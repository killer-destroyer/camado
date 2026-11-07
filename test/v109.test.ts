import { describe, expect, it } from "vitest";
import { plainCard } from "../src/bot.js";
import { cleanBook, cleanSource, findPdfLink, mergeBooks } from "../desktop/main/books.js";
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

  it("библиотека: чистка, слияние без дублей, поиск PDF на странице", () => {
    expect(cleanBook({ title: "  " })).toBeUndefined();
    const a = cleanBook({ title: "Матан", section: "Анализ", url: "https://x.org/a" })!;
    expect(a.status).toBe("want");
    expect(cleanBook({ title: "x", url: "javascript:alert(1)" })!.url).toBeUndefined();
    expect(cleanBook({ title: "x", file: "../../etc/passwd" })!.file).toBeUndefined();
    const r = mergeBooks([a], [cleanBook({ title: "Другое", url: "https://x.org/a" })!, cleanBook({ title: "Новая", section: "Анализ" })!]);
    expect(r.added).toBe(1);
    expect(findPdfLink('<a href="/file/pdf/12.pdf">PDF</a>', "https://lib.example/book/1")).toBe("https://lib.example/file/pdf/12.pdf");
    expect(findPdfLink("<a href='/x'>нет</a>", "https://lib.example/")).toBeUndefined();
    expect(cleanSource({ name: "Вики", url: "https://ru.wikipedia.org/w/index.php?search={q}" })).toBeDefined();
    expect(cleanSource({ name: "Без запроса", url: "https://example.org" })).toBeUndefined();
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
    const c = parseCourse("python", "Python", "python", `# P\nО курсе.\n\n## t-1 | Урок\nГайд\n\n\`\`\`python\n- не вариант\n\`\`\`\n\n?? Вопрос?\n- нет\n+ да\n= потому что\n\n!! Сложи\n<<<\na = 1\n<<<\nin: 1 2\nout: 3\nhint: подсказка\n===\nprint(3)\n===\n!! {3} Посложнее\nin: 5\nout: 5\nhint: h\n===\nprint(5)\n===\ncard: В :: О\\nдва\n\n### Модуль: Второй\n\n## t-2 | Ещё\nГайд 2\n`);
    const l = c.lessons[0]!;
    expect(l.guide).toContain("- не вариант"); // строка внутри кода — не вариант ответа
    expect(l.quiz).toEqual([{ q: "Вопрос?", options: ["нет", "да"], answer: 1, why: "потому что" }]);
    expect(l.tasks[0]).toMatchObject({ level: 1, text: "Сложи", starter: "a = 1", tests: [{ input: "1 2", output: "3" }], hints: ["подсказка"], solution: "print(3)" });
    expect(l.tasks[1]).toMatchObject({ level: 3, text: "Посложнее", tests: [{ input: "5", output: "5" }] });
    expect(l.module).toBe("Основы");
    expect(c.lessons[1]!.module).toBe("Второй");
    expect(l.cards).toEqual([{ question: "В", answer: "О\nдва" }]);
  });
});
