// Плеер: очередь, управление, тексты песен, палитра из обложки.
import type { LibraryState, Lyrics, Playlist, Track } from "../../../shared/types";
import type { LyricsSync } from "../../../shared/settings";
import { addAnchor, approximateTimes, lyricsSlope, mapLyricsTime } from "../../../shared/lrc";
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { autoTrim, measure } from "../lib/loudness";
import { createStore } from "../lib/store";
import { paletteById, paletteFromPixels, type Palette } from "../lib/palettes";
import { pickShuffle } from "../../../shared/shuffle";
import { app, toast, updateSettings } from "./app";

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
  /** «Поймать текст»: следующий клик по строке говорит, что её поют прямо сейчас. */
  syncLyrics?: boolean;
  playlists: Playlist[];
  favorites: string[];
}

export const player = createStore<PlayerState>({
  library: { folders: [], tracks: [], scanning: false },
  queue: [],
  index: -1,
  playing: false,
  shuffle: false,
  repeat: "all",
  lyricsLoading: false,
  playlists: [],
  favorites: [],
});

export function currentTrack(): Track | undefined {
  const s = player.get();
  return s.queue[s.index];
}

/** Что сейчас играет — для заголовков и текстов. */
export function nowMeta(): { title: string; artist: string; cover?: string; duration: number } | undefined {
  const t = currentTrack();
  return t
    ? {
        title: t.title,
        artist: t.artist,
        cover: t.cover,
        duration: t.duration || engine.el.duration || 0,
      }
    : undefined;
}

/** Позиция трека, где он сейчас. */
export function position(): number {
  return engine.el.currentTime || 0;
}

/** Подгонка текста трека: время текста = s × время песни + o (старый ручной сдвиг — это o при s = 1). */
export function lyricsSyncOf(id: string | undefined): LyricsSync {
  if (!id) return { s: 1, o: 0 };
  const st = app.get().settings;
  return st.lyricsSync[id] ?? { s: 1, o: st.lyricsOffsets[id] ?? 0 };
}

/** То, что сейчас слышно (для текста): с поправкой на задержку звука и подгонку текста под этот трек. */
export function lyricsTime(): number {
  return mapLyricsTime(lyricsSyncOf(currentTrack()?.id), engine.audibleTime);
}

/** Сколько секунд текста проходит за секунду реального времени (для поверх-окна). */
export function lyricsRate(): number {
  return lyricsSlope(lyricsSyncOf(currentTrack()?.id), engine.audibleTime) * (engine.el.playbackRate || 1);
}

function saveSync(id: string, sync: LyricsSync | undefined): void {
  const st = app.get().settings;
  const copy = { ...st.lyricsSync };
  const offsets = { ...st.lyricsOffsets };
  delete offsets[id]; // старый формат больше не нужен
  if (!sync || (Math.abs(sync.s - 1) < 0.0005 && Math.abs(sync.o) < 0.01 && sync.t1 === undefined && !sync.anchors?.length)) delete copy[id];
  else copy[id] = sync;
  updateSettings({ lyricsSync: copy, lyricsOffsets: offsets });
}

/** Кнопки «−/+»: сдвинуть текст трека, секунды (+ — текст позже). */
export function setLyricsOffset(trackId: string, seconds: number): void {
  const cur = lyricsSyncOf(trackId);
  const o = Math.round(Math.max(-30, Math.min(30, seconds)) * 20) / 20;
  saveSync(trackId, { ...cur, o, t1: undefined, l1: undefined });
  // при точках «−/+» двигают весь текст поверх ломаной — o работает как общий сдвиг
}

/** Сбросить всю подгонку текста трека. */
export function resetLyricsSync(trackId: string): void {
  saveSync(trackId, undefined);
}

/**
 * «Поймать» строку: её поют прямо сейчас.
 * Первый раз — сдвигаем весь текст. Второй раз (хотя бы через 20 с песни) — по двум точкам считаем
 * ещё и скорость: так лечится текст, сделанный под чуть ускоренную/замедленную версию песни.
 */
export function catchLyricsLine(lineTime: number): void {
  const id = currentTrack()?.id;
  player.set({ syncLyrics: false });
  if (!id) return;
  const cur = lyricsSyncOf(id);
  // Старая подгонка (сдвиг/скорость) → считаем, что сейчас текст верен по ней, и начинаем точки с чистого листа.
  const base = cur.anchors?.length ? cur : { s: 1, o: 0 };
  const next = addAnchor(base, engine.audibleTime, lineTime);
  if (!next) {
    toast("Похоже, это не та строка — текст бы слишком растянулся. Попробуй ещё раз.", "warn");
    return;
  }
  saveSync(id, next);
  const n = next.anchors!.length;
  toast(
    n === 1
      ? "Поймал! Если дальше текст снова разъедется — нажми ⌖ ещё раз там, где разъехался. Ловить можно сколько угодно раз."
      : `Подогнал по ${n} точкам — между ними текст растягивается сам.`,
    "ok",
  );
}

// ---------- Громкость каждой песни ----------

/** Итоговая поправка громкости трека, дБ: автовыравнивание + своя настройка. */
export function trackTrim(id: string): number {
  const s = app.get().settings;
  const loud = s.trackLoudness[id];
  return (s.autoLevel && loud !== undefined ? autoTrim(loud) : 0) + (s.trackGain[id] ?? 0);
}

/** Измерить трек, если ещё не мерили, и плавно поправить громкость, пока он играет. */
async function levelTrack(id: string, url: string): Promise<void> {
  if (!app.get().settings.autoLevel || app.get().settings.trackLoudness[id] !== undefined) return;
  const loud = await measure(url);
  if (loud === undefined) return;
  updateSettings({ trackLoudness: { ...app.get().settings.trackLoudness, [id]: loud } });
  if (currentTrack()?.id === id) engine.setTrim(trackTrim(id));
}

/** Своя громкость песни, дБ. */
export function setTrackGain(id: string, db: number): void {
  const v = Math.round(Math.max(-12, Math.min(12, db)) * 2) / 2;
  const copy = { ...app.get().settings.trackGain };
  if (v === 0) delete copy[id];
  else copy[id] = v;
  updateSettings({ trackGain: copy });
  if (currentTrack()?.id === id) engine.setTrim(trackTrim(id));
}

export function setAutoLevel(on: boolean): void {
  updateSettings({ autoLevel: on });
  const t = currentTrack();
  if (!t) return;
  engine.setTrim(trackTrim(t.id));
  if (on) void levelTrack(t.id, `camado-media://track/${t.id}`);
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

// ---------- Плейлисты и любимое ----------

export async function loadPlaylists(): Promise<void> {
  player.set(await api.playlists.list());
}

export async function toggleFavorite(trackId: string): Promise<void> {
  // сразу на экране, потом в базе
  const fav = player.get().favorites;
  player.set({ favorites: fav.includes(trackId) ? fav.filter((x) => x !== trackId) : [trackId, ...fav] });
  await api.playlists.toggleFavorite(trackId);
}

// ---------- История прослушиваний (для «Итогов недели») ----------

let listened = { id: "", seconds: 0 };
/** Засчитываем прослушивание, если трек играл хотя бы 30 секунд. */
function flushListened(): void {
  const l = listened;
  listened = { id: "", seconds: 0 };
  if (!l.id || l.seconds < 30) return;
  const t = player.get().library.tracks.find((x) => x.id === l.id);
  if (t) void api.plays.add({ trackId: t.id, title: t.title, artist: t.artist, seconds: Math.round(l.seconds) });
}

async function startCurrent(fade = 0): Promise<void> {
  const t = currentTrack();
  if (!t) return;
  flushListened();
  listened = { id: t.id, seconds: 0 };
  history.push(t.id);
  if (history.length > 50) history.shift();
  // Сразу «ищу текст», чтобы не мелькало «текста нет», пока трек грузится.
  player.set({ lyrics: undefined, lyricsLoading: true });
  try {
    const url = `camado-media://track/${t.id}`;
    await engine.play(url, fade, trackTrim(t.id));
    void levelTrack(t.id, url);
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
    // Текст без отметок времени — расставляем строки по песне примерно: так работают «Взрыв», «Строка» и поверх-окно.
    const dur = meta.duration || engine.el.duration;
    const ready: Lyrics =
      !lyrics.synced && lyrics.lines.length && dur > 0 ? { ...lyrics, synced: true, approx: true, lines: approximateTimes(lyrics.lines, dur) } : lyrics;
    if (id === lyricsReq) player.set({ lyrics: ready, lyricsLoading: false });
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
    player.set({
      coverPalette: paletteFromPixels(px, paletteById(app.get().settings.palette)),
    });
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

  // Сколько реально слушали текущий трек.
  const listenTimer = window.setInterval(() => {
    if (!engine.el.paused && listened.id) listened.seconds += 1;
  }, 1000);
  window.addEventListener("beforeunload", flushListened);
  void loadPlaylists();
  const offPl = api.on("data-changed", () => void loadPlaylists());

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
    clearInterval(listenTimer);
    window.removeEventListener("beforeunload", flushListened);
    offPl();
    offKeys();
  };
}
