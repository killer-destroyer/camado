// Общие типы для окна (renderer) и фоновой части (main) приложения.
import type { Card, ChatEntry, Exam, FocusSession, LessonLink, Note, PlanBlock, PlayStat, Playlist, Subject, Task, TaskKind, TaskStep, TaskStatus } from "../../src/store.js";
import type { FreeAlbum } from "../main/freeMusic.js";
import type { AiConfig } from "../../src/llm/providers.js";
import type { AppSettings } from "./settings.js";

export type { AiConfig };
export type { Card, Exam, PlanBlock, TaskStep };
export type { ChatEntry, FocusSession, FreeAlbum, LessonLink, Note, PlayStat, Playlist, Subject, Task, TaskKind, TaskStatus, AppSettings };

type ImportResult =
  | { kind: "saved"; file: string; name: string }
  | { kind: "choose"; links: { url: string; name: string }[] }
  | { kind: "error"; error: string };

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
  /** Длина той версии песни, под которую сделан текст (из базы). Сильно отличается от файла — текст может разъезжаться. */
  versionDuration?: number;
  /** Текст растянут под ускоренную/замедленную версию (nightcore, sped up, slowed) — во сколько раз. */
  scaled?: number;
  /** Тайминг примерный: в базе был только текст без отметок, строки расставлены по песне. */
  approx?: boolean;
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
  kind: AiConfig["kind"];
  config: AiConfig;
  presets: { id: string; name: string; baseUrl: string; hint: string; model: string }[];
}

/** Что играет — для мини-плеера в меню-баре, трея и Discord. */
export interface NowPlayingState {
  title: string;
  artist: string;
  cover?: string;
  playing: boolean;
  position: number;
  duration: number;
  sentAt: number;
}

/** То, что показывает плавающий текст песни поверх окон. */
export interface OverlayState {
  text: string;
  next?: string;
  words: LyricsWord[];
  lineEnd: number;
  position: number;
  /** На сколько секунд текста сдвигается позиция за секунду (скорость песни × подгонка текста). */
  rate: number;
  playing: boolean;
  /** Date.now() в момент отправки — чтобы плавно досчитывать позицию между обновлениями. */
  sentAt: number;
  colors: { text: string; accent: string; accent2: string };
}

export interface UpdateStatus {
  /**
   * dev — запущено из исходников (обновлений нет), checking — проверяю, none — последняя версия,
   * downloading — качаю, ready — скачано, нужен перезапуск, manual — есть новая (Mac, скачать вручную), error.
   */
  state: "dev" | "idle" | "checking" | "none" | "downloading" | "ready" | "manual" | "error";
  current: string;
  version?: string;
  percent?: number;
  error?: string;
  checkedAt?: number;
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
  steps: {
    list(taskId?: number): Promise<TaskStep[]>;
    set(taskId: number, titles: string[]): Promise<TaskStep[]>;
    toggle(id: number): Promise<void>;
    /** ИИ разбивает задание на шаги и сохраняет их. */
    ai(taskId: number): Promise<{ steps: string[] } | { error: string }>;
  };
  tutor: {
    ask(taskId: number, history: { role: "user" | "assistant"; content: string }[], message: string): Promise<{ answer: string } | { error: string }>;
  };
  media: {
    /** Фото или голосовое (base64) → Камадо разбирает и записывает задания. */
    send(kind: "photo" | "voice", mime: string, data: string, note?: string): Promise<{ answer: string } | { error: string }>;
  };
  cards: {
    list(opts?: { noteId?: number; due?: boolean }): Promise<Card[]>;
    add(cards: { question: string; answer: string; noteId?: number | null; subject?: string | null }[]): Promise<number>;
    review(id: number, grade: 0 | 1 | 2): Promise<Card | undefined>;
    remove(id: number): Promise<void>;
    ai(noteId: number): Promise<{ added: number } | { error: string }>;
  };
  exams: {
    list(): Promise<Exam[]>;
    save(input: { id?: number; subject?: string | null; title: string; at: string }): Promise<number>;
    remove(id: number): Promise<void>;
    setTickets(examId: number, titles: string[]): Promise<void>;
    ticketStatus(id: number, status: "new" | "review" | "known"): Promise<void>;
  };
  plan: {
    list(fromIso: string, toIso: string): Promise<PlanBlock[]>;
    save(input: { id?: number; taskId?: number | null; title: string; startAt: string; minutes: number }): Promise<number>;
    remove(id: number): Promise<void>;
  };
  links: {
    list(): Promise<LessonLink[]>;
    save(input: { id?: number; title: string; url: string; subject?: string | null; note?: string; pinned?: boolean }): Promise<LessonLink>;
    remove(id: number): Promise<boolean>;
    /** Открыть в браузере и запомнить, что открывали. */
    open(id: number): Promise<boolean>;
  };
  playlists: {
    list(): Promise<{ playlists: Playlist[]; favorites: string[] }>;
    create(name: string, trackIds?: string[]): Promise<Playlist>;
    rename(id: number, name: string): Promise<void>;
    remove(id: number): Promise<void>;
    add(id: number, trackIds: string[]): Promise<void>;
    removeTrack(id: number, trackId: string): Promise<void>;
    reorder(id: number, trackIds: string[]): Promise<void>;
    toggleFavorite(trackId: string): Promise<boolean>;
  };
  plays: {
    add(input: { trackId: string; title: string; artist: string; seconds: number }): Promise<void>;
    stats(sinceIso: string, limit?: number): Promise<PlayStat[]>;
  };
  notes: {
    list(): Promise<Note[]>;
    save(input: { id?: number; title: string; body?: string; subject?: string | null; pinned?: boolean }): Promise<Note>;
    remove(id: number): Promise<boolean>;
    /** Сохранить заметку в PDF (спросит, куда). */
    pdf(title: string, html: string): Promise<boolean>;
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
    /** Выбрать нейросеть (Gemini, Claude, OpenAI-совместимая) и ключ к ней. */
    connect(cfg: AiConfig, key?: string): Promise<{ ok: boolean; error?: string }>;
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
    /** ИИ слушает песню (WAV в base64) и называет, на какой секунде начинают петь строки с этими номерами. */
    aiSync(wav: string, lines: { n: number; text: string }[]): Promise<{ points: { n: number; t: number }[] } | { error: string }>;
  };
  quick: {
    /** Закрыть окно быстрой записи. */
    close(): Promise<void>;
    /** Сочетание клавиш, которым оно открывается. */
    key(): Promise<string>;
  };
  alarm: {
    /** Выбрать свой звук для напоминаний: копируется к Камадо, возвращает название и адрес. */
    pickSound(): Promise<{ name: string; url: string } | null>;
  };
  screensaver: {
    /** Выбрать свою картинку для заставки: копируется к Камадо, возвращает название и адрес. */
    pickImage(): Promise<{ name: string; url: string } | null>;
  };
  music: {
    /** Скачать по ссылке в папку «Музыка/Камадо». Для страницы с несколькими треками вернёт список. */
    importUrl(url: string): Promise<ImportResult>;
    /** Вставили код страницы (HTML) — найти в нём музыку. */
    importHtml(html: string, baseUrl?: string): Promise<ImportResult>;
    /** Поиск бесплатной музыки (Internet Archive). */
    searchFree(query: string): Promise<FreeAlbum[]>;
    freeTracks(id: string): Promise<{ url: string; name: string }[]>;
  };
  overlay: {
    /** Включить/выключить текст песни поверх всех окон. Возвращает новое состояние. */
    toggle(): Promise<boolean>;
    isOpen(): Promise<boolean>;
    push(state: OverlayState): Promise<void>;
  };
  nowPlaying: {
    /** Главное окно сообщает, что играет (мини-плеер, трей, Discord). */
    push(state: NowPlayingState | null): Promise<void>;
    /** Из мини-плеера: управление и «открыть Камадо». */
    action(action: "playpause" | "next" | "prev" | "open"): Promise<void>;
  };
  discord: {
    status(): Promise<"off" | "connecting" | "on" | "no-discord">;
  };
  updates: {
    status(): Promise<UpdateStatus>;
    check(): Promise<UpdateStatus>;
    /** Перезапустить и установить (Windows) или открыть ссылку на скачивание (Mac). */
    install(): Promise<void>;
  };
  system: {
    /** Сколько секунд пользователь ничего не трогал (во всей системе). */
    idleSeconds(): Promise<number>;
    /** Текст в меню-баре Mac (таймер фокуса, ближайший дедлайн). */
    trayStatus(text: string): Promise<void>;
  };
  window: {
    setTitleBarColors(symbol: string): Promise<void>;
    setFullScreen(on: boolean): Promise<void>;
    /** Окно сейчас на весь экран? */
    isFullScreen(): Promise<boolean>;
  };
  notify(title: string, body: string): Promise<void>;
  /** Путь к файлу, перетащенному в окно. */
  pathForFile(file: File): string;
  on(event: "data-changed" | "library-changed" | "media-key", cb: (payload?: unknown) => void): () => void;
  on(event: "download-progress", cb: (payload: { name: string; received: number; total: number }) => void): () => void;
  on(event: "reminder", cb: (payload: { text: string }) => void): () => void;
  on(event: "update-status", cb: (payload: UpdateStatus) => void): () => void;
  on(event: "overlay-state", cb: (payload: OverlayState) => void): () => void;
  on(event: "overlay-changed", cb: (payload: boolean) => void): () => void;
  on(event: "np-state", cb: (payload: NowPlayingState | null) => void): () => void;
  on(event: "go", cb: (payload: string) => void): () => void;
}
