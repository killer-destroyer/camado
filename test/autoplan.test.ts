import { describe, expect, it } from "vitest";
import { autoPlan, weekStartOf } from "../desktop/shared/autoplan.js";

describe("автораскладка недели", () => {
  it("ставит задания в вечерние окна до срока, кусками, не налезая на занятое", () => {
    const week = weekStartOf(new Date(2026, 10, 9, 12)); // понедельник
    const now = new Date(2026, 10, 9, 8);
    const due = new Date(2026, 10, 11, 23, 59).toISOString(); // среда
    const busy = [{ taskId: null, title: "Пара", startAt: new Date(2026, 10, 9, 16).toISOString(), minutes: 60 }];
    const plan = autoPlan([{ id: 1, title: "Лаба", subject: "Физика", kind: "lab", dueAt: due }], busy, week, now);
    expect(plan.reduce((a, b) => a + b.minutes, 0)).toBe(120);
    for (const b of plan) {
      const s = new Date(b.startAt);
      expect(s.getTime()).toBeLessThan(new Date(due).getTime());
      expect(s.getHours()).toBeGreaterThanOrEqual(16);
      // не на занятом часе понедельника 16–17
      expect(!(s.getDate() === 9 && s.getHours() === 16)).toBe(true);
    }
    expect(plan[0]!.title).toBe("Физика: Лаба");
  });

  it("уже распланированное не дублирует", () => {
    const week = weekStartOf(new Date(2026, 10, 9));
    const plan = autoPlan(
      [{ id: 2, title: "ДЗ", subject: null, kind: "homework", dueAt: null }],
      [{ taskId: 2, title: "ДЗ", startAt: new Date(2026, 10, 10, 17).toISOString(), minutes: 60 }],
      week,
      new Date(2026, 10, 9, 8),
    );
    expect(plan).toEqual([]);
  });
});

describe("сессия: что учить сегодня", async () => {
  const { todaysTickets, progressOf } = await import("../desktop/shared/session.js");
  const mk = (n: number, status: "new" | "review" | "known") => ({ id: n, num: n, title: `Билет ${n}`, status, seenAt: null });
  it("сначала «не знаю», норма — чтобы успеть к экзамену", () => {
    const tickets = [mk(1, "known"), mk(2, "review"), mk(3, "new"), mk(4, "new"), mk(5, "new"), mk(6, "new")];
    const now = new Date(2026, 0, 10, 10);
    const today = todaysTickets(tickets, new Date(2026, 0, 15, 9), now);
    expect(today[0]!.status).toBe("new");
    expect(today.length).toBeGreaterThanOrEqual(2);
    // накануне экзамена — всё по кругу
    expect(todaysTickets(tickets, new Date(2026, 0, 10, 20), now)).toHaveLength(6);
    expect(progressOf(tickets)).toMatchObject({ known: 1, review: 1, fresh: 4 });
  });
});
