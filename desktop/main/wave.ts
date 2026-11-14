// «Моя волна»: бесконечный поток под тебя — из твоей библиотеки и из открытой базы музыки.
// Открытая база — только легальная музыка под свободными лицензиями с прямыми файлами:
// ccMixter (Creative Commons) и сетевые лейблы Internet Archive. Стриминговые сервисы не трогаем.
// Учится на лайках, «не то», пропусках и дослушиваниях.
import { createHash } from "node:crypto";
import type { Store } from "../../src/store.js";
import type { Track, WaveMood } from "../shared/types.js";
import { fitsMood, type TrackEnergy } from "../shared/energy.js";

const KV = "wave.taste";
const UA = { "User-Agent": "Camado (study assistant)" };

/** Откуда можно слушать потоком (и только отсюда — защита от подмены ссылок). */
export const STREAM_HOSTS = /^(?:[\w-]+\.)*(archive\.org|ccmixter\.org)$/i;

export const MOODS: Record<WaveMood, { label: string; tags: string[]; libShare: number }> = {
  mine: { label: "Под меня", tags: [], libShare: 0.7 },
  energy: { label: "Бодро", tags: ["electronic", "dance", "rock", "funk", "upbeat", "breakbeat"], libShare: 0.4 },
  calm: { label: "Спокойно", tags: ["chill", "acoustic", "ambient", "downtempo", "piano", "jazz"], libShare: 0.4 },
  study: { label: "Учёба", tags: ["instrumental", "lofi", "ambient", "piano", "classical", "chillout"], libShare: 0.3 },
  new: { label: "Что-то новое", tags: ["experimental", "trip_hop", "folk", "hip_hop", "jazz", "electronic", "world", "indie"], libShare: 0.05 },
};

export interface Taste {
  /** По трекам: лайк (+1) / «не то» (−1), пропуски, дослушивания. */
  tracks: Record<string, { v?: 1 | -1; skips?: number; done?: number }>;
  tags: Record<string, number>;
  artists: Record<string, number>;
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

export function webId(url: string): string {
  return "web:" + createHash("sha1").update(url).digest("hex").slice(0, 24);
}

/** «2:31» → 151. */
const secs = (s?: string) => {
  if (!s) return 0;
  const p = s.split(":").map(Number);
  return p.length === 2 ? p[0]! * 60 + p[1]! : p.length === 3 ? p[0]! * 3600 + p[1]! * 60 + p[2]! : Number(s) || 0;
};

/** ccMixter: треки с тегом → треки Камадо (только mp3 длиннее полутора минут). */
export async function fromCcMixter(tag: string, fetchImpl: typeof fetch, offset = 0): Promise<Track[]> {
  const u = new URL("https://ccmixter.org/api/query");
  u.searchParams.set("f", "json");
  u.searchParams.set("tags", tag.replace(/[^\w]/g, "_"));
  u.searchParams.set("limit", "25");
  u.searchParams.set("sort", "rank");
  u.searchParams.set("offset", String(offset));
  const res = await fetchImpl(u.href, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const list = (await res.json().catch(() => [])) as {
    upload_name?: string;
    user_name?: string;
    user_real_name?: string;
    upload_tags?: string;
    file_page_url?: string;
    license_name?: string;
    license_url?: string;
    files?: { download_url?: string; file_format_info?: { "default-ext"?: string; ps?: string } }[];
  }[];
  const out: Track[] = [];
  for (const x of Array.isArray(list) ? list : []) {
    const f = x.files?.find((f) => f.file_format_info?.["default-ext"] === "mp3" && f.download_url);
    const dur = secs(f?.file_format_info?.ps);
    if (!f?.download_url || dur < 90 || dur > 15 * 60) continue;
    const url = f.download_url.replace(/^http:/, "https:");
    const tags = (x.upload_tags ?? "").split(",").filter((t) => t && !/^(media|remix|audio|mp3|44k|48k|stereo|mono|CBR|VBR|attribution|trackback|in_|bpm_|sample|ccplus|non_commercial|editorial|featured|nc_|sampling|by_|sa_|cc_|loops)/i.test(t));
    out.push({
      id: webId(url),
      path: url,
      title: x.upload_name?.trim() || "Без названия",
      artist: x.user_real_name?.trim() || x.user_name?.trim() || "ccMixter",
      album: "ccMixter",
      duration: dur,
      hasLyrics: false,
      web: { url, source: "ccMixter", page: x.file_page_url, license: x.license_name, licenseUrl: x.license_url, tags: tags.slice(0, 8) },
    });
  }
  return out;
}

/** Internet Archive, сетевые лейблы (netlabels): альбомы с тегом → по 1–2 трека из каждого. */
export async function fromArchive(tag: string, fetchImpl: typeof fetch, page = 1): Promise<Track[]> {
  const u = new URL("https://archive.org/advancedsearch.php");
  u.searchParams.set("q", `collection:(netlabels) AND mediatype:(audio) AND subject:(${tag.replace(/[^\w ]/g, " ")})`);
  for (const f of ["identifier", "title", "creator", "subject", "licenseurl"]) u.searchParams.append("fl[]", f);
  u.searchParams.append("sort[]", "downloads desc");
  u.searchParams.set("rows", "12");
  u.searchParams.set("page", String(page));
  u.searchParams.set("output", "json");
  const res = await fetchImpl(u.href, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const docs = ((await res.json().catch(() => ({}))) as { response?: { docs?: Record<string, unknown>[] } }).response?.docs ?? [];
  const pick = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? "") : v == null ? "" : String(v));
  const out: Track[] = [];
  // по несколько альбомов за раз — не больше 6 запросов
  for (const d of docs.sort(() => Math.random() - 0.5).slice(0, 6)) {
    const id = pick(d.identifier);
    if (!/^[\w.-]+$/.test(id)) continue;
    const meta = await fetchImpl(`https://archive.org/metadata/${id}/files`, { headers: UA, signal: AbortSignal.timeout(15_000) }).catch(() => undefined);
    if (!meta?.ok) continue;
    const files = (((await meta.json().catch(() => ({}))) as { result?: { name: string; format?: string; title?: string; creator?: string; artist?: string; length?: string }[] }).result ?? []).filter(
      (f) => /mp3/i.test(f.format ?? "") && !/_64kb|_vbr\.m3u/i.test(f.name) && secs(f.length) >= 90 && secs(f.length) <= 15 * 60,
    );
    // один файл на трек: предпочитаем VBR/обычный mp3
    const seen = new Set<string>();
    const tracks = files.filter((f) => {
      const k = f.name.replace(/\.[^.]+$/, "").replace(/_(vbr|128kb|64kb)$/i, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    for (const f of tracks.sort(() => Math.random() - 0.5).slice(0, 2)) {
      const url = `https://archive.org/download/${id}/${f.name.split("/").map(encodeURIComponent).join("/")}`;
      const album = pick(d.title);
      const subj = (Array.isArray(d.subject) ? d.subject : [d.subject]).map((s) => String(s ?? "").toLowerCase()).filter(Boolean);
      out.push({
        id: webId(url),
        path: url,
        title: f.title?.trim() || f.name.replace(/\.[^.]+$/, "").replace(/^\d+[\s._-]+/, "").replace(/_/g, " "),
        artist: f.creator?.trim() || f.artist?.trim() || pick(d.creator) || album.split(" - ")[0] || "Internet Archive",
        album,
        duration: secs(f.length),
        hasLyrics: false,
        cover: `https://archive.org/services/img/${encodeURIComponent(id)}`,
        web: {
          url,
          source: "Internet Archive",
          page: `https://archive.org/details/${id}`,
          license: /creativecommons/.test(pick(d.licenseurl)) ? `CC ${pick(d.licenseurl).match(/licenses\/([\w-]+)/)?.[1]?.toUpperCase() ?? ""}`.trim() : "свободная (netlabel)",
          licenseUrl: pick(d.licenseurl) || undefined,
          tags: subj.slice(0, 8),
        },
      });
    }
  }
  return out;
}

export class Wave {
  private cache = new Map<string, { at: number; tracks: Track[] }>();

  constructor(
    private store: Store,
    private fetchImpl: typeof fetch = (i, o) => fetch(i, o),
  ) {}

  taste(): Taste {
    try {
      const t = JSON.parse(this.store.getKv(KV) ?? "{}") as Partial<Taste>;
      return { tracks: t.tracks ?? {}, tags: t.tags ?? {}, artists: t.artists ?? {} };
    } catch {
      return { tracks: {}, tags: {}, artists: {} };
    }
  }

  /** Отзыв о треке: like/dislike — кнопками, skip/done — сам плеер. */
  feedback(t: Pick<Track, "id" | "artist"> & { web?: { tags?: string[] } }, kind: "like" | "unlike" | "dislike" | "skip" | "done"): void {
    const taste = this.taste();
    const e = (taste.tracks[t.id] ??= {});
    const w = { like: 3, unlike: -3, dislike: -4, skip: -1, done: 0.6 }[kind];
    if (kind === "like") e.v = 1;
    else if (kind === "unlike") delete e.v;
    else if (kind === "dislike") e.v = -1;
    else if (kind === "skip") e.skips = (e.skips ?? 0) + 1;
    else e.done = (e.done ?? 0) + 1;
    const a = norm(t.artist);
    if (a) taste.artists[a] = clamp((taste.artists[a] ?? 0) + w);
    for (const tag of t.web?.tags ?? []) taste.tags[norm(tag)] = clamp((taste.tags[norm(tag)] ?? 0) + w / 2);
    // не даём разрастись: держим 3000 последних треков
    const ids = Object.keys(taste.tracks);
    if (ids.length > 3000) for (const id of ids.slice(0, ids.length - 3000)) delete taste.tracks[id];
    this.store.setKv(KV, JSON.stringify(taste));
  }

  /** Насколько трек «твой»: лайки, дослушивания, исполнитель; «не то» — никогда. */
  score(t: Track, taste: Taste, favorites: Set<string>): number {
    const e = taste.tracks[t.id];
    if (e?.v === -1) return -Infinity;
    let s = 1;
    if (favorites.has(t.id) || e?.v === 1) s += 3;
    s += Math.min(3, (e?.done ?? 0) * 0.5) - (e?.skips ?? 0) * 1.2;
    s += (taste.artists[norm(t.artist)] ?? 0) * 0.4;
    for (const tag of t.web?.tags ?? []) s += (taste.tags[norm(tag)] ?? 0) * 0.2;
    return s;
  }

  private async catalog(tag: string): Promise<Track[]> {
    const key = tag;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 30 * 60_000 && hit.tracks.length) return hit.tracks;
    const [cc, ia] = await Promise.all([
      fromCcMixter(tag, this.fetchImpl, Math.floor(Math.random() * 4) * 25).catch(() => [] as Track[]),
      fromArchive(tag, this.fetchImpl, 1 + Math.floor(Math.random() * 3)).catch(() => [] as Track[]),
    ]);
    const tracks = [...cc, ...ia];
    this.cache.set(key, { at: Date.now(), tracks });
    return tracks;
  }

  /** Теги для «Под меня»: что лайкал и дослушивал; пока вкуса нет — разные спокойные и бодрые. */
  private myTags(taste: Taste): string[] {
    const top = Object.entries(taste.tags)
      .filter(([, v]) => v > 0.5)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k.replace(/[^\w]/g, "_"))
      .filter(Boolean)
      .slice(0, 4);
    return top.length ? top : ["chill", "electronic", "indie", "instrumental"];
  }

  /** Следующие треки волны. exclude — что уже было (не повторяемся). */
  async next(input: {
    mood: WaveMood;
    count?: number;
    exclude?: string[];
    library: Track[];
    favorites: string[];
    recent?: string[];
    /** Темп и энергия своих треков (меряет окно): по ним «бодро/спокойно/учёба» берёт и твои песни. */
    energy?: Record<string, TrackEnergy>;
  }): Promise<Track[]> {
    const mood = MOODS[input.mood] ? input.mood : "mine";
    const count = Math.max(1, Math.min(20, input.count ?? 6));
    const taste = this.taste();
    const fav = new Set(input.favorites);
    const skip = new Set([...(input.exclude ?? []), ...(input.recent ?? [])]);
    // свои треки — только подходящие по энергии (для «под меня» и «нового» — все)
    const lib = input.library.filter((t) => !skip.has(t.id) && fitsMood(mood, input.energy?.[t.id]));
    const libCount = lib.length ? Math.round(count * MOODS[mood].libShare) : 0;
    const pickWeighted = (pool: Track[], n: number) => {
      const scored = pool.map((t) => ({ t, s: this.score(t, taste, fav) })).filter((x) => Number.isFinite(x.s));
      const out: Track[] = [];
      while (out.length < n && scored.length) {
        const total = scored.reduce((a, x) => a + Math.max(0.15, x.s), 0);
        let r = Math.random() * total;
        let i = 0;
        for (; i < scored.length - 1; i++) {
          r -= Math.max(0.15, scored[i]!.s);
          if (r <= 0) break;
        }
        out.push(scored.splice(i, 1)[0]!.t);
      }
      return out;
    };
    const fromLib = pickWeighted(lib, libCount);
    const tags = mood === "mine" ? this.myTags(taste) : MOODS[mood].tags;
    const chosen = [...tags].sort(() => Math.random() - 0.5).slice(0, 2);
    const web = (await Promise.all(chosen.map((t) => this.catalog(t)))).flat();
    const uniq = new Map(web.filter((t) => !skip.has(t.id)).map((t) => [t.id, t]));
    // одного исполнителя — не больше двух подряд в выдаче
    const fromWeb = pickWeighted([...uniq.values()], count - fromLib.length + 2);
    const perArtist = new Map<string, number>();
    const webOk = fromWeb.filter((t) => {
      const a = norm(t.artist);
      const n = (perArtist.get(a) ?? 0) + 1;
      perArtist.set(a, n);
      return n <= 2;
    });
    let out = [...fromLib, ...webOk.slice(0, count - fromLib.length)];
    // интернета нет или база молчит — играем своё
    if (out.length < count) out = [...out, ...pickWeighted(lib.filter((t) => !out.includes(t)), count - out.length)];
    // и подходящих по энергии не нашлось — любые свои, лишь бы играло
    if (out.length < count) {
      const any = input.library.filter((t) => !skip.has(t.id) && !out.includes(t));
      out = [...out, ...pickWeighted(any, count - out.length)];
    }
    // свои и новые вперемешку
    return out.sort(() => Math.random() - 0.5);
  }
}

const clamp = (v: number) => Math.max(-10, Math.min(10, Math.round(v * 100) / 100));

// ---------- «Моя волна» 2.0: кандидаты с Audius под стиль плейлиста ----------

export interface CandidateQuery {
  /** Жанры, которые окно угадало по звуку плейлиста (см. guessGenres). */
  genres: string[];
  /** Доля русских песен в плейлисте. */
  ruShare: number;
  /** Исполнители из плейлиста — их треки, каверы и ремиксы на Audius. */
  artists: string[];
  exclude: string[];
}

/** Кандидаты для волны: популярное в угаданных жанрах + поиск по исполнителям + русское, если плейлист русский. */
export async function gatherCandidates(q: CandidateQuery, fetchImpl: typeof fetch, cache = new Map<string, { at: number; t: Track[] }>()): Promise<Track[]> {
  const { audiusSearch, audiusTrending, RU_WORDS } = await import("./audius.js");
  const cached = async (key: string, fn: () => Promise<Track[]>) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 30 * 60_000) return hit.t;
    const t = await fn().catch(() => [] as Track[]);
    if (t.length) cache.set(key, { at: Date.now(), t });
    return t;
  };
  const shuffle = <T>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
  const times = ["week", "month", "allTime"] as const;
  const jobs: Promise<Track[]>[] = [];
  for (const g of q.genres.slice(0, 3)) {
    const time = times[Math.floor(Math.random() * times.length)]!;
    jobs.push(cached(`tr:${g}:${time}`, () => audiusTrending(g, time, fetchImpl)).then((t) => shuffle(t).slice(0, 18)));
  }
  for (const a of shuffle(q.artists.filter((a) => a && !/неизвестн|unknown/i.test(a))).slice(0, 3)) {
    jobs.push(cached(`s:${a.toLowerCase()}`, () => audiusSearch(a, fetchImpl)).then((t) => t.slice(0, 6)));
  }
  // русские песни — поиском по частым русским словам внутри угаданных жанров (без жанра поиск даёт что попало)
  const ruN = q.ruShare >= 0.15 ? Math.max(2, Math.round(q.ruShare * 6)) : 0;
  const ruGenres = q.genres.length ? q.genres.slice(0, 2) : [undefined];
  shuffle(RU_WORDS)
    .slice(0, ruN)
    .forEach((w, k) => {
      const g = ruGenres[k % ruGenres.length];
      jobs.push(cached(`s:${w}:${g ?? ""}`, () => audiusSearch(w, fetchImpl, g)).then((t) => t.filter((x) => /[а-яё]/i.test(`${x.title} ${x.artist}`))));
    });
  const skip = new Set(q.exclude);
  const all = new Map<string, Track>();
  for (const t of (await Promise.all(jobs)).flat()) if (!skip.has(t.id)) all.set(t.id, t);
  return shuffle([...all.values()]).slice(0, 70);
}

/** Отпечатки звука (CLAP) песен — чтобы не слушать одну песню дважды. Хранится файлом в папке программы. */
export class EmbStore {
  private data?: Record<string, string>;
  private timer?: NodeJS.Timeout;
  constructor(private file: string) {}

  private async load(): Promise<Record<string, string>> {
    if (this.data) return this.data;
    const { readFile } = await import("node:fs/promises");
    try {
      const raw = JSON.parse(await readFile(this.file, "utf8")) as unknown;
      this.data = raw && typeof raw === "object" ? (raw as Record<string, string>) : {};
    } catch {
      this.data = {};
    }
    return this.data;
  }

  async get(ids: string[]): Promise<Record<string, string>> {
    const d = await this.load();
    const out: Record<string, string> = {};
    for (const id of ids.slice(0, 2000)) if (d[id]) out[id] = d[id]!;
    return out;
  }

  async put(entries: Record<string, string>): Promise<void> {
    const d = await this.load();
    for (const [id, v] of Object.entries(entries)) {
      // только похоже на вектор: base64 от 512 чисел float32
      if (typeof id === "string" && id.length < 80 && typeof v === "string" && v.length < 4000 && /^[A-Za-z0-9+/=]+$/.test(v)) d[id] = v;
    }
    const keys = Object.keys(d);
    if (keys.length > 8000) for (const k of keys.slice(0, keys.length - 8000)) delete d[k];
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 1500);
  }

  async flush(): Promise<void> {
    if (!this.data) return;
    const { writeFile } = await import("node:fs/promises");
    await writeFile(this.file, JSON.stringify(this.data)).catch(() => undefined);
  }
}
