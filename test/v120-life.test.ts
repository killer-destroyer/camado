// 1.2.0: деньги, сон и энергия, расписание, автораскладка с парами, резервная копия.
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { autoPlan } from "../desktop/shared/autoplan.js";
import {
  avgSleep,
  classesOn,
  classesToRemind,
  defaultOddMonday,
  energyAdvice,
  moneySummary,
  nextClass,
  nextMonthDay,
  parseMoney,
  sameSubjectLoose,
  weekParity,
  type ScheduleState,
} from "../desktop/shared/life.js";
import { cleanClass } from "../src/camado/extras.js";
import { applyPendingRestore } from "../desktop/main/life.js";
import { memoryStore } from "./helpers.js";

describe("деньги", () => {
  it("понимает траты и приходы, но не путает с заданиями", () => {
    expect(parseMoney("кофе 250")).toEqual({ amount: -250, title: "кофе" });
    expect(parseMoney("250 кофе")).toEqual({ amount: -250, title: "кофе" });
    expect(parseMoney("такси 340,5 р")).toEqual({ amount: -340.5, title: "такси" });
    expect(parseMoney("+5000 стипендия")).toEqual({ amount: 5000, title: "стипендия" });
    expect(parseMoney("стипендия 5000")).toEqual({ amount: 5000, title: "стипендия" });
    expect(parseMoney("обед в столовой 420₽")).toEqual({ amount: -420, title: "обед в столовой" });
    expect(parseMoney("Матан | №5-12 | завтра 18:00")).toBeUndefined();
    expect(parseMoney("дз по физике 12")).toBeUndefined();
    expect(parseMoney("лаба 3")).toBeUndefined();
    expect(parseMoney("в 18:00 позвонить")).toBeUndefined();
    expect(parseMoney("купить 2 хлеба 60")).toBeUndefined();
    expect(parseMoney("привет")).toBeUndefined();
  });

  it("считает, сколько можно в день до стипендии, с подписками", () => {
    const now = new Date(2026, 10, 10, 15); // 10 ноября
    const s = moneySummary(
      {
        entries: [
          { id: "1", at: new Date(2026, 10, 10, 9).toISOString(), amount: -300, title: "кофе" },
          { id: "2", at: new Date(2026, 10, 2, 9).toISOString(), amount: -700, title: "продукты" },
          { id: "3", at: new Date(2026, 9, 30).toISOString(), amount: -5000, title: "прошлый месяц" },
        ],
        subs: [
          { id: "a", name: "Музыка", amount: 199, day: 15 },
          { id: "b", name: "Связь", amount: 500, day: 28 },
        ],
        income: { amount: 5000, day: 25, name: "Стипендия" },
        balance: { amount: 3800, at: new Date(2026, 10, 10, 8).toISOString() },
      },
      now,
    );
    expect(s.spentToday).toBe(300);
    expect(s.spentMonth).toBe(1000);
    expect(s.balance).toBe(3500);
    expect(s.daysLeft).toBe(15);
    expect(s.subsBefore).toBe(199); // связь 28-го — уже после стипендии
    expect(s.perDay).toBe(Math.floor((3500 - 199) / 15));
  });

  it("ближайшее число месяца: 31-е в коротком месяце — последний день", () => {
    expect(nextMonthDay(31, new Date(2026, 1, 3)).getDate()).toBe(28);
    expect(nextMonthDay(5, new Date(2026, 10, 10)).getMonth()).toBe(11);
    expect(nextMonthDay(10, new Date(2026, 10, 10, 18)).getDate()).toBe(10);
  });
});

describe("сон и энергия", () => {
  const log = [
    { date: "2026-11-08", sleep: 5, energy: 2 },
    { date: "2026-11-09", sleep: 6, energy: 3 },
    { date: "2026-11-10", sleep: 5.5, energy: 2 },
  ];
  it("предупреждает о недосыпе перед экзаменом", () => {
    expect(avgSleep(log, "2026-11-10")).toBeCloseTo(5.5);
    const a = energyAdvice(log, "2026-11-10", [{ title: "Матан", days: 1 }]);
    expect(a?.tone).toBe("warn");
    expect(a?.text).toMatch(/завтра/);
  });
  it("мало сил — лёгкое, бодрый — тяжёлое", () => {
    expect(energyAdvice(log, "2026-11-10", [])?.tone).toBe("low");
    expect(energyAdvice([{ date: "2026-11-10", sleep: 8, energy: 5 }], "2026-11-10", [])?.text).toMatch(/тяжёлого/);
    expect(energyAdvice([], "2026-11-10", [])).toBeUndefined();
  });
});

describe("расписание пар", () => {
  const s: ScheduleState = {
    oddMonday: "2026-09-01",
    remindMin: 15,
    classes: [
      { weekday: 2, start: "09:50", end: "11:20", subject: "Математический анализ", room: "1404", weeks: "all" },
      { weekday: 2, start: "11:40", end: "13:10", subject: "Физика", weeks: "odd" },
      { weekday: 2, start: "11:40", end: "13:10", subject: "Английский", weeks: "even" },
    ],
  };
  it("чётные и нечётные недели", () => {
    expect(weekParity(new Date(2026, 8, 3), s.oddMonday)).toBe("odd");
    expect(weekParity(new Date(2026, 8, 9), s.oddMonday)).toBe("even");
    expect(classesOn(new Date(2026, 8, 1), s).map((c) => c.subject)).toEqual(["Математический анализ", "Физика"]);
    expect(classesOn(new Date(2026, 8, 8), s).map((c) => c.subject)).toEqual(["Математический анализ", "Английский"]);
    expect(defaultOddMonday(new Date(2026, 10, 7))).toBe("2026-08-31");
  });
  it("ближайшая пара и напоминание за 15 минут", () => {
    const tue = new Date(2026, 8, 1, 9, 35);
    expect(nextClass(tue, s)?.subject).toBe("Математический анализ");
    expect(classesToRemind(tue, s).map((c) => c.subject)).toEqual(["Математический анализ"]);
    expect(classesToRemind(new Date(2026, 8, 1, 9, 30), s)).toEqual([]);
    expect(nextClass(new Date(2026, 8, 1, 14), s)?.startAt.getDate()).toBe(8);
  });
  it("пары из ИИ проверяются", () => {
    expect(cleanClass({ weekday: 1, start: "9:50", end: "11:20", subject: "Матан", weeks: "all" })?.start).toBe("09:50");
    expect(cleanClass({ weekday: 9, start: "09:00", end: "10:00", subject: "x", weeks: "all" })).toBeUndefined();
    expect(cleanClass({ weekday: 1, start: "11:00", end: "10:00", subject: "x", weeks: "all" })).toBeUndefined();
    expect(cleanClass({ weekday: 1, start: "10:00", end: "11:00", subject: "x", weeks: "bogus" as never })?.weeks).toBe("all");
  });
  it("предмет из расписания узнаётся в заданиях", () => {
    expect(sameSubjectLoose("Мат. анализ", "Математический анализ")).toBe(true);
    expect(sameSubjectLoose("Физика", "Английский")).toBe(false);
  });
});

describe("автораскладка: пары заняты, тяжёлое — на бодрые часы", () => {
  const week = new Date(2026, 8, 7); // понедельник
  const tasks = [{ id: 1, title: "Лаба", subject: "Физика", kind: "lab", dueAt: new Date(2026, 8, 12, 12).toISOString() }];
  it("не ставит на время пары", () => {
    const busy: [number, number][] = [[new Date(2026, 8, 7, 16).getTime(), new Date(2026, 8, 7, 18).getTime()]];
    const out = autoPlan(tasks, [], week, new Date(2026, 8, 7, 8), 60, { busy });
    expect(out.length).toBeGreaterThan(0);
    for (const b of out) {
      const s = new Date(b.startAt).getTime();
      expect(s >= busy[0]![1] || s + b.minutes * 60e3 <= busy[0]![0]).toBe(true);
    }
  });
  it("тяжёлое — утром, если голова лучше работает утром", () => {
    const out = autoPlan(tasks, [], week, new Date(2026, 8, 7, 8), 60, { peak: [9, 13] });
    expect(new Date(out[0]!.startAt).getHours()).toBeLessThan(13);
  });
});

describe("резервная копия", () => {
  it("копия базы — целый файл, а «вернуть копию» подменяет базу до открытия", () => {
    const dir = mkdtempSync(join(tmpdir(), "camado-bk-"));
    const store = memoryStore();
    store.setKv("x", "1");
    const copy = join(dir, "copy.db");
    store.backupTo(copy);
    expect(existsSync(copy)).toBe(true);
    const db = join(dir, "camado.db");
    writeFileSync(db, "old");
    writeFileSync(`${db}.restore`, "new");
    expect(applyPendingRestore(db)).toBe(true);
    expect(existsSync(`${db}.before-restore`)).toBe(true);
    expect(existsSync(`${db}.restore`)).toBe(false);
    expect(applyPendingRestore(db)).toBe(false);
  });
});
