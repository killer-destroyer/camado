// ИИ управляет всем новым: деньги, сон, расписание, карточки, билеты — теми же обработчиками, что и кнопки.
import { describe, expect, it } from "vitest";
import { lifeHandlers } from "../desktop/main/life.js";
import { lifeTools } from "../desktop/main/lifeTools.js";
import type { CamadoCore } from "../src/core.js";
import { memoryStore } from "./helpers.js";

function rig() {
  const store = memoryStore();
  const core = { store, llm: {} } as unknown as CamadoCore;
  const life = lifeHandlers({
    core,
    withAi: async (fn) => fn(),
    dataDir: "/tmp",
    dbPath: () => "/tmp/x.db",
    dialog: {} as never,
    win: () => undefined,
    notify: () => undefined,
    send: () => undefined,
  });
  const acts: unknown[] = [];
  const tools = lifeTools({ handlers: life.handlers, core, timeZone: "Europe/Moscow", act: (a) => acts.push(a) });
  const run = (name: string, input: unknown) => tools.find((t) => t.name === name)!.run(input);
  const h = (name: string, ...a: unknown[]) => (life.handlers[name] as (...x: unknown[]) => unknown)(...a);
  return { store, run, h, acts };
}

describe("ИИ и новые разделы", () => {
  it("записывает несколько трат и приход за раз, считает «можно в день»", async () => {
    const r = rig();
    await r.run("money_setup", { income: { amount: 5000, day: 25 }, balance: 3000 });
    const out = await r.run("money_add", { items: [{ title: "кофе", amount: 250 }, { title: "такси", amount: 340 }, { title: "перевод от мамы", amount: 1000, income: true }] });
    expect(out).toMatch(/Записал 3/);
    expect(out).toMatch(/можно/);
    const m = (await r.h("money.get")) as { entries: { amount: number }[] };
    expect(m.entries.map((e) => e.amount)).toEqual([-250, -340, 1000]);
    const rep = await r.run("money_report", {});
    expect(rep).toMatch(/такси 340/);
    const id = /\[([0-9a-f-]{36})\] [^;]*такси/.exec(rep)![1]!;
    await r.run("money_remove", { ids: [id] });
    expect(((await r.h("money.get")) as { entries: unknown[] }).entries).toHaveLength(2);
  });

  it("вносит и убирает пары, меняет чётность и напоминание", async () => {
    const r = rig();
    await r.run("schedule_edit", {
      add: [
        { weekday: 1, start: "9:50", end: "11:20", subject: "Математический анализ", room: "1404" },
        { weekday: 3, start: "13:30", end: "15:00", subject: "Физика", weeks: "odd" },
      ],
      remind_minutes: 10,
    });
    let s = (await r.h("schedule.get")) as { classes: { subject: string }[]; remindMin: number; oddMonday: string };
    expect(s.classes).toHaveLength(2);
    expect(s.remindMin).toBe(10);
    const odd = s.oddMonday;
    await r.run("schedule_edit", { remove: [{ subject: "Мат. анализ" }], flip_parity: true });
    s = (await r.h("schedule.get")) as typeof s;
    expect(s.classes.map((c) => c.subject)).toEqual(["Физика"]);
    expect(s.oddMonday).not.toBe(odd);
    expect(await r.run("schedule_list", {})).toMatch(/чётная|нечётная/);
  });

  it("сон, карточки, билеты и пересчёт текста", async () => {
    const r = rig();
    expect(await r.run("energy_log", { sleep: 5, energy: 2, peak: "evening" })).toMatch(/вечером/);
    expect(await r.run("cards", { add: [{ q: "Что такое производная?", a: "Предел отношения приращений", subject: "Матан" }] })).toMatch(/Добавил карточек: 1/);
    const id = r.store.saveExam({ subject: "Матан", title: "Экзамен", at: new Date(Date.now() + 86400e3).toISOString() });
    r.store.setTickets(id, ["Предел", "Производная"]);
    expect(await r.run("ticket_status", { exam_id: id, tickets: [{ num: 2, status: "known" }] })).toMatch(/1/);
    expect(r.store.listExams()[0]!.tickets[1]!.status).toBe("known");
    await r.run("lyrics_words", {});
    expect(r.acts).toEqual([{ type: "words-redo" }]);
  });
});
