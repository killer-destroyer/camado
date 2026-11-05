// Музыка по ссылке: прямая ссылка на файл (mp3, flac…) или страница, на которой лежит аудио.
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { AUDIO_EXT } from "./library.js";

const MAX_BYTES = 600 * 1024 * 1024;
const MAX_HTML = 5 * 1024 * 1024;

// Эти сервисы не отдают файлы — с них скачать нельзя, говорим об этом сразу и честно.
const STREAMING = /(^|\.)(youtube\.com|youtu\.be|music\.yandex\.[a-z]+|soundcloud\.com|spotify\.com|music\.apple\.com|vk\.com|vk\.ru|deezer\.com|tidal\.com|zvuk\.com)$/i;

const TYPE_EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
  "audio/opus": ".opus",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm",
};

export interface AudioLink {
  url: string;
  name: string;
}

export type ImportResult =
  | { kind: "saved"; file: string; name: string }
  | { kind: "choose"; links: AudioLink[] }
  | { kind: "error"; error: string };

const isAudioPath = (u: URL) => AUDIO_EXT.has(extname(decodeURIComponent(u.pathname)).toLowerCase());

function nameFromUrl(u: URL): string {
  const n = decodeURIComponent(basename(u.pathname)) || "трек";
  return n.replace(/\.[^.]+$/, "") || "трек";
}

/** Ищет на странице ссылки на аудио: <audio>, <source>, og:audio и обычные ссылки на файлы. */
export function findAudioLinks(html: string, pageUrl: string): AudioLink[] {
  const found = new Map<string, AudioLink>();
  const add = (raw: string) => {
    const cleaned = raw.trim().replace(/&amp;/g, "&");
    if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:")) return;
    let u: URL;
    try {
      u = new URL(cleaned, pageUrl);
    } catch {
      return;
    }
    if (!/^https?:$/.test(u.protocol)) return;
    if (!found.has(u.href)) found.set(u.href, { url: u.href, name: nameFromUrl(u) });
  };
  const attr = /<(?:audio|source)\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi;
  const meta = /<meta\b[^>]*?(?:property|name)\s*=\s*["']og:audio(?::url|:secure_url)?["'][^>]*?content\s*=\s*["']([^"']+)["']/gi;
  const meta2 = /<meta\b[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?(?:property|name)\s*=\s*["']og:audio(?::url|:secure_url)?["']/gi;
  const href = /\shref\s*=\s*["']([^"']+\.(?:mp3|flac|m4a|aac|ogg|opus|wav|webm)(?:\?[^"']*)?)["']/gi;
  for (const re of [attr, meta, meta2, href]) for (const m of html.matchAll(re)) add(m[1]!);
  return [...found.values()];
}

function fileName(res: Response, u: URL): { name: string; ext: string } {
  const cd = res.headers.get("content-disposition") ?? "";
  const star = cd.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
  const plain = cd.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  let raw = star ? decodeURIComponent(star.trim().replace(/^"|"$/g, "")) : plain ?? decodeURIComponent(basename(u.pathname));
  raw = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || "трек";
  let ext = extname(raw).toLowerCase();
  if (!AUDIO_EXT.has(ext)) {
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    ext = TYPE_EXT[type] ?? ".mp3";
  } else raw = raw.slice(0, -ext.length);
  return { name: raw.slice(0, 150), ext };
}

function freePath(dir: string, name: string, ext: string): string {
  let p = join(dir, name + ext);
  for (let i = 2; existsSync(p); i++) p = join(dir, `${name} (${i})${ext}`);
  return p;
}

export async function importFromUrl(
  raw: string,
  destDir: string,
  onProgress: (p: { name: string; received: number; total: number }) => void = () => {},
  fetchImpl: typeof fetch = fetch,
): Promise<ImportResult> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { kind: "error", error: "Это не похоже на ссылку. Скопируй её из адресной строки целиком." };
  }
  if (!/^https?:$/.test(u.protocol)) return { kind: "error", error: "Нужна ссылка, начинающаяся с http:// или https://" };
  if (STREAMING.test(u.hostname)) {
    return {
      kind: "error",
      error:
        "С этого сервиса скачать нельзя: он не отдаёт файлы, а только проигрывает у себя. Нужна прямая ссылка на файл (mp3, flac…) или страница, где файл лежит для скачивания.",
    };
  }

  let res: Response;
  try {
    res = await fetchImpl(u.href, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
  } catch {
    return { kind: "error", error: "Сайт не ответил. Проверь интернет и ссылку." };
  }
  if (!res.ok) return { kind: "error", error: `Сайт ответил ошибкой ${res.status}. Возможно, ссылка устарела.` };

  const finalUrl = new URL(res.url || u.href);
  const type = (res.headers.get("content-type") ?? "").toLowerCase();

  if (type.includes("text/html")) {
    const html = (await res.text()).slice(0, MAX_HTML);
    const links = findAudioLinks(html, finalUrl.href);
    if (links.length === 0) return { kind: "error", error: "На этой странице не нашлось музыки для скачивания." };
    if (links.length === 1) return importFromUrl(links[0]!.url, destDir, onProgress, fetchImpl);
    return { kind: "choose", links };
  }

  if (!type.startsWith("audio/") && !(isAudioPath(finalUrl) && /octet-stream|^$/.test(type.split(";")[0]!.trim()))) {
    return { kind: "error", error: "По ссылке не музыка. Нужен файл mp3, flac, m4a, ogg, opus или wav." };
  }
  const total = Number(res.headers.get("content-length") ?? 0);
  if (total > MAX_BYTES) return { kind: "error", error: "Файл слишком большой (больше 600 МБ)." };
  if (!res.body) return { kind: "error", error: "Сайт прислал пустой ответ." };

  await mkdir(destDir, { recursive: true });
  const { name, ext } = fileName(res, finalUrl);
  const target = freePath(destDir, name, ext);
  const part = `${target}.part`;
  let received = 0;
  let lastReport = 0;
  const counter = Readable.fromWeb(res.body as unknown as WebReadableStream).on("data", (chunk: Buffer) => {
    received += chunk.length;
    if (received > MAX_BYTES) counter.destroy(new Error("слишком большой файл"));
    const now = Date.now();
    if (now - lastReport > 200) {
      lastReport = now;
      onProgress({ name, received, total });
    }
  });
  try {
    await pipeline(counter, createWriteStream(part));
    await rename(part, target);
  } catch {
    await rm(part, { force: true });
    return { kind: "error", error: "Скачивание оборвалось. Попробуй ещё раз." };
  }
  onProgress({ name, received, total: total || received });
  return { kind: "saved", file: target, name };
}
