// Плеер: очередь, управление, тексты песен, палитра из обложки.
import type { LibraryState, Lyrics, Track } from "../../../shared/types";
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { createStore } from "../lib/store";
import { paletteById, paletteFromPixels, type Palette } from "../lib/palettes";
import { app, toast } from "./app";

/** То, что играет во встроенном онлайн-плеере. */
export interface OnlineNow {
  service: "yandex" | "soundcloud";
  title: string;
  artist: string;
  artwork?: string;
  duration: number;
  position: number;
  /** performance.now() момента, когда position был верен. */
  at: number;
  playing: boolean;
}

interface PlayerState {
  library: LibraryState;
  queue: Track[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  source: "local" | "online";
  online?: OnlineNow;
  lyrics?: Lyrics;
  lyricsLoading: boolean;
  coverPalette?: Palette;
  /** Обработчик управления онлайн-плеером (ставит вкладка «Онлайн»). */
  onlineControl?: (action: "playpause" | "next" | "prev") => void;
}

export const player = createStore<PlayerState>({
  library: { folders: [], tracks: [], scanning: false },
  queue: [],
  index: -1,
  playing: false,
  shuffle: false,
  repeat: "all",
  source: "local",
  lyricsLoading: false,
});

export function currentTrack(): Track | undefined {
  const s = player.get();
  return s.queue[s.index];
}

/** Что сейчас играет — для заголовков и текстов (локальный трек или онлайн). */
export function nowMeta(): { title: string; artist: string; cover?: string; duration: number } | undefined {
  const s = player.get();
  if (s.source === "online" && s.online) {
    return { title: s.online.title, artist: s.online.artist, cover: s.online.artwork, duration: s.online.duration };
  }
  const t = currentTrack();
  return t ? { title: t.title, artist: t.artist, cover: t.cover, duration: t.duration || engine.el.duration || 0 } : undefined;
}

/** Текущая позиция в секундах — вызывается каждый кадр. */
export function position(): number {
  const s = player.get();
  if (s.source === "online" && s.online) {
    const o = s.online;
    return o.playing ? o.position + (performance.now() - o.at) / 1000 : o.position;
  }
  return engine.el.currentTime || 0;
}

export function duration(): number {
  return nowMeta()?.duration || 0;
}

// ---------- Библиотека ----------

export async function loadLibrary(): Promise<void> {
  player.set({ library: await api.library.get() });
}

export function watchLibrary(): () => void {
  return api.on("library-changed", () => void loadLibrary());
}

// ---------- Управление ----------

export async function playQueue(tracks: Track[], index: number): Promise<void> {
  player.set({ queue: tracks, index, source: "local" });
  await startCurrent();
}

async function startCurrent(): Promise<void> {
  const t = currentTrack();
  if (!t) return;
  // Сразу «ищу текст», чтобы не мелькало «текста нет», пока трек грузится.
  player.set({ lyrics: undefined, lyricsLoading: true });
  try {
    await engine.play(`camado-media://track/${t.id}`);
  } catch (err) {
    console.error(err);
    toast(`Не смог воспроизвести «${t.title}»`, "warn");
  }
  void loadLyrics();
  void loadCoverPalette(t.cover);
}

export function togglePlay(): void {
  const s = player.get();
  if (s.source === "online") return s.onlineControl?.("playpause");
  if (!currentTrack()) {
    const first = s.library.tracks[0];
    if (first) void playQueue(s.library.tracks, 0);
    return;
  }
  if (engine.el.paused) void engine.play().catch(() => undefined);
  else engine.el.pause();
}

export function next(auto = false): void {
  const s = player.get();
  if (s.source === "online") return s.onlineControl?.("next");
  if (s.queue.length === 0) return;
  if (auto && s.repeat === "one") {
    engine.el.currentTime = 0;
    void engine.play();
    return;
  }
  let i: number;
  if (s.shuffle && s.queue.length > 1) {
    do i = Math.floor(Math.random() * s.queue.length);
    while (i === s.index);
  } else {
    i = s.index + 1;
    if (i >= s.queue.length) {
      if (s.repeat === "off" && auto) return;
      i = 0;
    }
  }
  player.set({ index: i });
  void startCurrent();
}

export function prev(): void {
  const s = player.get();
  if (s.source === "online") return s.onlineControl?.("prev");
  if (engine.el.currentTime > 3) {
    engine.el.currentTime = 0;
    return;
  }
  if (s.queue.length === 0) return;
  player.set({ index: (s.index - 1 + s.queue.length) % s.queue.length });
  void startCurrent();
}

export function seek(sec: number): void {
  if (player.get().source === "online") return;
  const d = engine.el.duration;
  // Длина ещё может быть неизвестна (трек только начал грузиться) — тогда просто ставим позицию.
  engine.el.currentTime = Math.max(0, Number.isFinite(d) ? Math.min(d - 0.05, sec) : sec);
}

export function cycleRepeat(): void {
  const order = ["all", "one", "off"] as const;
  const r = player.get().repeat;
  player.set({ repeat: order[(order.indexOf(r) + 1) % order.length] });
}

// ---------- Тексты и палитра ----------

let lyricsReq = 0;
export async function loadLyrics(): Promise<void> {
  const meta = nowMeta();
  const id = ++lyricsReq;
  if (!meta) return player.set({ lyrics: undefined, lyricsLoading: false });
  player.set({ lyrics: undefined, lyricsLoading: true });
  const t = player.get().source === "local" ? currentTrack() : undefined;
  try {
    const lyrics = await api.lyrics.get({
      title: meta.title,
      artist: meta.artist,
      album: t?.album,
      duration: meta.duration || undefined,
      trackId: t?.id,
    });
    if (id === lyricsReq) player.set({ lyrics, lyricsLoading: false });
  } catch {
    if (id === lyricsReq) player.set({ lyricsLoading: false });
  }
}

export async function loadCoverPalette(cover?: string): Promise<void> {
  if (!cover) return player.set({ coverPalette: undefined });
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cover;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, 48, 48);
    const px = g.getImageData(0, 0, 48, 48).data;
    player.set({ coverPalette: paletteFromPixels(px, paletteById(app.get().settings.palette)) });
  } catch {
    player.set({ coverPalette: undefined });
  }
}

export function initPlayer(): () => void {
  const el = engine.el;
  const sync = () => player.set({ playing: !el.paused });
  const ended = () => next(true);
  el.addEventListener("play", sync);
  el.addEventListener("pause", sync);
  el.addEventListener("ended", ended);
  const offKeys = api.on("media-key", (action) => {
    if (action === "playpause") togglePlay();
    if (action === "next") next();
    if (action === "prev") prev();
  });
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }
  return () => {
    el.removeEventListener("play", sync);
    el.removeEventListener("pause", sync);
    el.removeEventListener("ended", ended);
    offKeys();
  };
}
