// Пословный текст песен: Камадо сам, в фоне, по одной песне слушает библиотеку и ставит время каждому слову.
// Считается один раз на песню и хранится у пользователя. Первой — песня, которая играет.
import type { Lyrics, Track } from "../../../shared/types";
import { asrWindows, ASR_WINDOW, languageOf, respaceLines, textKey, WORDSYNC_MODEL, type WordSync } from "../../../shared/wordsync";
import { api } from "../lib/api";
import { createStore } from "../lib/store";
import { app, toast } from "./app";
import type { AsrIn, AsrOut } from "../workers/asr";
import { tempoEnergy, type TrackEnergy } from "../../../shared/energy";

/** Меньше этой доли расслышанных слов — разметке не верим (не тот текст, крик, сплошное «ля-ля»). */
export const MIN_QUALITY = 0.3;

export interface WordsState {
  /** Какие песни готовы: id → модель. */
  done: Record<string, string>;
  /** Сейчас слушаю эту песню. */
  busy?: { id: string; title: string; done: number; total: number };
  /** Качается модель: сколько скачано из скольки (байты, по всем файлам). */
  model?: { loaded: number; total: number };
  device?: string;
  error?: string;
  loaded: boolean;
}

export const words = createStore<WordsState>({ done: {}, loaded: false });

// ---------- поток распознавания ----------

let worker: Worker | undefined;
type AsrResult = Extract<AsrOut, { type: "result" }>;
const waits = new Map<number, { ok: (r: AsrResult) => void; fail: (e: Error) => void }>();
const fileProgress = new Map<string, { loaded: number; total: number }>();

function asrWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/asr.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<AsrOut>) => {
    const m = e.data;
    if (m.type === "window") {
      const b = words.get().busy;
      if (b) words.set({ busy: { ...b, done: m.done, total: m.total } });
    } else if (m.type === "ready") words.set({ device: m.device, model: undefined });
    else if (m.type === "result") {
      waits.get(m.id)?.ok(m);
      waits.delete(m.id);
    } else if (m.type === "error") {
      if (m.id !== undefined) {
        waits.get(m.id)?.fail(new Error(m.message));
        waits.delete(m.id);
      } else words.set({ error: m.message });
    }
  };
  worker.onerror = (e) => {
    const err = new Error(e.message || "Распознавание упало");
    waits.forEach((w) => w.fail(err));
    waits.clear();
    worker?.terminate();
    worker = undefined;
  };
  return worker;
}

let reqId = 0;
function recognize(pcm: Float32Array, starts: number[], language: string | undefined, sr: number, lines: { text: string }[], duration: number) {
  const id = ++reqId;
  return new Promise<AsrResult>((ok, fail) => {
    waits.set(id, { ok, fail });
    // копия: буфер декодера звука нельзя передать в другой поток
    const copy = pcm.slice();
    const msg: AsrIn = { type: "run", id, pcm: copy, starts, window: ASR_WINDOW, language, sr, lines: lines.map((l) => ({ text: l.text })), duration };
    asrWorker().postMessage(msg, [copy.buffer]);
  });
}

/** Распознать речь (16 кГц) на компьютере — для голосового Камадо, когда модель ИИ не слышит звук. */
export async function transcribeLocal(pcm: Float32Array, language = "ru"): Promise<string> {
  const sec = pcm.length / 16000;
  const starts = sec <= ASR_WINDOW ? [0] : asrWindows(sec);
  const padded = pcm.length >= 16000 ? pcm : (() => {
    const p = new Float32Array(16000);
    p.set(pcm);
    return p;
  })();
  const r = await recognize(padded, starts, language, 16000, [], sec);
  return (r.heardLines ?? [])
    .map((l) => l.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- очередь ----------

let running = false;
let tracksOf: () => Track[] = () => [];
let currentOf: () => Track | undefined = () => undefined;
let onReady: (id: string) => void = () => undefined;
let resetSync: (id: string) => void = () => undefined;
let pcmOf: (url: string) => Promise<Float32Array> = async () => new Float32Array();
let onEnergy: (id: string, en: TrackEnergy | undefined) => void = () => undefined;
let SR = 16000;
const failed = new Set<string>();

/** Громкость отрывка: в тишине модель «слышит» несуществующие слова — такие окна пропускаем. */
function loud(pcm: Float32Array, start: number, sr: number): boolean {
  const a = Math.floor(start * sr);
  const b = Math.min(pcm.length, a + ASR_WINDOW * sr);
  let sum = 0;
  let n = 0;
  for (let i = a; i < b; i += 32) {
    sum += pcm[i]! * pcm[i]!;
    n++;
  }
  return n > 0 && Math.sqrt(sum / n) > 0.004;
}

export function initWordSync(deps: {
  tracks: () => Track[];
  current: () => Track | undefined;
  /** Разметка песни готова — если она играет, обновить текст. */
  ready: (id: string) => void;
  /** Старая подгонка (сдвиг/скорость) была под строки из базы — с пословной разметкой она только мешает. */
  resetSync: (id: string) => void;
  pcm: (url: string) => Promise<Float32Array>;
  sr: number;
  energy?: (id: string, en: TrackEnergy | undefined) => void;
  playing?: () => boolean;
}): void {
  if (deps.playing) isPlaying = deps.playing;
  // свернули окно / поставили на паузу — можно доделать остальные песни
  document.addEventListener("visibilitychange", () => kick());
  tracksOf = deps.tracks;
  currentOf = deps.current;
  onReady = deps.ready;
  resetSync = deps.resetSync;
  pcmOf = deps.pcm;
  if (deps.energy) onEnergy = deps.energy;
  SR = deps.sr;
  api.on("model-progress", (p) => {
    // модель «Моей волны» качается отдельно — её показывает волна
    if (/clap/i.test(p.file)) return;
    fileProgress.set(p.file, { loaded: p.loaded, total: p.total });
    let loaded = 0;
    let total = 0;
    fileProgress.forEach((x) => {
      loaded += x.loaded;
      total += x.total;
    });
    words.set({ model: loaded >= total ? undefined : { loaded, total } });
  });
  void api.wordsync.done().then((done) => {
    words.set({ done, loaded: true });
    kick();
  });
}

/** Что-то поменялось (новые песни, включили настройку, сменилась песня) — проверить очередь. */
export function kick(): void {
  if (running || !words.get().loaded || !app.get().settings.wordSync) return;
  running = true;
  void loop().finally(() => {
    running = false;
  });
}

let isPlaying: () => boolean = () => false;

function next(): Track | undefined {
  const done = words.get().done;
  const need = (t: Track) => done[t.id] !== WORDSYNC_MODEL && !failed.has(t.id);
  const cur = currentOf();
  // трек из открытой базы не размечаем (это пришлось бы качать его целиком ещё раз)
  if (cur && !cur.web && need(cur)) return cur;
  // Пока играет музыка и окно на экране — не грузим процессор чужими песнями: остальные — на паузе или в фоне.
  if (isPlaying() && !document.hidden) return undefined;
  return tracksOf().find(need);
}

async function loop(): Promise<void> {
  let shownModelHint = false;
  for (;;) {
    if (!app.get().settings.wordSync) return;
    const t = next();
    if (!t) return;
    if (!shownModelHint && !Object.keys(words.get().done).length) {
      shownModelHint = true;
      toast("Расставляю слова в текстах песен сам — один раз скачаю модель распознавания (≈300 МБ), дальше всё на компьютере.");
    }
    words.set({ busy: { id: t.id, title: t.title, done: 0, total: 0 }, error: undefined });
    try {
      const ws = await processTrack(t);
      await api.wordsync.save(t.id, ws);
      if (ws.lines.length) resetSync(t.id);
      words.set((s) => ({ done: { ...s.done, [t.id]: WORDSYNC_MODEL } }));
      onReady(t.id);
    } catch (err) {
      console.warn("Пословный текст:", t.title, err);
      failed.add(t.id);
      const msg = err instanceof Error ? err.message : String(err);
      words.set({ error: msg });
      // сеть пропала, пока качалась модель, — не мучаем остальные песни
      if (/модель|fetch|network|502|Failed to fetch/i.test(msg)) return;
    } finally {
      words.set({ busy: undefined });
    }
    // передышка между песнями
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function processTrack(t: Track): Promise<WordSync> {
  const lyrics: Lyrics = await api.lyrics.get({ title: t.title, artist: t.artist, album: t.album, duration: t.duration || undefined, trackId: t.id });
  const lines = lyrics.lines.filter((l) => l.text.trim());
  const pcm = await pcmOf(`camado-media://track/${t.id}`);
  // заодно — темп и энергия для «Моей волны» (звук уже раскодирован)
  onEnergy(t.id, tempoEnergy(pcm, SR));
  const duration = pcm.length / SR;
  const starts = asrWindows(duration).filter((s) => loud(pcm, s, SR));
  const language = languageOf(lines.map((l) => l.text).join(" "));
  const base = { v: 1 as const, model: WORDSYNC_MODEL, duration, createdAt: new Date().toISOString() };
  if (!starts.length) return { ...base, textKey: textKey(lyrics.lines), source: "heard", quality: 0, lines: [] };
  const res = await recognize(pcm, starts, language, SR, lyrics.lines, duration);
  if (lines.length >= 2 && res.aligned) {
    const r = res.aligned;
    return { ...base, textKey: textKey(lyrics.lines), source: "aligned", quality: r.quality, lines: r.quality >= MIN_QUALITY ? r.lines : [] };
  }
  // текста нигде нет — покажем услышанное (если там правда пели)
  const own = res.heardLines ?? [];
  const enough = own.reduce((a, l) => a + (l.words?.length ?? 0), 0) >= 12;
  return { ...base, textKey: "", source: "heard", quality: enough ? 1 : 0, lines: enough ? own : [] };
}

/** Применить готовую разметку к тексту песни (если подходит). */
export function withWords(lyrics: Lyrics, ws: WordSync | null): Lyrics | undefined {
  if (!ws || ws.model !== WORDSYNC_MODEL || !ws.lines.length) return undefined;
  if (ws.source === "aligned" && ws.quality >= MIN_QUALITY && lyrics.lines.length && ws.textKey === textKey(lyrics.lines))
    return { ...lyrics, synced: true, approx: false, scaled: undefined, versionDuration: undefined, lines: respaceLines(ws.lines, ws.duration), wordTimed: true };
  if (ws.source === "heard" && !lyrics.lines.length) return { synced: true, source: "heard", lines: respaceLines(ws.lines, ws.duration), wordTimed: true };
  return undefined;
}

/** Пересчитать песню заново (кнопка в плеере). */
export async function redoWords(id: string): Promise<void> {
  await api.wordsync.drop(id);
  failed.delete(id);
  words.set((s) => {
    const done = { ...s.done };
    delete done[id];
    return { done };
  });
  kick();
}
