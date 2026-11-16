import { describe, expect, it } from "vitest";
import { focusStreak, levelOf, unlocked } from "../desktop/shared/achievements.js";

const day = (offset: number, hour = 15) => {
  const d = new Date(2026, 10, 10, hour);
  d.setDate(d.getDate() - offset);
  return d.toISOString();
};

describe("ачивки", () => {
  it("серия считается от сегодня (или вчера)", () => {
    const now = new Date(2026, 10, 10, 20);
    expect(focusStreak([day(0), day(1), day(2), day(4)].map((startedAt) => ({ minutes: 25, startedAt })), now)).toBe(3);
    expect(focusStreak([day(1), day(2)].map((startedAt) => ({ minutes: 25, startedAt })), now)).toBe(2);
    expect(focusStreak([day(3)].map((startedAt) => ({ minutes: 25, startedAt })), now)).toBe(0);
  });

  it("открываются по делам: ночная сова, сдал в последний час, серия", () => {
    const now = new Date(2026, 10, 10, 20);
    const due = new Date(2026, 10, 9, 23, 59).toISOString();
    const got = unlocked(
      {
        focus: [{ minutes: 25, startedAt: day(0, 23) }, { minutes: 25, startedAt: day(1) }, { minutes: 25, startedAt: day(2) }],
        done: [{ dueAt: due, doneAt: new Date(2026, 10, 9, 23, 30).toISOString() }],
        plays: 3,
        links: 0,
        cardsReviewed: 0,
      },
      now,
    );
    expect(got).toEqual(expect.arrayContaining(["first_focus", "night", "streak3", "clutch"]));
    expect(got).not.toContain("focus10h");
  });

  it("уровень растёт с опытом", () => {
    expect(levelOf({ focus: [], done: [], plays: 0, links: 0, cardsReviewed: 0 }).level).toBe(1);
    expect(levelOf({ focus: [{ minutes: 600, startedAt: day(0) }], done: [], plays: 0, links: 0, cardsReviewed: 0 }).level).toBeGreaterThan(3);
  });
});
