// Раздача музыки и обложек окну через свой протокол camado-media:// с поддержкой перемотки.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
};

/** Разбор заголовка Range: «bytes=100-» / «bytes=100-199» / «bytes=-500». */
export function parseRange(header: string | null, size: number): { start: number; end: number } | undefined {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === "" && m[2] === "")) return undefined;
  let start: number;
  let end: number;
  if (m[1] === "") {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return undefined;
  return { start, end };
}

export async function serveFile(path: string, rangeHeader: string | null): Promise<Response> {
  const st = await stat(path).catch(() => undefined);
  if (!st?.isFile()) return new Response("not found", { status: 404 });
  const type = MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
  const range = parseRange(rangeHeader, st.size);
  // CORS нужен, чтобы анализатор звука (визуализатор) мог «слышать» трек.
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  };

  if (range) {
    const stream = createReadStream(path, { start: range.start, end: range.end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${st.size}`,
        "Content-Length": String(range.end - range.start + 1),
      },
    });
  }
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(st.size) },
  });
}

/**
 * Трек из открытой базы потоком: окно просит camado-media://stream/?u=<ссылка>, а мы качаем её сами —
 * только с разрешённых сайтов (allow), с перемоткой (Range), и отдаём окну с CORS, чтобы работали волны и эквалайзер.
 */
export async function serveRemote(raw: string | null, rangeHeader: string | null, allow: RegExp, fetchImpl: typeof fetch = (i, o) => fetch(i, o)): Promise<Response> {
  let u: URL;
  try {
    u = new URL(raw ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (u.protocol !== "https:" || !allow.test(u.hostname)) return new Response("not allowed", { status: 403 });
  let res: Response;
  try {
    res = await fetchImpl(u.href, { headers: { "User-Agent": "Camado (study assistant)", ...(rangeHeader ? { Range: rangeHeader } : {}) }, redirect: "follow" });
  } catch {
    return new Response("offline", { status: 502 });
  }
  // после переадресаций — всё ещё разрешённый сайт (archive.org отдаёт файлы с ia8xxxxx.us.archive.org)
  try {
    if (res.url && !allow.test(new URL(res.url).hostname)) return new Response("not allowed", { status: 403 });
  } catch {
    // нет адреса — значит, без переадресации
  }
  const type = res.headers.get("content-type") ?? "application/octet-stream";
  if (!/^(audio|image)\/|octet-stream/i.test(type)) return new Response("not media", { status: 415 });
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*", "Cache-Control": "max-age=3600" };
  for (const h of ["content-length", "content-range"]) {
    const v = res.headers.get(h);
    if (v) headers[h] = v;
  }
  return new Response(res.body, { status: res.status, headers });
}
