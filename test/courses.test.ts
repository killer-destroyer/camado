import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCourse, parseProblems, sameOutput, streak, warmupFor, type CodeTask, type CourseId } from "../desktop/shared/courses/format.js";
import { detectTools, hasRunner, runCode } from "../desktop/main/runner.js";

const FILES: [CourseId, string, "python" | "java" | "cpp" | "html"][] = [
  ["python", "Python", "python"],
  ["java", "Java", "java"],
  ["cpp", "C++", "cpp"],
  ["html", "HTML и CSS", "html"],
];
const problems = parseProblems(readFileSync(new URL("../desktop/shared/courses/problems.md", import.meta.url), "utf8"));
const courses = FILES.map(([id, name, lang]) => parseCourse(id, name, lang, readFileSync(new URL(`../desktop/shared/courses/${id}.md`, import.meta.url), "utf8")));

describe("курсы «Прокачки»", () => {
  it.each(courses.map((c) => [c.id, c] as const))("%s: уроки собраны полностью", (_id, c) => {
    expect(c.about.length).toBeGreaterThan(40);
    expect(c.lessons.length).toBeGreaterThanOrEqual(c.lang === "html" ? 16 : 26);
    expect(new Set(c.lessons.map((l) => l.module)).size).toBeGreaterThanOrEqual(4);
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
      expect(l.tasks.length, l.id).toBeGreaterThanOrEqual(c.lang === "html" ? 2 : 3);
      for (const [ti, t0] of l.tasks.entries()) {
      const id = `${l.id}#${ti + 1}`;
      expect(t0.solution.trim().length, id).toBeGreaterThan(5);
      expect(t0.hints.length, id).toBeGreaterThanOrEqual(1);
      expect(t0.text.length, id).toBeGreaterThan(20);
      if (c.lang === "html") expect(t0.checks.length, id).toBeGreaterThanOrEqual(1);
      else expect(t0.tests.length >= 2 || t0.tests[0]?.input === "", id).toBe(true);
      }
      expect(l.cards.length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  // Решения всех задач правда проходят свои тесты (где установлен язык), а заготовки — нет.
  const check = async (lang: "python" | "java" | "cpp", items: { id: string; t: Pick<CodeTask, "tests" | "solution" | "starter"> }[]) => {
    const tools = await detectTools();
    if (!hasRunner(tools, lang)) return;
    for (const { id, t } of items) {
      const res = await runCode(tools, lang, t.solution, t.tests.map((x) => x.input), 20000);
      if ("error" in res) throw new Error(res.error);
      res.forEach((r, i) => {
        expect(r.ok, `${id} тест ${i + 1}: ${r.stderr}`).toBe(true);
        expect(sameOutput(r.stdout, t.tests[i]!.output), `${id} тест ${i + 1}: получилось\n${r.stdout}\nожидалось\n${t.tests[i]!.output}`).toBe(true);
      });
      if (t.starter.trim()) {
        const st = await runCode(tools, lang, t.starter, t.tests.map((x) => x.input), 20000);
        if (!("error" in st)) expect(st.every((r, i) => r.ok && sameOutput(r.stdout, t.tests[i]!.output)), `${id}: заготовка уже проходит тесты`).toBe(false);
      }
    }
  };
  for (const c of courses.filter((x) => x.lang !== "html")) {
    it(`${c.id}: решения всех задач проходят тесты`, async () => {
      await check(
        c.lang as "python",
        c.lessons.flatMap((l) => l.tasks.map((t, i) => ({ id: `${l.id}#${i + 1}`, t }))),
      );
    }, 900_000);
  }

  it("задачник: задачи собраны и эталонные решения проходят тесты", async () => {
    expect(problems.length).toBeGreaterThanOrEqual(150);
    const ids = new Set(problems.map((p) => p.id));
    expect(ids.size).toBe(problems.length);
    for (const p of problems) {
      expect(p.text.length, p.id).toBeGreaterThan(30);
      expect(p.tests.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.hints.length, p.id).toBeGreaterThanOrEqual(1);
    }
    await check("python", problems.map((p) => ({ id: p.id, t: { tests: p.tests, solution: p.solution, starter: "" } })));
  }, 900_000);

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
