// 1.5.0: автопилот сессии — план по дням, готовность, «В план», вечерний экзаменатор.
import { describe, expect, it } from "vitest";
import { rangeText, readiness, sessionPlan, type SessionTicket } from "../desktop/shared/session.js";
import { autopilotTick, autopilotToPlan, autopilotTools, eveningMessage } from "../desktop/main/autopilot.js";
import { memoryStore } from "./helpers.js";

const T = (num: number, status: SessionTicket["status"] = "new"): SessionTicket => ({ id: num, num, title: `Билет ${num}`, status, seenAt: null });
const day = (d: number, h = 12) => new Date(2026, 10, d, h);

describe("план по билетам", () => {
  it("«не знаю» — два захода, «повторить» — один, накануне — всё", () => {
    const tickets = [T(1), T(2), T(3), T(4, "review"), T(5, "known")];
    const plan = sessionPlan(tickets, day(10, 10), day(5));
    // 5 дней: 4 рабочих + накануне
    expect(plan.at(-1)).toMatchObject({ offset: 4, kind: "final", nums: [1, 2, 3, 4] });
    const learn = plan.filter((p) => p.kind === "learn");
    const all = learn.flatMap((p) => p.nums);
    expect(all.filter((n) => n === 1)).toHaveLength(2); // дважды
    expect(all.filter((n) => n === 4)).toHaveLength(1);
    expect(all).not.toContain(5);
    expect(learn.flatMap((p) => p.again).sort()).toEqual([1, 2, 3]);
  });

  it("завтра экзамен — сегодня пробежать всё; экзамен прошёл — пусто", () => {
    expect(sessionPlan([T(1), T(2, "known")], day(6, 9), day(5))).toEqual([{ offset: 0, nums: [1], kind: "final", again: [] }]);
    expect(sessionPlan([T(1)], day(4), day(5))).toEqual([]);
  });

  it("готовность и темп", () => {
    const r = readiness([T(1, "known"), T(2, "review"), T(3), T(4)], day(15), day(5));
    expect(r.pct).toBe(38);
    expect(r.days).toBe(10);
    expect(r.verdict).toBe("успеваешь спокойно");
    expect(readiness(Array.from({ length: 60 }, (_, i) => T(i + 1)), day(9), day(5)).verdict).toMatch(/много/);
    expect(rangeText([7, 1, 2, 3, 5, 8])).toBe("1–3, 5, 7–8");
  });
});

describe("автопилот в программе", () => {
  const TZ = "Europe/Moscow";
  const now = new Date("2026-11-05T09:00:00Z"); // 12:00 по Москве

  it("«В план» — по блоку в день, повторно — заменяет, а не дублирует", () => {
    const s = memoryStore(() => now);
    const id = s.saveExam({ title: "Матан", subject: "Матан", at: "2026-11-09T07:00:00Z" });
    s.setTickets(id, ["Предел", "Ряды", "Интегралы"]);
    const r = autopilotToPlan(s, id, { hour: 18, tz: TZ, now });
    expect(r).toEqual({ blocks: 4 });
    const blocks = s.listPlan(now, new Date("2026-11-10T00:00:00Z"));
    expect(blocks).toHaveLength(4);
    expect(blocks[0]!.startAt).toBe("2026-11-05T15:00:00.000Z"); // 18:00 МСК
    expect(blocks[0]!.title).toMatch(/^Сессия · Матан: билеты/);
    expect(blocks.at(-1)!.title).toMatch(/повторить всё/);
    autopilotToPlan(s, id, { hour: 19, tz: TZ, now });
    expect(s.listPlan(now, new Date("2026-11-10T00:00:00Z"))).toHaveLength(4);
    expect(autopilotToPlan(s, 999, { tz: TZ, now })).toEqual({ error: "Экзамен не найден" });
  });

  it("вечерний экзаменатор: раз в день, в свой час, только если есть что делать", () => {
    let t = now;
    const s = memoryStore(() => t);
    const id = s.saveExam({ title: "Физика", subject: "Физика", at: "2026-11-12T07:00:00Z" });
    s.setTickets(id, ["Кинематика", "Динамика", "Работа", "Импульс"]);
    const sent: string[] = [];
    const tick = (iso: string) => autopilotTick(s, { on: true, hour: 20, tz: TZ, now: new Date(iso), send: (m) => sent.push(m) });
    expect(tick("2026-11-05T15:30:00Z")).toBe(false); // 18:30 — рано
    expect(tick("2026-11-05T17:10:00Z")).toBe(true); // 20:10
    expect(sent[0]).toMatch(/Вечерний экзаменатор[\s\S]*«Физика» — через 7 дн\., готов на 0%\. На сегодня осталось: билеты 1/);
    expect(tick("2026-11-05T17:40:00Z")).toBe(false); // второй раз в тот же день — нет
    // назавтра всё на сегодня пройдено — молчит
    t = new Date("2026-11-06T10:00:00Z");
    const ex = s.listExams()[0]!;
    const plan = sessionPlan(ex.tickets, new Date(2026, 10, 12, 10), new Date(2026, 10, 6, 13));
    for (const n of plan[0]!.nums) s.setTicketStatus(ex.tickets.find((x) => x.num === n)!.id, "review");
    expect(eveningMessage(s, new Date("2026-11-06T17:05:00Z"), TZ)).toBeUndefined();
  });

  it("ИИ: статус и «разложи в план»", async () => {
    const s = memoryStore(() => now);
    const id = s.saveExam({ title: "Алгебра", subject: null, at: "2026-11-15T07:00:00Z" });
    s.setTickets(id, ["Группы", "Кольца"]);
    let changed = 0;
    const tool = autopilotTools(s, TZ, () => changed++, () => now)[0]!;
    expect(await tool.run({ action: "status" })).toMatch(/«Алгебра» \(id \d+\) через 10 дн\.: готов на 0%/);
    expect(await tool.run({ action: "to_plan" })).toMatch(/Разложил в «План»/);
    expect(changed).toBe(1);
  });
});
