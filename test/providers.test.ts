import { describe, expect, it } from "vitest";
import { z } from "zod";
import { GeminiProvider, toGeminiSchema } from "../src/llm/gemini.js";
import { OpenAiCompatProvider } from "../src/llm/openai.js";
import { buildProvider, parseAiConfig } from "../src/llm/providers.js";
import { defineTool } from "../src/llm/tool.js";
import type { Usage } from "../src/llm/types.js";

const saved: string[] = [];
const addTask = defineTool({
  name: "add_task",
  description: "Записать задание",
  schema: z.object({ title: z.string(), due_at: z.string().nullable().optional(), kind: z.enum(["homework", "exam"]).default("homework") }),
  run: async (i) => {
    saved.push(i.title);
    return `Записал: ${i.title}`;
  },
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("Gemini", () => {
  it("схема инструментов без того, чего Gemini не понимает", () => {
    const s = toGeminiSchema(addTask.inputSchema) as Record<string, unknown>;
    const str = JSON.stringify(s);
    expect(str).not.toContain("$schema");
    expect(str).not.toContain("additionalProperties");
    expect(str).not.toContain("anyOf");
    expect((s.properties as Record<string, { nullable?: boolean }>).due_at!.nullable).toBe(true);
  });

  it("вызывает инструмент, отдаёт результат и возвращает ответ; бесплатный тариф стоит $0", async () => {
    saved.length = 0;
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const replies = [
      { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "add_task", args: { title: "Решить №5–12" } } }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 } },
      { candidates: [{ content: { role: "model", parts: [{ text: "Записал матан!" }] } }], usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 5 } },
    ];
    const impl = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return json(replies[calls.length - 1]);
    }) as unknown as typeof fetch;
    const usages: Usage[] = [];
    const p = new GeminiProvider("AIzaTEST", undefined, true, undefined, impl);
    const r = await p.runAgent({ tier: "brain", system: ["Ты Камадо"], history: [], userMessage: "по матану №5–12", tools: [addTask], onUsage: (u) => usages.push(u) });
    expect(r.text).toBe("Записал матан!");
    expect(saved).toEqual(["Решить №5–12"]);
    expect(calls[0]!.url).toContain("models/gemini-flash-latest:generateContent");
    const second = calls[1]!.body.contents as { role: string; parts: { functionResponse?: { response: { result: string } } }[] }[];
    expect(second.at(-1)!.parts[0]!.functionResponse!.response.result).toBe("Записал: Решить №5–12");
    expect(usages.every((u) => u.costUsd === 0)).toBe(true);
  });

  it("картинки и голос уходят как inlineData", async () => {
    let body: Record<string, unknown> = {};
    const impl = (async (_u: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return json({ candidates: [{ content: { role: "model", parts: [{ text: "ok" }] } }] });
    }) as unknown as typeof fetch;
    await new GeminiProvider("k", undefined, true, undefined, impl).runAgent({
      tier: "fast",
      system: [],
      history: [],
      userMessage: "что тут?",
      tools: [],
      attachments: [{ mime: "audio/wav", data: "AAAA" }],
    });
    const parts = (body.contents as { parts: { inlineData?: { mimeType: string } }[] }[])[0]!.parts;
    expect(parts[0]!.inlineData!.mimeType).toBe("audio/wav");
  });

  it("закончился бесплатный лимит — понятная ошибка", async () => {
    const impl = (async () => json({ error: { message: "quota" } }, 429)) as unknown as typeof fetch;
    await expect(new GeminiProvider("k", undefined, true, undefined, impl).runAgent({ tier: "brain", system: [], history: [], userMessage: "hi", tools: [] })).rejects.toThrow(/лимит/);
  });
});

describe("OpenAI-совместимые", () => {
  it("инструменты через tool_calls; цену OpenRouter берёт из ответа", async () => {
    saved.length = 0;
    const replies = [
      { choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "add_task", arguments: '{"title":"Лаба"}' } }] } }], usage: { prompt_tokens: 50, completion_tokens: 5, cost: 0.0001 } },
      { choices: [{ message: { role: "assistant", content: "Готово" } }], usage: { prompt_tokens: 60, completion_tokens: 2, cost: 0.0002 } },
    ];
    let n = 0;
    const impl = (async () => json(replies[n++])) as unknown as typeof fetch;
    const usages: Usage[] = [];
    const p = new OpenAiCompatProvider({ baseUrl: "https://openrouter.ai/api/v1", apiKey: "k", models: { fast: "m", brain: "m", smart: "m" }, price: { input: 0, output: 0 } }, impl);
    const r = await p.runAgent({ tier: "brain", system: ["s"], history: [], userMessage: "лаба", tools: [addTask], onUsage: (u) => usages.push(u) });
    expect(r.text).toBe("Готово");
    expect(saved).toEqual(["Лаба"]);
    expect(usages.map((u) => u.costUsd)).toEqual([0.0001, 0.0002]);
  });

  it("неизвестная цена — не ноль: учёт трат посчитает по самой дорогой (лимит не обойти)", async () => {
    const impl = (async () => json({ choices: [{ message: { role: "assistant", content: "hi" } }], usage: { prompt_tokens: 10, completion_tokens: 1 } })) as unknown as typeof fetch;
    const usages: Usage[] = [];
    await new OpenAiCompatProvider({ baseUrl: "https://api.example.com/v1", apiKey: "k", models: { fast: "m", brain: "m", smart: "m" }, price: { input: 0, output: 0 } }, impl).runAgent({
      tier: "brain",
      system: [],
      history: [],
      userMessage: "x",
      tools: [],
      onUsage: (u) => usages.push(u),
    });
    expect(usages[0]!.costUsd).toBeUndefined();
    // своя модель на компьютере — бесплатно
    const local: Usage[] = [];
    await new OpenAiCompatProvider({ baseUrl: "http://localhost:11434/v1", models: { fast: "m", brain: "m", smart: "m" }, price: { input: 0, output: 0 } }, impl).runAgent({
      tier: "brain",
      system: [],
      history: [],
      userMessage: "x",
      tools: [],
      onUsage: (u) => local.push(u),
    });
    expect(local[0]!.costUsd).toBe(0);
  });
});

describe("выбор нейросети", () => {
  it("по умолчанию — бесплатный Gemini; без ключа — ручной режим", () => {
    expect(parseAiConfig(undefined)).toMatchObject({ kind: "gemini", free: true });
    expect(parseAiConfig("{сломано")).toMatchObject({ kind: "gemini" });
    const claude = { fast: "a", brain: "b", smart: "c" };
    expect(buildProvider({ kind: "gemini" }, undefined, claude)).toBeUndefined();
    expect(buildProvider({ kind: "gemini" }, "AIza", claude)).toBeInstanceOf(GeminiProvider);
    expect(buildProvider({ kind: "openai", baseUrl: "http://localhost:11434/v1" }, undefined, claude)).toBeInstanceOf(OpenAiCompatProvider);
  });
});
