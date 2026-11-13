// Любая модель с «OpenAI-совместимым» API: OpenRouter, DeepSeek, Groq, GLM, а также своя на компьютере
// (Ollama, LM Studio). Адрес, ключ и названия моделей задаются в Настройках → ИИ.
import { humanAiError, networkHint } from "./errors.js";
import type { AgentRequest, AgentResult, LLMProvider, Tier, Usage } from "./types.js";

interface Msg {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

interface ChatResponse {
  choices?: { message?: Msg; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number; prompt_tokens_details?: { cached_tokens?: number } };
  model?: string;
  error?: { message?: string };
}

export interface OpenAiOptions {
  baseUrl: string;
  apiKey?: string;
  models: Record<Tier, string>;
  /** $ за 1 млн токенов — для учёта трат. OpenRouter присылает цену сам. */
  price: { input: number; output: number };
  /** Владелец отметил модель как бесплатную — запросы стоят $0. */
  free?: boolean;
}

/** Своя модель на компьютере — бесплатно. */
export const isLocalUrl = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(url.endsWith("/") ? url : url + "/");

export class OpenAiCompatProvider implements LLMProvider {
  constructor(
    private o: OpenAiOptions,
    // берём fetch в момент запроса: в программе он подменяется на сетевой стек Chromium (системный прокси и VPN)
    private fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async runAgent(req: AgentRequest): Promise<AgentResult> {
    const model = this.o.models[req.tier];
    const toolsByName = new Map(req.tools.map((t) => [t.name, t]));
    const history = [...req.history];
    while (history[0]?.role === "assistant") history.shift();
    for (const a of req.attachments ?? []) {
      if (!a.mime.startsWith("image/")) throw new Error("Эта модель не понимает голосовые — для голоса подключи Gemini в Настройках → ИИ.");
    }
    const messages: Msg[] = [
      { role: "system", content: req.system.join("\n\n") },
      ...history.map((m) => ({ role: m.role, content: m.content }) as Msg),
      {
        role: "user",
        content: req.attachments?.length
          ? [...req.attachments.map((a) => ({ type: "image_url" as const, image_url: { url: `data:${a.mime};base64,${a.data}` } })), { type: "text" as const, text: req.userMessage }]
          : req.userMessage,
      },
    ];
    const tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    const url = this.o.baseUrl.replace(/\/+$/, "") + "/chat/completions";
    const openrouter = /openrouter\.ai/i.test(url);

    for (let step = 0; step < (req.maxSteps ?? 8); step++) {
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.o.apiKey ? { Authorization: `Bearer ${this.o.apiKey}` } : {}),
          ...(openrouter ? { "X-Title": "Camado" } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          ...(tools.length ? { tools } : {}),
          max_tokens: 4096,
          ...(openrouter ? { usage: { include: true } } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      }).catch((err: unknown) => {
        if (err instanceof Error && /timeout|aborted/i.test(err.name + err.message)) throw new Error(`${serviceName(this.o.baseUrl)} слишком долго не отвечает. Попробуй ещё раз.`);
        throw new Error(networkHint(serviceName(this.o.baseUrl)));
      });
      const data = (await res.json().catch(() => ({}))) as ChatResponse;
      if (!res.ok) {
        throw new Error(humanAiError(serviceName(this.o.baseUrl), res.status, data.error?.message ?? ""));
      }
      req.onUsage?.(this.usage(model, data));
      const choice = data.choices?.[0];
      const msg = choice?.message;
      // Нет ответа в привычном виде — показываем, что сказал сервис, а не прячем причину.
      if (!msg) throw new Error(`Сервис ответил не так, как ждали${data.error?.message ? `: ${data.error.message}` : ""}. Проверь адрес API и название модели в Настройках → ИИ.`);
      if (choice.finish_reason === "content_filter") return { text: "", refused: true };
      messages.push({ role: "assistant", content: msg.content ?? "", ...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {}) });
      if (!msg.tool_calls?.length) return { text: typeof msg.content === "string" ? msg.content.trim() : "" };
      for (const call of msg.tool_calls) {
        const tool = toolsByName.get(call.function.name);
        let content: string;
        try {
          if (!tool) throw new Error(`Нет такого инструмента: ${call.function.name}`);
          content = await tool.run(JSON.parse(call.function.arguments || "{}"));
        } catch (err) {
          content = `Ошибка: ${err instanceof Error ? err.message : String(err)}`;
        }
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
    }
    return { text: "Я запутался в шагах и остановился. Попробуй переформулировать." };
  }

  private usage(model: string, data: ChatResponse): Usage {
    const u = data.usage ?? {};
    const input = u.prompt_tokens ?? 0;
    const output = u.completion_tokens ?? 0;
    // Цену знает сам сервис (OpenRouter) → берём её; своя модель → $0; задана цена → считаем;
    // ничего не известно → undefined: учёт трат посчитает по самой дорогой цене (лимит не обойти).
    const priced = this.o.price.input > 0 || this.o.price.output > 0;
    const cost =
      typeof u.cost === "number"
        ? u.cost
        : isLocalUrl(this.o.baseUrl) || this.o.free
          ? 0
          : priced
            ? (input * this.o.price.input + output * this.o.price.output) / 1_000_000
            : undefined;
    return { model: data.model ?? model, inputTokens: input, outputTokens: output, cacheReadTokens: u.prompt_tokens_details?.cached_tokens ?? 0, cacheWriteTokens: 0, costUsd: cost };
  }
}

/** «openrouter.ai» → «OpenRouter» — для понятных сообщений об ошибках. */
export function serviceName(baseUrl: string): string {
  const host = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return baseUrl;
    }
  })();
  if (/openrouter/i.test(host)) return "OpenRouter";
  if (/deepseek/i.test(host)) return "DeepSeek";
  if (/openai\.com/i.test(host)) return "OpenAI";
  if (/localhost|127\.0\.0\.1/i.test(host)) return "локальная модель";
  if (/groq/i.test(host)) return "Groq";
  if (/mistral/i.test(host)) return "Mistral";
  return host || "сервис";
}
