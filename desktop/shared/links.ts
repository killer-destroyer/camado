// Ссылки на уроки: вытащить все ссылки из вставленного текста, понять сервис, придумать название.

export interface Service {
  id: string;
  name: string;
}

const SERVICES: { re: RegExp; id: string; name: string }[] = [
  { re: /(^|\.)zoom\.(us|com)$/, id: "zoom", name: "Zoom" },
  { re: /^meet\.google\.com$/, id: "meet", name: "Google Meet" },
  { re: /(^|\.)teams\.(microsoft|live)\.com$/, id: "teams", name: "Teams" },
  { re: /(^|\.)telemost\.yandex\.[a-z]+$/, id: "telemost", name: "Телемост" },
  { re: /(^|\.)(t\.me|telegram\.me|telegram\.org)$/, id: "telegram", name: "Telegram" },
  { re: /(^|\.)(discord\.gg|discord\.com)$/, id: "discord", name: "Discord" },
  { re: /^(docs|drive|classroom|forms|sites)\.google\.com$/, id: "google", name: "Google" },
  { re: /(^|\.)(disk\.yandex\.[a-z]+|yadi\.sk)$/, id: "yadisk", name: "Яндекс Диск" },
  { re: /(^|\.)dropbox\.com$/, id: "dropbox", name: "Dropbox" },
  { re: /(^|\.)(youtube\.com|youtu\.be)$/, id: "youtube", name: "YouTube" },
  { re: /(^|\.)github\.com$/, id: "github", name: "GitHub" },
  { re: /(^|\.)notion\.(so|site)$/, id: "notion", name: "Notion" },
  { re: /(^|\.)stepik\.org$/, id: "stepik", name: "Stepik" },
  { re: /(^|\.)(coursera\.org|edx\.org|udemy\.com)$/, id: "course", name: "Курс" },
  { re: /(^|\.)instructure\.com$|^canvas\./, id: "lms", name: "Canvas" },
  { re: /(^|\.)blackboard\.com$/, id: "lms", name: "Blackboard" },
  { re: /moodle|lms|edu|learn/i, id: "lms", name: "Учебный сайт" },
];

export function serviceOf(url: string): Service {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { id: "web", name: "Сайт" };
  }
  if (/^docs\.google\.com$/.test(host)) {
    const kind = url.includes("/spreadsheets/") ? "Таблица" : url.includes("/presentation/") ? "Презентация" : url.includes("/forms/") ? "Форма" : "Документ";
    return { id: "google", name: `Google ${kind}` };
  }
  if (host === "drive.google.com") return { id: "google", name: "Google Диск" };
  if (host === "classroom.google.com") return { id: "google", name: "Google Classroom" };
  const hit = SERVICES.find((s) => s.re.test(host));
  return hit ? { id: hit.id, name: hit.name } : { id: "web", name: host || "Сайт" };
}

export interface FoundLink {
  url: string;
  title: string;
}

// http(s)://… или голый домен вида zoom.us/j/123, meet.google.com/abc-defg-hij
const URL_RE = /\bhttps?:\/\/[^\s<>"'«»]+|\b(?:[a-z0-9-]+\.)+(?:com|ru|org|net|us|me|io|gg|edu|so|site|sk|be|co)\/[^\s<>"'«»]*/gi;

/** Убрать с конца знаки препинания, которые прилипли к ссылке в тексте. */
function trimTail(u: string): string {
  let out = u.replace(/[.,;:!?…]+$/, "");
  // закрывающая скобка без открывающей — это скобка текста, не ссылки
  while (out.endsWith(")") && (out.match(/\(/g)?.length ?? 0) < (out.match(/\)/g)?.length ?? 0)) out = out.slice(0, -1);
  return out;
}

/** Подпись ссылки — текст той же строки без самой ссылки, без «ссылка:», эмодзи-стрелок и т. п. */
function labelFrom(line: string, url: string): string {
  return line
    .replace(url, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s.,()«»"'+#№/:-]/gu, " ")
    .replace(/\b(ссылк[аиу]|link|здесь|тут|вот|по ссылке|переходите|заходите)\b/giu, " ")
    .replace(/[\s:–—-]+$/u, "")
    .replace(/^[\s:–—-]+/u, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 80);
}

/** Все ссылки из текста (сообщение из чата, письмо, страница расписания), без повторов. */
export function extractLinks(text: string): FoundLink[] {
  const out: FoundLink[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    for (const m of line.matchAll(URL_RE)) {
      const raw = trimTail(m[0]);
      const url = /^https?:/i.test(raw) ? raw : `https://${raw}`;
      let key: string;
      try {
        key = new URL(url).toString();
      } catch {
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      const label = labelFrom(line, raw);
      out.push({ url: key, title: label.length >= 3 ? label : serviceOf(key).name });
    }
  }
  return out;
}
