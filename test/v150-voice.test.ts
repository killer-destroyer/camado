// 1.5.0: голосовой Камадо — что читать вслух и слово «Камадо».
import { describe, expect, it } from "vitest";
import { isWakeWord, speakable } from "../desktop/shared/voicetext.js";

describe("голос", () => {
  it("читает без разметки, ссылок и эмодзи", () => {
    expect(speakable("**Завтра** матан в 9:30 📚\n- [лекция](https://zoom.us/j/1) и https://x.y/z")).toBe("Завтра матан в 9:30 - лекция и ссылка");
    expect(speakable("```py\nprint(1)\n```Готово ✅")).toBe("Готово");
  });
  it("узнаёт «Камадо» и похожее, но не «комод»", () => {
    expect(isWakeWord("Камадо, что завтра?")).toBe(true);
    expect(isWakeWord("комода включи музыку")).toBe(true);
    expect(isWakeWord("Kamado")).toBe(true);
    expect(isWakeWord("купил комод")).toBe(false);
    expect(isWakeWord("камадоша")).toBe(false);
    expect(isWakeWord("")).toBe(false);
  });
});
