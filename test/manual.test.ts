import { describe, expect, it } from "vitest";
import { parseDue, parseTaskArgs } from "../src/manual.js";

const TZ = "America/New_York";
// Четверг, 5 ноября 2026, 10:00 по Нью-Йорку (UTC−5).
const now = new Date("2026-11-05T15:00:00Z");

describe("parseDue", () => {
  it("дата без времени — до 23:59 по местному", () => {
    expect(parseDue("07.11", now, TZ)?.toISOString()).toBe("2026-11-08T04:59:00.000Z");
  });

  it("дата со временем и годом", () => {
    expect(parseDue("7.11.2026 18:00", now, TZ)?.toISOString()).toBe("2026-11-07T23:00:00.000Z");
    expect(parseDue("07.11.26 9:30", now, TZ)?.toISOString()).toBe("2026-11-07T14:30:00.000Z");
  });

  it("сегодня, завтра, послезавтра", () => {
    expect(parseDue("сегодня", now, TZ)?.toISOString()).toBe("2026-11-06T04:59:00.000Z");
    expect(parseDue("Завтра 18:00", now, TZ)?.toISOString()).toBe("2026-11-06T23:00:00.000Z");
    expect(parseDue("послезавтра", now, TZ)?.toISOString()).toBe("2026-11-08T04:59:00.000Z");
  });

  it("прошедшая дата без года — это следующий год", () => {
    expect(parseDue("10.09", now, TZ)?.toISOString()).toBe("2027-09-11T03:59:00.000Z");
  });

  it("летнее время учитывается", () => {
    // 1 июля в Нью-Йорке UTC−4.
    expect(parseDue("01.07.2027 12:00", now, TZ)?.toISOString()).toBe("2027-07-01T16:00:00.000Z");
  });

  it("не дата — undefined", () => {
    for (const s of ["31.02", "13.13", "07.11 25:00", "пятница", "№5-12", ""]) {
      expect(parseDue(s, now, TZ), s).toBeUndefined();
    }
  });
});

describe("parseTaskArgs", () => {
  it("предмет | что | срок", () => {
    expect(parseTaskArgs("Матан | №5–12 | 07.11", now, TZ)).toEqual({
      subject: "Матан",
      title: "№5–12",
      dueAt: "2026-11-08T04:59:00.000Z",
    });
  });

  it("что | срок и предмет | что различаются по дате", () => {
    expect(parseTaskArgs("прочитать главу 2 | завтра", now, TZ)).toEqual({
      title: "прочитать главу 2",
      dueAt: "2026-11-07T04:59:00.000Z", // завтра, 6 ноября 23:59 по Нью-Йорку
    });
    expect(parseTaskArgs("Физика | лаба 3", now, TZ)).toEqual({ subject: "Физика", title: "лаба 3" });
  });

  it("одно поле — просто задание без срока", () => {
    expect(parseTaskArgs("  выучить билеты  ", now, TZ)).toEqual({ title: "выучить билеты" });
  });

  it("понятные ошибки", () => {
    expect(parseTaskArgs("Матан | №5 | в пятницу", now, TZ)).toEqual({
      error: expect.stringContaining("не понял срок «в пятницу»"),
    });
    expect(parseTaskArgs("a | b | c | d", now, TZ)).toHaveProperty("error");
    expect(parseTaskArgs(" | ", now, TZ)).toHaveProperty("error");
  });
});
