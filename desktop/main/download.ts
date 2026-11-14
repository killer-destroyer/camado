// Музыка по ссылке: прямая ссылка на файл (mp3, flac…) или страница, на которой лежит аудио.
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AUDIO_EXT } from "./library.js";

const MAX_BYTES = 600 * 1024 * 1024;
const MAX_HTML = 5 * 1024 * 1024;

// Эти сервисы не отдают файлы — с них скачать нельзя, говорим об этом сразу и честно.
const STREAMING =
  /(^|\.)(youtube\.com|youtu\.be|music\.yandex\.[a-z]+|soundcloud\.com|spotify\.com|music\.apple\.com|vk\.com|vk\.ru|deezer\.com|tidal\.com|zvuk\.com)$/i;

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

// ---------- Никаких адресов домашней сети ----------
// Страница со списком треков могла бы подсунуть ссылку на роутер, принтер или сам компьютер
// (192.168.x.x, localhost). Камадо качает только из интернета.

/** Адрес из домашней/служебной сети (не интернет). */
export function isPrivateIp(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}

type HostLookup = (host: string) => Promise<string[]>;
let hostLookup: HostLookup = async (host) => (await lookup(host, { all: true })).map((a) => a.address);
/** Для тестов: подменить, как узнаётся IP по имени сайта. */
export function setHostLookup(fn: HostLookup): void {
  hostLookup = fn;
}

const LOCAL_ONLY = "Это адрес домашней сети или самого компьютера — оттуда Камадо не скачивает. Нужна ссылка из интернета.";

export async function isLocalHost(u: URL): Promise<boolean> {
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(localhost|local|internal|lan|home|arpa)$/.test(host)) return true;
  if (isIP(host)) return isPrivateIp(host);
  const ips = await hostLookup(host).catch(() => [] as string[]);
  return ips.some(isPrivateIp);
}

/**
 * Сайты, которые отдают файл только «со своей страницы» (защита от чужих ссылок): ccMixter отвечает 403 на прямую
 * ссылку на mp3. Ставим их собственную страницу — как будто нажал «скачать» на сайте (файлы там выложены для скачивания).
 */
export function siteReferer(u: URL): string | undefined {
  return /(^|\.)ccmixter\.org$/i.test(u.hostname) ? "https://ccmixter.org/" : undefined;
}

/** Запрос с проверкой каждого перенаправления: сайт не может «перекинуть» Камадо в домашнюю сеть. */
async function publicFetch(
  start: URL,
  fetchImpl: typeof fetch,
  init: RequestInit = {},
): Promise<{ res: Response; url: URL } | { error: string }> {
  let cur = start;
  for (let hop = 0; hop < 8; hop++) {
    if (!/^https?:$/.test(cur.protocol)) return { error: "Сайт перенаправил на неподдерживаемый адрес." };
    if (await isLocalHost(cur)) return { error: LOCAL_ONLY };
    const ref = siteReferer(cur);
    const headers = ref ? { ...(init.headers as Record<string, string> | undefined), Referer: ref } : init.headers;
    const res = await fetchImpl(cur.href, { ...init, headers, redirect: "manual" });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = new URL(loc, cur);
      continue;
    }
    return { res, url: res.url ? new URL(res.url) : cur };
  }
  return { error: "Слишком много перенаправлений." };
}

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
  let raw = star ? decodeURIComponent(star.trim().replace(/^"|"$/g, "")) : (plain ?? decodeURIComponent(basename(u.pathname)));
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

/**
 * Ссылки «поделиться» с облаков ведут на страницу просмотра, а не на файл.
 * Превращаем их в прямые ссылки на скачивание (только публичные файлы — без входа в чужие аккаунты).
 */
export async function resolveCloud(u: URL, fetchImpl: typeof fetch = fetch): Promise<URL | { links: AudioLink[] } | { error: string }> {
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  // Dropbox: ?dl=0 → ?dl=1
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) {
    const d = new URL(u);
    d.searchParams.set("dl", "1");
    return d;
  }
  // Google Диск: /file/d/ID/view, /open?id=ID, /uc?id=ID
  if (host === "drive.google.com" || host === "docs.google.com") {
    const id = u.pathname.match(/\/file\/d\/([\w-]{10,})/)?.[1] ?? u.searchParams.get("id");
    if (!id) return { error: "Это папка Google Диска или документ. Открой нужный файл и скопируй ссылку на него." };
    return new URL(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`);
  }
  // Яндекс Диск: публичная ссылка → официальный API отдаёт адрес файла (для папки — список треков)
  if (/^(disk\.yandex\.[a-z]+|yadi\.sk)$/.test(host) || host === "cloud-api.yandex.net") {
    const api = host === "cloud-api.yandex.net" ? u : new URL("https://cloud-api.yandex.net/v1/disk/public/resources/download");
    if (host !== "cloud-api.yandex.net") api.searchParams.set("public_key", u.href);
    const res = await fetchImpl(api.href, { signal: AbortSignal.timeout(15_000) }).catch(() => undefined);
    if (res?.ok) {
      const href = ((await res.json()) as { href?: string }).href;
      if (href) return new URL(href);
    }
    // Может, это папка: смотрим, какие в ней треки.
    const list = new URL("https://cloud-api.yandex.net/v1/disk/public/resources");
    list.searchParams.set("public_key", api.searchParams.get("public_key") ?? u.href);
    list.searchParams.set("limit", "200");
    const lr = await fetchImpl(list.href, { signal: AbortSignal.timeout(15_000) }).catch(() => undefined);
    if (!lr?.ok) return { error: "Яндекс Диск не отдал файл. Проверь, что ссылка публичная." };
    const body = (await lr.json()) as { _embedded?: { items?: { type: string; name: string; path: string; mime_type?: string }[] } };
    const items = (body._embedded?.items ?? []).filter(
      (i) => i.type === "file" && (i.mime_type?.startsWith("audio/") || AUDIO_EXT.has(extname(i.name).toLowerCase())),
    );
    if (!items.length) return { error: "В этой папке на Яндекс Диске нет музыки." };
    return {
      links: items.map((i) => {
        const d = new URL("https://cloud-api.yandex.net/v1/disk/public/resources/download");
        d.searchParams.set("public_key", list.searchParams.get("public_key")!);
        d.searchParams.set("path", i.path);
        return { url: d.href, name: i.name.replace(/\.[^.]+$/, "") };
      }),
    };
  }
  return u;
}

/** Вставили не ссылку, а код страницы (HTML): ищем в нём музыку. */
export async function importFromHtml(
  html: string,
  baseUrl: string | undefined,
  destDir: string,
  onProgress: (p: { name: string; received: number; total: number }) => void = () => {},
  fetchImpl: typeof fetch = fetch,
): Promise<ImportResult> {
  const base =
    baseUrl?.trim() ||
    html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ||
    html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta\b[^>]*property\s*=\s*["']og:url["'][^>]*content\s*=\s*["']([^"']+)["']/i)?.[1];
  const links = findAudioLinks(html.slice(0, MAX_HTML), base ?? "https://camado.invalid/").filter(
    (l) => !l.url.startsWith("https://camado.invalid/"),
  );
  if (!links.length) {
    return {
      kind: "error",
      error: base
        ? "В этом коде не нашлось ссылок на музыку."
        : "В коде нет полных ссылок на музыку. Вставь лучше адрес страницы из адресной строки.",
    };
  }
  if (links.length === 1) return importFromUrl(links[0]!.url, destDir, onProgress, fetchImpl);
  return { kind: "choose", links };
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

  if (await isLocalHost(u)) return { kind: "error", error: LOCAL_ONLY };
  const cloud = await resolveCloud(u, fetchImpl).catch(() => u);
  if ("error" in cloud) return { kind: "error", error: cloud.error };
  if ("links" in cloud)
    return cloud.links.length === 1
      ? importFromUrl(cloud.links[0]!.url, destDir, onProgress, fetchImpl)
      : { kind: "choose", links: cloud.links };
  u = cloud;

  let res: Response;
  let finalUrl: URL;
  try {
    const r = await publicFetch(u, fetchImpl, { signal: AbortSignal.timeout(30_000) });
    if ("error" in r) return { kind: "error", error: r.error };
    res = r.res;
    finalUrl = r.url;
  } catch {
    return { kind: "error", error: "Сайт не ответил. Проверь интернет и ссылку." };
  }
  if (!res.ok) return { kind: "error", error: `Сайт ответил ошибкой ${res.status}. Возможно, ссылка устарела.` };

  const type = (res.headers.get("content-type") ?? "").toLowerCase();

  if (type.includes("text/html")) {
    const html = (await res.text()).slice(0, MAX_HTML);
    const links = findAudioLinks(html, finalUrl.href);
    if (links.length === 0) return { kind: "error", error: "На этой странице не нашлось музыки для скачивания." };
    if (links.length === 1) return importFromUrl(links[0]!.url, destDir, onProgress, fetchImpl);
    return { kind: "choose", links };
  }

  // Облака часто отдают «просто файл» (octet-stream) — тогда смотрим на имя файла в ссылке или в заголовке.
  const cdName = res.headers.get("content-disposition")?.match(/filename\*?\s*=\s*(?:UTF-8'')?"?([^";]+)/i)?.[1] ?? "";
  const audioByName = isAudioPath(finalUrl) || AUDIO_EXT.has(extname(decodeURIComponent(cdName)).toLowerCase());
  if (!type.startsWith("audio/") && !(audioByName && /octet-stream|binary|^$/.test(type.split(";")[0]!.trim()))) {
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
