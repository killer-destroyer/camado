// 1.4.0: файлы — выгрузка учебного чата Telegram (zip с result.json или messages.html), Word, текст.
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { chunkMessages, importDocument, parseExportHtml, readDocument, usefulMessages, usefulScore } from "../src/camado/docs.js";

const json = {
  name: "Учебная группа",
  messages: [
    { id: 1, type: "service", action: "join_group_by_link", date_unixtime: "1762500000" },
    { id: 2, type: "message", from: "Аня", date_unixtime: "1762500100", text: "ахахах" },
    { id: 3, type: "message", from: "Аня", date_unixtime: "1762500200", text: "+" },
    { id: 4, type: "message", from: "Староста", date_unixtime: "1762500300", text: ["ДЗ по матану: №5–12, сдать до 14.11 в ", { type: "text_link", text: "форму", href: "https://forms.example.com/a" }] },
    { id: 5, type: "message", from: "Староста", date_unixtime: "1762500400", text: "Экзамен по линалу 25 декабря в 10:00, ауд. 1404. Билеты — https://docs.example.com/b" },
    { id: 6, type: "message", from: "Петя", date_unixtime: "1762500500", text: "кто идёт в столовку" },
    { id: 7, type: "message", from: "Староста", date_unixtime: "1762500600", text: "ДЗ по матану: №5–12, сдать до 14.11 в форму", forwarded_from: "Преподаватель" },
    { id: 8, type: "message", from: "Бот-спамер", date_unixtime: "1762500700", text: "ДЗ по матану: №5–12, сдать до 14.11 в форму", forwarded_from: "Преподаватель" },
  ],
};

const html = `<html><body><div class="page_header"><div class="text bold">Учебная группа</div></div>
<div class="message default clearfix" id="message4"><div class="body"><div class="pull_right date details" title="07.11.2026 16:49:12 UTC+03:00">16:49</div>
<div class="from_name">Староста</div><div class="text">Лаба 2 по проге до 20.11, репозиторий <a href="https://github.com/example/lab2">тут</a></div></div></div>
<div class="message default clearfix joined" id="message5"><div class="body"><div class="pull_right date details" title="07.11.2026 16:50:00 UTC+03:00">16:50</div>
<div class="text">ахах</div></div></div>
<div class="message default clearfix" id="message6"><div class="body"><div class="pull_right date details" title="07.11.2026 17:00:00 UTC+03:00">17:00</div>
<div class="from_name">Петя</div><div class="forwarded body"><div class="from_name">Преподаватель <span class="date details">07.11.2026</span></div><div class="text">Контрольная по физике перенесена на понедельник, 9:50, ауд. 304</div></div></div></div>
</body></html>`;

describe("файлы: выгрузка чата", () => {
  it("zip с result.json: текст, ссылки из слов, авторы, даты", () => {
    const zip = zipSync({ "ChatExport/result.json": strToU8(JSON.stringify(json)), "ChatExport/photos/1.jpg": new Uint8Array([1, 2, 3]) });
    const r = readDocument("ChatExport.zip", zip);
    expect(r.kind).toBe("chat");
    if (r.kind !== "chat") return;
    expect(r.chat.name).toBe("Учебная группа");
    expect(r.chat.messages).toHaveLength(7);
    const dz = r.chat.messages.find((m) => m.text.startsWith("ДЗ"))!;
    expect(dz.links).toEqual(["https://forms.example.com/a"]);
    expect(dz.at).toMatch(/^2025-|^2026-/);
    // спам и болтовня — мимо, одинаковые объявления — один раз
    const useful = usefulMessages(r.chat.messages);
    expect(useful.map((m) => m.text.slice(0, 12))).toEqual(["ДЗ по матану", "Экзамен по л", "ДЗ по матану"]);
    expect(usefulScore({ from: "x", text: "кто идёт в столовку", links: [] })).toBeLessThan(3);
  });

  it("zip с messages.html: пересланное от преподавателя и ссылки", () => {
    const r = readDocument("export.zip", zipSync({ "ChatExport/messages.html": strToU8(html) }));
    expect(r.kind).toBe("chat");
    if (r.kind !== "chat") return;
    expect(r.chat.messages.map((m) => m.from)).toEqual(["Староста", "Староста", "Петя"]);
    expect(r.chat.messages[0]!.links).toEqual(["https://github.com/example/lab2"]);
    expect(r.chat.messages[2]!.forwarded).toBe("Преподаватель");
    expect(new Date(r.chat.messages[0]!.at!).toISOString()).toBe("2026-11-07T13:49:12.000Z");
    expect(usefulMessages(r.chat.messages)).toHaveLength(2);
    expect(parseExportHtml(["<html></html>"])).toBeUndefined();
  });

  it("Word и текст", () => {
    const docx = zipSync({ "word/document.xml": strToU8('<w:document><w:body><w:p><w:r><w:t>Лаба 3 до 1 декабря</w:t></w:r></w:p><w:p><w:r><w:t>Вторая строка</w:t></w:r></w:p></w:body></w:document>') });
    const r = readDocument("задание.docx", docx);
    expect(r).toEqual({ kind: "text", text: "Лаба 3 до 1 декабря\nВторая строка" });
    expect(readDocument("a.txt", strToU8("привет")).kind).toBe("text");
    expect(readDocument("a.pdf", strToU8("%PDF-1.7 ...")).kind).toBe("pdf");
  });

  it("разбор целиком: части уходят Камадо как чужие данные, просьба — отдельно", async () => {
    const calls: { text: string; forwardedFrom?: string; ownerNote?: string }[] = [];
    const progress: string[] = [];
    const report = await importDocument(
      { handle: async (m) => (calls.push(m), "Записал: 1 задание, 2 ссылки"), timeZone: "Europe/Moscow", progress: (t) => void progress.push(t) },
      { name: "ChatExport.zip", data: zipSync({ "result.json": strToU8(JSON.stringify(json)) }), caption: "раскидай по напоминаниям" },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.forwardedFrom).toMatch(/выгрузка чата «Учебная группа»/);
    expect(calls[0]!.ownerNote).toMatch(/add_task/);
    expect(calls[0]!.ownerNote).toMatch(/раскидай по напоминаниям/);
    expect(calls[0]!.text).toMatch(/https:\/\/forms\.example\.com\/a/);
    expect(calls[0]!.text).not.toMatch(/столовку|ахах/);
    expect(report).toMatch(/из 7 сообщений полезных 3/);
    expect(progress[0]).toMatch(/Открыл/);
  });

  it("большой чат режется на части", () => {
    const many = Array.from({ length: 400 }, (_, i) => ({ from: "x", text: `ДЗ №${i}: решить задачи ${"а".repeat(200)} до ${(i % 28) + 1}.12`, links: [] }));
    const parts = chunkMessages(usefulMessages(many), "Europe/Moscow", 24_000);
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(24_000 + 400);
  });
});
