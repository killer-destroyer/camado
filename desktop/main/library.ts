// Библиотека музыки: папки на компьютере → список треков с обложками.
import { createHash } from "node:crypto";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { parseFile } from "music-metadata";
import type { LibraryState, Track } from "../shared/types.js";

export const AUDIO_EXT = new Set([".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".webm"]);
const MAX_DEPTH = 8;

interface Indexed extends Track {
  mtime: number;
}

/** Своя правка трека: файл не трогаем, правка хранится у нас и накладывается поверх тегов. */
export interface TrackEdit {
  title?: string;
  artist?: string;
  album?: string;
  /** camado-media://cover/… */
  cover?: string;
}

interface Saved {
  folders: string[];
  files: string[];
  tracks: Indexed[];
  edits?: Record<string, TrackEdit>;
}

/** Накладывает правку на трек (пустые поля правки не считаются). */
export function applyEdit<T extends Track>(t: T, e: TrackEdit | undefined): T {
  if (!e) return t;
  return {
    ...t,
    ...(e.title?.trim() ? { title: e.title.trim() } : {}),
    ...(e.artist?.trim() ? { artist: e.artist.trim() } : {}),
    ...(e.album !== undefined ? { album: e.album.trim() } : {}),
    ...(e.cover ? { cover: e.cover } : {}),
    edited: true,
  };
}

export const trackId = (path: string) => createHash("sha1").update(path).digest("hex");

export function lrcPathFor(audioPath: string): string {
  return audioPath.slice(0, audioPath.length - extname(audioPath).length) + ".lrc";
}

export class Library {
  private state: Saved = { folders: [], files: [], tracks: [] };
  private byId = new Map<string, Indexed>();
  private watchers: FSWatcher[] = [];
  private watchTimer?: NodeJS.Timeout;
  scanning = false;

  constructor(
    private dir: string,
    private onChange: () => void,
  ) {}

  get coversDir(): string {
    return join(this.dir, "covers");
  }

  private get file(): string {
    return join(this.dir, "library.json");
  }

  async load(): Promise<void> {
    await mkdir(this.coversDir, { recursive: true });
    if (existsSync(this.file)) {
      try {
        const saved = JSON.parse(await readFile(this.file, "utf8")) as Saved;
        this.state = { folders: saved.folders ?? [], files: saved.files ?? [], tracks: saved.tracks ?? [], edits: saved.edits ?? {} };
      } catch (err) {
        console.error("library.json повреждён, начинаю заново:", err);
      }
    }
    this.reindex();
  }

  private reindex(): void {
    this.byId = new Map(this.state.tracks.map((t) => [t.id, t]));
  }

  private async save(): Promise<void> {
    await writeFile(this.file, JSON.stringify(this.state));
  }

  view(): LibraryState {
    const edits = this.state.edits ?? {};
    const tracks = this.state.tracks
      .map(({ mtime: _m, ...t }) => applyEdit(t, edits[t.id]))
      .sort((a, b) => a.artist.localeCompare(b.artist, "ru") || a.album.localeCompare(b.album, "ru") || a.title.localeCompare(b.title, "ru"));
    return { folders: [...this.state.folders], tracks, scanning: this.scanning };
  }

  /** Путь к файлу трека — только для треков из библиотеки (защита от чтения чего попало). */
  trackPath(id: string): string | undefined {
    return this.byId.get(id)?.path;
  }

  /** Трек с учётом правки — для ИИ и для поиска текста песни. */
  track(id: string): Track | undefined {
    const t = this.byId.get(id);
    if (!t) return undefined;
    const { mtime: _m, ...rest } = t;
    return applyEdit(rest, this.state.edits?.[id]);
  }

  /** Поправить название/исполнителя/альбом. null в поле — вернуть как в файле. */
  async edit(id: string, patch: { title?: string | null; artist?: string | null; album?: string | null; cover?: string | null }): Promise<Track | undefined> {
    if (!this.byId.has(id)) return undefined;
    const edits = (this.state.edits ??= {});
    const cur: TrackEdit = { ...edits[id] };
    for (const k of ["title", "artist", "album", "cover"] as const) {
      const v = patch[k];
      if (v === undefined) continue;
      if (v === null) delete cur[k];
      else cur[k] = k === "cover" ? v : v.trim().slice(0, 200);
    }
    if (Object.keys(cur).length) edits[id] = cur;
    else delete edits[id];
    await this.save();
    this.onChange();
    return this.track(id);
  }

  /** Своя обложка из картинки (байты) → файл в covers, ссылка в правку. */
  async setCover(id: string, data: Uint8Array, mime: string): Promise<Track | undefined> {
    if (!this.byId.has(id) || data.byteLength === 0 || data.byteLength > 15 * 1024 * 1024) return undefined;
    const e = /png/.test(mime) ? "png" : /webp/.test(mime) ? "webp" : "jpg";
    const name = `${createHash("sha1").update(data).digest("hex")}.${e}`;
    const file = join(this.coversDir, name);
    if (!existsSync(file)) await writeFile(file, data);
    return this.edit(id, { cover: `camado-media://cover/${name}` });
  }

  /** Убрать все правки трека. */
  async resetEdit(id: string): Promise<Track | undefined> {
    if (this.state.edits) delete this.state.edits[id];
    await this.save();
    this.onChange();
    return this.track(id);
  }

  coverPath(name: string): string | undefined {
    return /^[a-f0-9]{40}\.(jpg|png|webp)$/.test(name) ? join(this.coversDir, name) : undefined;
  }

  async addPaths(paths: string[]): Promise<LibraryState> {
    for (const raw of paths) {
      const p = resolve(raw);
      const st = await stat(p).catch(() => undefined);
      if (!st) continue;
      if (st.isDirectory()) {
        if (!this.state.folders.includes(p)) this.state.folders.push(p);
      } else if (AUDIO_EXT.has(extname(p).toLowerCase()) && !this.state.files.includes(p)) {
        this.state.files.push(p);
      }
    }
    return this.rescan();
  }

  /**
   * Следим за папками: скачал трек в такую папку (из браузера, из Telegram) —
   * через пару секунд он сам появится в библиотеке.
   */
  watchFolders(): void {
    for (const w of this.watchers) w.close();
    this.watchers = [];
    for (const folder of this.state.folders) {
      try {
        const w = watch(folder, { recursive: true }, (_ev, name) => {
          if (name && !AUDIO_EXT.has(extname(String(name)).toLowerCase()) && !String(name).endsWith(".lrc")) return;
          clearTimeout(this.watchTimer);
          this.watchTimer = setTimeout(() => void this.rescan(), 2500);
        });
        w.on("error", () => undefined);
        this.watchers.push(w);
      } catch {
        // папку удалили или нет доступа — просто не следим
      }
    }
  }

  async removeFolder(path: string): Promise<LibraryState> {
    this.state.folders = this.state.folders.filter((f) => f !== path);
    this.state.files = this.state.files.filter((f) => f !== path);
    return this.rescan();
  }

  async rescan(): Promise<LibraryState> {
    if (this.scanning) return this.view();
    this.scanning = true;
    this.onChange();
    try {
      const found = new Set<string>();
      for (const folder of this.state.folders) await walk(folder, 0, found);
      for (const f of this.state.files) if (existsSync(f)) found.add(f);

      const old = new Map(this.state.tracks.map((t) => [t.path, t]));
      const next: Indexed[] = [];
      let sinceSave = 0;
      for (const path of found) {
        const st = await stat(path).catch(() => undefined);
        if (!st) continue;
        const prev = old.get(path);
        if (prev && prev.mtime === st.mtimeMs) {
          next.push({ ...prev, hasLyrics: prev.hasLyrics || existsSync(lrcPathFor(path)) });
          continue;
        }
        next.push(await this.index(path, st.mtimeMs));
        // Показываем прогресс по ходу большого сканирования.
        if (++sinceSave >= 40) {
          sinceSave = 0;
          this.state.tracks = [...next];
          this.reindex();
          this.onChange();
        }
      }
      this.state.tracks = next;
      this.reindex();
      await this.save();
      this.watchFolders();
    } finally {
      this.scanning = false;
      this.onChange();
    }
    return this.view();
  }

  private async index(path: string, mtime: number): Promise<Indexed> {
    const ext = extname(path);
    const fallbackTitle = basename(path, ext).replace(/^\d+[\s._-]+/, "").replace(/_/g, " ");
    const base: Indexed = {
      id: trackId(path),
      path,
      title: fallbackTitle,
      artist: "Неизвестный исполнитель",
      album: "",
      duration: 0,
      hasLyrics: existsSync(lrcPathFor(path)),
      mtime,
    };
    try {
      const meta = await parseFile(path, { duration: true });
      const c = meta.common;
      base.title = c.title?.trim() || base.title;
      base.artist = c.artist?.trim() || c.albumartist?.trim() || base.artist;
      base.album = c.album?.trim() || "";
      base.duration = meta.format.duration ?? 0;
      const lyrics = (c as { lyrics?: unknown[] }).lyrics;
      if (Array.isArray(lyrics) && lyrics.length > 0) base.hasLyrics = true;
      const pic = c.picture?.[0];
      if (pic) {
        const hash = createHash("sha1").update(pic.data).digest("hex");
        const e = pic.format.includes("png") ? "png" : pic.format.includes("webp") ? "webp" : "jpg";
        const name = `${hash}.${e}`;
        const coverFile = join(this.coversDir, name);
        if (!existsSync(coverFile)) await writeFile(coverFile, pic.data);
        base.cover = `camado-media://cover/${name}`;
      }
    } catch (err) {
      console.warn("Не прочитал теги:", path, err instanceof Error ? err.message : err);
    }
    return base;
  }
}

async function walk(dir: string, depth: number, out: Set<string>): Promise<void> {
  if (depth > MAX_DEPTH) return;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, depth + 1, out);
    else if (e.isFile() && AUDIO_EXT.has(extname(e.name).toLowerCase())) out.add(p);
  }
}
