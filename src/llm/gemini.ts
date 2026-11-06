// Google Gemini через официальный REST API (generativelanguage.googleapis.com).
// Бесплатный ключ — aistudio.google.com. Умеет инструменты, картинки и голос.
import type { AgentRequest, AgentResult, LLMProvider, Tier, Usage } from "./types.js";

export const GEMINI_MODELS: Record<Tier, string> = {
  fast: "gemini-flash-lite-latest",
  brain: "gemini-flash-latest",
  smart: "gemini-flash-latest",
};

const API = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Gemini понимает только часть JSON Schema (OpenAPI-подмножество).
 * Убираем то, чего он не знает, «A или null» превращаем в nullable.
 */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const s = schema as Record<string, unknown>;
  const variants = (s.anyOf ?? s.oneOf) as Record<string, unknown>[] | undefined;
  if (variants) {
    const real = variants.filter((v) => v.type !== "null");
    const base = (toGeminiSchema(real[0] ?? {}) ?? {}) as Record<string, unknown>;
    if (real.length < variants.length) base.nullable = true;
    if (s.description) base.description = s.description;
    return base;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (["$schema", "additionalProperties", "default", "$ref", "$defs", "definitions", "examples", "title", "exclusiveMinimum", "exclusiveMaximum", "pattern", "minLength", "maxLength"].includes(k)) continue;
    if (k === "const") {
      out.enum = [v];
      continue;
    }
    if (k === "type" && Array.isArray(v)) {
      const t = v.filter((x) => x !== "null");
      out.type = t[0];
      if (t.length < v.length) out.nullable = true;
      continue;
    }
    if (k === "format" && !["date-time", "enum", "int32", "int64", "float", "double"].includes(String(v))) continue;
    out[k] = k === "properties" ? Object.fromEntries(Object.entries(v as object).map(([pk, pv]) => [pk, toGeminiSchema(pv)])) : toGeminiSchema(v);
  }
  return out;
}

interface Part {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
  thoughtSignature?: string;
}

interface Content {
  role: "user" | "model";
  parts: Part[];
}

interface GenerateResponse {
  candidates?: { content?: Content; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number; thoughtsTokenCount?: number };
  modelVersion?: string;
  error?: { message?: string; status?: string };
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private models: Record<Tier, string> = GEMINI_MODELS,
    /** Бесплатный тариф — запросы ничего не стоят (для учёта трат). */
    private free = true,
    private price: { input: number; output: number } = { input: 0, output: 0 },
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async runAgent(req: AgentRequest): Promise<AgentResult> {
    const model = this.models[req.tier];
    const toolsByName = new Map(req.tools.map((t) => [t.name, t]));
    const history = [...req.history];
    while (history[0]?.role === "assistant") history.shift();
    const contents: Content[] = history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    contents.push({
      role: "user",
      parts: [...(req.attachments ?? []).map((a) => ({ inlineData: { mimeType: a.mime, data: a.data } })), { text: req.userMessage }],
    });
    const body = {
      systemInstruction: { parts: [{ text: req.system.join("\n\n") }] },
      tools: req.tools.length
        ? [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: toGeminiSchema(t.inputSchema) })) }]
        : undefined,
      generationConfig: { maxOutputTokens: 8192 },
    };

    const maxSteps = req.maxSteps ?? 8;
    for (let step = 0; step < maxSteps; step++) {
      const res = await this.fetchImpl(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({ ...body, contents }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = (await res.json().catch(() => ({}))) as GenerateResponse;
      if (!res.ok) throw new GeminiError(geminiMessage(res.status, data), res.status);
      req.onUsage?.(this.usage(model, data));

      if (data.promptFeedback?.blockReason) return { text: "", refused: true };
      const cand = data.candidates?.[0];
      if (!cand?.content) {
        if (cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") return { text: "", refused: true };
        return { text: "Модель ничего не ответила. Попробуй ещё раз." };
      }
      contents.push(cand.content);
      const calls = cand.content.parts.filter((p) => p.functionCall);
      if (!calls.length) {
        return {
          text: cand.content.parts
            .filter((p) => p.text && !p.thought)
            .map((p) => p.text)
            .join("")
            .trim(),
        };
      }
      const replies: Part[] = [];
      for (const p of calls) {
        const { name, args } = p.functionCall!;
        const tool = toolsByName.get(name);
        try {
          if (!tool) throw new Error(`Нет такого инструмента: ${name}`);
          replies.push({ functionResponse: { name, response: { result: await tool.run(args ?? {}) } } });
        } catch (err) {
          replies.push({ functionResponse: { name, response: { error: err instanceof Error ? err.message : String(err) } } });
        }
      }
      contents.push({ role: "user", parts: replies });
    }
    return { text: "Я запутался в шагах и остановился. Попробуй переформулировать." };
  }

  private usage(model: string, data: GenerateResponse): Usage {
    const u = data.usageMetadata ?? {};
    const input = u.promptTokenCount ?? 0;
    const output = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    return {
      model: data.modelVersion ?? model,
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: u.cachedContentTokenCount ?? 0,
      cacheWriteTokens: 0,
      costUsd: this.free ? 0 : (input * this.price.input + output * this.price.output) / 1_000_000,
    };
  }
}

function geminiMessage(status: number, data: GenerateResponse): string {
  if (status === 429) return "Бесплатный лимит Gemini на сегодня закончился. Завтра снова заработает — или подключи другую модель в Настройках → ИИ.";
  if (status === 400 && /API key/i.test(data.error?.message ?? "")) return "Google не принял ключ Gemini. Проверь его в Настройках → ИИ.";
  if (status === 403) return "У ключа Gemini нет доступа. Создай новый на aistudio.google.com.";
  return `Gemini ответил ошибкой ${status}${data.error?.message ? `: ${data.error.message}` : ""}`;
}

/** Проверить ключ: бесплатный запрос списка моделей. */
export async function checkGeminiKey(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const res = await fetchImpl(`${API}/models?pageSize=1`, { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(15_000) });
  if (res.ok) return true;
  if (res.status === 400 || res.status === 401 || res.status === 403) return false;
  throw new Error(`Gemini ответил ${res.status}`);
}
