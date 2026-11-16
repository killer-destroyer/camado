// Ручной ввод заданий командами — работает без ключа API.
import { localParts, localToUtc } from "./time.js";

export interface ParsedTask {
  subject?: string;
  title: string;
  dueAt?: string; // ISO в UTC
}

const DATE_RE = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2}|\d{4}))?(?:\s+(\d{1,2}):(\d{2}))?$/;
const RELATIVE_RE = /^(сегодня|завтра|послезавтра)(?:\s+(\d{1,2}):(\d{2}))?$/i;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Понимает «07.11», «7.11.2026», «07.11 18:00», «завтра», «сегодня 23:00».
 * Время по умолчанию — 23:59. Возвращает undefined, если это не дата.
 */
export function parseDue(text: string, now: Date, timeZone: string): Date | undefined {
  const s = text.trim().toLowerCase();
  const [ty, tm, td] = localParts(now, timeZone).ymd.split("-").map(Number) as [number, number, number];

  let year: number, month: number, day: number, hour: number, minute: number;
  let explicitYear = false;

  const rel = s.match(RELATIVE_RE);
  const abs = s.match(DATE_RE);
  if (rel) {
    const shift = { сегодня: 0, завтра: 1, послезавтра: 2 }[rel[1]!.toLowerCase() as "сегодня"];
    const d = new Date(Date.UTC(ty, tm - 1, td + shift));
    [year, month, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    [hour, minute] = rel[2] ? [Number(rel[2]), Number(rel[3])] : [23, 59];
  } else if (abs) {
    day = Number(abs[1]);
    month = Number(abs[2]);
    explicitYear = abs[3] !== undefined;
    year = explicitYear ? Number(abs[3]!.length === 2 ? `20${abs[3]}` : abs[3]) : ty;
    [hour, minute] = abs[4] ? [Number(abs[4]), Number(abs[5])] : [23, 59];
  } else {
    return undefined;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return undefined;

  let due = localToUtc(year, month, day, hour, minute, timeZone);
  // «31.02» и подобное: дата «перескочила» на другой день — значит, такой нет.
  const pad = (n: number) => String(n).padStart(2, "0");
  if (localParts(due, timeZone).ymd !== `${year}-${pad(month)}-${pad(day)}`) return undefined;

  // Год не указан и дата уже прошла — значит, имелся в виду следующий год.
  if (!explicitYear && !rel && due.getTime() < now.getTime() - DAY) {
    due = localToUtc(year + 1, month, day, hour, minute, timeZone);
  }
  return due;
}

/**
 * Разбирает аргументы /add и подобных:
 *   «что сделать»
 *   «что сделать | срок»
 *   «предмет | что сделать»
 *   «предмет | что сделать | срок»
 */
export function parseTaskArgs(args: string, now: Date, timeZone: string): ParsedTask | { error: string } {
  const parts = args.split("|").map((p) => p.trim());
  if (parts.length === 0 || parts.every((p) => !p)) return { error: "пусто" };

  let dueAt: string | undefined;
  if (parts.length >= 2) {
    const due = parseDue(parts.at(-1)!, now, timeZone);
    if (due) {
      dueAt = due.toISOString();
      parts.pop();
    } else if (parts.length === 3) {
      return { error: `не понял срок «${parts.at(-1)}». Пиши так: 07.11, 07.11 18:00, завтра` };
    }
  }

  if (parts.length > 2 || parts.some((p) => !p)) return { error: "не понял формат" };
  const [first, second] = parts as [string, string | undefined];
  return second === undefined ? { title: first, dueAt } : { subject: first, title: second, dueAt };
}
