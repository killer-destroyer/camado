// Общие типы для окна (renderer) и фоновой части (main) приложения.
import type { ChatEntry, FocusSession, Note, Subject, Task, TaskKind, TaskStatus } from "../../src/store.js";
import type { AppSettings } from "./settings.js";

export type { ChatEntry, FocusSession, Note, Subject, Task, TaskKind, TaskStatus, AppSettings };

export interface Track {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  /** Секунды. 0, если неизвестно. */
  duration: number;
  /** camado-media://cover/... или undefined. */
  cover?: string;
  /** Есть .lrc рядом с файлом или текст в тегах. */
  hasLyrics: boolean;
}

export interface LyricsWord {
  time: number;
  text: string;
}

export interface LyricsLine {
  /** Секунды от начала трека. */
  time: number;
  text: string;
  /** Пословные метки из «расширенного» LRC, если есть. */
  words?: LyricsWord[];
}

export interface Lyrics {
  /** true — строки с таймингом, false — просто текст. */
  synced: boolean;
  lines: LyricsLine[];
  source: "file" | "tags" | "lrclib" | "none";
}

export interface LyricsQuery {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  /** Для локальных треков: искать .lrc рядом и в тегах. */
  trackId?: string;
}

export interface LibraryState {
  folders: string[];
  tracks: Track[];
  scanning: boolean;
}

export interface AiStatus {
  enabled: boolean;
  keyHint?: string;
  spentUsd: number;
  budgetUsd: number;
  model: string;
}

export interface BotStatus {
  /** Токен бота задан (в приложении или в .env). */
  configured: boolean;
  running: boolean;
  /** Бот знает своего хозяина. */
  paired: boolean;
  username?: string;
  error?: string;
}

export interface AppInfo {
  platform: NodeJS.Platform;
  version: string;
  timeZone: string;
  /** Частота обновления основного монитора, Гц. */
  refreshRate: number;
  /** Работает ли захват системного звука на этой ОС. */
  loopbackSupported: boolean;
}

export type TaskInput = {
  title: string;
  subject?: string | null;
  details?: string | null;
  kind?: TaskKind;
  dueAt?: string | null;
};

export type TaskPatch = Partial<Pick<Task, "subject" | "title" | "details" | "kind" | "dueAt" | "status">>;

/** То, что окно может попросить у фоновой части. Реализация — desktop/preload. */
export interface CamadoApi {
  info(): Promise<AppInfo>;
  tasks: {
    list(includeClosed?: boolean): Promise<Task[]>;
    add(input: TaskInput): Promise<Task>;
    update(id: number, patch: TaskPatch): Promise<Task | undefined>;
    /** Разбор строки «предмет | что | срок» как у /add. */
    quickAdd(text: string, kind?: TaskKind): Promise<{ task?: Task; error?: string }>;
  };
  subjects: {
    list(): Promise<Subject[]>;
    save(input: { name: string; teacher?: string; info?: string }): Promise<Subject>;
  };
  notes: {
    list(): Promise<Note[]>;
    save(input: { id?: number; title: string; body?: string; subject?: string | null; pinned?: boolean }): Promise<Note>;
    remove(id: number): Promise<boolean>;
  };
  focus: {
    add(input: { subject?: string | null; minutes: number; startedAt: string }): Promise<FocusSession>;
    list(sinceIso: string): Promise<FocusSession[]>;
  };
  chat: {
    history(): Promise<ChatEntry[]>;
    send(text: string): Promise<{ answer?: string; error?: string }>;
  };
  ai: {
    status(): Promise<AiStatus>;
    setKey(key: string): Promise<{ ok: boolean; error?: string }>;
    clearKey(): Promise<void>;
  };
  bot: {
    status(): Promise<BotStatus>;
    /** Проверить токен от @BotFather, сохранить и запустить бота. */
    connect(token: string): Promise<{ ok: boolean; error?: string; username?: string }>;
    /** Код, который нужно прислать боту, чтобы он запомнил хозяина (действует 15 минут). */
    pairingCode(): Promise<string>;
    disconnect(): Promise<void>;
  };
  settings: {
    get(): Promise<AppSettings>;
    set(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  library: {
    get(): Promise<LibraryState>;
    pickFolder(): Promise<LibraryState>;
    addPaths(paths: string[]): Promise<LibraryState>;
    removeFolder(path: string): Promise<LibraryState>;
    rescan(): Promise<LibraryState>;
  };
  lyrics: {
    get(query: LyricsQuery): Promise<Lyrics>;
  };
  online: {
    /** Клавиша в веб-плеер (пробел — пауза), если сайт не дал управлять собой. */
    sendKey(webContentsId: number, key: string): Promise<void>;
  };
  window: {
    setTitleBarColors(symbol: string): Promise<void>;
  };
  notify(title: string, body: string): Promise<void>;
  /** Путь к файлу, перетащенному в окно. */
  pathForFile(file: File): string;
  on(event: "data-changed" | "library-changed" | "media-key", cb: (payload?: unknown) => void): () => void;
  on(event: "reminder", cb: (payload: { text: string }) => void): () => void;
}
