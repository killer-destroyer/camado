import { describe, expect, it } from "vitest";
import { nextReview } from "../src/store.js";
import { memoryStore } from "./helpers.js";

describe("шаги заданий", () => {
  it("сохраняются по порядку, отмечаются, заменяются целиком", () => {
    const s = memoryStore();
    const t = s.addTask({ title: "Курсовая" });
    s.setSteps(t.id, ["Выбрать тему", " ", "Найти 5 источников", "Написать план"]);
    const steps = s.listSteps(t.id);
    expect(steps.map((x) => x.title)).toEqual(["Выбрать тему", "Найти 5 источников", "Написать план"]);
    s.toggleStep(steps[0]!.id);
    expect(s.listSteps(t.id)[0]!.done).toBe(true);
    s.setSteps(t.id, ["Одно"]);
    expect(s.listSteps(t.id)).toHaveLength(1);
  });
});

describe("карточки", () => {
  it("интервалы растут, «не помню» — завтра", () => {
    let c = { interval: 0, ease: 2.5, reps: 0 };
    c = nextReview(c, 2);
    expect(c.interval).toBe(2);
    c = nextReview(c, 2);
    expect(c.interval).toBe(5);
    c = nextReview(c, 2);
    expect(c.interval).toBeGreaterThan(10);
    const forgot = nextReview(c, 0);
    expect(forgot).toMatchObject({ interval: 1, reps: 0 });
    expect(forgot.ease).toBeLessThan(c.ease);
  });

  it("к повторению — только те, у кого подошёл срок", () => {
    const s = memoryStore();
    s.addCards([
      { question: "Предел?", answer: "Число, к которому…" },
      { question: "", answer: "пусто — не сохраняется" },
    ]);
    const [card] = s.listCards({ dueBefore: new Date(Date.now() + 1000) });
    expect(card!.question).toBe("Предел?");
    s.reviewCard(card!.id, 2);
    expect(s.listCards({ dueBefore: new Date(Date.now() + 1000) })).toHaveLength(0);
    expect(s.listCards()).toHaveLength(1);
  });
});

describe("сессия", () => {
  it("билеты из списка с номерами, отметки переживают правку списка", () => {
    const s = memoryStore();
    const id = s.saveExam({ subject: "Матанализ", title: "Экзамен", at: "2027-01-20T09:00:00.000Z" });
    s.setTickets(id, ["1. Пределы", "2) Ряды", "Интегралы"]);
    let ex = s.listExams()[0]!;
    expect(ex.tickets.map((t) => [t.num, t.title])).toEqual([
      [1, "Пределы"],
      [2, "Ряды"],
      [3, "Интегралы"],
    ]);
    s.setTicketStatus(ex.tickets[0]!.id, "known");
    s.setTickets(id, ["1. Пределы", "2. Ряды", "3. Интегралы", "4. Производные"]);
    ex = s.listExams()[0]!;
    expect(ex.tickets[0]!.status).toBe("known");
    expect(ex.tickets).toHaveLength(4);
    s.deleteExam(id);
    expect(s.listExams()).toEqual([]);
  });
});

describe("планировщик", () => {
  it("блоки на неделю, длина в разумных пределах", () => {
    const s = memoryStore();
    const id = s.savePlanBlock({ title: "Матан", startAt: "2026-11-09T15:00:00.000Z", minutes: 5 });
    s.savePlanBlock({ title: "Далеко", startAt: "2026-12-09T15:00:00.000Z", minutes: 60 });
    const week = s.listPlan(new Date("2026-11-09T00:00:00Z"), new Date("2026-11-16T00:00:00Z"));
    expect(week).toHaveLength(1);
    expect(week[0]!.minutes).toBe(15);
    s.deletePlanBlock(id);
    expect(s.listPlan(new Date("2026-11-09T00:00:00Z"), new Date("2026-11-16T00:00:00Z"))).toEqual([]);
  });
});
