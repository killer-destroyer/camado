// Тексты песен: .lrc рядом с файлом → теги файла → бесплатная база LRCLIB (lrclib.net).
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFile } from "music-metadata";
import { parseLrc, plainLines } from "../shared/lrc.js";
import type { Lyrics, LyricsQuery } from "../shared/types.js";
import { lrcPathFor } from "./library.js";

const USER_AGENT = "Camado/0.2 (https://github.com/killer-destroyer/camado)";
const NOT_FOUND_TTL = 7 * 24 * 3600 * 1000;
const NONE: Lyrics = { synced: false, lines: [], source: "none" };

/** Декоративные символы из названий с SoundCloud: ☆⋆｡ ⊹┊۵ ♡ ✧ и т. п. */
const DECOR = /[^\p{L}0-9\s'’&().,!?:+\-]/gu;

/** Убирает из названия мусор: «(Official Video)», «[Remastered]», «feat. …», [2403137955], ☆⋆｡ и т. п. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\[\s*\d{5,}\s*\]|\(\s*\d{5,}\s*\)/g, "") // ID вроде [2403137955]
    .replace(/\s*[([](?:official|lyric|lyrics|audio|video|clip|mv|hd|hq|remaster|remastered|live|explicit|clean|prod\.?|feat\.?|ft\.?|клип|премьера|slowed|sped up|speed up|reverb|nightcore)[^)\]]*[)\]]/gi, "")
    .replace(/\s+(?:feat\.?|ft\.?)\s.+$/i, "")
    .replace(/\s+-\s+(?:remaster(?:ed)?|single version|radio edit).*$/i, "")
    .replace(DECOR, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, "")
    .trim();
}

/** Есть ли в строке хоть одна буква (исполнитель «☆⋆｡» — не исполнитель). */
export const hasLetters = (s: string) => /\p{L}/u.test(s);

/** Первый исполнитель из «A, B & C» / «A feat. B». */
export function mainArtist(artist: string): string {
  const a = cleanTitle(artist);
  return a.split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bx\b|;)\s*/i)[0]!.trim() || a;
}

/** Варианты «исполнитель + название», которые стоит попробовать — от самого точного. */
export function queryVariants(title: string, artist: string): { track: string; artist?: string }[] {
  const out: { track: string; artist?: string }[] = [];
  const add = (track: string, a?: string) => {
    const t = track.trim();
    if (!t || !hasLetters(t)) return;
    const key = `${t}|${a ?? ""}`.toLowerCase();
    if (!out.some((o) => `${o.track}|${o.artist ?? ""}`.toLowerCase() === key)) out.push(a && hasLetters(a) ? { track: t, artist: a } : { track: t });
  };
  const t = cleanTitle(title);
  const a = mainArtist(artist);
  if (hasLetters(a) && !/^неизвестный исполнитель$/i.test(a)) add(t, a);
  // «Исполнитель - Песня» в самом названии (частая история с файлами из интернета)
  const m = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) add(m[2]!, mainArtist(m[1]!));
  add(t);
  // без уточнения в скобках: «Botsu 8 (The Last Dance Song)» → «Botsu 8»
  const bare = t.replace(/\s*[([][^)\]]*[)\]]\s*/g, " ").trim();
  if (bare !== t) add(bare);
  return out;
}

interface LrclibRecord {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

function fromRecord(r: LrclibRecord): Lyrics {
  if (r.syncedLyrics) return { ...parseLrc(r.syncedLyrics), synced: true, source: "lrclib" };
  if (r.plainLyrics) return { synced: false, lines: plainLines(r.plainLyrics), source: "lrclib" };
  return NONE;
}

export class LyricsService {
  constructor(
    private cacheDir: string,
    private trackPath: (id: string) => string | undefined,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async get(q: LyricsQuery): Promise<Lyrics> {
    const local = await this.fromFile(q);
    if (local) return local;
    if (!q.title.trim()) return NONE;

    await mkdir(this.cacheDir, { recursive: true });
    const key = createHash("sha1")
      // v3: после улучшения поиска старые результаты больше не действуют
      .update(`v3|${q.artist}|${q.title}|${Math.round(q.duration ?? 0)}`.toLowerCase())
      .digest("hex");
    const cacheFile = join(this.cacheDir, `${key}.json`);
    if (existsSync(cacheFile)) {
      const cached = JSON.parse(await readFile(cacheFile, "utf8")) as Lyrics;
      const age = Date.now() - (await stat(cacheFile)).mtimeMs;
      if (cached.lines.length > 0 || age < NOT_FOUND_TTL) return cached;
    }

    let result = NONE;
    try {
      result = await this.fromLrclib(q);
    } catch (err) {
      // Нет сети — не кэшируем «не найдено», попробуем в следующий раз.
      console.warn("LRCLIB недоступен:", err instanceof Error ? err.message : err);
      return NONE;
    }
    await writeFile(cacheFile, JSON.stringify(result));
    return result;
  }

  private async fromFile(q: LyricsQuery): Promise<Lyrics | undefined> {
    if (!q.trackId) return undefined;
    const path = this.trackPath(q.trackId);
    if (!path) return undefined;

    const lrc = lrcPathFor(path);
    if (existsSync(lrc)) {
      const parsed = parseLrc(await readFile(lrc, "utf8"));
      if (parsed.lines.length) return { ...parsed, source: "file" };
    }

    try {
      const meta = await parseFile(path, { skipCovers: true });
      const tags = (meta.common as { lyrics?: { text?: string; syncText?: { text: string; timestamp?: number }[] }[] })
        .lyrics;
      for (const tag of tags ?? []) {
        if (tag.syncText?.length) {
          const lines = tag.syncText
            .filter((l) => l.text?.trim())
            .map((l) => ({ time: (l.timestamp ?? 0) / 1000, text: l.text.trim() }));
          if (lines.length) return { synced: true, lines, source: "tags" };
        }
        if (tag.text?.trim()) {
          const parsed = parseLrc(tag.text);
          if (parsed.lines.length) return { ...parsed, source: "tags" };
        }
      }
    } catch {
      // нет тегов — не страшно
    }
    return undefined;
  }

  private async request(path: string, params: Record<string, string>): Promise<Response> {
    const url = `https://lrclib.net/api/${path}?${new URLSearchParams(params)}`;
    return this.fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
  }

  private async fromLrclib(q: LyricsQuery): Promise<Lyrics> {
    const near = (r: LrclibRecord) => !q.duration || !r.duration || Math.abs(r.duration - q.duration) <= 5;
    const pick = (list: LrclibRecord[]) => {
      // Одну песню в базу часто заливают много раз с разной длиной — берём ту, что ближе всего к нашему файлу.
      const diff = (r: LrclibRecord) => (q.duration && r.duration ? Math.abs(r.duration - q.duration) : 0);
      const ok = list.filter((r) => !r.instrumental).sort((a, b) => diff(a) - diff(b));
      const best = ok.find((r) => r.syncedLyrics && near(r)) ?? ok.find((r) => r.plainLyrics && near(r));
      return best ? fromRecord(best) : undefined;
    };
    let plain: Lyrics | undefined;
    const take = (l: Lyrics | undefined): Lyrics | undefined => {
      if (!l?.lines.length) return undefined;
      if (l.synced) return l;
      plain ??= l; // запомним простой текст, но поищем ещё с таймингом
      return undefined;
    };

    for (const v of queryVariants(q.title, q.artist)) {
      if (v.artist) {
        const params: Record<string, string> = { track_name: v.track, artist_name: v.artist };
        if (q.duration) params.duration = String(Math.round(q.duration));
        const exact = await this.request("get", params);
        if (exact.ok) {
          const l = take(fromRecord((await exact.json()) as LrclibRecord));
          if (l) return l;
        } else if (exact.status !== 404) throw new Error(`LRCLIB ответил ${exact.status}`);
      }
      const search = await this.request("search", v.artist ? { track_name: v.track, artist_name: v.artist } : { q: v.track });
      if (!search.ok) throw new Error(`LRCLIB ответил ${search.status}`);
      const l = take(pick((await search.json()) as LrclibRecord[]));
      if (l) return l;
    }
    return plain ?? NONE;
  }
}
