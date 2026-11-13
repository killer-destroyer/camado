// Камадо мини-приложением в Telegram: страница (miniapp на GitHub Pages) без своего сервера.
// Свежие данные бот кладёт прямо в ссылку — после «#», эта часть никуда не отправляется (ни GitHub, ни кому-то ещё):
// страница читает её у тебя в телефоне. Действия (сделано, записать, трата) страница возвращает боту через Telegram.
import { deflateRawSync } from "node:zlib";
import type { Store } from "./store.js";

/** Где лежит страница. Можно поменять в .env (CAMADO_MINIAPP_URL). */
export const DEFAULT_MINIAPP_URL = "https://killer-destroyer.github.io/camado-/miniapp/";

export interface MiniExtras {
  /** Пары сегодня: «09:30», «Матан», «ауд. 204». */
  classes?: { start: string; end: string; subject: string; room?: string }[];
  money?: { balance?: number; perDay?: number; spentToday: number; daysLeft?: number };
}

export interface MiniSnapshot {
  v: 1;
  /** Когда снято (мс). */
  at: number;
  tz: string;
  /** [id, предмет, что, срок ISO|"", вид] — ближайшие открытые. */
  t: [number, string, string, string, string][];
  /** [название, когда ISO, готов %] */
  e: [string, string, number][];
  /** [название, ссылка] — закреплённые и частые */
  l: [string, string][];
  c?: MiniExtras["classes"];
  m?: MiniExtras["money"];
}

export function miniSnapshot(store: Store, tz: string, extras: MiniExtras = {}, now = new Date()): MiniSnapshot {
  const tasks = store
    .listTasks()
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
    .slice(0, 25)
    .map((t) => [t.id, (t.subject ?? "").slice(0, 40), t.title.slice(0, 120), t.dueAt ?? "", t.kind] as [number, string, string, string, string]);
  const exams = store
    .listExams()
    .filter((e) => new Date(e.at).getTime() > now.getTime() - 86400e3)
    .slice(0, 6)
    .map((e) => {
      const k = e.tickets.filter((x) => x.status === "known").length;
      const r = e.tickets.filter((x) => x.status === "review").length;
      return [e.title.slice(0, 60), e.at, e.tickets.length ? Math.round(((k + r * 0.5) / e.tickets.length) * 100) : -1] as [string, string, number];
    });
  const links = store
    .listLinks()
    .slice(0, 10)
    .map((l) => [l.title.slice(0, 50), l.url] as [string, string]);
  return { v: 1, at: now.getTime(), tz, t: tasks, e: exams, l: links, c: extras.classes?.slice(0, 8), m: extras.money };
}

/** Сжать и превратить в часть ссылки (base64url). Слишком длинно — урезаем списки. */
export function encodeSnapshot(s: MiniSnapshot, maxLen = 3000): string {
  let cur = s;
  for (let i = 0; i < 6; i++) {
    const enc = deflateRawSync(Buffer.from(JSON.stringify(cur), "utf8"), { level: 9 }).toString("base64url");
    if (enc.length <= maxLen) return enc;
    cur = { ...cur, t: cur.t.slice(0, Math.ceil(cur.t.length * 0.7)), l: cur.l.slice(0, Math.ceil(cur.l.length * 0.6)) };
  }
  return deflateRawSync(Buffer.from(JSON.stringify({ ...cur, t: cur.t.slice(0, 5), l: [] }), "utf8"), { level: 9 }).toString("base64url");
}

export function miniAppUrl(base: string, s: MiniSnapshot): string {
  return `${base.replace(/#.*$/, "")}#d=${encodeSnapshot(s)}`;
}

/** Что прислала страница. Всё лишнее отбрасываем: это данные, а не команды. */
export type MiniAction = { a: "done"; id: number } | { a: "add"; text: string } | { a: "spend"; text: string };

export function parseMiniAction(raw: string): MiniAction | undefined {
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!x || typeof x !== "object") return undefined;
  const o = x as Record<string, unknown>;
  if (o.a === "done" && Number.isInteger(o.id) && (o.id as number) > 0) return { a: "done", id: o.id as number };
  if ((o.a === "add" || o.a === "spend") && typeof o.text === "string" && o.text.trim()) return { a: o.a, text: o.text.trim().slice(0, 500) };
  return undefined;
}
