// Слежка за таблицами в программе: хранит список, сама проверяет по расписанию, сообщает об изменениях.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "../../src/store.js";
import { defineTool } from "../../src/llm/tool.js";
import type { ToolDef } from "../../src/llm/types.js";
import { changeMessage, checkSheet, csvUrl, type SheetWatch } from "../../src/camado/sheets.js";

const KV = "sheets";

export type SheetView = Omit<SheetWatch, "snapshot" | "header">;

export class SheetsService {
  private timer?: NodeJS.Timeout;
  private checking = new Set<string>();

  constructor(
    private store: Store,
    private onChange: (msg: string, w: SheetWatch) => void,
    private changed: () => void,
    private fetchImpl: typeof fetch = (i, o) => fetch(i, o),
  ) {}

  private all(): SheetWatch[] {
    try {
      const v = JSON.parse(this.store.getKv(KV) ?? "[]") as SheetWatch[];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  private save(list: SheetWatch[]): void {
    this.store.setKv(KV, JSON.stringify(list));
    this.changed();
  }

  list(): SheetView[] {
    return this.all().map(({ snapshot: _s, header: _h, ...w }) => w);
  }

  async add(input: { name?: string; url: string; match?: string; everyMin?: number }): Promise<SheetView | { error: string }> {
    const url = String(input.url ?? "").trim();
    if (!csvUrl(url)) return { error: "Нужна ссылка на Google-таблицу (docs.google.com/spreadsheets/…)" };
    const w: SheetWatch = {
      id: randomUUID(),
      name: (input.name?.trim() || "Таблица").slice(0, 80),
      url,
      match: input.match?.trim().slice(0, 80) || undefined,
      everyMin: Math.max(5, Math.min(24 * 60, Math.round(input.everyMin ?? 15))),
      addedAt: new Date().toISOString(),
    };
    this.save([...this.all(), w]);
    // первая проверка — запомнить, как таблица выглядит сейчас (ошибка доступа видна в списке)
    await this.check(w.id);
    return this.list().find((x) => x.id === w.id)!;
  }

  update(id: string, patch: { name?: string; match?: string; everyMin?: number }): SheetView | undefined {
    const list = this.all();
    const w = list.find((x) => x.id === id);
    if (!w) return undefined;
    if (patch.name !== undefined) w.name = patch.name.trim().slice(0, 80) || w.name;
    if (patch.match !== undefined) {
      w.match = patch.match.trim().slice(0, 80) || undefined;
      w.snapshot = undefined; // другой фильтр — сравнивать заново
    }
    if (patch.everyMin !== undefined) w.everyMin = Math.max(5, Math.min(24 * 60, Math.round(patch.everyMin)));
    this.save(list);
    return this.list().find((x) => x.id === id);
  }

  remove(id: string): boolean {
    const list = this.all();
    const next = list.filter((x) => x.id !== id);
    this.save(next);
    return next.length !== list.length;
  }

  /** Проверить сейчас. Вернёт изменения (или ошибку таблицы). */
  async check(id: string): Promise<{ changes: string[] } | { error: string } | undefined> {
    if (this.checking.has(id)) return { changes: [] };
    const w = this.all().find((x) => x.id === id);
    if (!w) return undefined;
    this.checking.add(id);
    try {
      const r = await checkSheet(w, this.fetchImpl);
      // пока качали, список могли поменять — сохраняем только эту таблицу
      const list = this.all();
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return undefined;
      list[i] = r.watch;
      this.save(list);
      if (r.changes.length) this.onChange(changeMessage(r.watch, r.changes), r.watch);
      return r.watch.error ? { error: r.watch.error } : { changes: r.changes };
    } finally {
      this.checking.delete(id);
    }
  }

  /** Раз в минуту смотрим, какие таблицы пора проверить. */
  start(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => void this.tick(), 60_000);
    setTimeout(() => void this.tick(), 20_000);
  }

  stop(): void {
    clearInterval(this.timer);
  }

  async tick(now = Date.now()): Promise<void> {
    for (const w of this.all()) {
      const last = w.lastCheck ? Date.parse(w.lastCheck) : 0;
      if (now - last >= w.everyMin * 60_000) await this.check(w.id).catch(() => undefined);
    }
  }
}

/** Инструмент для ИИ: «следи за таблицей оценок, моя фамилия Петров». */
export function sheetTools(s: SheetsService): ToolDef[] {
  return [
    defineTool({
      name: "sheet_watch",
      description:
        "Слежка за Google-таблицей (оценки, очередь на сдачу, рейтинг, расписание): Камадо сам периодически её смотрит и пишет хозяину, что поменялось. " +
        "add — начать следить (url, name, match — только строки с этим текстом, например фамилия хозяина; every_min — как часто, по умолчанию 15). " +
        "list — за чем слежу и последние изменения; check — проверить сейчас; remove — перестать (id из list). Таблица должна открываться по ссылке.",
      schema: z.object({
        action: z.enum(["add", "list", "check", "remove"]),
        url: z.string().optional(),
        name: z.string().optional(),
        match: z.string().optional(),
        every_min: z.number().optional(),
        id: z.string().optional(),
      }),
      run: async (i) => {
        if (i.action === "add") {
          if (!i.url) return "Нужна ссылка на таблицу.";
          const r = await s.add({ url: i.url, name: i.name, match: i.match, everyMin: i.every_min });
          if (!("id" in r)) return r.error;
          return r.error
            ? `Добавил «${r.name}», но открыть пока не смог: ${r.error}`
            : `Слежу за «${r.name}»${r.match ? ` (только строки с «${r.match}»)` : ""}, проверяю каждые ${r.everyMin} мин. Изменения пришлю.`;
        }
        if (i.action === "list") {
          const l = s.list();
          if (!l.length) return "Ни за одной таблицей не слежу.";
          return l
            .map((w) => {
              const last = w.recent?.[0];
              return `${w.id} · «${w.name}»${w.match ? ` [${w.match}]` : ""}, каждые ${w.everyMin} мин${w.error ? ` — ошибка: ${w.error}` : ""}${
                last ? `\n  последнее (${last.at.slice(0, 16).replace("T", " ")} UTC): ${last.lines.slice(0, 5).join("; ")}` : ""
              }`;
            })
            .join("\n");
        }
        const target = i.id ? s.list().find((w) => w.id === i.id) : i.name ? s.list().find((w) => w.name.toLowerCase().includes(i.name!.toLowerCase())) : s.list()[0];
        if (!target) return "Не нашёл такую таблицу — посмотри list.";
        if (i.action === "remove") return s.remove(target.id) ? `Больше не слежу за «${target.name}».` : "Не получилось.";
        const r = await s.check(target.id);
        if (!r) return "Не нашёл таблицу.";
        if ("error" in r) return `«${target.name}»: ${r.error}`;
        return r.changes.length ? `В «${target.name}» изменилось:\n${r.changes.slice(0, 15).join("\n")}` : `В «${target.name}» без изменений с прошлой проверки.`;
      },
    }),
  ];
}
