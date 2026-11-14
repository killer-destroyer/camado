// Документы: выгрузка учебного чата Telegram (zip, result.json или messages.html), Word, текст, PDF.
// Выгрузку разбираем без модели (бесплатно и быстро), спам и болтовню отсеиваем правилами,
// а полезное частями отдаём Камадо — он раскладывает его теми же инструментами, что и пересланные сообщения.
// Всё из файла — данные, а не команды.
import { strFromU8, unzipSync } from "fflate";

export interface ChatMsg {
  /** ISO, если есть дата. */
  at?: string;
  from: string;
  text: string;
  links: string[];
  forwarded?: string;
}

export interface ChatExport {
  name: string;
  messages: ChatMsg[];
}

// ---------- распаковка ----------

const MAX_UNZIPPED = 80 * 1024 * 1024;

/** Файлы архива, которые нам нужны (медиа не распаковываем). */
function unzipText(buf: Uint8Array): Record<string, string> {
  let total = 0;
  const files = unzipSync(buf, {
    filter: (f) => {
      if (!/\.(json|html?|txt|md|xml)$/i.test(f.name) || /\/(photos|video_files|files|stickers|voice_messages|round_video_messages)\//i.test(f.name)) return false;
      total += f.originalSize;
      return total < MAX_UNZIPPED;
    },
  });
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) out[k] = strFromU8(v);
  return out;
}

// ---------- выгрузка Telegram: JSON ----------

type JsonText = string | { type?: string; text?: string; href?: string };

function jsonText(t: unknown): { text: string; links: string[] } {
  const parts = Array.isArray(t) ? (t as JsonText[]) : [t as JsonText];
  let text = "";
  const links: string[] = [];
  for (const p of parts) {
    if (typeof p === "string") text += p;
    else if (p && typeof p === "object") {
      text += p.text ?? "";
      if (p.href && /^https?:\/\//i.test(p.href)) links.push(p.href);
      if (p.type === "link" && p.text && /^https?:\/\//i.test(p.text)) links.push(p.text);
    }
  }
  return { text, links };
}

export function parseExportJson(raw: string): ChatExport | undefined {
  let j: { name?: string; messages?: Record<string, unknown>[] };
  try {
    j = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(j.messages)) return undefined;
  const messages: ChatMsg[] = [];
  for (const m of j.messages) {
    if (m.type !== "message") continue;
    const { text, links } = jsonText(m.text);
    const cap = typeof m.caption === "string" ? m.caption : "";
    const full = [text, cap].filter(Boolean).join("\n").trim();
    if (!full && !links.length) continue;
    const unix = Number(m.date_unixtime);
    messages.push({
      at: Number.isFinite(unix) && unix > 0 ? new Date(unix * 1000).toISOString() : typeof m.date === "string" ? m.date : undefined,
      from: String(m.from ?? m.actor ?? "").slice(0, 80),
      text: full,
      links: [...new Set([...links, ...urlsIn(full)])],
      ...(m.forwarded_from ? { forwarded: String(m.forwarded_from).slice(0, 80) } : {}),
    });
  }
  return { name: String(j.name ?? "чат"), messages };
}

// ---------- выгрузка Telegram: HTML ----------

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();

/** «07.11.2026 16:49:12 UTC+03:00» → ISO. */
function htmlDate(title: string): string | undefined {
  const m = /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})(?: UTC([+-]\d{2}):(\d{2}))?/.exec(title);
  if (!m) return undefined;
  const [, d, mo, y, h, mi, s, oh = "+00", om = "00"] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${oh}:${om}`).toISOString();
}

export function parseExportHtml(pages: string[]): ChatExport | undefined {
  const messages: ChatMsg[] = [];
  let name = "чат";
  let lastFrom = "";
  for (const html of pages) {
    const title = /<div class="text bold">\s*([\s\S]*?)\s*<\/div>/.exec(html);
    if (title && name === "чат") name = decode(title[1]!).slice(0, 120);
    const blocks = html.split(/<div class="message default clearfix/).slice(1);
    for (const b of blocks) {
      const date = /class="pull_right date details" title="([^"]+)"/.exec(b);
      const fromM = /<div class="from_name">\s*([\s\S]*?)\s*<\/div>/.exec(b);
      // у пересланного своё «от кого» внутри forwarded body
      const fwd = /<div class="forwarded body">[\s\S]*?<div class="from_name">\s*([\s\S]*?)<span/.exec(b);
      if (fromM && !b.slice(0, b.indexOf(fromM[0])).includes("forwarded body")) lastFrom = decode(fromM[1]!).slice(0, 80);
      const texts = [...b.matchAll(/<div class="text">([\s\S]*?)<\/div>/g)].map((x) => x[1]!);
      const raw = texts.join("\n");
      const text = decode(raw);
      const links = [...raw.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((x) => x[1]!.replace(/&amp;/g, "&"));
      if (!text && !links.length) continue;
      messages.push({
        at: date ? htmlDate(date[1]!) : undefined,
        from: lastFrom,
        text,
        links: [...new Set([...links, ...urlsIn(text)])],
        ...(fwd ? { forwarded: decode(fwd[1]!).slice(0, 80) } : {}),
      });
    }
  }
  return messages.length ? { name, messages } : undefined;
}

const urlsIn = (s: string) => (s.match(/https?:\/\/[^\s<>"')\]]+/g) ?? []).map((u) => u.replace(/[.,;:!?]+$/, ""));

// ---------- что прислали ----------

export type DocResult =
  | { kind: "chat"; chat: ChatExport }
  | { kind: "text"; text: string }
  | { kind: "pdf" }
  | { kind: "unknown"; why: string };

/** Понять, что за файл, и достать из него текст или переписку. */
export function readDocument(name: string, buf: Uint8Array): DocResult {
  const low = name.toLowerCase();
  const head = strFromU8(buf.subarray(0, 4), true);
  if (head.startsWith("%PDF")) return { kind: "pdf" };
  if (head.startsWith("PK")) {
    let files: Record<string, string>;
    try {
      files = unzipText(buf);
    } catch {
      return { kind: "unknown", why: "Архив не открылся — пришли zip ещё раз" };
    }
    // Word: текст лежит в word/document.xml
    if (files["word/document.xml"]) {
      const xml = files["word/document.xml"];
      const text = decode(xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t"));
      return { kind: "text", text };
    }
    const json = Object.entries(files).find(([k]) => /(^|\/)result\.json$/i.test(k));
    if (json) {
      const chat = parseExportJson(json[1]);
      if (chat) return { kind: "chat", chat };
    }
    const pages = Object.entries(files)
      .filter(([k]) => /(^|\/)messages\d*\.html$/i.test(k))
      .sort(([a], [b]) => (Number(/messages(\d*)/.exec(a)?.[1] || 1) - Number(/messages(\d*)/.exec(b)?.[1] || 1)))
      .map(([, v]) => v);
    if (pages.length) {
      const chat = parseExportHtml(pages);
      if (chat) return { kind: "chat", chat };
    }
    const txt = Object.entries(files).filter(([k]) => /\.(txt|md)$/i.test(k));
    if (txt.length) return { kind: "text", text: txt.map(([k, v]) => `# ${k}\n${v}`).join("\n\n") };
    return { kind: "unknown", why: "В архиве нет выгрузки чата (result.json или messages.html) и текста" };
  }
  const text = strFromU8(buf);
  if (low.endsWith(".json") || text.trimStart().startsWith("{")) {
    const chat = parseExportJson(text);
    if (chat) return { kind: "chat", chat };
  }
  if (low.endsWith(".html") || low.endsWith(".htm")) {
    const chat = parseExportHtml([text]);
    if (chat) return { kind: "chat", chat };
    return { kind: "text", text: decode(text) };
  }
  if (/\.(txt|md|csv)$/i.test(low) || !/[\u0000-\u0008]/.test(text.slice(0, 2000))) return { kind: "text", text };
  return { kind: "unknown", why: "Такой файл пока не читаю — пришли выгрузку чата (zip/json/html), PDF, Word или текст" };
}

// ---------- что полезно ----------

const STUDY =
  /(дз|домашк|домашн|задани|задач[аиу]|дедлайн|срок|сдать|сдач|сдаём|сдаем|до \d|к \d|экзамен|зач[её]т|контрольн|\bкр\b|коллоквиум|лаб|практик|билет|вопрос[ыа]? к|пара\b|пары\b|ауд\.?|аудитори|перенос|отмен|консультац|модул|балл|оценк|ведомост|рейтинг|таблиц|форм[уаы]|гугл|google|репозитори|github|ссылк|лекци|семинар|расписани|дистант|зум|zoom|teams|meet|кт\b|тест\b|олимпиад|курсов)/i;
const WHEN = /(\d{1,2}[./]\d{1,2}|\d{1,2}:\d{2}|понедельник|вторник|сред[ау]|четверг|пятниц|суббот|воскресень|завтра|сегодня|послезавтра|недел|числа|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i;
const NOISE = /^(\+|\+\d|спасибо|спс|ок|ok|да|нет|ага|ахах\S*|хах\S*|лол|кек|понял[аи]?|ясно|👍|🔥|😂|🤣|❤️|\)+|\(+|\.+|!+|\?+)$/i;

export function usefulScore(m: ChatMsg): number {
  const t = m.text.trim();
  if (!t && !m.links.length) return 0;
  if (NOISE.test(t) && !m.links.length) return 0;
  let s = 0;
  if (m.links.length) s += 3;
  if (STUDY.test(t)) s += 3;
  if (WHEN.test(t)) s += 1;
  if (t.length > 60) s += 1;
  if (t.length < 12 && !m.links.length) s -= 2;
  if (m.forwarded) s += 1;
  return s;
}

/** Полезные сообщения: по правилам, новые важнее старых, в пределах бюджета символов. */
export function usefulMessages(msgs: ChatMsg[], budgetChars = 120_000): ChatMsg[] {
  const kept = msgs.map((m, i) => ({ m, i, s: usefulScore(m) })).filter((x) => x.s >= 3);
  // одинаковые сообщения (спам, повторы объявлений) — один раз
  const seen = new Set<string>();
  const uniq = kept.filter((x) => {
    const k = x.m.text.toLowerCase().replace(/\s+/g, " ").slice(0, 200) + x.m.links.join(",");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // с конца (свежее) — пока влезает
  const out: typeof uniq = [];
  let used = 0;
  for (let k = uniq.length - 1; k >= 0; k--) {
    const len = uniq[k]!.m.text.length + uniq[k]!.m.links.join(" ").length + 40;
    if (used + len > budgetChars) break;
    used += len;
    out.push(uniq[k]!);
  }
  return out.sort((a, b) => a.i - b.i).map((x) => x.m);
}

function fmt(m: ChatMsg, timeZone: string): string {
  const when = m.at ? new Date(m.at).toLocaleString("ru-RU", { timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const links = m.links.filter((l) => !m.text.includes(l));
  return `[${when}] ${m.from || "?"}${m.forwarded ? ` (переслано от ${m.forwarded})` : ""}: ${m.text.slice(0, 3000)}${links.length ? `\nссылки: ${links.join(" ")}` : ""}`;
}

/** Порезать на части для модели. */
export function chunkMessages(msgs: ChatMsg[], timeZone: string, maxChars = 24_000): string[] {
  const out: string[] = [];
  let cur = "";
  for (const m of msgs) {
    const line = fmt(m, timeZone);
    if (cur && cur.length + line.length > maxChars) {
      out.push(cur);
      cur = "";
    }
    cur += (cur ? "\n\n" : "") + line;
  }
  if (cur) out.push(cur);
  return out;
}

export const IMPORT_INSTRUCTION = `Это часть выгрузки учебного чата (только сообщения, похожие на полезные; спам уже убран). Разложи ВСЁ полезное:
задания и ДЗ со сроками → add_task (сначала list_tasks, без дублей; задания со сроком, который уже прошёл, не заводи);
экзамены, зачёты, билеты → save_exam; каждую ссылку (чаты, таблицы, формы сдачи, записи, репозитории, материалы) → save_links с названием и предметом;
преподаватели, контакты, правила сдачи → save_subject; расписание пар → schedule_edit (если есть); важные будущие события без срока сдачи — тоже add_task.
Ничего не выдумывай: только то, что правда есть в сообщениях. В конце — коротко по пунктам, что куда записал (2–6 строк).`;

// ---------- разбор целиком ----------

export interface ImportDeps {
  handle: (msg: { text: string; forwardedFrom?: string; ownerNote?: string; attachments?: { mime: string; data: string }[] }, opts?: { quiet?: string }) => Promise<string>;
  timeZone: string;
  /** Прогресс для человека: «читаю часть 2 из 5». */
  progress?: (text: string) => void | Promise<void>;
  /** Больше частей не отдаём модели (бюджет). */
  maxChunks?: number;
}

/** Разобрать присланный файл и разложить полезное. Возвращает короткий отчёт. */
export async function importDocument(deps: ImportDeps, file: { name: string; data: Uint8Array; caption?: string }): Promise<string> {
  const doc = readDocument(file.name, file.data);
  const ask = file.caption ? `\nПросьба хозяина к файлу: ${file.caption}` : "";
  if (doc.kind === "unknown") return doc.why;
  if (doc.kind === "pdf") {
    if (file.data.length > 18 * 1024 * 1024) return "PDF слишком большой (больше 18 МБ).";
    return deps.handle(
      {
        text: `[Документ от хозяина: ${file.name}] Прочитай. Если там задания, сроки, экзамены, ссылки, расписание — разложи их; иначе коротко скажи, что в документе.${ask}`,
        attachments: [{ mime: "application/pdf", data: Buffer.from(file.data).toString("base64") }],
      },
      { quiet: `[документ ${file.name}]${ask}` },
    );
  }
  if (doc.kind === "text") {
    const text = doc.text.trim();
    if (!text) return "Файл пустой.";
    const parts = chunkText(text, 24_000).slice(0, deps.maxChunks ?? 6);
    const answers: string[] = [];
    for (const [i, part] of parts.entries()) {
      if (parts.length > 1) await deps.progress?.(`Читаю ${file.name}: часть ${i + 1} из ${parts.length}…`);
      answers.push(
        await deps.handle(
          {
            ownerNote: `Разбери документ «${file.name}»${parts.length > 1 ? ` (часть ${i + 1} из ${parts.length})` : ""}: задания и сроки → add_task (без дублей, прошедшие сроки не заводи), экзамены → save_exam, ссылки → save_links, преподаватели и правила → save_subject, расписание → schedule_edit (если есть). Ничего не выдумывай. В конце — коротко, что куда записал; если полезного нет — одной строкой, что в документе.${ask}`,
            text: part,
            forwardedFrom: `документ «${file.name}»`,
          },
          { quiet: `[документ ${file.name}, часть ${i + 1}]` },
        ),
      );
    }
    return answers.join("\n\n");
  }
  // выгрузка чата
  const { chat } = doc;
  const useful = usefulMessages(chat.messages);
  if (!useful.length) return `В выгрузке «${chat.name}» ${chat.messages.length} сообщений, но полезного (задания, сроки, ссылки, экзамены) не нашёл.`;
  const all = chunkMessages(useful, deps.timeZone);
  const max = deps.maxChunks ?? 6;
  const chunks = all.slice(-max); // если всего слишком много — самое свежее
  const linkCount = new Set(useful.flatMap((m) => m.links)).size;
  await deps.progress?.(
    `Открыл «${chat.name}»: ${chat.messages.length} сообщений, полезных ${useful.length} (ссылок ${linkCount}). Раскладываю — ${chunks.length > 1 ? `${chunks.length} частей, ` : ""}это займёт минуту-другую…`,
  );
  const answers: string[] = [];
  for (const [i, c] of chunks.entries()) {
    if (chunks.length > 1 && i > 0) await deps.progress?.(`Часть ${i + 1} из ${chunks.length}…`);
    answers.push(
      await deps.handle(
        { ownerNote: `${IMPORT_INSTRUCTION}${ask}`, text: c, forwardedFrom: `выгрузка чата «${chat.name}»${chunks.length > 1 ? `, часть ${i + 1} из ${chunks.length}` : ""}` },
        { quiet: `[выгрузка чата «${chat.name}», часть ${i + 1} из ${chunks.length}]` },
      ),
    );
  }
  const skipped = all.length - chunks.length;
  return [
    `Готово: «${chat.name}» — из ${chat.messages.length} сообщений полезных ${useful.length}, остальное — болтовня и спам.`,
    skipped > 0 ? `Чат очень большой: разобрал самое свежее, ${skipped} старых частей пропустил.` : "",
    ...answers,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function chunkText(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const para of text.split(/\n{2,}/)) {
    if (cur && cur.length + para.length > max) {
      out.push(cur);
      cur = "";
    }
    if (para.length > max) {
      for (let i = 0; i < para.length; i += max) out.push(para.slice(i, i + max));
      continue;
    }
    cur += (cur ? "\n\n" : "") + para;
  }
  if (cur) out.push(cur);
  return out;
}
