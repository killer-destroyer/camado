// 1.5.0: ошибки ИИ — понятным языком (страна, нет денег, ключ, лимит).
import { describe, expect, it } from "vitest";
import { humanAiError, isLocationError, LOCATION_HINT } from "../src/llm/errors.js";
import { geminiKeyProblem } from "../src/llm/gemini.js";
import { OpenAiCompatProvider, serviceName } from "../src/llm/openai.js";

describe("ошибки ИИ", () => {
  it("страна, деньги, ключ, лимит", () => {
    expect(isLocationError("User location is not supported for the API use.")).toBe(true);
    expect(humanAiError("Gemini", 400, "User location is not supported for the API use.")).toBe(LOCATION_HINT);
    expect(humanAiError("DeepSeek", 402, "Insufficient Balance")).toMatch(/нет денег/);
    expect(humanAiError("OpenRouter", 401)).toMatch(/не принял ключ/);
    expect(humanAiError("OpenRouter", 429)).toMatch(/Лимит/);
    expect(serviceName("https://api.deepseek.com/v1")).toBe("DeepSeek");
  });
  it("Gemini из «неподдерживаемой страны» — это не «ключ не принят»", async () => {
    const fake = (async () => new Response(JSON.stringify({ error: { code: 400, message: "User location is not supported for the API use.", status: "FAILED_PRECONDITION" } }), { status: 400 })) as unknown as typeof fetch;
    expect(await geminiKeyProblem("AQ.xxxxxxxxxxxxxxxxxxxxxxxx", fake)).toBe(LOCATION_HINT);
  });
  it("402 от DeepSeek в чате — «нет денег», а сеть — подсказка про VPN", async () => {
    const p402 = new OpenAiCompatProvider({ baseUrl: "https://api.deepseek.com/v1", apiKey: "k", models: { fast: "m", brain: "m", smart: "m" }, price: { input: 0, output: 0 }, free: true }, (async () =>
      new Response(JSON.stringify({ error: { message: "Insufficient Balance" } }), { status: 402 })) as unknown as typeof fetch);
    await expect(p402.runAgent({ tier: "brain", system: ["s"], history: [], userMessage: "привет", tools: [] })).rejects.toThrow(/На счёте DeepSeek нет денег/);
    const pNet = new OpenAiCompatProvider({ baseUrl: "https://openrouter.ai/api/v1", apiKey: "k", models: { fast: "m", brain: "m", smart: "m" }, price: { input: 0, output: 0 }, free: true }, (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch);
    await expect(pNet.runAgent({ tier: "brain", system: ["s"], history: [], userMessage: "привет", tools: [] })).rejects.toThrow(/VPN/);
  });
});
