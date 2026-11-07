// Текст песни по словам: распознанные слова (со временем) сопоставляются с настоящим текстом.
// Распознавание может ошибаться в словах — поэтому сравниваем похожесть, а пропуски заполняем по соседям.
// Так у каждого слова своё время, и текст сам ускоряется и замедляется вместе с певцом.
import type { LyricsLine, LyricsWord } from "./types.js";

/** Слово, которое услышала модель: время начала и конца, секунды от начала песни. */
export interface HeardWord {
  t0: number;
  t1: number;
  text: string;
}

/** Пословная разметка песни — хранится у пользователя. */
export interface WordSync {
  v: 1;
  /** Чем распознавали (другая модель — пересчитать). */
  model: string;
  /** Отпечаток текста, под который сделана разметка: текст сменился — разметка устарела. */
  textKey: string;
  /** aligned — настоящий текст по словам; heard — текста не было, показываем услышанное. */
  source: "aligned" | "heard";
  /** Доля слов текста, которые удалось расслышать (0…1). */
  quality: number;
  duration: number;
  lines: LyricsLine[];
  createdAt: string;
}

export const WORDSYNC_MODEL = "whisper-small-q4@1";

/** Окна для распознавания: модель слушает по 30 с; соседние окна перекрываются, чтобы не резать слова. */
export const ASR_WINDOW = 28;
export const ASR_STEP = 24;

export function asrWindows(duration: number): number[] {
  const out: number[] = [];
  for (let s = 0; s < duration - 1; s += ASR_STEP) out.push(s);
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** Слова строки (по пробелам и дефисам: «рок-н-ролл» модель слышит тремя словами). */
export function tokens(text: string): string[] {
  return text.split(/[\s\-‐–—]+/).map(norm).filter(Boolean);
}

/** Отпечаток текста: те же слова — та же разметка. */
export function textKey(lines: { text: string }[]): string {
  const s = lines.map((l) => tokens(l.text).join(" ")).join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return `${lines.length}:${s.length}:${h.toString(16)}`;
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return m + n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n]!;
}

/** Похожесть слов 0…1 (опечатки распознавания прощаются). */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - lev(a, b) / Math.max(a.length, b.length);
}

/**
 * Модель ставит начало слова сразу после конца прошлого — паузы «прилипают» к следующему слову.
 * Поэтому начало берём не раньше, чем «конец минус обычная длина такого слова».
 */
export function wordStart(w: HeardWord): number {
  const typical = 0.12 + 0.08 * norm(w.text).length;
  return Math.max(w.t0, w.t1 - typical);
}

/** Склеить окна: из перекрытия берём слова той половины, что ближе к середине своего окна. */
export function mergeWindows(windows: { start: number; words: HeardWord[] }[]): HeardWord[] {
  const out: HeardWord[] = [];
  const overlap = ASR_WINDOW - ASR_STEP;
  windows.forEach((w, i) => {
    const from = i === 0 ? -Infinity : w.start + overlap / 2;
    const next = windows[i + 1];
    const to = next ? next.start + overlap / 2 : Infinity;
    for (const x of w.words) if (x.t0 >= from && x.t0 < to && norm(x.text)) out.push(x);
  });
  return out.sort((a, b) => a.t0 - b.t0);
}

/** Частые «галлюцинации» распознавания на музыке без слов. */
const JUNK = /^(продолжение следует|субтитры|редактор субтитров|спасибо за просмотр|thanks for watching|music|музыка|♪+)$/i;

export function cleanHeard(words: HeardWord[]): HeardWord[] {
  return words.filter((w) => norm(w.text) && !JUNK.test(w.text.trim().replace(/[.!…]+$/, "")) && w.t1 >= w.t0);
}

const weight = (w: string) => 1 + w.length;

/**
 * Сопоставить текст с услышанным (выравнивание последовательностей) и дать время каждому слову.
 * Возвращает строки с пословными метками и долю расслышанных слов.
 */
export function alignLyrics(lines: { text: string }[], heardRaw: HeardWord[], duration: number): { lines: LyricsLine[]; quality: number } {
  const heard = cleanHeard(heardRaw);
  // слова текста: [строка, слово в строке, нормализованное, исходное]
  const lw: { line: number; text: string; key: string }[] = [];
  lines.forEach((l, li) => {
    for (const raw of l.text.split(/\s+/).filter(Boolean)) {
      // исходное слово может быть «рок-н-ролл» — внутри сравниваем по частям, показываем целиком
      const parts = tokens(raw);
      if (!parts.length) continue;
      lw.push({ line: li, text: raw, key: parts.join(" ") });
    }
  });
  // для выравнивания — части слов; запоминаем, к какому слову текста относится часть
  const L: { w: number; t: string }[] = [];
  lw.forEach((w, i) => w.key.split(" ").forEach((t) => L.push({ w: i, t })));
  const H = heard.map((h) => norm(h.text));
  const n = L.length;
  const m = H.length;
  const times: (number | undefined)[] = new Array(n).fill(undefined);
  let matched = 0;
  if (n && m) {
    const GAP_L = 0.45; // слово текста не расслышали
    const GAP_H = 0.3; // лишнее услышанное
    const score = (i: number, j: number) => {
      const s = similarity(L[i]!.t, H[j]!);
      return s >= 0.5 ? s * 2 - 0.6 : -1.2;
    };
    // Нидлман — Вунш: таблица (n+1)×(m+1), ходы: 1 — совпало, 2 — пропуск в тексте, 3 — лишнее услышанное
    const W = m + 1;
    const dp = new Float32Array((n + 1) * W);
    const mv = new Uint8Array((n + 1) * W);
    for (let i = 1; i <= n; i++) {
      dp[i * W] = -GAP_L * i;
      mv[i * W] = 2;
    }
    for (let j = 1; j <= m; j++) {
      dp[j] = -GAP_H * j;
      mv[j] = 3;
    }
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const a = dp[(i - 1) * W + j - 1]! + score(i - 1, j - 1);
        const b = dp[(i - 1) * W + j]! - GAP_L;
        const c = dp[i * W + j - 1]! - GAP_H;
        if (a >= b && a >= c) {
          dp[i * W + j] = a;
          mv[i * W + j] = 1;
        } else if (b >= c) {
          dp[i * W + j] = b;
          mv[i * W + j] = 2;
        } else {
          dp[i * W + j] = c;
          mv[i * W + j] = 3;
        }
      }
    }
    // обратный ход: пары «часть текста → услышанное слово»
    const pair: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = n, j = m; i > 0 || j > 0; ) {
      const k = mv[i * W + j];
      if (i > 0 && j > 0 && k === 1) {
        if (similarity(L[i - 1]!.t, H[j - 1]!) >= 0.5) pair[i - 1] = j - 1;
        i--;
        j--;
      } else if (i > 0 && (k === 2 || j === 0)) i--;
      else j--;
    }
    // время совпавших; время должно идти вперёд — выбросы отбрасываем
    let last = -Infinity;
    for (let i = 0; i < n; i++) {
      const j = pair[i];
      if (j === undefined) continue;
      const t = wordStart(heard[j]!);
      if (t + 0.05 < last) continue;
      times[i] = t;
      last = t;
    }
    // промежутки между совпавшими: если там было услышанное «не то» слово — ставим на его время,
    // иначе — делим промежуток по длине слов
    const used = new Set(pair.filter((j): j is number => j !== undefined));
    let i = 0;
    while (i < n) {
      if (times[i] !== undefined) {
        i++;
        continue;
      }
      let k = i;
      while (k < n && times[k] === undefined) k++;
      const prevT = i > 0 ? times[i - 1]! : undefined;
      const nextT = k < n ? times[k]! : undefined;
      const lo = prevT ?? (nextT !== undefined ? Math.max(0, nextT - L.slice(i, k).reduce((a, x) => a + weight(x.t) * 0.07, 0) - 0.3) : 0);
      const hi = nextT ?? Math.min(duration, lo + L.slice(i, k).reduce((a, x) => a + weight(x.t) * 0.07, 0) + 0.3);
      const spare = heard.map((h, j) => ({ h, j })).filter(({ h, j }) => !used.has(j) && wordStart(h) > lo + 0.02 && wordStart(h) < hi - 0.02);
      if (spare.length >= Math.ceil((k - i) / 2)) {
        // услышанных «не тех» слов хватает — раскладываем по ним
        for (let q = i; q < k; q++) times[q] = wordStart(spare[Math.min(spare.length - 1, Math.floor(((q - i) * spare.length) / (k - i)))]!.h);
      } else {
        // поют подряд: слова той же строки, что и соседнее расслышанное, — вплотную к нему;
        // целые нерасслышанные строки — поровну в оставшемся промежутке (а не по всему проигрышу)
        const PACE = 0.07;
        const prevLine = i > 0 ? lw[L[i - 1]!.w]!.line : -1;
        const nextLine = k < n ? lw[L[k]!.w]!.line : -1;
        let a = i;
        let t = lo;
        let carry = prevT !== undefined ? weight(L[i - 1]!.t) : 0;
        while (a < k && prevT !== undefined && lw[L[a]!.w]!.line === prevLine) {
          t += carry * PACE;
          times[a] = Math.min(t, hi);
          carry = weight(L[a]!.t);
          a++;
        }
        let c = k;
        let tc = hi;
        while (c > a && nextT !== undefined && lw[L[c - 1]!.w]!.line === nextLine) {
          tc -= weight(L[c - 1]!.t) * PACE;
          times[c - 1] = Math.max(tc, a > i ? times[a - 1]! : lo);
          c--;
        }
        if (a < c) {
          const from = a > i ? times[a - 1]! + carry * PACE : lo;
          const to = c < k ? times[c]! : hi;
          const tot = L.slice(a, c).reduce((x, y) => x + weight(y.t), 0) || 1;
          let acc = 0;
          for (let q = a; q < c; q++) {
            times[q] = from + ((Math.max(from, to) - from) * acc) / tot;
            acc += weight(L[q]!.t);
          }
        }
      }
      i = k;
    }
    matched = pair.filter((x) => x !== undefined).length;
  }
  // части → слова текста (время слова — его первая часть), слова → строки
  const wordTime = new Array<number>(lw.length).fill(0);
  for (let i = n - 1; i >= 0; i--) if (times[i] !== undefined) wordTime[L[i]!.w] = times[i]!;
  const outLines: LyricsLine[] = lines.map((l) => ({ time: 0, text: l.text.trim(), words: [] as LyricsWord[] }));
  let prev = 0;
  lw.forEach((w, i) => {
    const t = Math.max(prev, Math.min(duration, wordTime[i] ?? prev));
    prev = t;
    outLines[w.line]!.words!.push({ time: Math.round(t * 100) / 100, text: w.text });
  });
  // строка без слов (например «♪») — встаёт сразу перед следующей
  let nextT = duration;
  for (let i = outLines.length - 1; i >= 0; i--) {
    const l = outLines[i]!;
    if (l.words!.length) {
      l.time = l.words![0]!.time;
      nextT = l.time;
    } else {
      l.time = nextT;
      delete l.words;
    }
  }
  return { lines: outLines.filter((l) => l.text), quality: n ? matched / n : 0 };
}

/** Текста нигде нет — строки из услышанного: новая строка после паузы или каждые ~8 слов. */
export function linesFromHeard(heardRaw: HeardWord[]): LyricsLine[] {
  const heard = cleanHeard(heardRaw);
  const lines: LyricsLine[] = [];
  let cur: LyricsWord[] = [];
  let lastEnd = -Infinity;
  const flush = () => {
    if (cur.length) lines.push({ time: cur[0]!.time, text: cur.map((w) => w.text).join(" "), words: cur });
    cur = [];
  };
  for (const h of heard) {
    const t = wordStart(h);
    if (cur.length && (t - lastEnd > 0.9 || cur.length >= 8 || /[.!?]$/.test(cur[cur.length - 1]!.text))) flush();
    cur.push({ time: Math.round(t * 100) / 100, text: h.text.trim() });
    lastEnd = h.t1;
  }
  flush();
  return lines;
}

/** Язык песни по тексту: кириллица — русский, иначе английский; текста нет — модель решит сама. */
export function languageOf(text: string): string | undefined {
  const cyr = (text.match(/[а-яё]/gi) ?? []).length;
  const lat = (text.match(/[a-z]/gi) ?? []).length;
  if (!cyr && !lat) return undefined;
  return cyr >= lat * 0.4 ? "russian" : "english";
}
