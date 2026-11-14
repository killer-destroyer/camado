import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { Camado } from "../src/camado/brain.js";
import { AnthropicProvider, type MessagesClient } from "../src/llm/anthropic.js";
import { BudgetExceededError, MeteredProvider } from "../src/llm/metered.js";
import { memoryStore } from "./helpers.js";

type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type Msg = Anthropic.Beta.Messages.BetaMessage;

const MODELS = { fast: "claude-haiku-5-5", brain: "claude-sonnet-5-5", smart: "claude-opus-5-5" };

function reply(stop: Msg["stop_reason"], content: unknown[]): Msg {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    stop_reason: stop,
    content,
    usage: { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  } as unknown as Msg;
}

/** Заглушка API: отдаёт заранее заготовленные ответы и запоминает запросы. */
function fakeClient(replies: Msg[]) {
  const calls: Params[] = [];
  const client: MessagesClient = {
    beta: {
      messages: {
        async create(params) {
          calls.push(structuredClone(params));
          const next = replies.shift();
          if (!next) throw new Error("заглушка: ответы кончились");
          return next;
        },
      },
    },
  };
  return { client, calls };
}

const NOW = () => new Date("2026-11-05T15:00:00Z");

describe("Камадо + Claude", () => {
  it("модель вызывает add_task, задание сохраняется, ответ уходит пользователю", async () => {
    const store = memoryStore(NOW);
    const { client, calls } = fakeClient([
      reply("tool_use", [
        { type: "thinking", thinking: "", signature: "sig" },
        {
          type: "tool_use",
          id: "tu_1",
          name: "add_task",
          input: { title: "Решить №5–12", subject: "Матан", due_at: "2026-11-06T23:59:00-05:00" },
        },
      ]),
      reply("end_turn", [{ type: "text", text: "Записал: матан №5–12 до пятницы 23:59." }]),
    ]);
    const llm = new MeteredProvider(new AnthropicProvider(client, MODELS), store, 25, NOW);
    const camado = new Camado(store, llm, "America/New_York", NOW);

    const answer = await camado.handle({ text: "по матану №5-12 к пятнице", forwardedFrom: "Препод" });

    expect(answer).toBe("Записал: матан №5–12 до пятницы 23:59.");
    expect(store.listTasks()).toHaveLength(1);

    // Первый запрос: системный промпт, инструменты, контекст времени и источник.
    const first = calls[0]!;
    expect(first.model).toBe("claude-sonnet-5-5");
    expect(first.fallbacks).toBe("default");
    expect(first.betas).toEqual(["server-side-fallback-2026-07-01"]);
    const toolNames = (first.tools ?? []).map((t) => ("name" in t ? t.name : ""));
    expect(toolNames).toContain("add_task");
    // Пересланное — данные: менять и стирать сохранённое из него нельзя.
    expect(toolNames).not.toContain("update_task");
    expect(toolNames).not.toContain("forget");
    const userText = first.messages[0]!.content as string;
    expect(userText).toMatch(/^\[Сейчас: .*UTC-05:00\]/);
    expect(userText).toContain("[Пересланное сообщение от: Препод.");
    expect(userText).toContain("<<<\nпо матану №5-12 к пятнице\n>>>");

    // Второй запрос: ответ модели вернулся целиком (с блоком размышлений) + результат инструмента.
    const second = calls[1]!;
    const assistant = second.messages[1]!;
    expect(assistant.role).toBe("assistant");
    expect((assistant.content as { type: string }[])[0]!.type).toBe("thinking");
    const result = (second.messages[2]!.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0]!;
    expect(result.tool_use_id).toBe("tu_1");
    expect(result.is_error).toBeUndefined();

    // Траты записаны: 2 запроса × (1000 вход × $2 + 100 выход × $10) / 1М.
    expect(llm.spentThisMonth()).toBeCloseTo(0.006);

    // Разговор сохранён для следующего сообщения.
    expect(store.recentChat(10).map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("ошибка инструмента возвращается модели, а не роняет бота", async () => {
    const store = memoryStore(NOW);
    const { client, calls } = fakeClient([
      reply("tool_use", [{ type: "tool_use", id: "tu_1", name: "add_task", input: { title: "x", due_at: "пятница" } }]),
      reply("end_turn", [{ type: "text", text: "Не понял срок — к какому числу?" }]),
    ]);
    const camado = new Camado(store, new AnthropicProvider(client, MODELS), "UTC", NOW);

    expect(await camado.handle({ text: "x к пятнице" })).toContain("к какому числу");
    const result = (calls[1]!.messages[2]!.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0]!;
    expect(result.is_error).toBe(true);
    expect(store.listTasks()).toHaveLength(0);
  });

  it("отказ модели — понятное сообщение", async () => {
    const store = memoryStore(NOW);
    const { client } = fakeClient([reply("refusal", [])]);
    const camado = new Camado(store, new AnthropicProvider(client, MODELS), "UTC", NOW);
    expect(await camado.handle({ text: "..." })).toContain("отказалась");
  });

  it("Haiku идёт без серверного фолбэка (он его не поддерживает)", async () => {
    const { client, calls } = fakeClient([reply("end_turn", [{ type: "text", text: "ok" }])]);
    await new AnthropicProvider(client, MODELS).runAgent({
      tier: "fast",
      system: ["s"],
      history: [{ role: "assistant", content: "лишнее приветствие" }],
      userMessage: "u",
      tools: [],
    });
    expect(calls[0]!.model).toBe("claude-haiku-5-5");
    expect(calls[0]!.fallbacks).toBeUndefined();
    // История не может начинаться с ответа ассистента.
    expect(calls[0]!.messages).toHaveLength(1);
  });

  it("при исчерпанном бюджете модель не вызывается", async () => {
    const store = memoryStore(NOW);
    store.recordUsage({ model: "m", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 30 });
    const { client, calls } = fakeClient([]);
    const llm = new MeteredProvider(new AnthropicProvider(client, MODELS), store, 25, NOW);
    await expect(new Camado(store, llm, "UTC", NOW).handle({ text: "привет" })).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(calls).toHaveLength(0);
  });
});
