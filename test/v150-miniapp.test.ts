// 1.5.0: мини-приложение в Telegram — снимок данных в ссылке, действия со страницы.
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { encodeSnapshot, miniAppUrl, miniSnapshot, parseMiniAction, type MiniSnapshot } from "../src/miniapp.js";
import { memoryStore } from "./helpers.js";

const decode = (enc: string) => JSON.parse(inflateRawSync(Buffer.from(enc, "base64url")).toString("utf8")) as MiniSnapshot;

describe("мини-приложение", () => {
  it("снимок: ближайшие задания, экзамены с готовностью, ссылки, пары и деньги", () => {
    const s = memoryStore();
    s.addTask({ subject: "Матан", title: "№5–12", kind: "homework", dueAt: "2026-11-07T09:00:00Z" });
    s.addTask({ subject: "Физика", title: "Лаба 3", kind: "lab", dueAt: "2026-11-06T09:00:00Z" });
    const ex = s.saveExam({ title: "Матан", subject: "Матан", at: "2026-11-20T07:00:00Z" });
    s.setTickets(ex, ["a", "b"]);
    s.setTicketStatus(s.listExams()[0]!.tickets[0]!.id, "known");
    s.saveLink({ title: "Zoom матан", url: "https://zoom.us/j/1", subject: "Матан" });
    const snap = miniSnapshot(s, "Europe/Moscow", { money: { perDay: 500, spentToday: 120 }, classes: [{ start: "a", end: "b", subject: "Матан" }] }, new Date("2026-11-05T12:00:00Z"));
    expect(snap.t.map((t) => t[2])).toEqual(["Лаба 3", "№5–12"]);
    expect(snap.e).toEqual([["Матан", "2026-11-20T07:00:00Z", 50]]);
    expect(snap.l).toEqual([["Zoom матан", "https://zoom.us/j/1"]]);
    const url = miniAppUrl("https://x.github.io/camado-/miniapp/", snap);
    expect(url).toMatch(/^https:\/\/x\.github\.io\/camado-\/miniapp\/#d=[\w-]+$/);
    expect(decode(url.split("#d=")[1]!)).toEqual(snap);
  });

  it("длинный список не раздувает ссылку", () => {
    const s = memoryStore();
    for (let i = 0; i < 40; i++) s.addTask({ subject: `Предмет ${i}`, title: `Очень длинное задание номер ${i} с подробным описанием, что сделать и как сдать ${Math.random()}`, kind: "homework", dueAt: null });
    const enc = encodeSnapshot(miniSnapshot(s, "UTC"), 1500);
    expect(enc.length).toBeLessThanOrEqual(1500);
    expect(decode(enc).t.length).toBeGreaterThan(0);
  });

  it("со страницы — только известные действия", () => {
    expect(parseMiniAction('{"a":"done","id":7}')).toEqual({ a: "done", id: 7 });
    expect(parseMiniAction('{"a":"spend","text":" кофе 250 "}')).toEqual({ a: "spend", text: "кофе 250" });
    expect(parseMiniAction('{"a":"add","text":"матан №5 к пятнице"}')).toEqual({ a: "add", text: "матан №5 к пятнице" });
    expect(parseMiniAction('{"a":"delete_all"}')).toBeUndefined();
    expect(parseMiniAction('{"a":"done","id":-1}')).toBeUndefined();
    expect(parseMiniAction("не json")).toBeUndefined();
  });
});
