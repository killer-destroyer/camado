// «Моя волна» 2.0 — как в Яндексе, но на открытой музыке.
// 1) Нейросеть CLAP слушает песни выбранного плейлиста (10 секунд каждой) и делает «отпечаток» звучания.
// 2) По отпечаткам угадываются жанры → с Audius берутся кандидаты (жанры, исполнители плейлиста, русское — если
//    плейлист русский). 3) Кандидатов тоже слушает нейросеть, в волну идут самые похожие по звучанию.
// 4) Подстройка на лету: ♡ — ближе к этому звучанию, «не то» и пропуск — дальше.
// Проверено на 717 треках 20 жанров: ~7 из 10 подобранных того же стиля (случайно — 2). См. docs/WAVE.md.
import type { Track, WaveMood } from "../../../shared/types";
import { guessGenres, isRu, sameSong, MOOD_GENRES, moodSeeds, normalize, rankWave, type RankItem, type Vec } from "../../../shared/waveRank";
import { GENRE_CENTROIDS } from "../../../shared/waveGenres";
import { api } from "../lib/api";
import { createStore } from "../lib/store";
import { app, toast } from "./app";
import { currentTrack, next, player, playQueue, trackSrc } from "./player";
import type { ClapIn, ClapOut } from "../workers/clap";

export const WAVE_MOODS: { id: WaveMood; label: string }[] = [
  { id: "mine", label: "Под меня" },
  { id: "energy", label: "Бодро" },
  { id: "calm", label: "Спокойно" },
  { id: "study", label: "Учёба" },
  { id: "new", label: "Что-то новое" },
];

/** Что сейчас делает волна (для карточки «Моя волна»). */
export const waveStatus = createStore<{ stage?: string; model?: { loaded: number; total: number } }>({});

// ---------- нейросеть в отдельном потоке ----------

const SR = 48000;
let worker: Worker | undefined;
let reqId = 0;
const waits = new Map<number, { ok: (v: Float32Array) => void; fail: (e: Error) => void }>();
const modelFiles = new Map<string, { loaded: number; total: number }>();

function clap(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/clap.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<ClapOut>) => {
    const m = e.data;
    if (m.type === "vec") {
      waits.get(m.id)?.ok(m.vec);
      waits.delete(m.id);
    } else if (m.type === "error") {
      if (m.id !== undefined) {
        waits.get(m.id)?.fail(new Error(m.message));
        waits.delete(m.id);
      }
    } else if (m.type === "ready") waveStatus.set({ model: undefined });
  };
  worker.onerror = (e) => {
    const err = new Error(e.message || "Нейросеть волны упала");
    waits.forEach((w) => w.fail(err));
    waits.clear();
    worker?.terminate();
    worker = undefined;
  };
  api.on("model-progress", (p) => {
    if (!/clap/i.test(p.file)) return;
    modelFiles.set(p.file, { loaded: p.loaded, total: p.total });
    let loaded = 0;
    let total = 0;
    modelFiles.forEach((x) => {
      loaded += x.loaded;
      total += x.total;
    });
    waveStatus.set({ model: loaded >= total ? undefined : { loaded, total } });
  });
  return worker;
}

function embedPcm(pcm: Float32Array): Promise<Float32Array> {
  const id = ++reqId;
  return new Promise((ok, fail) => {
    // нейросеть не ответила за полторы минуты (не скачалась, зависла) — не ждём вечно
    const timer = window.setTimeout(() => {
      if (waits.delete(id)) fail(new Error("Нейросеть волны не отвечает"));
    }, 90_000);
    const done = <T,>(fn: (v: T) => void) => (v: T) => {
      clearTimeout(timer);
      fn(v);
    };
    waits.set(id, { ok: done(ok), fail: done(fail) });
    return void clap().postMessage({ type: "embed", id, pcm } satisfies ClapIn, [pcm.buffer]);
  });
}

/** 10 секунд вокруг доли at (0..1) песни, моно 48 кГц. */
function window10(buf: AudioBuffer, at: number): Float32Array | undefined {
  const len = SR * 10;
  if (buf.length < SR * 6) return undefined;
  const start = Math.max(0, Math.min(buf.length - len, Math.floor(buf.length * at - len / 2)));
  const out = new Float32Array(Math.min(len, buf.length));
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i]! += ch[start + i]! / buf.numberOfChannels;
  }
  return out;
}

async function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  return new OfflineAudioContext(1, 1, SR).decodeAudioData(data);
}

const toB64 = (v: Float32Array) => {
  const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s: string) => {
  const bin = atob(s);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return new Float32Array(b.buffer);
};

const memo = new Map<string, Float32Array>();
/** Отпечаток песни: из памяти, из сохранённого или послушать (своя — с диска, из базы — первые ~1,5 МБ потоком). */
async function embedTrack(t: Track): Promise<Float32Array | undefined> {
  const hit = memo.get(t.id);
  if (hit) return hit;
  const savedAll: Record<string, string> = await api.wave.embGet([t.id]).catch(() => ({}));
  const saved = savedAll[t.id];
  if (saved) {
    const v = fromB64(saved);
    memo.set(t.id, v);
    return v;
  }
  try {
    const res = await fetch(trackSrc(t), t.web ? { headers: { Range: "bytes=0-1599999" } } : undefined);
    if (!res.ok) return undefined;
    const buf = await decode(await res.arrayBuffer());
    // своя песня целиком — берём середину; у песни из базы скачано начало — берём его вторую половину
    const pcm = window10(buf, t.web ? 0.65 : 0.4);
    if (!pcm) return undefined;
    const v = await embedPcm(pcm);
    memo.set(t.id, v);
    void api.wave.embPut({ [t.id]: toB64(v) });
    return v;
  } catch {
    return undefined;
  }
}

// ---------- сама волна ----------

interface Session {
  mood: WaveMood;
  name?: string;
  seeds: Vec[];
  ruShare?: number;
  genres: string[];
  artists: string[];
  /** Песни плейлиста и своей библиотеки — в волну не попадают (жалоба: «и так есть в плейлисте»). */
  own: Set<string>;
  /** Свои песни — та же песня с Audius (другой адрес) тоже не попадёт. */
  ownSongs: Track[];
  pool: Map<string, { t: Track; emb: Float32Array }>;
  liked: Vec[];
  disliked: Vec[];
  smart: boolean;
  token: number;
}

let session: Session | undefined;
let token = 0;

const alive = (s: Session) => session === s && s.token === token && player.get().wave;

// ---------- волна из хитов (по умолчанию): подбор делает ядро по данным Deezer, старт мгновенный ----------

interface HitsSession {
  mood: WaveMood;
  name?: string;
  seedIds?: string[];
  token: number;
}
let hitsSession: HitsSession | undefined;

async function startHits(mood: WaveMood, seedTracks: Track[] | undefined, name: string | undefined, my: number): Promise<boolean> {
  const hs: HitsSession = { mood, name, seedIds: seedTracks?.map((t) => t.id), token: my };
  hitsSession = hs;
  session = undefined;
  player.set({ wave: { mood, name, loading: true, seen: [] } });
  waveStatus.set({ stage: "Подбираю волну…" });
  const first = await api.wave.hits({ seedIds: hs.seedIds, mood, exclude: [], character: app.get().settings.waveCharacter, count: 4 }).catch(() => [] as Track[]);
  if (token !== my) return true;
  waveStatus.set({ stage: undefined });
  if (!first.length) return false;
  player.set({ wave: { mood, name, seen: first.map((t) => t.id) } });
  await playQueue(first, 0, true);
  toast(name ? `«Моя волна» по «${name}»` : `«Моя волна» · ${WAVE_MOODS.find((m) => m.id === mood)?.label}`, "info");
  return true;
}

async function extendHits(hs: HitsSession): Promise<void> {
  const w = player.get().wave;
  if (!w || hs.token !== token) return;
  const more = await api.wave.hits({ seedIds: hs.seedIds, mood: hs.mood, exclude: w.seen, character: app.get().settings.waveCharacter, count: 4 }).catch(() => [] as Track[]);
  const cur = player.get();
  if (!cur.wave || hs.token !== token) return;
  const fresh = more.filter((t) => !cur.queue.some((q) => q.id === t.id));
  const drop = Math.max(0, cur.index - 20);
  player.set({
    queue: [...cur.queue.slice(drop), ...fresh],
    index: cur.index - drop,
    wave: { ...cur.wave, loading: false, seen: [...cur.wave.seen, ...fresh.map((t) => t.id)].slice(-600) },
  });
}

/** Включить волну: по плейлисту (seeds), по настроению или «под меня» (любимое и часто слушаемое). */
export async function startWave(mood: WaveMood = "mine", seedTracks?: Track[], name?: string): Promise<void> {
  const my = ++token;
  if (app.get().settings.waveSource !== "indie") {
    try {
      if (await startHits(mood, seedTracks, name, my)) return;
    } catch (err) {
      console.error(err);
    }
    if (token !== my) return;
    hitsSession = undefined;
    // хиты недоступны (нет связи с Deezer) — честно говорим и пробуем открытую базу с полными песнями
    toast("Не достучался до базы хитов — включаю полные песни независимых музыкантов", "warn");
  }
  hitsSession = undefined;
  const lib = player.get().library.tracks;
  player.set({ wave: { mood, name, loading: true, seen: [] } });
  waveStatus.set({ stage: "Слушаю, что ты любишь…" });
  const favIds = new Set(player.get().favorites);
  let base: Track[] = seedTracks?.length ? seedTracks : mood === "mine" ? (lib.filter((t) => favIds.has(t.id)).length >= 5 ? lib.filter((t) => favIds.has(t.id)) : lib) : lib;
  base = base.filter((t) => !t.web || seedTracks?.includes(t));
  const s: Session = {
    mood,
    name,
    seeds: [],
    genres: [],
    artists: [...new Set(base.map((t) => t.artist))],
    own: new Set(lib.map((t) => t.id)),
    ownSongs: lib,
    pool: new Map(),
    liked: [],
    disliked: [],
    smart: true,
    token: my,
  };
  const ruBase = (seedTracks?.length ? seedTracks : lib).filter((t) => t.title || t.artist);
  s.ruShare = ruBase.length ? ruBase.filter(isRu).length / ruBase.length : undefined;
  session = s;

  if (mood === "energy" || mood === "calm" || mood === "study") {
    s.seeds = moodSeeds(mood);
    s.genres = MOOD_GENRES[mood].slice(0, 3);
    s.artists = [];
  } else {
    // слушаем до 12 песен плейлиста (отпечатки сохраняются — второй раз мгновенно)
    const sample = [...base].sort(() => Math.random() - 0.5).slice(0, 12);
    let n = 0;
    for (const t of sample) {
      if (!alive(s)) return;
      waveStatus.set({ stage: `Слушаю ${name ? `«${name}»` : "твою музыку"}: ${++n} из ${sample.length}` });
      const v = await embedTrack(t);
      if (v) s.seeds.push(v);
      // первая же песня не «послушалась» — нейросеть недоступна: не тратим время на остальные
      else if (n === 1 && !s.seeds.length) break;
    }
    if (!alive(s)) return;
    if (!s.seeds.length) s.smart = false;
    s.genres = s.seeds.length ? guessGenres(s.seeds, 3) : ["Pop", "Electronic", "Hip-Hop/Rap"];
    if (mood === "new") {
      // «что-то новое»: жанры, которых в плейлисте нет, — и без похожести
      const all = Object.keys(GENRE_CENTROIDS).filter((g) => !s.genres.includes(g));
      s.genres = all.sort(() => Math.random() - 0.5).slice(0, 3);
      s.seeds = s.genres.map((g) => normalize(GENRE_CENTROIDS[g]!));
    }
  }
  // что лайкал и что «не то» раньше — сразу в подстройку
  void api.wave.taste().then(async (tt) => {
    const embs = await api.wave.embGet([...tt.liked, ...tt.disliked]).catch(() => ({}) as Record<string, string>);
    for (const id of tt.liked) if (embs[id]) s.liked.push(fromB64(embs[id]!));
    for (const id of tt.disliked) if (embs[id]) s.disliked.push(fromB64(embs[id]!));
  });

  await fetchMore(s, 8);
  if (!alive(s)) return;
  const first = pickNext(s, 3);
  if (!first.length) {
    player.set({ wave: undefined });
    waveStatus.set({ stage: undefined });
    toast("Не нашёл похожей музыки — проверь интернет и попробуй ещё раз", "warn");
    return;
  }
  player.set({ wave: { mood, name, seen: first.map((t) => t.id) } });
  waveStatus.set({ stage: undefined });
  await playQueue(first, 0, true);
  toast(name ? `«Моя волна» по «${name}»` : `«Моя волна» · ${WAVE_MOODS.find((m) => m.id === mood)?.label}`, "info");
  // дослушиваем остальных кандидатов в фоне — следующие песни будут точнее
  void fetchMore(s, 14);
}

/** Набрать кандидатов с Audius и послушать их (до want отпечатков в запасе). */
async function fetchMore(s: Session, want: number): Promise<void> {
  const exclude = [...(player.get().wave?.seen ?? []), ...s.pool.keys()];
  waveStatus.set({ stage: player.get().wave?.loading ? "Ищу похожее…" : undefined });
  const cands = (await api.wave.candidates({ genres: s.genres, ruShare: s.ruShare ?? 0, artists: s.artists, exclude }).catch(() => [] as Track[])).filter(
    (t) => !s.own.has(t.id) && !s.ownSongs.some((o) => sameSong(o, t)),
  );
  if (!alive(s)) return;
  // слушаем сначала тех, кто вероятнее подойдёт: угаданный жанр, и русские — если плейлист русский
  const prio = (t: Track) => (t.web?.tags?.some((g) => s.genres.includes(g)) ? 2 : 0) + (s.ruShare !== undefined && s.ruShare > 0.2 && isRu(t) ? 1 : 0);
  const order = [...cands].sort((a, b) => prio(b) - prio(a));
  let got = 0;
  for (const t of order) {
    if (!alive(s) || got >= want) break;
    if (player.get().wave?.loading) waveStatus.set({ stage: `Подбираю похожее: ${got + 1} из ${want}` });
    const emb = s.smart ? await embedTrack(t) : new Float32Array(0);
    if (!alive(s)) return;
    if (!emb) continue;
    s.pool.set(t.id, { t, emb });
    got++;
  }
  // нейросеть не скачалась / не работает — играем по жанрам, без похожести
  if (s.smart && !got && cands.length) {
    s.smart = false;
    toast("Не получилось «послушать» песни — подбираю по жанрам", "warn");
    for (const t of order.slice(0, want)) s.pool.set(t.id, { t, emb: new Float32Array(0) });
  }
}

/** Лучшие n из запаса (с учётом языка, лайков и «не то»), убираем их из запаса. */
function pickNext(s: Session, n: number): Track[] {
  const items: (RankItem & { t: Track })[] = [...s.pool.values()].map(({ t, emb }) => ({ id: t.id, title: t.title, artist: t.artist, emb, plays: t.web?.plays, t }));
  const ranked = s.smart
    ? rankWave(items, { seeds: s.seeds, ruShare: s.ruShare, liked: s.liked, disliked: s.disliked, popular: app.get().settings.waveCharacter === "popular" })
    : rankWave(
        items.map((x) => ({ ...x, emb: [] })),
        { seeds: [], ruShare: s.ruShare },
      );
  const out = ranked.slice(0, n).map((x) => x.t);
  for (const t of out) s.pool.delete(t.id);
  return out;
}

/** Для проверки подбора: лучшие n из запаса, ничего не меняя. */
export function wavePreview(n = 10): { title: string; artist: string; tags?: string[] }[] {
  const s = session;
  if (!s) return [];
  const items = [...s.pool.values()].map(({ t, emb }) => ({ id: t.id, title: t.title, artist: t.artist, emb, t }));
  return rankWave(items, { seeds: s.seeds, ruShare: s.ruShare, liked: s.liked, disliked: s.disliked })
    .slice(0, n)
    .map((x) => ({ title: x.title, artist: x.artist, tags: x.t.web?.tags }));
}

export const waveDebug = () => ({ genres: session?.genres, ruShare: session?.ruShare, seeds: session?.seeds.length, pool: session?.pool.size, smart: session?.smart });

let extending: Promise<void> | undefined;
/** Подложить следующие песни, пока волна не кончилась. */
export function extendWave(): Promise<void> {
  if (hitsSession && player.get().wave) {
    const hs = hitsSession;
    extending ??= extendHits(hs)
      .catch(() => undefined)
      .finally(() => (extending = undefined));
    return extending;
  }
  const s = session;
  const w = player.get().wave;
  if (!w || !s || !alive(s)) return Promise.resolve();
  extending ??= (async () => {
    if (s.pool.size < 3) await fetchMore(s, 8);
    if (!alive(s)) return;
    const fresh = pickNext(s, 3);
    const cur = player.get();
    const drop = Math.max(0, cur.index - 20);
    player.set({
      queue: [...cur.queue.slice(drop), ...fresh.filter((t) => !cur.queue.some((q) => q.id === t.id))],
      index: cur.index - drop,
      wave: { ...w, loading: false, seen: [...w.seen, ...fresh.map((t) => t.id)].slice(-400) },
    });
    // запас на потом — в фоне
    if (s.pool.size < 4) void fetchMore(s, 8);
  })().finally(() => (extending = undefined));
  return extending;
}

export function stopWave(): void {
  token++;
  session = undefined;
  hitsSession = undefined;
  player.set({ wave: undefined });
  waveStatus.set({ stage: undefined });
}

/** Подстройка на лету: пропустил в начале или «не то» — дальше от этого звучания; ♡ — ближе. */
export function waveFeedback(t: Track, kind: "like" | "dislike" | "skip"): void {
  const s = session;
  const v = memo.get(t.id);
  if (!s || !v) return;
  if (kind === "like") s.liked.push(v);
  else s.disliked.push(v);
}

/** «Не то»: больше такого не ставить, сразу дальше. */
export function waveDislike(): void {
  const t = currentTrack();
  if (!t) return;
  void api.wave.feedback(t, "dislike");
  waveFeedback(t, "dislike");
  toast("Понял, такое больше не ставлю", "info");
  next(false);
}
