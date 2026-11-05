import Anthropic from "@anthropic-ai/sdk";
import type { AgentRequest, AgentResult, LLMProvider, Tier, Usage } from "./types.js";

// Насколько глубоко модель думает на каждом уровне. Меньше — дешевле и быстрее.
const EFFORT: Record<Tier, "low" | "medium" | "high"> = {
  fast: "low",
  brain: "medium",
  smart: "high",
};

// Модели, у которых есть серверный запасной вариант: если фильтр безопасности
// ложно сработает, запрос сам перезапустится на другой модели.
const SUPPORTS_FALLBACK = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"]);

/** Минимум, который нам нужен от SDK, — чтобы в тестах подставлять заглушку. */
export interface MessagesClient {
  beta: {
    messages: {
      create(
        params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
      ): Promise<Anthropic.Beta.Messages.BetaMessage>;
    };
  };
}

export class AnthropicProvider implements LLMProvider {
  constructor(
    private client: MessagesClient,
    private models: Record<Tier, string>,
  ) {}

  static create(apiKey: string, models: Record<Tier, string>): AnthropicProvider {
    return new AnthropicProvider(new Anthropic({ apiKey }), models);
  }

  async runAgent(req: AgentRequest): Promise<AgentResult> {
    const model = this.models[req.tier];
    const toolsByName = new Map(req.tools.map((t) => [t.name, t]));
    const tools: Anthropic.Beta.Messages.BetaTool[] = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Beta.Messages.BetaTool.InputSchema,
    }));
    const system: Anthropic.Beta.Messages.BetaTextBlockParam[] = req.system.map((text) => ({ type: "text", text }));

    // Первое сообщение обязано быть от пользователя.
    const history = [...req.history];
    while (history[0]?.role === "assistant") history.shift();
    const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: req.userMessage },
    ];

    const maxSteps = req.maxSteps ?? 8;
    for (let step = 0; step < maxSteps; step++) {
      const response = await this.client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        tools,
        messages,
        cache_control: { type: "ephemeral" },
        output_config: { effort: EFFORT[req.tier] },
        ...(SUPPORTS_FALLBACK.has(model)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      });
      req.onUsage?.(toUsage(response));

      if (response.stop_reason === "refusal") return { text: "", refused: true };

      // Ответ модели кладём целиком: в нём могут быть блоки размышлений,
      // которые API ждёт обратно без изменений.
      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "pause_turn") continue;
      if (response.stop_reason !== "tool_use") return { text: textOf(response) };

      const toolResults: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const tool = toolsByName.get(block.name);
        try {
          if (!tool) throw new Error(`Нет такого инструмента: ${block.name}`);
          const content = await tool.run(block.input);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : String(err),
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
    return { text: "Я запутался в шагах и остановился. Попробуй переформулировать." };
  }
}

function textOf(response: Anthropic.Beta.Messages.BetaMessage): string {
  return response.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function toUsage(response: Anthropic.Beta.Messages.BetaMessage): Usage {
  const u = response.usage;
  return {
    model: response.model,
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
}

/**
 * Проверяет ключ бесплатным запросом (список моделей).
 * true — ключ рабочий, false — ключ неверный; сетевые и прочие ошибки пробрасывает.
 */
export async function checkAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    await new Anthropic({ apiKey, maxRetries: 1 }).models.list({ limit: 1 });
    return true;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return false;
    }
    throw err;
  }
}
