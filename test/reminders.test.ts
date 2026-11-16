import { describe, expect, it } from "vitest";
import { dueReminders, morningDigest } from "../src/reminders.js";
import type { Task } from "../src/store.js";

const H = 60 * 60 * 1000;
const now = new Date("2026-11-05T15:00:00Z");

function task(id: number, hoursLeft: number | null, extra: Partial<Task> = {}): Task {
  return {
    id,
    subject: "Матан",
    title: `задание ${id}`,
    details: null,
    kind: "homework",
    dueAt: hoursLeft === null ? null : new Date(now.getTime() + hoursLeft * H).toISOString(),
    status: "todo",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...extra,
  };
}

const nothingSent = () => false;

describe("dueReminders", () => {
  it("ДЗ: за сутки и за 3 часа, но не раньше", () => {
    expect(dueReminders([task(1, 30)], now, nothingSent)).toHaveLength(0);
    expect(dueReminders([task(1, 20)], now, nothingSent).map((r) => r.rule.id)).toEqual(["24h"]);
    expect(dueReminders([task(1, 2)], now, nothingSent).map((r) => r.rule.id)).toEqual(["3h"]);
  });

  it("контрольные напоминаются ещё и за 3 дня", () => {
    expect(dueReminders([task(1, 60, { kind: "test" })], now, nothingSent).map((r) => r.rule.id)).toEqual(["3d"]);
    expect(dueReminders([task(1, 60)], now, nothingSent)).toHaveLength(0);
  });

  it("если подходят сразу несколько правил — шлём только самое срочное", () => {
    const [r] = dueReminders([task(1, 2, { kind: "exam" })], now, nothingSent);
    expect(r!.rule.id).toBe("3h");
    expect(r!.skipped.map((s) => s.id)).toEqual(["3d", "24h"]);
  });

  it("не повторяет отправленное и пропускает сданное, просроченное и без срока", () => {
    const sent = (id: number, rule: string) => id === 1 && rule === "24h";
    const tasks = [task(1, 20), task(2, 20, { status: "done" }), task(3, -1), task(4, null)];
    expect(dueReminders(tasks, now, sent)).toHaveLength(0);
  });
});

describe("morningDigest", () => {
  it("раскладывает по срочности", () => {
    const tz = "America/New_York"; // сейчас 10:00 по Нью-Йорку
    const text = morningDigest(
      [task(1, -2, { title: "просрочка" }), task(2, 5, { title: "сегодня" }), task(3, 40, { title: "скоро" }), task(4, 200)],
      now,
      tz,
    );
    expect(text).toContain("Просрочено:\n#1");
    expect(text).toContain("Сегодня:\n#2");
    expect(text).toContain("Ближайшие 3 дня:\n#3");
    expect(text).not.toContain("#4");
  });

  it("пусто — так и говорит", () => {
    expect(morningDigest([], now, "UTC")).toContain("сроков нет");
  });
});
