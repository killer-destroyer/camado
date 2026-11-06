// Разбор текстов песен в формате LRC: [мм:сс.xx] строка.
// Поддерживает несколько меток на строку, [offset:±мс] и пословные метки <мм:сс.xx>.
import type { LyricsSync } from "./settings.js";
import type { Lyrics, LyricsLine, LyricsWord } from "./types.js";

const LINE_TIME = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const WORD_TIME = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
const OFFSET = /^\[offset:\s*([+-]?\d+)\]/im;

function toSeconds(min: string, sec: string, frac?: string): number {
  const f = frac ? Number(frac) / 10 ** frac.length : 0;
  return Number(min) * 60 + Number(sec) + f;
}

export function parseLrc(text: string): Lyrics {
  const offsetMs = Number(text.match(OFFSET)?.[1] ?? 0);
  const shift = -offsetMs / 1000; // положительный offset — текст раньше
  const lines: LyricsLine[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(LINE_TIME)];
    if (stamps.length === 0) continue;
    const body = raw.replace(LINE_TIME, "").trim();

    let words: LyricsWord[] | undefined;
    if (WORD_TIME.test(body)) {
      WORD_TIME.lastIndex = 0;
      words = [];
      const parts = body.split(WORD_TIME);
      // split с группами: [текст, мин, сек, доли, текст, ...]
      for (let i = 1; i + 3 < parts.length + 1; i += 4) {
        const t = toSeconds(parts[i]!, parts[i + 1]!, parts[i + 2]);
        const w = (parts[i + 3] ?? "").trim();
        if (w) words.push({ time: Math.max(0, t + shift), text: w });
      }
    }
    const plain = body.replace(WORD_TIME, "").replace(/\s+/g, " ").trim();

    for (const m of stamps) {
      const time = Math.max(0, toSeconds(m[1]!, m[2]!, m[3]) + shift);
      lines.push(words?.length ? { time, text: plain, words } : { time, text: plain });
    }
  }

  lines.sort((a, b) => a.time - b.time);
  if (lines.length === 0) {
    return { synced: false, lines: plainLines(text), source: "none" };
  }
  return { synced: true, lines, source: "none" };
}

export function plainLines(text: string): LyricsLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(LINE_TIME, "").trim())
    .filter((l) => l && !/^\[\w+:.*\]$/.test(l))
    .map((l) => ({ time: 0, text: l }));
}

/** Индекс строки, которая звучит в момент t (−1 — до первой). */
export function activeLineIndex(lines: LyricsLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid]!.time <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/**
 * Слова строки со временем появления. Если пословных меток нет —
 * распределяем слова по длительности строки пропорционально длине слова.
 */
export function timedWords(lines: LyricsLine[], index: number, trackDuration = 0): LyricsWord[] {
  const line = lines[index];
  if (!line) return [];
  if (line.words?.length) return line.words;
  const words = line.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const next = lines[index + 1]?.time ?? (trackDuration > line.time ? trackDuration : line.time + 4);
  // Слова успевают прозвучать за ~85% строки, но не дольше 6 секунд.
  const span = Math.min(Math.max(next - line.time, 0.4) * 0.85, 6);
  const weights = words.map((w) => 1 + w.length);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return words.map((w, i) => {
    const time = line.time + (acc / total) * span;
    acc += weights[i]!;
    return { time, text: w };
  });
}

/** Растянуть/сжать тайминги в k раз (текст от обычной версии → под nightcore/slowed). */
export function scaleLyrics(l: Lyrics, k: number): Lyrics {
  return {
    ...l,
    scaled: k,
    lines: l.lines.map((x) => ({
      ...x,
      time: x.time * k,
      ...(x.words ? { words: x.words.map((w) => ({ ...w, time: w.time * k })) } : {}),
    })),
  };
}

/** Признак ускоренной или замедленной версии в названии. */
export function speedHint(title: string): "fast" | "slow" | undefined {
  if (/nightcore|sped\s*up|speed\s*up|ускорен/i.test(title)) return "fast";
  if (/slowed|daycore|замедлен/i.test(title)) return "slow";
  return undefined;
}

/**
 * Текст без отметок времени → примерные отметки: строки равномерно по песне,
 * длинные строки звучат дольше. Пение обычно начинается после вступления и кончается до концовки.
 */
export function approximateTimes(lines: LyricsLine[], duration: number): LyricsLine[] {
  if (!lines.length || !(duration > 0)) return lines;
  const start = Math.min(20, duration * 0.08);
  const end = duration * 0.94;
  const weights = lines.map((l) => l.text.length + 10);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return lines.map((l, i) => {
    const time = start + ((end - start) * acc) / total;
    acc += weights[i]!;
    return { time, text: l.text };
  });
}

/** Минимум секунд песни между двумя «пойманными» строками, чтобы по ним считать скорость. */
export const SYNC_SPAN = 20;
const MIN_SLOPE = 0.7;
const MAX_SLOPE = 1.4;

/**
 * Время текста для момента песни T.
 * Без точек — s·T + o. С точками — по ломаной через все «пойманные» строки: между соседними точками
 * свой темп. Так лечится и чуть ускоренная копия, и вырезанный/вставленный кусок посередине.
 */
export function mapLyricsTime(sync: LyricsSync, T: number): number {
  const a = sync.anchors;
  if (!a?.length) return sync.s * T + sync.o;
  if (a.length === 1) return T - a[0]!.t + a[0]!.l + sync.o;
  let i = 0;
  while (i < a.length - 2 && T > a[i + 1]!.t) i++;
  const p = a[i]!;
  const q = a[i + 1]!;
  const k = (q.l - p.l) / (q.t - p.t);
  return p.l + (T - p.t) * k + sync.o;
}

/** Темп текста в момент T (сколько секунд текста за секунду песни). */
export function lyricsSlope(sync: LyricsSync, T: number): number {
  const a = sync.anchors;
  if (!a?.length) return sync.s;
  if (a.length === 1) return 1;
  let i = 0;
  while (i < a.length - 2 && T > a[i + 1]!.t) i++;
  return (a[i + 1]!.l - a[i]!.l) / (a[i + 1]!.t - a[i]!.t);
}

/**
 * «Поймать» строку: в момент песни audioT поют строку с временем lineT.
 * Добавляет точку (рядом с уже пойманной — заменяет её). Нелепую точку (темп между соседями вне 0.7–1.4)
 * не принимает — значит, нажали не ту строку. Возвращает null, если точка отклонена.
 */
export function addAnchor(cur: LyricsSync, audioT: number, lineT: number): LyricsSync | null {
  const old = (cur.anchors ?? []).filter((a) => Math.abs(a.t - audioT) > 5);
  // старая подгонка без точек (кнопки ±, прошлая версия) → превращаем текущую поправку в точку «здесь и сейчас»
  const list = [...old, { t: audioT, l: lineT }].sort((a, b) => a.t - b.t);
  for (let i = 1; i < list.length; i++) {
    const k = (list[i]!.l - list[i - 1]!.l) / (list[i]!.t - list[i - 1]!.t);
    if (list[i]!.t - list[i - 1]!.t >= 3 && (k < MIN_SLOPE || k > MAX_SLOPE)) return null;
  }
  return { s: 1, o: 0, anchors: list };
}

/** Старый расчёт по двум точкам (оставлен для совместимости и тестов). */
export function nextSync(cur: LyricsSync, audioT: number, lineT: number): LyricsSync {
  if (cur.t1 !== undefined && cur.l1 !== undefined && Math.abs(audioT - cur.t1) >= SYNC_SPAN) {
    const s = Math.max(0.75, Math.min(1.33, (lineT - cur.l1) / (audioT - cur.t1)));
    return { s, o: cur.l1 - s * cur.t1, t1: cur.t1, l1: cur.l1 };
  }
  return { s: cur.s, o: lineT - cur.s * audioT, t1: audioT, l1: lineT };
}
