// Плеер: очередь, управление, тексты песен, палитра из обложки.
import type { LibraryState, Lyrics, Track } from "../../../shared/types";
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { createStore } from "../lib/store";
import { paletteById, paletteFromPixels, type Palette } from "../lib/palettes";
import { pickShuffle } from "../../../shared/shuffle";
import { app, toast } from "./app";

interface PlayerState {
  library: LibraryState;
  queue: Track[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  lyrics?: Lyrics;
  lyricsLoading: boolean;
  coverPalette?: Palette;
  /** Таймер сна: во сколько выключить (Date.now()) или «после этого трека». */
  sleep?: { at?: number; endOfTrack?: boolean };
}

export const player = createStore<PlayerState>({
  library: { folders: [], tracks: [], scanning: false },
  queue: [],
  index: -1,
  playing: false,
  shuffle: false,
  repeat: "all",
  lyricsLoading: false,
});

export function currentTrack(): Track | undefined {
  const s = player.get();
  return s.queue[s.index];
}

/** Что сейчас играет — для заголовков и текстов. */
export function nowMeta(): { title: string; artist: string; cover?: string; duration: number } | undefined {
  const t = currentTrack();
  return t ? { title: t.title, artist: t.artist, cover: t.cover, duration: t.duration || engine.el.duration || 0 } : undefined;
}

/** Позиция трека, где он сейчас. */
export function position(): number {
  return engine.el.currentTime || 0;
}

/** То, что сейчас слышно (для текста): с поправкой на задержку звука и ручной сдвиг трека. */
export function lyricsTime(): number {
  const id = currentTrack()?.id;
  const shift = id ? (app.get().settings.lyricsOffsets[id] ?? 0) : 0;
  return engine.audibleTime + shift;
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
  player.set({ queue: tracks, index });
  await startCurrent(0.35);
}

/** Перемешать всё и включить — режим умного рандома. */
export async function shuffleAll(tracks: Track[]): Promise<void> {
  if (tracks.length === 0) return;
  player.set({ shuffle: true });
  await playQueue(tracks, Math.floor(Math.random() * tracks.length));
}

const history: string[] = [];

async function startCurrent(fade = 0): Promise<void> {
  const t = currentTrack();
  if (!t) return;
  history.push(t.id);
  if (history.length > 50) history.shift();
  // Сразу «ищу текст», чтобы не мелькало «текста нет», пока трек грузится.
  player.set({ lyrics: undefined, lyricsLoading: true });
  try {
    await engine.play(`camado-media://track/${t.id}`, fade);
  } catch (err) {
    console.error(err);
    toast(`Не смог воспроизвести «${t.title}»`, "warn");
  }
  void updateMediaSession(t);
  void loadLyrics();
  void loadCoverPalette(t.cover);
}

/** «Сейчас играет» в системе (Пункт управления на Mac, медиа-клавиши, оверлей Windows). */
let artworkUrl: string | undefined;
async function updateMediaSession(t: Track): Promise<void> {
  if (!("mediaSession" in navigator)) return;
  const set = (src?: string) =>
    (navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: t.album,
      artwork: src ? [{ src, sizes: "512x512" }] : [],
    }));
  set();
  if (!t.cover) return;
  try {
    // Система принимает картинку только как blob/data — свой протокол camado-media не понимает.
    const blob = await (await fetch(t.cover)).blob();
    if (artworkUrl) URL.revokeObjectURL(artworkUrl);
    artworkUrl = URL.createObjectURL(blob);
    if (currentTrack()?.id === t.id) set(artworkUrl);
  } catch {
    // без обложки — не страшно
  }
}

export function togglePlay(): void {
  const s = player.get();
  if (!currentTrack()) {
    const first = s.library.tracks[0];
    if (first) void playQueue(s.library.tracks, 0);
    return;
  }
  if (engine.el.paused) void engine.play().catch(() => undefined);
  else engine.el.pause();
}

/** Индекс следующего трека или −1, если очередь кончилась. */
function nextIndex(auto: boolean): number {
  const s = player.get();
  if (s.queue.length === 0) return -1;
  if (s.shuffle && s.queue.length > 1) return pickShuffle(s.queue, s.index, history);
  const i = s.index + 1;
  if (i >= s.queue.length) return s.repeat === "off" && auto ? -1 : 0;
  return i;
}

/** fade — плавный переход (секунды). Вручную — короткий, чтобы не было щелчка. */
export function next(auto = false, fade = auto ? 0 : 0.4): void {
  const s = player.get();
  if (s.queue.length === 0) return;
  if (auto && s.sleep?.endOfTrack) {
    player.set({ sleep: undefined });
    engine.el.pause();
    toast("Таймер сна: трек закончился — спокойной ночи 🌙");
    return;
  }
  if (auto && s.repeat === "one") {
    engine.el.currentTime = 0;
    void engine.play();
    return;
  }
  const i = nextIndex(auto);
  if (i < 0) return;
  player.set({ index: i });
  void startCurrent(fade);
}

export function prev(): void {
  const s = player.get();
  if (engine.el.currentTime > 3) {
    engine.el.currentTime = 0;
    return;
  }
  if (s.queue.length === 0) return;
  player.set({ index: (s.index - 1 + s.queue.length) % s.queue.length });
  void startCurrent(0.4);
}

// ---------- Таймер сна ----------

export function setSleep(v: number | "track" | null): void {
  if (v === null) player.set({ sleep: undefined });
  else if (v === "track") player.set({ sleep: { endOfTrack: true } });
  else player.set({ sleep: { at: Date.now() + v * 60e3 } });
  if (v !== null) toast(v === "track" ? "Выключу музыку после этого трека 🌙" : `Выключу музыку через ${v} мин 🌙`);
}

export function seek(sec: number): void {
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
  const t = currentTrack();
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
  // Слушаем обе деки, но реагируем только на ту, что сейчас главная.
  const isActive = (e: Event) => e.target === engine.el;
  const sync = (e: Event) => {
    if (isActive(e)) player.set({ playing: !engine.el.paused });
  };
  const ended = (e: Event) => {
    if (isActive(e)) next(true);
  };
  for (const d of engine.decks) {
    d.addEventListener("play", sync);
    d.addEventListener("pause", sync);
    d.addEventListener("ended", ended);
  }

  // Кроссфейд: за N секунд до конца трека заранее запускаем следующий на второй деке.
  let crossedFor = "";
  const timer = window.setInterval(() => {
    const s = player.get();
    const el = engine.el;
    const t = currentTrack();
    if (s.sleep?.at && Date.now() >= s.sleep.at) {
      player.set({ sleep: undefined });
      void engine.fadeOutAndPause(8);
      toast("Таймер сна: выключаю музыку 🌙");
      return;
    }
    const fade = app.get().settings.crossfade;
    if (!t || el.paused || !fade || !Number.isFinite(el.duration) || el.duration < fade * 3) return;
    if (s.repeat === "one" || s.sleep?.endOfTrack || crossedFor === t.id) return;
    const left = (el.duration - el.currentTime) / (el.playbackRate || 1);
    if (left <= fade && nextIndex(true) >= 0) {
      crossedFor = t.id;
      next(true, fade);
    }
  }, 200);

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
    navigator.mediaSession.setActionHandler("seekto", (d) => d.seekTime !== undefined && seek(d.seekTime));
  }
  return () => {
    for (const d of engine.decks) {
      d.removeEventListener("play", sync);
      d.removeEventListener("pause", sync);
      d.removeEventListener("ended", ended);
    }
    clearInterval(timer);
    offKeys();
  };
}
