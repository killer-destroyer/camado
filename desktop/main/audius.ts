// Audius — открытая музыкальная платформа: музыканты сами выкладывают треки, у неё есть официальный API для
// сторонних программ (слушать потоком можно, это не обход стриминга). Много жанров и русскоязычных исполнителей.
import type { Track } from "../shared/types.js";
import { webId } from "./wave.js";

const API = "https://api.audius.co/v1";
const APP = "camado";

interface AudiusTrack {
  id: string;
  title: string;
  genre?: string | null;
  mood?: string | null;
  duration?: number;
  play_count?: number;
  permalink?: string;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  is_delete?: boolean;
  artwork?: Record<string, string> | null;
  user?: { name?: string; handle?: string };
}

export const audiusStreamUrl = (id: string) => `${API}/tracks/${encodeURIComponent(id)}/stream?app_name=${APP}`;

export function toTrack(t: AudiusTrack): Track | undefined {
  if (!t?.id || t.is_delete || t.is_streamable === false || t.is_stream_gated) return undefined;
  const dur = t.duration ?? 0;
  if (dur < 60 || dur > 15 * 60) return undefined;
  const url = audiusStreamUrl(t.id);
  return {
    id: webId(url),
    path: url,
    title: (t.title ?? "").trim() || "Без названия",
    artist: t.user?.name?.trim() || t.user?.handle || "Audius",
    album: t.genre ?? "",
    duration: dur,
    hasLyrics: false,
    cover: t.artwork?.["480x480"] ?? t.artwork?.["150x150"],
    web: {
      url,
      source: "Audius",
      page: t.permalink ? `https://audius.co${t.permalink}` : undefined,
      tags: [t.genre, t.mood].filter((x): x is string => !!x),
      plays: t.play_count ?? 0,
    },
  };
}

async function get(path: string, fetchImpl: typeof fetch): Promise<AudiusTrack[]> {
  const res = await fetchImpl(`${API}${path}${path.includes("?") ? "&" : "?"}app_name=${APP}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { data?: AudiusTrack[] };
  return Array.isArray(body.data) ? body.data : [];
}

const tracks = (list: AudiusTrack[]) => list.map(toTrack).filter((t): t is Track => !!t);

/** Популярное в жанре: за неделю, месяц или всё время. */
export async function audiusTrending(genre: string, time: "week" | "month" | "allTime", fetchImpl: typeof fetch): Promise<Track[]> {
  return tracks(await get(`/tracks/trending?genre=${encodeURIComponent(genre)}&time=${time}`, fetchImpl));
}

/** Поиск: исполнитель, слово; genre — только в этом жанре. */
export async function audiusSearch(query: string, fetchImpl: typeof fetch, genre?: string): Promise<Track[]> {
  const q = query.replace(/[^\p{L}\p{N} '&.-]+/gu, " ").trim().slice(0, 60);
  if (!q) return [];
  return tracks(await get(`/tracks/search?query=${encodeURIComponent(q)}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`, fetchImpl));
}

/** Частые русские слова в названиях — так находятся русскоязычные песни (поиск Audius ищет по словам). */
export const RU_WORDS = ["любовь", "песня", "ночь", "мама", "город", "зима", "лето", "сердце", "небо", "мечта", "дождь", "танцы", "москва", "друг", "домой", "звезды", "грусть", "море", "весна", "снег", "улица", "кавер", "рэп", "рок", "душа", "один", "навсегда", "мой", "тебя", "жизнь"];
