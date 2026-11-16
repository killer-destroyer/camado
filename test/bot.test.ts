import { describe, expect, it } from "vitest";
import { describeOrigin, splitMessage } from "../src/bot.js";

describe("бот", () => {
  it("режет длинные ответы по строкам под лимит Telegram", () => {
    const text = Array.from({ length: 50 }, (_, i) => `строка ${i} `.repeat(10)).join("\n");
    const chunks = splitMessage(text, 500);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
    expect(chunks.join("\n")).toBe(text);
  });

  it("понимает, от кого переслано", () => {
    expect(
      describeOrigin({ type: "user", date: 0, sender_user: { id: 1, is_bot: false, first_name: "Иван", last_name: "Петров" } }),
    ).toBe("Иван Петров");
    expect(describeOrigin({ type: "hidden_user", date: 0, sender_user_name: "Аноним" })).toBe("Аноним");
    expect(describeOrigin(undefined)).toBeUndefined();
  });
});
