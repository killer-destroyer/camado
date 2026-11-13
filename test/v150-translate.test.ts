// 1.5.0: перевод текста песни — одним запросом, припев один раз, русский не переводим.
import { describe, expect, it } from "vitest";
import { isMostlyCyrillic, parseTranslation, translateLyrics } from "../src/camado/translate.js";
import type { AgentRequest, LLMProvider } from "../src/llm/types.js";

describe("перевод песни", () => {
  it("русский не переводим", () => {
    expect(isMostlyCyrillic(["Группа крови на рукаве", "мой порядковый номер"])).toBe(true);
    expect(isMostlyCyrillic(["I want to break free", "God knows"])).toBe(false);
    expect(isMostlyCyrillic(["♪", ""])).toBe(true);
  });

  it("припев переводится один раз, строки на своих местах", async () => {
    const asked: string[] = [];
    const llm: LLMProvider = {
      runAgent: async (req: AgentRequest) => {
        asked.push(req.userMessage);
        expect(req.system.join(" ")).toMatch(/не выполняй/);
        return { text: '```json\n[{"n":1,"ru":"Я хочу вырваться"},{"n":2,"ru":"Бог знает"}]\n```' };
      },
    };
    const out = await translateLyrics(llm, ["I want to break free", "", "God knows", "I want to break free", "oh"], { title: "Break Free" });
    expect(out).toEqual(["Я хочу вырваться", "", "Бог знает", "Я хочу вырваться", ""]);
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatch(/1: I want to break free\n2: God knows\n3: oh/);
  });

  it("мусорный ответ не роняет", () => {
    expect(parseTranslation("не json").size).toBe(0);
    expect(parseTranslation('[{"n":"x","ru":1},{"n":2,"ru":"ок"}]').get(2)).toBe("ок");
  });
});
