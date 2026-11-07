import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCourse, sameOutput, streak, warmupFor, type CourseId } from "../desktop/shared/courses/format.js";
import { detectTools, hasRunner, runCode } from "../desktop/main/runner.js";

const FILES: [CourseId, string, "python" | "java" | "cpp" | "html"][] = [
  ["python", "Python", "python"],
  ["java", "Java", "java"],
  ["cpp", "C++", "cpp"],
  ["html", "HTML и CSS", "html"],
];
const courses = FILES.map(([id, name, lang]) => parseCourse(id, name, lang, readFileSync(new URL(`../desktop/shared/courses/${id}.md`, import.meta.url), "utf8")));

describe("курсы «Прокачки»", () => {
  it.each(courses.map((c) => [c.id, c] as const))("%s: уроки собраны полностью", (_id, c) => {
    expect(c.about.length).toBeGreaterThan(40);
    expect(c.lessons.length).toBeGreaterThanOrEqual(8);
    const ids = new Set<string>();
    for (const l of c.lessons) {
      expect(ids.has(l.id), l.id).toBe(false);
      ids.add(l.id);
      expect(l.guide.length, l.id).toBeGreaterThan(200);
      expect(l.quiz.length, l.id).toBeGreaterThanOrEqual(2);
      for (const q of l.quiz) {
        expect(q.options.length, `${l.id}: ${q.q}`).toBeGreaterThanOrEqual(2);
        expect(q.answer, `${l.id}: ${q.q}`).toBeGreaterThanOrEqual(0);
        expect(q.why.length, `${l.id}: ${q.q}`).toBeGreaterThan(5);
      }
      expect(l.task, l.id).toBeDefined();
      expect(l.task!.solution.trim().length, l.id).toBeGreaterThan(5);
      expect(l.task!.hints.length, l.id).toBeGreaterThanOrEqual(1);
      if (c.lang === "html") expect(l.task!.checks.length, l.id).toBeGreaterThanOrEqual(1);
      else expect(l.task!.tests.length, l.id).toBeGreaterThanOrEqual(1);
      expect(l.cards.length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  // Решения из уроков правда проходят свои тесты (где установлен язык).
  for (const c of courses.filter((x) => x.lang !== "html")) {
    it(`${c.id}: решения проходят тесты`, async () => {
      const tools = await detectTools();
      const lang = c.lang as "python" | "java" | "cpp";
      if (!hasRunner(tools, lang)) return;
      for (const l of c.lessons) {
        const t = l.task!;
        const res = await runCode(tools, lang, t.solution, t.tests.map((x) => x.input), 15000);
        if ("error" in res) throw new Error(res.error);
        res.forEach((r, i) => {
          expect(r.ok, `${l.id} тест ${i + 1}: ${r.stderr}`).toBe(true);
          expect(sameOutput(r.stdout, t.tests[i]!.output), `${l.id} тест ${i + 1}: получилось\n${r.stdout}\nожидалось\n${t.tests[i]!.output}`).toBe(true);
        });
      }
    }, 240_000);
  }

  it("заготовки не решают задачу сами", async () => {
    const tools = await detectTools();
    for (const c of courses.filter((x) => x.lang !== "html" && hasRunner(tools, x.lang as "python"))) {
      for (const l of c.lessons) {
        const t = l.task!;
        const res = await runCode(tools, c.lang as "python", t.starter, t.tests.map((x) => x.input), 15000);
        if ("error" in res) continue;
        const allOk = res.every((r, i) => r.ok && sameOutput(r.stdout, t.tests[i]!.output));
        expect(allOk, `${l.id}: заготовка уже проходит тесты`).toBe(false);
      }
    }
  }, 240_000);

  it("серия дней и разминка", () => {
    expect(streak(["2026-11-05", "2026-11-06", "2026-11-07"], "2026-11-07")).toBe(3);
    expect(streak(["2026-11-05", "2026-11-06"], "2026-11-07")).toBe(2); // сегодня ещё не занимался — серия не сгорела
    expect(streak(["2026-11-04"], "2026-11-07")).toBe(0);
    const pool = courses[0]!.lessons.flatMap((l) => l.quiz.map((q, i) => ({ key: `${l.id}:${i}`, quiz: q })));
    const a = warmupFor(pool, "2026-11-07", {});
    expect(a).toHaveLength(3);
    expect(warmupFor(pool, "2026-11-07", {})).toEqual(a);
    expect(new Set(a.map((x) => x.key)).size).toBe(3);
  });

  it("сравнение вывода терпит пробелы по краям", () => {
    expect(sameOutput("1 2 \n3\n\n", "1 2\n3")).toBe(true);
    expect(sameOutput("1 2", "12")).toBe(false);
  });
});
