// Слежка за Google-таблицей: Камадо сам раз в N минут смотрит таблицу (оценки, очередь на сдачу, рейтинг)
// и пишет, что поменялось — можно только в строках, где есть твоя фамилия.
// Таблица должна открываться по ссылке («Все, у кого есть ссылка» или «Опубликовать в интернете»).

export interface SheetWatch {
  id: string;
  name: string;
  url: string;
  /** Только строки, где есть этот текст (например, фамилия). Пусто — вся таблица. */
  match?: string;
  /** Как часто смотреть, минут. */
  everyMin: number;
  addedAt: string;
  lastCheck?: string;
  lastChange?: string;
  /** Последние изменения (новые сверху). */
  recent?: { at: string; lines: string[] }[];
  error?: string;
  /** Снимок таблицы (только нужные строки) для сравнения. */
  snapshot?: string[][];
  header?: string[];
}

/** Ссылка на таблицу → адрес выгрузки CSV нужного листа. */
export function csvUrl(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return undefined;
  }
  if (u.hostname !== "docs.google.com") return undefined;
  // опубликованная: /spreadsheets/d/e/<id>/pubhtml → /pub?output=csv
  const pub = u.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]+)/);
  const gid = u.searchParams.get("gid") ?? u.hash.match(/gid=(\d+)/)?.[1];
  if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=csv${gid ? `&gid=${gid}` : ""}`;
  const m = u.pathname.match(/^\/spreadsheets\/d\/([\w-]{20,})/);
  if (!m) return undefined;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

/** CSV → строки (кавычки, переносы внутри ячеек, "" внутри кавычек). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((x) => x.trim()));
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/** Колонка → буква, как в таблице: 0 → A, 27 → AB. */
export function colName(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Строка заголовков: первая, где заполнено больше половины ячеек. */
export function pickHeader(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const r = rows[i]!;
    const filled = r.filter(Boolean).length;
    if (filled >= 2 && filled >= r.length / 2) return i;
  }
  return 0;
}

/** Ключ строки: первая непустая ячейка из первых трёх (обычно ФИО или №), иначе номер строки. */
function rowKey(r: string[], i: number): string {
  const k = r.slice(0, 3).find((x) => x.trim());
  return k ? norm(k) : `#${i}`;
}

/** Что поменялось между снимками: понятные строки «Иванов · Лаба 3: — → 5». */
export function diffSheets(oldRows: string[][], newRows: string[][], header: string[]): string[] {
  const label = (r: string[]) => r.slice(0, 3).find((x) => x.trim()) ?? "";
  const colLabel = (c: number) => header[c]?.trim() || colName(c);
  const keyed = (rows: string[][]) => {
    const m = new Map<string, string[]>();
    rows.forEach((r, i) => {
      let k = rowKey(r, i);
      while (m.has(k)) k += "'";
      m.set(k, r);
    });
    return m;
  };
  const a = keyed(oldRows);
  const b = keyed(newRows);
  const out: string[] = [];
  for (const [k, r] of b) {
    const was = a.get(k);
    if (!was) {
      if (r.some(Boolean)) out.push(`Новая строка: ${r.filter(Boolean).slice(0, 6).join(" · ")}`);
      continue;
    }
    const n = Math.max(r.length, was.length);
    for (let c = 0; c < n; c++) {
      const x = was[c] ?? "";
      const y = r[c] ?? "";
      if (x !== y) out.push(`${label(r) || colName(c)} · ${colLabel(c)}: ${x || "—"} → ${y || "—"}`);
    }
  }
  for (const [k, r] of a) if (!b.has(k) && r.some(Boolean)) out.push(`Убрали строку: ${r.filter(Boolean).slice(0, 6).join(" · ")}`);
  return out;
}

/** Нужные строки таблицы (по фильтру) и заголовки. */
export function selectRows(all: string[][], match?: string): { header: string[]; rows: string[][] } {
  const h = pickHeader(all);
  const header = all[h] ?? [];
  const body = all.slice(h + 1);
  const m = match?.trim() ? norm(match) : "";
  const rows = m ? body.filter((r) => r.some((c) => norm(c).includes(m))) : body;
  return { header, rows: rows.slice(0, 3000).map((r) => r.slice(0, 200)) };
}

export interface CheckResult {
  changes: string[];
  watch: SheetWatch;
}

/** Скачать таблицу и сравнить с прошлым разом. Первый раз — только запомнить. */
export async function checkSheet(w: SheetWatch, fetchImpl: typeof fetch = (i, o) => fetch(i, o), now = new Date()): Promise<CheckResult> {
  const url = csvUrl(w.url);
  const next: SheetWatch = { ...w, lastCheck: now.toISOString() };
  if (!url) return { changes: [], watch: { ...next, error: "Это не ссылка на Google-таблицу" } };
  let text: string;
  try {
    const res = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || /text\/html/i.test(type)) {
      return {
        changes: [],
        watch: { ...next, error: res.status === 404 ? "Таблица не найдена" : "Таблица закрыта: открой доступ «Все, у кого есть ссылка» (просмотр) или опубликуй её" },
      };
    }
    text = await res.text();
  } catch {
    return { changes: [], watch: { ...next, error: "Не смог открыть таблицу — нет интернета?" } };
  }
  if (text.length > 8 * 1024 * 1024) return { changes: [], watch: { ...next, error: "Таблица слишком большая" } };
  const { header, rows } = selectRows(parseCsv(text), w.match);
  const fresh: SheetWatch = { ...next, error: undefined, snapshot: rows, header };
  if (!w.snapshot) return { changes: [], watch: fresh };
  const changes = diffSheets(w.snapshot, rows, header.length ? header : (w.header ?? []));
  if (!changes.length) return { changes, watch: fresh };
  const recent = [{ at: now.toISOString(), lines: changes.slice(0, 40) }, ...(w.recent ?? [])].slice(0, 10);
  return { changes, watch: { ...fresh, lastChange: now.toISOString(), recent } };
}

/** Сообщение владельцу: коротко, что поменялось. */
export function changeMessage(w: SheetWatch, changes: string[]): string {
  const shown = changes.slice(0, 12).map((c) => `• ${c}`);
  const more = changes.length > 12 ? `\n…и ещё ${changes.length - 12}` : "";
  return `📊 В таблице «${w.name}» изменения:\n${shown.join("\n")}${more}`;
}
