import { describe, expect, it } from "vitest";
import { plainCard } from "../src/bot.js";
import { booksFor } from "../desktop/shared/itmoBooks.js";
import { checkHtml, parseCourse } from "../desktop/shared/courses/format.js";

/** Простой «документ» для проверки HTML-требований без браузера. */
function fakeDoc(counts: Record<string, number>, style = "") {
  return {
    querySelectorAll(sel: string) {
      if (sel === "style") return [{ textContent: style, getAttribute: () => null }];
      if (sel === "[style]") return [];
      return Array.from({ length: counts[sel] ?? 0 }, () => ({ textContent: "", getAttribute: () => null }));
    },
  };
}

describe("1.0.9", () => {
  it("карточка для Telegram — без разметки", () => {
    expect(plainCard("Что делает `x % 2`? **важно**\n```python\nprint(1)\n```")).toBe("Что делает x % 2? важно\nprint(1)");
  });

  it("книги ИТМО находятся по названию предмета", () => {
    expect(booksFor("Математический анализ").map((b) => b.id)).toContain(2657);
    expect(booksFor("Алгоритмы и структуры данных").length).toBeGreaterThan(0);
    expect(booksFor("Физкультура")).toHaveLength(0);
  });

  it("проверка HTML: элементы и стили", () => {
    const checks = [
      { selector: "h1", min: 1, message: "нужен h1" },
      { selector: "li", min: 3, message: "3 пункта" },
      { selector: "css:display\\s*:\\s*flex", min: 1, message: "flex" },
    ];
    expect(checkHtml(fakeDoc({ h1: 1, li: 3 }, ".a { display: flex }"), checks)).toEqual([]);
    expect(checkHtml(fakeDoc({ li: 2 }, ".a { display: grid }"), checks)).toEqual(["нужен h1", "3 пункта", "flex"]);
  });

  it("разбор урока: вопросы, задача, тесты, карточки", () => {
    const c = parseCourse("python", "Python", "python", `# P\nО курсе.\n\n## t-1 | Урок\nГайд\n\n\`\`\`python\n- не вариант\n\`\`\`\n\n?? Вопрос?\n- нет\n+ да\n= потому что\n\n!! Сложи\n<<<\na = 1\n<<<\nin: 1 2\nout: 3\nhint: подсказка\n===\nprint(3)\n===\ncard: В :: О\\nдва\n`);
    const l = c.lessons[0]!;
    expect(l.guide).toContain("- не вариант"); // строка внутри кода — не вариант ответа
    expect(l.quiz).toEqual([{ q: "Вопрос?", options: ["нет", "да"], answer: 1, why: "потому что" }]);
    expect(l.task).toMatchObject({ text: "Сложи", starter: "a = 1", tests: [{ input: "1 2", output: "3" }], hints: ["подсказка"], solution: "print(3)" });
    expect(l.cards).toEqual([{ question: "В", answer: "О\nдва" }]);
  });
});
