// 1.5.0: слежка за Google-таблицей — ссылка → CSV, разбор, что поменялось, фильтр по фамилии.
import { describe, expect, it } from "vitest";
import { changeMessage, checkSheet, colName, csvUrl, diffSheets, parseCsv, selectRows, type SheetWatch } from "../src/camado/sheets.js";
import { SheetsService, sheetTools } from "../desktop/main/sheets.js";
import { memoryStore } from "./helpers.js";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

const csv = (s: string) => new Response(s, { headers: { "content-type": "text/csv" } });

describe("таблицы", () => {
  it("ссылка → адрес CSV", () => {
    expect(csvUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=123`)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=123`);
    expect(csvUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`);
    expect(csvUrl("https://docs.google.com/spreadsheets/d/e/2PACX-1vXyz/pubhtml?gid=7")).toBe("https://docs.google.com/spreadsheets/d/e/2PACX-1vXyz/pub?output=csv&gid=7");
    expect(csvUrl("https://evil.example/spreadsheets/d/" + ID)).toBeUndefined();
    expect(csvUrl("не ссылка")).toBeUndefined();
  });

  it("CSV с кавычками и переносами", () => {
    expect(parseCsv('ФИО,Лаба 1,"Комментарий"\r\n"Петров, П.",5,"сдал ""досрочно""\nмолодец"\n')).toEqual([
      ["ФИО", "Лаба 1", "Комментарий"],
      ["Петров, П.", "5", 'сдал "досрочно"\nмолодец'],
    ]);
    expect(colName(0)).toBe("A");
    expect(colName(27)).toBe("AB");
  });

  it("понятные изменения по строкам и колонкам", () => {
    const header = ["ФИО", "Лаба 1", "Лаба 2"];
    const a = [
      ["Иванов", "5", ""],
      ["Петров", "4", ""],
    ];
    const b = [
      ["Иванов", "5", ""],
      ["Петров", "4", "5"],
      ["Сидоров", "3", ""],
    ];
    expect(diffSheets(a, b, header)).toEqual(["Петров · Лаба 2: — → 5", "Новая строка: Сидоров · 3"]);
    expect(diffSheets(b, a, header)).toContain("Убрали строку: Сидоров · 3");
  });

  it("фильтр «только мои строки» и заголовок не в первой строке", () => {
    const all = parseCsv("Ведомость,,\nФИО,Лаба 1,Лаба 2\nИванов,5,\nПетров Пётр,4,\n");
    const { header, rows } = selectRows(all, "петров");
    expect(header).toEqual(["ФИО", "Лаба 1", "Лаба 2"]);
    expect(rows).toEqual([["Петров Пётр", "4", ""]]);
  });

  it("первый раз запоминает, потом присылает изменения; закрытая таблица — понятная ошибка", async () => {
    let body = "ФИО,Лаба 1\nПетров,\nИванов,3\n";
    const f = (async () => csv(body)) as unknown as typeof fetch;
    const w: SheetWatch = { id: "1", name: "Оценки", url: `https://docs.google.com/spreadsheets/d/${ID}/edit`, match: "Петров", everyMin: 15, addedAt: "" };
    const r1 = await checkSheet(w, f);
    expect(r1.changes).toEqual([]);
    body = "ФИО,Лаба 1\nПетров,5\nИванов,4\n";
    const r2 = await checkSheet(r1.watch, f);
    expect(r2.changes).toEqual(["Петров · Лаба 1: — → 5"]); // Иванова не показываем — фильтр
    expect(changeMessage(r2.watch, r2.changes)).toMatch(/«Оценки»[\s\S]*Петров · Лаба 1: — → 5/);
    const closed = (async () => new Response("<html>login</html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    expect((await checkSheet(w, closed)).watch.error).toMatch(/доступ/);
  });

  it("служба: проверяет по расписанию, сообщает, ИИ управляет словами", async () => {
    let body = "ФИО,Очередь\nПетров,7\n";
    const sent: string[] = [];
    const svc = new SheetsService(
      memoryStore(),
      (m) => sent.push(m),
      () => undefined,
      (async () => csv(body)) as unknown as typeof fetch,
    );
    const tool = sheetTools(svc)[0]!;
    expect(await tool.run({ action: "add", url: `https://docs.google.com/spreadsheets/d/${ID}/edit`, name: "Очередь на сдачу", every_min: 5 })).toMatch(/Слежу за «Очередь на сдачу»/);
    body = "ФИО,Очередь\nПетров,3\n";
    await svc.tick(Date.now() + 6 * 60_000);
    expect(sent[0]).toMatch(/Петров · Очередь: 7 → 3/);
    await svc.tick(Date.now() + 7 * 60_000);
    expect(sent).toHaveLength(1);
    expect(await tool.run({ action: "list" })).toMatch(/последнее/);
    expect(await tool.run({ action: "add", url: "https://example.com" })).toMatch(/Google-таблиц/);
    expect(await tool.run({ action: "remove", name: "очередь" })).toMatch(/Больше не слежу/);
    expect(svc.list()).toHaveLength(0);
  });
});
