// Плеер: очередь, управление, тексты песен, палитра из обложки.
import type { WaveMood } from "../../../shared/types";
import type { TrackEnergy } from "../../../shared/energy";
import type { LibraryState, Lyrics, Playlist, Track } from "../../../shared/types";
import type { LyricsSync } from "../../../shared/settings";
import { addAnchor, approximateTimes, cleanEarWindow, EAR_WINDOW, earWindows, lyricsSlope, mapLyricsTime, syncFromHeard } from "../../../shared/lrc";
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { autoTrim, measure } from "../lib/loudness";
import { scratching } from "../lib/scratch";
import { createStore } from "../lib/store";
import { paletteById, paletteFromPixels, type Palette } from "../lib/palettes";
import { pickShuffle } from "../../../shared/shuffle";
import { app, toast, updateSettings } from "./app";
import { initWordSync, kick as kickWords, withWords } from "./wordsync";

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
  /** Для какой обложки посчитана coverPalette — пластинка ждёт «свои» цвета, чтобы не мелькнуть в чужих. */
  coverPaletteFor?: string;
  /** Таймер сна: во сколько выключить (Date.now()) или «после этого трека». */
  sleep?: { at?: number; endOfTrack?: boolean };
  /** «Поймать текст»: следующий клик по строке говорит, что её поют прямо сейчас. */
  syncLyrics?: boolean;
  /** ИИ сейчас слушает песню, чтобы подогнать текст. */
  earSyncing?: boolean;
  playlists: Playlist[];
  favorites: string[];
  /** Играет «Моя волна»: настроение и что уже было. */
  wave?: { mood: WaveMood; loading?: boolean; seen: string[] };
  /** Перевод текста песни: key — для какого текста, lines — по строкам (той же длины). */
  translation?: { key: string; lines?: string[]; native?: boolean; busy?: boolean; error?: string };
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

// ---------- Подгонка текста по звуку (ИИ слушает песню) ----------

export const SR = 16000; // так Gemini слушает сам; отрывок 40 с ≈ 1,3 МБ
/** Песню → моно 16 кГц (любой формат файла). */
export async function songPcm(url: string): Promise<Float32Array> {
  const buf = await (await fetch(url)).arrayBuffer();
  const decoded = await new OfflineAudioContext(1, SR, SR).decodeAudioData(buf);
  const off = new OfflineAudioContext(1, Math.ceil(Math.min(decoded.duration, 15 * 60) * SR), SR);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}

/** Кусок звука → WAV (16 бит) в base64. */
function wavBase64(pcm: Float32Array): string {
  const bytes = new Uint8Array(44 + pcm.length * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SR, true);
  v.setUint32(28, SR * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i]!)) * 0x7fff, true);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

let earBusy = "";
const earTried = new Set<string>();
/**
 * Подогнать текст текущей песни по звуку: ИИ слушает песню и называет, когда начинают петь ~10 строк,
 * по этим точкам ставится та же подгонка, что и ручная ⌖. auto — сама, без всплывашек об ошибках.
 */
export async function syncLyricsByEar(auto = false): Promise<boolean> {
  const t = currentTrack();
  const lyrics = player.get().lyrics;
  if (!t || !lyrics?.synced || lyrics.lines.length < 4 || earBusy) return false;
  if (auto && earTried.has(t.id)) return false;
  earTried.add(t.id);
  earBusy = t.id;
  player.set({ earSyncing: true });
  if (!auto) toast("Слушаю песню и подгоняю текст — это займёт 10–30 секунд…");
  try {
    // ИИ слушает 4 коротких отрывка (на всей песне целиком он путается в секундах к концу)
    const pcm = await songPcm(trackSrc(t));
    const windows = earWindows(pcm.length / SR, lyrics.lines);
    const results = await Promise.all(
      windows.map(async (w) => {
        const clip = pcm.subarray(Math.floor(w.start * SR), Math.floor((w.start + EAR_WINDOW) * SR));
        const r = await api.lyrics.aiSync(
          wavBase64(clip),
          w.lines.map((i) => ({ n: i, text: lyrics.lines[i]!.text })),
        );
        if ("error" in r) return r.error;
        // внутри отрывка: не на «нулевой» секунде и не за его концом; потом — проверка темпа отрывка
        const pts = r.points.filter((p) => p.t >= 1 && p.t <= EAR_WINDOW + 1).map((p) => ({ t: w.start + p.t, l: lyrics.lines[p.n]!.time }));
        return cleanEarWindow(pts);
      }),
    );
    const failed = results.find((x): x is string => typeof x === "string");
    const points = results.flatMap((x) => (typeof x === "string" ? [] : x));
    if (failed && points.length < 3) {
      if (!auto) toast(failed, "warn");
      return false;
    }
    const sync = syncFromHeard(points);
    if (currentTrack()?.id !== t.id) return false;
    if (!sync) {
      if (!auto) toast("Не получилось уверенно расслышать строки — подгони вручную кнопкой ⌖.", "warn");
      return false;
    }
    saveSync(t.id, sync);
    toast(`Подогнал текст по звуку — послушал ${points.length} строк. Если где-то не так — поправь ⌖.`, "ok");
    return true;
  } catch (err) {
    console.error("Подгонка по звуку:", err);
    if (!auto) toast("Не получилось подогнать текст по звуку.", "warn");
    return false;
  } finally {
    earBusy = "";
    player.set({ earSyncing: false });
  }
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
  const st = app.get().settings;
  const needLoud = st.autoLevel && st.trackLoudness[id] === undefined;
  if (!needLoud && st.trackEnergy[id]) return;
  const m = await measure(url);
  if (!m) return;
  const cur = app.get().settings;
  updateSettings({
    ...(needLoud ? { trackLoudness: { ...cur.trackLoudness, [id]: m.loud } } : {}),
    ...(m.energy ? { trackEnergy: { ...cur.trackEnergy, [id]: m.energy } } : {}),
  });
  if (needLoud && currentTrack()?.id === id) engine.setTrim(trackTrim(id));
}

/** Энергию посчитали по пути (при разборе слов песни) — запомнить для «Моей волны». */
export function rememberEnergy(id: string, en: TrackEnergy | undefined): void {
  if (!en || app.get().settings.trackEnergy[id]) return;
  updateSettings({ trackEnergy: { ...app.get().settings.trackEnergy, [id]: en } });
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
  if (on && !t.web) void levelTrack(t.id, trackSrc(t));
}

export function duration(): number {
  return nowMeta()?.duration || 0;
}

// ---------- Библиотека ----------

export async function loadLibrary(): Promise<void> {
  const library = await api.library.get();
  // поправили название или обложку — очередь показывает новое
  const byId = new Map(library.tracks.map((t) => [t.id, t]));
  const queue = player.get().queue;
  const fresh = queue.map((t) => {
    const n = byId.get(t.id);
    return n && (n.title !== t.title || n.artist !== t.artist || n.album !== t.album || n.cover !== t.cover) ? { ...t, title: n.title, artist: n.artist, album: n.album, cover: n.cover } : t;
  });
  player.set(fresh.some((t, i) => t !== queue[i]) ? { library, queue: fresh } : { library });
  kickWords();
}

/** Пословный текст: очередь песен в фоне. Готово для играющей — сразу обновить текст. */
export function startWordSync(): () => void {
  initWordSync({
    tracks: () => player.get().library.tracks,
    current: currentTrack,
    ready: (id) => {
      if (currentTrack()?.id === id) void loadLyrics();
    },
    pcm: songPcm,
    sr: SR,
    energy: rememberEnergy,
    playing: () => player.get().playing,
    resetSync: (id) => {
      const st = app.get().settings;
      if (st.lyricsSync[id] || st.lyricsOffsets[id]) resetLyricsSync(id);
    },
  });
  // поставили на паузу — можно слушать остальные песни
  let was = player.get().playing;
  const offPlay = player.subscribe(() => {
    const now = player.get().playing;
    if (now !== was && !now) kickWords();
    was = now;
  });
  const offWs = api.on("wordsync-changed", (id) => {
    if (currentTrack()?.id === id) void loadLyrics();
  });
  return () => {
    offPlay();
    offWs();
  };
}

export function watchLibrary(): () => void {
  return api.on("library-changed", () => void loadLibrary());
}

// ---------- Управление ----------

/** Откуда играть: свой файл — с диска, трек из открытой базы — потоком через Камадо. */
export function trackSrc(t: Track): string {
  return t.web ? `camado-media://stream/?u=${encodeURIComponent(t.web.url)}` : `camado-media://track/${t.id}`;
}

export async function playQueue(tracks: Track[], index: number, keepWave = false): Promise<void> {
  player.set(keepWave ? { queue: tracks } : { queue: tracks, wave: undefined });
  setIndex(index);
  await startCurrent(0.35);
}

/**
 * Переключить трек: номер, подгонка текста выключается, и если цвета новой обложки уже готовы
 * (соседей готовим заранее) — ставим их тем же махом, без промежуточного кадра.
 */
function setIndex(i: number): void {
  const t = player.get().queue[i];
  const cached = t?.cover ? paletteCache.get(paletteKey(t.cover)) : undefined;
  player.set({ index: i, syncLyrics: false, ...(cached ? { coverPalette: cached, coverPaletteFor: t!.cover } : {}) });
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
  const t = player.get().queue.find((x) => x.id === trackId) ?? player.get().library.tracks.find((x) => x.id === trackId);
  if (t) void api.wave.feedback(t, fav.includes(trackId) ? "unlike" : "like");
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
  const t = player.get().library.tracks.find((x) => x.id === l.id) ?? player.get().queue.find((x) => x.id === l.id);
  if (t) void api.plays.add({ trackId: t.id, title: t.title, artist: t.artist, seconds: Math.round(l.seconds) });
}

// ---------- «Моя волна» ----------

export const WAVE_MOODS: { id: WaveMood; label: string }[] = [
  { id: "mine", label: "Под меня" },
  { id: "energy", label: "Бодро" },
  { id: "calm", label: "Спокойно" },
  { id: "study", label: "Учёба" },
  { id: "new", label: "Что-то новое" },
];

export async function startWave(mood: WaveMood = "mine"): Promise<void> {
  player.set({ wave: { mood, loading: true, seen: [] } });
  const tracks = await api.wave.next(mood, []).catch(() => [] as Track[]);
  if (player.get().wave?.mood !== mood) return;
  if (!tracks.length) {
    player.set({ wave: undefined });
    toast("Волна пока пустая: добавь музыку в библиотеку или проверь интернет", "warn");
    return;
  }
  player.set({ wave: { mood, seen: tracks.map((t) => t.id) } });
  await playQueue(tracks, 0, true);
  toast(`«Моя волна» · ${WAVE_MOODS.find((m) => m.id === mood)?.label}`, "info");
}

export function stopWave(): void {
  player.set({ wave: undefined });
}

let extending: Promise<void> | undefined;
/** Подгрузить ещё, пока волна не кончилась. */
export function extendWave(): Promise<void> {
  const w = player.get().wave;
  if (!w) return Promise.resolve();
  extending ??= (async () => {
    player.set({ wave: { ...w, loading: true } });
    const more = await api.wave.next(w.mood, w.seen).catch(() => [] as Track[]);
    const cur = player.get();
    if (cur.wave?.mood !== w.mood) return;
    const fresh = more.filter((t) => !cur.queue.some((q) => q.id === t.id));
    // очередь не растёт бесконечно: старое (давно сыгранное) убираем
    const drop = Math.max(0, cur.index - 20);
    player.set({
      queue: [...cur.queue.slice(drop), ...fresh],
      index: cur.index - drop,
      wave: { mood: w.mood, seen: [...w.seen, ...fresh.map((t) => t.id)].slice(-400) },
    });
  })().finally(() => (extending = undefined));
  return extending;
}

/** «Не то»: больше такого не ставить, сразу дальше. */
export function waveDislike(): void {
  const t = currentTrack();
  if (!t) return;
  void api.wave.feedback(t, "dislike");
  toast("Понял, такое больше не ставлю", "info");
  next(false);
}

/** «Сохранить к себе»: трек из открытой базы скачивается в «Музыка/Камадо». */
export async function saveWebTrack(t: Track): Promise<void> {
  if (!t.web) return;
  toast(`Сохраняю «${t.title}»…`, "info");
  const r = await api.music.importUrl(t.web.url);
  if (r.kind === "saved") toast(`«${t.title}» теперь в твоей библиотеке`, "ok");
  else if (r.kind === "error") toast(r.error, "warn");
}

async function startCurrent(fade = 0): Promise<void> {
  const t = currentTrack();
  if (!t) return;
  if (player.get().wave && player.get().index >= player.get().queue.length - 2) void extendWave();
  flushListened();
  listened = { id: t.id, seconds: 0 };
  history.push(t.id);
  if (history.length > 50) history.shift();
  // Сразу «ищу текст», чтобы не мелькало «текста нет», пока трек грузится.
  player.set({ lyrics: undefined, lyricsLoading: true });
  try {
    const url = trackSrc(t);
    await engine.play(url, fade, trackTrim(t.id));
    // громкость выравниваем по своим файлам; трек из интернета для этого пришлось бы качать дважды
    if (!t.web) void levelTrack(t.id, url);
  } catch (err) {
    console.error(err);
    toast(`Не смог воспроизвести «${t.title}»`, "warn");
  }
  void updateMediaSession(t);
  void loadLyrics();
  kickWords();
  void loadCoverPalette(t.cover).then(prefetchNeighbors);
}

/** Заранее готовим соседние треки: обложку в память и её цвета — переход будет без рывка. */
function prefetchNeighbors(): void {
  const s = player.get();
  if (s.queue.length < 2) return;
  const ids = new Set([nextIndex(false), (s.index - 1 + s.queue.length) % s.queue.length]);
  for (const i of ids) {
    const cover = s.queue[i]?.cover;
    if (cover && !paletteCache.has(paletteKey(cover))) void paletteFor(cover).catch(() => undefined);
  }
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
  if (engine.el.paused) {
    // На всякий случай: звук не должен остаться заглушённым после скретча на паузе.
    if (!scratching()) engine.setMusicMuted(false);
    void engine.play().catch(() => undefined);
  } else engine.el.pause();
}

/** Индекс следующего трека или −1, если очередь кончилась. */
function nextIndex(auto: boolean): number {
  const s = player.get();
  if (s.queue.length === 0) return -1;
  if (s.shuffle && !s.wave && s.queue.length > 1) return pickShuffle(s.queue, s.index, history);
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
  if (auto && s.repeat === "one" && !s.wave) {
    engine.el.currentTime = 0;
    void engine.play();
    return;
  }
  // волна учится: дослушал — нравится, пропустил в начале — не очень
  const cur = currentTrack();
  if (cur) {
    const d = engine.el.duration || cur.duration;
    const at = engine.el.currentTime;
    if (auto) void api.wave.feedback(cur, "done");
    else if (d > 0 && at > 2 && at < d * 0.4) void api.wave.feedback(cur, "skip");
  }
  if (s.wave && s.index >= s.queue.length - 1) {
    // волна кончилась раньше, чем подгрузилась — дождаться и играть дальше
    void extendWave().then(() => {
      if (player.get().index < player.get().queue.length - 1) {
        setIndex(player.get().index + 1);
        void startCurrent(fade);
      }
    });
    return;
  }
  const i = nextIndex(auto);
  if (i < 0) return;
  setIndex(i);
  void startCurrent(fade);
}

export function prev(): void {
  const s = player.get();
  if (engine.el.currentTime > 3) {
    engine.el.currentTime = 0;
    return;
  }
  if (s.queue.length === 0) return;
  setIndex((s.index - 1 + s.queue.length) % s.queue.length);
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
/** Перевод текста: включён в настройках — переводим текст играющей песни (один раз, дальше из сохранённого). */
export async function ensureTranslation(): Promise<void> {
  const ly = player.get().lyrics;
  if (!app.get().settings.lyricsTranslate || !ly?.lines.length) return;
  const lines = ly.lines.map((l) => l.text);
  const key = lines.join("\n");
  const cur = player.get().translation;
  if (cur?.key === key && (cur.lines || cur.busy || cur.native)) return;
  player.set({ translation: { key, busy: true } });
  const meta = nowMeta();
  const r = await api.lyrics.translate(lines, { title: meta?.title, artist: meta?.artist });
  if (player.get().translation?.key !== key) return;
  if ("error" in r) {
    player.set({ translation: { key, error: r.error } });
    toast(`Перевод: ${r.error}`, "warn");
  } else player.set({ translation: { key, lines: r.lines, native: r.native } });
}

export function toggleTranslation(): void {
  const on = !app.get().settings.lyricsTranslate;
  updateSettings({ lyricsTranslate: on });
  if (on) {
    toast(player.get().lyrics?.lines.length ? "Перевожу текст песни…" : "Перевод включён — появится, когда будет текст песни", "info");
    void ensureTranslation().then(() => {
      if (player.get().translation?.native) toast("Песня и так на русском", "info");
    });
  }
}

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
    // своя пословная разметка (Камадо расслышал песню сам) — точнее всего остального
    const timed = t && app.get().settings.wordSync ? withWords(lyrics, await api.wordsync.get(t.id).catch(() => null)) : undefined;
    const ready: Lyrics =
      timed ?? (!lyrics.synced && lyrics.lines.length && dur > 0 ? { ...lyrics, synced: true, approx: true, lines: approximateTimes(lyrics.lines, dur) } : lyrics);
    if (id === lyricsReq) {
      player.set({ lyrics: ready, lyricsLoading: false });
      void maybeAutoEar(ready, dur);
      void ensureTranslation();
    }
  } catch {
    if (id === lyricsReq) player.set({ lyricsLoading: false });
  }
}

const paletteCache = new Map<string, Palette>();
/** Держим обложки соседей декодированными, чтобы картинка появлялась мгновенно. */
const coverImages = new Map<string, HTMLImageElement>();
const paletteKey = (cover: string) => `${app.get().settings.palette}|${cover}`;

async function paletteFor(cover: string): Promise<Palette> {
  const key = paletteKey(cover);
  const hit = paletteCache.get(key);
  if (hit) return hit;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = cover;
  await img.decode();
  coverImages.set(cover, img);
  if (coverImages.size > 8) coverImages.delete(coverImages.keys().next().value!);
  const c = document.createElement("canvas");
  c.width = c.height = 48;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 48, 48);
  const pal = paletteFromPixels(g.getImageData(0, 0, 48, 48).data, paletteById(app.get().settings.palette));
  paletteCache.set(key, pal);
  if (paletteCache.size > 200) paletteCache.delete(paletteCache.keys().next().value!);
  return pal;
}

/** Текст, скорее всего, разъедется (версия другой длины или расставлен примерно) — подгоняем по звуку сами. */
async function maybeAutoEar(l: Lyrics, dur: number): Promise<void> {
  const t = currentTrack();
  const st = app.get().settings;
  if (!t || !st.lyricsByEar || l.wordTimed || st.lyricsSync[t.id] || st.lyricsOffsets[t.id]) return;
  const off = l.approx || (!l.scaled && !!l.versionDuration && dur > 0 && Math.abs(l.versionDuration - dur) > 1.5);
  if (!off) return;
  if (!(await api.ai.status()).enabled) return;
  // чуть подождём: вдруг человек сразу листает дальше
  await new Promise((r) => setTimeout(r, 4000));
  if (currentTrack()?.id === t.id) void syncLyricsByEar(true);
}

export async function loadCoverPalette(cover?: string): Promise<void> {
  if (!cover) return player.set({ coverPalette: undefined, coverPaletteFor: undefined });
  try {
    const pal = await paletteFor(cover);
    if (currentTrack()?.cover === cover || nowMeta()?.cover === cover) player.set({ coverPalette: pal, coverPaletteFor: cover });
  } catch {
    player.set({ coverPalette: undefined, coverPaletteFor: cover });
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
