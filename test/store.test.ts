import { describe, expect, it } from "vitest";
import { memoryStore } from "./helpers.js";

describe("Store", () => {
  it("хранит задания и сортирует по сроку, без срока — в конце", () => {
    const s = memoryStore();
    s.addTask({ title: "без срока" });
    s.addTask({ title: "позже", dueAt: "2026-11-10T04:59:00.000Z" });
    s.addTask({ title: "раньше", subject: "Матан", dueAt: "2026-11-07T04:59:00.000Z" });

    expect(s.listTasks().map((t) => t.title)).toEqual(["раньше", "позже", "без срока"]);
    expect(s.listTasks()[0]).toMatchObject({ subject: "Матан", kind: "homework", status: "todo" });
  });

  it("закрытые задания скрыты по умолчанию", () => {
    const s = memoryStore();
    const t = s.addTask({ title: "лаба" });
    s.updateTask(t.id, { status: "done" });
    expect(s.listTasks()).toHaveLength(0);
    expect(s.listTasks({ includeClosed: true })).toHaveLength(1);
  });

  it("перенос срока сбрасывает отправленные напоминания", () => {
    const s = memoryStore();
    const t = s.addTask({ title: "лаба", dueAt: "2026-11-06T00:00:00.000Z" });
    expect(s.markReminderSent(t.id, "24h")).toBe(true);
    expect(s.markReminderSent(t.id, "24h")).toBe(false);

    s.updateTask(t.id, { status: "in_progress" });
    expect(s.wasReminderSent(t.id, "24h")).toBe(true);

    s.updateTask(t.id, { dueAt: "2026-11-09T00:00:00.000Z" });
    expect(s.wasReminderSent(t.id, "24h")).toBe(false);
  });

  it("карточка предмета дополняется, а не затирается", () => {
    const s = memoryStore();
    s.saveSubject({ name: "Физика", teacher: "Иванов И.И." });
    s.saveSubject({ name: "физика", info: "Сдавать в Moodle, только PDF" });
    expect(s.listSubjects()).toEqual([
      { id: 1, name: "Физика", teacher: "Иванов И.И.", info: "Сдавать в Moodle, только PDF" },
    ]);
  });

  it("память и история разговора", () => {
    const s = memoryStore();
    const f = s.remember("Не любит заниматься после 23:00");
    expect(s.listMemory()).toEqual([f]);
    expect(s.forget(f.id)).toBe(true);
    expect(s.forget(f.id)).toBe(false);

    for (let i = 1; i <= 5; i++) s.appendChat(i % 2 ? "user" : "assistant", `m${i}`);
    expect(s.recentChat(3).map((m) => m.content)).toEqual(["m3", "m4", "m5"]);
  });

  it("считает траты с начала периода", () => {
    let now = new Date("2026-10-31T12:00:00Z");
    const s = memoryStore(() => now);
    const u = { model: "m", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    s.recordUsage({ ...u, costUsd: 5 });
    now = new Date("2026-11-02T12:00:00Z");
    s.recordUsage({ ...u, costUsd: 1.5 });
    s.recordUsage({ ...u, costUsd: 0.25 });
    expect(s.spentSince(new Date("2026-11-01T00:00:00Z"))).toBeCloseTo(1.75);
  });
});
