// «Библиотека»: свои книги и источники. Всё хранится только у владельца (база и папка library),
// в коде программы своих книг нет — список добавляется в программе или импортом файла.
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { BrowserWindow, Dialog } from "electron";
import type { Store } from "../../src/store.js";
import { safeFetch } from "../../src/web.js";
import type { Book, BookSource } from "../shared/types.js";

const BOOKS_KV = "books.list";
const SOURCES_KV = "books.sources";
const MAX_PDF = 300 * 1024 * 1024;

/** Источники по умолчанию — общедоступные, без привязки к какому-либо вузу. */
export const DEFAULT_SOURCES: BookSource[] = [
  { id: "wiki", name: "Википедия", url: "https://ru.wikipedia.org/w/index.php?search={q}" },
  { id: "scholar", name: "Google Академия", url: "https://scholar.google.com/scholar?q={q}" },
];

/** Файл импорта: книги и источники (свой список владельца). */
export interface BooksImport {
  books?: Partial<Book>[];
  sources?: Partial<BookSource>[];
}

export function cleanBook(b: Partial<Book>, now = new Date()): Book | undefined {
  const title = String(b.title ?? "").trim().slice(0, 300);
  if (!title) return undefined;
  const url = typeof b.url === "string" && /^https?:\/\//i.test(b.url) ? b.url.slice(0, 2000) : undefined;
  const status = b.status === "reading" || b.status === "done" ? b.status : "want";
  return {
    id: typeof b.id === "string" && b.id ? b.id.slice(0, 80) : randomUUID(),
    title,
    author: b.author ? String(b.author).slice(0, 200) : undefined,
    section: String(b.section ?? "Разное").trim().slice(0, 80) || "Разное",
    url,
    file: typeof b.file === "string" && /^[\w.-]+\.pdf$/i.test(b.file) ? b.file : undefined,
    status,
    page: Number.isFinite(b.page) ? Math.max(1, Math.floor(b.page!)) : undefined,
    pages: Number.isFinite(b.pages) ? Math.max(1, Math.floor(b.pages!)) : undefined,
    note: b.note ? String(b.note).slice(0, 2000) : undefined,
    addedAt: b.addedAt ?? now.toISOString(),
  };
}

export function cleanSource(s: Partial<BookSource>): BookSource | undefined {
  const name = String(s.name ?? "").trim().slice(0, 60);
  const url = String(s.url ?? "").trim();
  if (!name || !/^https?:\/\//i.test(url) || !url.includes("{q}")) return undefined;
  return { id: s.id ? String(s.id).slice(0, 60) : randomUUID(), name, url: url.slice(0, 1000) };
}

/** Объединить импорт со своим списком: та же ссылка или то же название в том же разделе не задвоится. */
export function mergeBooks(cur: Book[], add: Book[]): { list: Book[]; added: number } {
  const key = (b: Book) => (b.url ? b.url.toLowerCase() : `${b.section}|${b.title}`.toLowerCase());
  const seen = new Set(cur.map(key));
  const list = [...cur];
  let added = 0;
  for (const b of add) {
    if (seen.has(key(b))) continue;
    seen.add(key(b));
    list.push(b);
    added++;
  }
  return { list, added };
}

/** Найти PDF на странице книги (ссылка на .pdf или «/file/pdf/…»). */
export function findPdfLink(html: string, base: string): string | undefined {
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  const cands: string[] = [];
  while ((m = re.exec(html))) {
    const href = m[1]!;
    if (/\.pdf(\?|#|$)/i.test(href) || /\/pdf\//i.test(href)) cands.push(href);
  }
  for (const c of cands) {
    try {
      return new URL(c, base).href;
    } catch {
      /* следующая */
    }
  }
  return undefined;
}

type Handler = (...args: never[]) => unknown;

export function booksHandlers(deps: { store: Store; dataDir: string; dialog: Dialog; win: () => BrowserWindow | undefined; notify: () => void }): Record<string, Handler> {
  const { store } = deps;
  const dir = join(deps.dataDir, "library");
  const load = (): Book[] => {
    try {
      return (JSON.parse(store.getKv(BOOKS_KV) ?? "[]") as Partial<Book>[]).map((b) => cleanBook(b)).filter((b): b is Book => !!b);
    } catch {
      return [];
    }
  };
  const save = (list: Book[]) => {
    store.setKv(BOOKS_KV, JSON.stringify(list));
    deps.notify();
  };
  const sources = (): BookSource[] => {
    try {
      const raw = store.getKv(SOURCES_KV);
      return raw ? (JSON.parse(raw) as Partial<BookSource>[]).map(cleanSource).filter((s): s is BookSource => !!s) : DEFAULT_SOURCES;
    } catch {
      return DEFAULT_SOURCES;
    }
  };
  const addFiles = async (paths: string[], section?: string) => {
    await mkdir(dir, { recursive: true });
    const add: Book[] = [];
    for (const p of paths.filter((x) => extname(x).toLowerCase() === ".pdf").slice(0, 50)) {
      const st = await stat(p).catch(() => undefined);
      if (!st?.isFile() || st.size > MAX_PDF) continue;
      const file = `${randomUUID()}.pdf`;
      await copyFile(p, join(dir, file));
      const b = cleanBook({ title: basename(p, extname(p)).replace(/[_]+/g, " "), section: section || "Мои файлы", file, status: "want" });
      if (b) add.push(b);
    }
    save([...load(), ...add]);
    return { added: add.length };
  };

  return {
    "books.list": () => ({ books: load(), sources: sources() }),
    "books.save": (b: Partial<Book>) => {
      const list = load();
      const clean = cleanBook(b);
      if (!clean) return undefined;
      const i = list.findIndex((x) => x.id === clean.id);
      // файл можно только сохранить прежний — путь не задаётся из окна
      if (i >= 0) list[i] = { ...clean, file: list[i]!.file };
      else list.push({ ...clean, file: undefined });
      save(list);
      return clean;
    },
    "books.remove": async (id: string) => {
      const list = load();
      const b = list.find((x) => x.id === id);
      if (b?.file) await rm(join(dir, b.file), { force: true }).catch(() => undefined);
      save(list.filter((x) => x.id !== id));
    },
    /** Убрать скачанный файл, книгу оставить (место на диске). */
    "books.dropFile": async (id: string) => {
      const list = load();
      const b = list.find((x) => x.id === id);
      if (!b?.file) return;
      await rm(join(dir, b.file), { force: true }).catch(() => undefined);
      b.file = undefined;
      save(list);
    },
    "books.pickFiles": async (section?: string) => {
      const w = deps.win();
      const opts = { title: "Добавить книги (PDF)", properties: ["openFile", "multiSelections"] as ("openFile" | "multiSelections")[], filters: [{ name: "PDF", extensions: ["pdf"] }] };
      const res = await (w ? deps.dialog.showOpenDialog(w, opts) : deps.dialog.showOpenDialog(opts));
      if (res.canceled) return { added: 0 };
      return addFiles(res.filePaths, section);
    },
    "books.addPaths": (paths: string[], section?: string) => addFiles(paths, section),
    /** Скачать PDF к себе: по прямой ссылке или со страницы книги. */
    "books.download": async (id: string) => {
      const list = load();
      const b = list.find((x) => x.id === id);
      if (!b?.url) return { error: "У книги нет ссылки" };
      try {
        let { res, url } = await safeFetch(b.url, fetch, { accept: "application/pdf,text/html;q=0.9,*/*;q=0.5", timeoutMs: 60_000 });
        let type = res.headers.get("content-type") ?? "";
        if (/html/.test(type)) {
          const link = findPdfLink((await res.text()).slice(0, 3_000_000), url);
          if (!link) return { error: "На странице не нашёл PDF — открой её в браузере" };
          ({ res, url } = await safeFetch(link, fetch, { accept: "application/pdf,*/*;q=0.5", timeoutMs: 120_000 }));
          type = res.headers.get("content-type") ?? "";
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > MAX_PDF) return { error: "Файл слишком большой" };
        if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") return { error: `Это не PDF (${type.split(";")[0] || "неизвестный тип"})` };
        await mkdir(dir, { recursive: true });
        const file = `${randomUUID()}.pdf`;
        await writeFile(join(dir, file), buf);
        if (b.file) await rm(join(dir, b.file), { force: true }).catch(() => undefined);
        b.file = file;
        save(list);
        return { ok: true as const, size: buf.length };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Не скачалось" };
      }
    },
    "books.import": async () => {
      const w = deps.win();
      const opts = { title: "Импорт списка книг", properties: ["openFile"] as "openFile"[], filters: [{ name: "Список книг", extensions: ["json"] }] };
      const res = await (w ? deps.dialog.showOpenDialog(w, opts) : deps.dialog.showOpenDialog(opts));
      if (res.canceled || !res.filePaths[0]) return { cancelled: true as const };
      try {
        const data = JSON.parse(await readFile(res.filePaths[0], "utf8")) as BooksImport;
        const add = (data.books ?? []).slice(0, 2000).map((b) => cleanBook({ ...b, file: undefined, id: undefined })).filter((b): b is Book => !!b);
        const merged = mergeBooks(load(), add);
        save(merged.list);
        let srcAdded = 0;
        if (data.sources?.length) {
          const cur = sources();
          const next = [...cur];
          for (const s of data.sources.slice(0, 50)) {
            const c = cleanSource({ ...s, id: undefined });
            if (c && !next.some((x) => x.url === c.url)) {
              next.push(c);
              srcAdded++;
            }
          }
          store.setKv(SOURCES_KV, JSON.stringify(next));
        }
        return { books: merged.added, sources: srcAdded };
      } catch {
        return { error: "Не получилось прочитать файл — нужен список книг в формате JSON" };
      }
    },
    "books.export": async () => {
      const w = deps.win();
      const opts = { title: "Сохранить список книг", defaultPath: "мои-книги.json", filters: [{ name: "Список книг", extensions: ["json"] }] };
      const res = await (w ? deps.dialog.showSaveDialog(w, opts) : deps.dialog.showSaveDialog(opts));
      if (res.canceled || !res.filePath) return false;
      const books = load().map(({ file: _f, ...b }) => b);
      await writeFile(res.filePath, JSON.stringify({ books, sources: sources() }, null, 2), "utf8");
      return true;
    },
    "books.setSources": (list: Partial<BookSource>[]) => {
      const clean = list.map(cleanSource).filter((s): s is BookSource => !!s).slice(0, 50);
      store.setKv(SOURCES_KV, JSON.stringify(clean));
      return clean;
    },
  };
}

/** Путь к PDF книги для протокола camado-media://book/<файл>. */
export function bookFilePath(dataDir: string, name: string): string | undefined {
  return /^[0-9a-f-]{36}\.pdf$/i.test(name) ? join(dataDir, "library", name) : undefined;
}
