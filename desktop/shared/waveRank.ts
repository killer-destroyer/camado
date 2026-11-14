// «Моя волна» 2.0: подбор по звуку. Нейросеть CLAP делает «отпечаток» каждой песни (вектор),
// похожие по звучанию песни — близко. Проверено на 717 треках 20 жанров: из 10 подобранных ~7 того же стиля
// (случайно — 2), русский плейлист → 8–9 из 10 русские (docs/WAVE.md).
import { GENRE_CENTROIDS } from "./waveGenres.js";

export type Vec = Float32Array | number[];

export function dot(a: Vec, b: Vec): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

export function normalize(v: Vec): Float32Array {
  const out = Float32Array.from(v);
  const n = Math.hypot(...out) || 1;
  for (let i = 0; i < out.length; i++) out[i]! /= n;
  return out;
}

/** Есть кириллица в названии или исполнителе — считаем песню русской (русскоязычной). */
export const isRu = (t: { title: string; artist: string }) => /[а-яё]/i.test(`${t.title} ${t.artist}`);

/** Насколько песня похожа на плейлист: среднее двух самых близких песен плейлиста (так смешанный плейлист не «усредняется»). */
export function knn(v: Vec, seeds: Vec[], k = 2): number {
  if (!seeds.length) return 0;
  const sims = seeds.map((s) => dot(v, s)).sort((a, b) => b - a);
  const top = sims.slice(0, Math.min(k, sims.length));
  return top.reduce((a, b) => a + b, 0) / top.length;
}

/** Какие жанры искать: ближайшие «центры» жанров к песням плейлиста. */
export function guessGenres(seeds: Vec[], n = 3): string[] {
  if (!seeds.length) return [];
  const scores = Object.entries(GENRE_CENTROIDS).map(([g, c]) => [g, seeds.reduce((a, s) => a + dot(s, c), 0) / seeds.length] as const);
  return scores
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([g]) => g);
}

/** Настроения без плейлиста — «как будто плейлист» из центров этих жанров. */
export const MOOD_GENRES: Record<"energy" | "calm" | "study", string[]> = {
  energy: ["Electronic", "House", "Techno", "Rock", "Hip-Hop/Rap", "Punk"],
  calm: ["Ambient", "Acoustic", "Lo-Fi", "Folk", "Jazz", "R&B/Soul"],
  study: ["Lo-Fi", "Ambient", "Classical", "Soundtrack"],
};
export const moodSeeds = (mood: keyof typeof MOOD_GENRES): Float32Array[] =>
  MOOD_GENRES[mood].map((g) => GENRE_CENTROIDS[g]).filter((c): c is number[] => !!c).map((c) => normalize(c));

export interface RankItem {
  id: string;
  title: string;
  artist: string;
  emb: Vec;
  /** Сколько раз слушали (для «Популярного»). */
  plays?: number;
}

export interface RankInput {
  seeds: Vec[];
  /** Доля русских песен в плейлисте (0..1); undefined — язык не важен. */
  ruShare?: number;
  /** Отпечатки того, что лайкал, и того, что «не то»/пропускал. */
  liked?: Vec[];
  disliked?: Vec[];
  popular?: boolean;
  /** Не больше стольких песен одного исполнителя на 10. */
  perArtist?: number;
}

/** Вес языка: проверено, что 0.05 даёт ~85% русских на русском плейлисте и не портит стиль. */
const LANG_W = 0.05;

export function scoreItem(c: RankItem, inp: RankInput): number {
  let s = knn(c.emb, inp.seeds);
  if (inp.ruShare !== undefined) s += LANG_W * (isRu(c) ? inp.ruShare : 1 - inp.ruShare);
  // подстройка на лету: похоже на лайкнутое — выше, на «не то» — ниже
  if (inp.liked?.length) s += 0.06 * Math.max(0, knn(c.emb, inp.liked, 1) - 0.6);
  if (inp.disliked?.length) {
    const near = knn(c.emb, inp.disliked, 1);
    if (near > 0.75) s -= 0.4 * (near - 0.75) + 0.02;
  }
  if (inp.popular && c.plays) s += 0.015 * Math.log10(1 + c.plays);
  return s;
}

/** Порядок волны: лучшие по похожести, без двух одинаковых исполнителей подряд и не больше perArtist на 10. */
export function rankWave<T extends RankItem>(cands: T[], inp: RankInput): T[] {
  const scored = cands.map((c) => ({ c, s: scoreItem(c, inp) })).sort((a, b) => b.s - a.s);
  const out: T[] = [];
  const per = new Map<string, number>();
  const cap = inp.perArtist ?? 2;
  const rest: T[] = [];
  for (const { c } of scored) {
    const a = c.artist.toLowerCase().trim();
    const n = per.get(a) ?? 0;
    if (n >= cap || out.at(-1)?.artist.toLowerCase().trim() === a) {
      rest.push(c);
      continue;
    }
    per.set(a, n + 1);
    out.push(c);
  }
  return [...out, ...rest];
}

const words = (x: string) =>
  x
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\b(official|audio|video|remaster(ed)?|lyrics?)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
/** Название без «Исполнитель - » в начале. */
const bareTitle = (t: { title: string }) => {
  const parts = t.title.split(/\s[-–—]\s/);
  return words(parts.length >= 2 ? parts.slice(1).join(" ") : t.title);
};

/** Одна и та же песня (своя и с Audius): то же название и пересекается исполнитель. «Город» другого исполнителя — не она. */
export function sameSong(a: { title: string; artist: string }, b: { title: string; artist: string }): boolean {
  const ta = bareTitle(a);
  if (!ta || ta !== bareTitle(b)) return false;
  const tokens = (t: { title: string; artist: string }) => new Set(words(`${t.artist} ${t.title}`).split(" ").filter((w) => w.length >= 3));
  const A = tokens(a);
  const titleWords = new Set(ta.split(" "));
  for (const w of tokens(b)) if (A.has(w) && !titleWords.has(w)) return true;
  return false;
}
