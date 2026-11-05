// Разбор текстов песен в формате LRC: [мм:сс.xx] строка.
// Поддерживает несколько меток на строку, [offset:±мс] и пословные метки <мм:сс.xx>.
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
