// Поиск бесплатной музыки: Internet Archive (archive.org) — миллионы записей, которые
// авторы и лейблы выложили для свободного скачивания. Без ключей и без регистрации.
import type { AudioLink } from "./download.js";

export interface FreeAlbum {
  id: string;
  title: string;
  artist: string;
  cover: string;
  downloads: number;
}

const UA = { "User-Agent": "Camado (study assistant)" };
const pick = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? "") : v == null ? "" : String(v));

/** Убираем из запроса символы, которые ломают поиск archive.org. */
const clean = (q: string) => q.replace(/[():"\\[\]{}^~*?!]/g, " ").replace(/\s+/g, " ").trim();

export async function searchFree(query: string, fetchImpl: typeof fetch = fetch): Promise<FreeAlbum[]> {
  const q = clean(query);
  if (!q) return [];
  const u = new URL("https://archive.org/advancedsearch.php");
  u.searchParams.set("q", `(title:(${q}) OR creator:(${q})) AND mediatype:(audio) AND -collection:(podcasts OR radioprograms)`);
  for (const f of ["identifier", "title", "creator", "downloads"]) u.searchParams.append("fl[]", f);
  u.searchParams.append("sort[]", "downloads desc");
  u.searchParams.set("rows", "30");
  u.searchParams.set("output", "json");
  const res = await fetchImpl(u.href, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`archive.org ответил ${res.status}`);
  const body = (await res.json()) as { response?: { docs?: Record<string, unknown>[] } };
  return (body.response?.docs ?? []).map((d) => {
    const id = pick(d.identifier);
    return {
      id,
      title: pick(d.title) || id,
      artist: pick(d.creator) || "Неизвестный исполнитель",
      cover: `https://archive.org/services/img/${encodeURIComponent(id)}`,
      downloads: Number(d.downloads ?? 0),
    };
  });
}

interface IaFile {
  name: string;
  format?: string;
  source?: string;
  title?: string;
  track?: string;
  length?: string;
}

const FORMAT_RANK: Record<string, number> = { "VBR MP3": 3, MP3: 3, "128Kbps MP3": 2, "64Kbps MP3": 1, Flac: 2, "Ogg Vorbis": 1 };

/** Треки одной записи: по одному файлу на трек, предпочитаем mp3. */
export async function freeTracks(id: string, fetchImpl: typeof fetch = fetch): Promise<AudioLink[]> {
  if (!/^[\w.-]+$/.test(id)) return [];
  const res = await fetchImpl(`https://archive.org/metadata/${id}`, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`archive.org ответил ${res.status}`);
  const body = (await res.json()) as { files?: IaFile[] };
  const best = new Map<string, IaFile>();
  for (const f of body.files ?? []) {
    const rank = FORMAT_RANK[f.format ?? ""];
    if (!rank) continue;
    const key = f.name.replace(/\.[^.]+$/, "").replace(/_(vbr|64kb|128kb)$/i, "");
    const cur = best.get(key);
    if (!cur || rank > (FORMAT_RANK[cur.format ?? ""] ?? 0)) best.set(key, f);
  }
  return [...best.values()]
    .sort((a, b) => Number(a.track ?? 0) - Number(b.track ?? 0) || a.name.localeCompare(b.name))
    .map((f) => ({
      url: `https://archive.org/download/${id}/${f.name.split("/").map(encodeURIComponent).join("/")}`,
      name: f.title?.trim() || f.name.replace(/\.[^.]+$/, ""),
    }));
}
