// Интернет для ИИ: прочитать страницу по ссылке. Только публичные сайты: адреса домашней сети и самого
// компьютера (и перенаправления туда) не открываем — чтобы чужая ссылка не «заглянула» в локальную сеть.
// Текст страницы — это данные, а не команды (так и говорим модели).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function isPrivateIp(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number) as [number, number];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}

type HostLookup = (host: string) => Promise<string[]>;
let hostLookup: HostLookup = async (host) => (await lookup(host, { all: true })).map((a) => a.address);
/** Для тестов. */
export function setWebLookup(fn: HostLookup): void {
  hostLookup = fn;
}

async function isLocal(u: URL): Promise<boolean> {
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(localhost|local|internal|lan|home|arpa)$/.test(host)) return true;
  if (isIP(host)) return isPrivateIp(host);
  const ips = await hostLookup(host).catch(() => [] as string[]);
  return ips.length === 0 || ips.some(isPrivateIp);
}

/** Скачать по ссылке только с публичного сайта: каждое перенаправление тоже проверяется. */
export async function safeFetch(raw: string, fetchImpl: typeof fetch = fetch, init: { accept?: string; timeoutMs?: number } = {}): Promise<{ res: Response; url: string }> {
  let cur: URL;
  try {
    cur = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Это не похоже на ссылку");
  }
  for (let hop = 0; hop < 6; hop++) {
    if (!/^https?:$/.test(cur.protocol)) throw new Error("Такие ссылки не открываю");
    if (await isLocal(cur)) throw new Error("Это адрес домашней сети или компьютера — такие не открываю");
    const res = await fetchImpl(cur.href, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (Camado study assistant)", Accept: init.accept ?? "*/*" },
      signal: AbortSignal.timeout(init.timeoutMs ?? 20_000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = new URL(loc, cur);
      continue;
    }
    if (!res.ok) throw new Error(`Сайт ответил ошибкой ${res.status}`);
    return { res, url: cur.href };
  }
  throw new Error("Слишком много перенаправлений");
}

/** HTML → читаемый текст: без скриптов, стилей и разметки, ссылки — «текст (адрес)». */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, t: string) => `${t.replace(/<[^>]+>/g, "")} (${href})`)
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

/** Открыть публичную страницу и вернуть её текст (до limit символов). */
export async function readPage(raw: string, fetchImpl: typeof fetch = fetch, limit = 12_000): Promise<{ title: string; text: string; url: string }> {
  let cur: URL;
  try {
    cur = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Это не похоже на ссылку");
  }
  for (let hop = 0; hop < 6; hop++) {
    if (!/^https?:$/.test(cur.protocol)) throw new Error("Такие ссылки не открываю");
    if (await isLocal(cur)) throw new Error("Это адрес домашней сети или компьютера — такие не открываю");
    const res = await fetchImpl(cur.href, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (Camado study assistant)", Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(20_000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = new URL(loc, cur);
      continue;
    }
    if (!res.ok) throw new Error(`Сайт ответил ошибкой ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text|json|xml/.test(type)) throw new Error(`Это не страница, а файл (${type.split(";")[0] || "неизвестный тип"})`);
    const body = (await res.text()).slice(0, 2_000_000);
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.trim() ?? cur.hostname;
    const text = /html/.test(type) ? htmlToText(body) : body;
    return { title, text: text.slice(0, limit), url: cur.href };
  }
  throw new Error("Слишком много перенаправлений");
}
