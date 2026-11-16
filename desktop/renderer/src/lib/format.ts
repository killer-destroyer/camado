// Форматирование времени и сроков по-русски.

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

/** 187 → «3:07» */
export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type Urgency = "overdue" | "hot" | "soon" | "later" | "none";

export function urgency(dueAt: string | null, now = Date.now()): Urgency {
  if (!dueAt) return "none";
  const left = new Date(dueAt).getTime() - now;
  if (left < 0) return "overdue";
  if (left < 24 * 3600e3) return "hot";
  if (left < 72 * 3600e3) return "soon";
  return "later";
}

/** «через 2 д 4 ч», «через 35 мин», «просрочено на 3 ч». */
export function countdown(dueAt: string, now = Date.now()): string {
  let ms = new Date(dueAt).getTime() - now;
  const past = ms < 0;
  ms = Math.abs(ms);
  const d = Math.floor(ms / 86400e3);
  const h = Math.floor((ms % 86400e3) / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const text = d > 0 ? `${d} д ${h} ч` : h > 0 ? `${h} ч ${m} мин` : `${Math.max(1, m)} мин`;
  return past ? `просрочено на ${text}` : `через ${text}`;
}

export function fmtDue(dueAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dueAt));
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

/** Значение для <input type="datetime-local"> из ISO и обратно (в местном времени компьютера). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const KIND_LABEL = {
  homework: "ДЗ",
  test: "Контрольная",
  exam: "Экзамен",
  lab: "Лаба",
  other: "Дело",
} as const;
