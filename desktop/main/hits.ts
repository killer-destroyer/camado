// «Моя волна» из актуальных популярных песен. Как у больших сервисов, подбор — по тому, что слушают люди:
// открытый API Deezer отдаёт «похожих исполнителей» (кто слушает этого — слушает и тех), «радио исполнителя»,
// популярность каждой песни сейчас (rank), свежие релизы и официальные 30-секундные отрывки.
// Целиком песни играют только стриминговые сервисы — их мы не обходим: в волне звучит отрывок,
// а полную версию можно открыть в Яндекс Музыке / VK / YouTube или сохранить в «Хочу послушать».
import type { Track, WaveMood } from "../shared/types.js";
import { isRu, sameSong } from "../shared/waveRank.js";
import { webId } from "./wave.js";

const API = "https://api.deezer.com";

interface DzArtist {
  id: number;
  name: string;
  nb_fan?: number;
}
interface DzTrack {
  id: number;
  title: string;
  title_short?: string;
  duration?: number;
  rank?: number;
  preview?: string;
  readable?: boolean;
  artist?: { id: number; name: string };
  album?: { id?: number; title?: string; cover_big?: string; cover_medium?: string };
}
interface DzAlbum {
  id: number;
  title: string;
  release_date?: string;
  record_type?: string;
  cover_big?: string;
}

export const deezerTrackUrl = (id: number | string) => `${API}/track/${id}`;
export const DEEZER_TRACK = /^https:\/\/api\.deezer\.com\/track\/(\d+)$/;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** «Miyagi & Эндшпиль feat. Рем Дигга» → главный исполнитель и гости (для поиска похожих). */
export function splitArtists(raw: string): string[] {
  const s = raw.replace(/\((feat|ft)\.?[^)]*\)/gi, (m) => `, ${m.slice(1, -1).replace(/^(feat|ft)\.?/i, "")}`);
  return s
    .split(/\s*(?:,|;|\s&\s|\sx\s|\s×\s|\sfeat\.?\s|\sft\.?\s|\sи\s|\sand\s|\svs\.?\s)\s*/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && !/^(неизвестн|unknown|various|разные|сборник)/i.test(x))
    .slice(0, 3);
}

/** Исполнители плейлиста с весами: чем больше песен, тем важнее. Неизвестный исполнитель и «Исполнитель - Название» в названии — тоже учитываем. */
export function seedArtists(tracks: { title: string; artist: string }[]): { name: string; w: number }[] {
  const count = new Map<string, { name: string; n: number }>();
  for (const t of tracks) {
    let names = splitArtists(t.artist);
    if (!names.length) {
      const dash = t.title.split(/\s[-–—]\s/);
      if (dash.length >= 2) names = splitArtists(dash[0]!);
    }
    names.forEach((name, i) => {
      const k = norm(name);
      if (!k) return;
      const e = count.get(k) ?? { name, n: 0 };
      e.n += i === 0 ? 1 : 0.5; // гость на фите — вполовину
      count.set(k, e);
    });
  }
  const total = [...count.values()].reduce((a, e) => a + e.n, 0) || 1;
  return [...count.values()].sort((a, b) => b.n - a.n).map((e) => ({ name: e.name, w: e.n / total }));
}

export interface HitsQuery {
  /** Песни, под которые подбираем (плейлист; для «Под меня» — любимое и часто слушаемое). */
  seeds: { title: string; artist: string }[];
  mood: WaveMood;
  /** popular — больше известного; new — больше незнакомых исполнителей. */
  character: "new" | "popular";
  /** Что уже звучало в этой волне (id треков Камадо). */
  exclude: string[];
  /** Своя библиотека — эти песни в волну не ставим. */
  own: { title: string; artist: string }[];
  /** Исполнители, которых пользователь отметил «не то» / часто пропускает (в нижнем регистре). */
  dislikedArtists?: string[];
  count?: number;
}

interface Cand {
  t: DzTrack;
  /** Насколько исполнитель близок плейлисту (0..1). */
  aff: number;
  /** Откуда: radio — «радио» исполнителя плейлиста, top — топ похожего исполнителя, fresh — свежий релиз, mood — подборка под настроение, chart — чарт. */
  from: "radio" | "top" | "fresh" | "mood" | "chart";
  /** От какого исполнителя плейлиста пришёл (чтобы в смешанном плейлисте звучали все его стороны). */
  origin?: number;
}

/** Подборки Deezer под настроение. */
const MOOD_RADIOS: Record<"energy" | "calm" | "study", number[]> = {
  energy: [42122, 648, 42182, 42302, 37151],
  calm: [38435, 39031, 39051, 30861, 42242],
  study: [38225, 42502, 30661, 37071],
};
const GENRES = [132, 116, 152, 113, 165, 85, 106, 466, 129, 464, 169];

interface Session {
  key: string;
  at: number;
  seeds: { name: string; w: number; id?: number }[];
  ruShare: number;
  pool: Map<number, Cand>;
  /** Похожие исполнители: id → близость. */
  related: Map<number, { name: string; aff: number; origin?: number }>;
  given: Set<number>;
  /** Исполнители последних выданных песен (чтобы один не звучал слишком часто). */
  recent: number[];
  stage: number;
  /** Сколько раз подряд расширение ничего не дало. */
  dry: number;
}

export class Hits {
  private cache = new Map<string, { at: number; data: unknown }>();
  private artistIds = new Map<string, number>();
  private sessions = new Map<string, Session>();
  private previews = new Map<string, { at: number; url: string }>();

  constructor(
    private fetchImpl: typeof fetch = (i, o) => fetch(i, o),
    private random: () => number = Math.random,
  ) {}

  private async get<T>(path: string, ttl = 30 * 60_000): Promise<T | undefined> {
    const hit = this.cache.get(path);
    if (hit && Date.now() - hit.at < ttl) return hit.data as T;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.fetchImpl(`${API}${path}`, { signal: AbortSignal.timeout(12_000) });
        if (!res.ok) return undefined;
        const body = (await res.json()) as { error?: { code?: number } };
        // 4 — слишком часто: подождать секунду и повторить один раз
        if (body?.error) {
          if (body.error.code === 4 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1100));
            continue;
          }
          return undefined;
        }
        this.cache.set(path, { at: Date.now(), data: body });
        if (this.cache.size > 600) this.cache.delete(this.cache.keys().next().value!);
        return body as T;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private list = async <T>(path: string) => (await this.get<{ data?: T[] }>(path))?.data ?? [];

  /** Исполнитель по имени → id в Deezer (0 — не нашёлся). Берём точное совпадение имени, иначе — самое известное из похожих. */
  async artistId(name: string): Promise<number> {
    const k = norm(name);
    if (this.artistIds.has(k)) return this.artistIds.get(k)!;
    const found = await this.list<DzArtist>(`/search/artist?q=${encodeURIComponent(name)}&limit=6`);
    const exact = found.filter((a) => norm(a.name) === k).sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
    const words = new Set(k.split(" ").filter((w) => w.length >= 3));
    const close = found.find((a) => norm(a.name).split(" ").some((w) => words.has(w)) && (a.nb_fan ?? 0) >= 500);
    const id = (exact ?? close)?.id ?? 0;
    this.artistIds.set(k, id);
    return id;
  }

  private session(q: HitsQuery): Session {
    const seeds = seedArtists(q.seeds).slice(0, 40);
    const key = `${q.mood}|${q.character}|${seeds.slice(0, 12).map((s) => norm(s.name)).join(",")}`;
    let s = this.sessions.get(key);
    if (s && Date.now() - s.at < 3 * 3600_000) return s;
    const ruBase = q.seeds.filter((t) => t.title || t.artist);
    s = { key, at: Date.now(), seeds, ruShare: ruBase.length ? ruBase.filter(isRu).length / ruBase.length : 0, pool: new Map(), related: new Map(), given: new Set(), recent: [], stage: 0, dry: 0 };
    this.sessions.set(key, s);
    if (this.sessions.size > 6) this.sessions.delete(this.sessions.keys().next().value!);
    return s;
  }

  private add(s: Session, list: DzTrack[], aff: number, from: Cand["from"], origin?: number): number {
    let n = 0;
    for (const t of list) {
      if (!t?.id || !t.preview || t.readable === false || !t.artist?.name) continue;
      const old = s.pool.get(t.id);
      // одна песня из нескольких источников — берём лучшую оценку (и чуть добавляем: её советуют с разных сторон)
      if (old) old.aff = Math.min(1, Math.max(old.aff, aff) + 0.05);
      else {
        s.pool.set(t.id, { t, aff, from, origin });
        n++;
      }
    }
    return n;
  }

  /** Расширить запас кандидатов. Этап 0 — быстрый (первая песня через секунду), дальше — глубже. */
  private async expand(s: Session, q: HitsQuery): Promise<void> {
    const stage = s.stage++;
    const before = s.pool.size;
    const mood = q.mood;
    const pick = <T>(a: T[], n: number) => [...a].sort(() => this.random() - 0.5).slice(0, n);

    if (mood === "energy" || mood === "calm" || mood === "study") {
      // подборки под настроение; а «свои» похожие исполнители добавятся ниже и получат прибавку
      const radios = stage === 0 ? pick(MOOD_RADIOS[mood], 2) : MOOD_RADIOS[mood];
      const lists = await Promise.all(radios.map((r) => this.list<DzTrack>(`/radio/${r}/tracks?limit=40`)));
      lists.forEach((l) => this.add(s, l, 0.45, "mood"));
    }
    if (mood === "new") {
      // «что-то новое»: чарты жанров — без исполнителей плейлиста и их соседей
      const genres = stage === 0 ? [0, ...pick(GENRES, 1)] : pick(GENRES, 3);
      const lists = await Promise.all(genres.map((g) => this.list<DzTrack>(`/chart/${g}/tracks?limit=40`)));
      lists.forEach((l) => this.add(s, l, 0.4, "chart"));
    }

    // исполнители плейлиста: по весу, по 4 за этап
    const todo = s.seeds.filter((x) => x.id === undefined).slice(0, stage === 0 ? 4 : 5);
    await Promise.all(todo.map(async (x) => (x.id = await this.artistId(x.name))));
    const known = todo.filter((x) => x.id);
    const maxW = Math.max(...s.seeds.map((x) => x.w), 0.0001);
    const w = (x: { w: number }) => 0.55 + 0.45 * (x.w / maxW);

    const isMood = mood === "energy" || mood === "calm" || mood === "study";
    if (mood === "mine") {
      // «радио» исполнителя — готовая подборка «в духе»: с неё волна стартует мгновенно
      const radios = await Promise.all(known.map((x) => this.list<DzTrack>(`/artist/${x.id}/radio?limit=30`)));
      radios.forEach((l, i) => this.add(s, l, 0.7 * w(known[i]!), "radio", known[i]!.id));
    }

    // похожие исполнители: кто советуется сразу от нескольких исполнителей плейлиста — тот ближе
    const rel = await Promise.all(known.map((x) => this.list<DzArtist>(`/artist/${x.id}/related?limit=20`)));
    rel.forEach((l, i) =>
      l.forEach((a, pos) => {
        const add = w(known[i]!) * (1 - pos / 30) * 0.6;
        const e = s.related.get(a.id) ?? { name: a.name, aff: 0, origin: known[i]!.id };
        e.aff = Math.min(1, e.aff + add);
        s.related.set(a.id, e);
      }),
    );
    if (mood === "new") {
      // незнакомое: выкидываем из чартов всё «своё»
      const mine = new Set([...s.seeds.map((x) => x.id), ...s.related.keys()]);
      for (const [id, c] of s.pool) if (c.t.artist && mine.has(c.t.artist.id)) s.pool.delete(id);
    } else if (isMood) {
      // настроение: только подборки под него; свой вкус — прибавкой (если исполнитель близок твоим)
      for (const c of s.pool.values()) {
        const r = c.t.artist ? s.related.get(c.t.artist.id) : undefined;
        if (r) c.aff = Math.min(1, 0.45 + 0.4 * r.aff);
      }
    } else if (stage >= 1 || known.length) {
      // топ песен ближайших похожих исполнителей (то, что у них слушают сейчас)
      const seedIds = new Set(s.seeds.map((x) => x.id));
      const best = [...s.related.entries()]
        .filter(([id]) => !seedIds.has(id))
        .sort((a, b) => b[1].aff - a[1].aff)
        .slice(stage * 6, stage * 6 + 6);
      const tops = await Promise.all(best.map(([id]) => this.list<DzTrack>(`/artist/${id}/top?limit=10`)));
      tops.forEach((l, i) => this.add(s, l, Math.min(1, 0.35 + best[i]![1].aff), "top", best[i]![1].origin));
      // свежие релизы (до года) у исполнителей плейлиста и ближайших похожих — «актуальное»
      if (stage >= 1) {
        const who = [...known.map((x) => [x.id!, 0.75 * w(x)] as const), ...best.slice(0, 3).map(([id, e]) => [id, Math.min(1, 0.4 + e.aff)] as const)];
        const yearAgo = new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10);
        await Promise.all(
          who.map(async ([id, aff]) => {
            const albums = (await this.list<DzAlbum>(`/artist/${id}/albums?limit=6`)).filter((a) => (a.release_date ?? "") >= yearAgo);
            const al = albums[0];
            if (!al) return;
            const tracks = await this.list<DzTrack>(`/album/${al.id}/tracks?limit=8`);
            // у песен альбома нет обложки и альбома — добавляем
            this.add(
              s,
              tracks.map((t) => ({ ...t, album: { id: al.id, title: al.title, cover_big: al.cover_big } })),
              Math.min(1, aff + 0.1),
              "fresh",
            );
          }),
        );
      }
    }
    s.dry = s.pool.size === before ? s.dry + 1 : 0;
  }

  /** Оценка кандидата: близость исполнителя + популярность сейчас. Язык — отдельно, долями (см. next). */
  private score(c: Cand, s: Session, q: HitsQuery): number {
    // русская музыка на Deezer набирает примерно вдвое меньше — меряем популярность «среди своих»
    const ru = isRu({ title: c.t.title, artist: c.t.artist?.name ?? "" });
    const pop = Math.min(1, (c.t.rank ?? 0) / (ru ? 450_000 : 900_000));
    const popW = q.character === "popular" ? 0.4 : 0.15;
    let sc = (1 - popW) * c.aff + popW * pop + (c.from === "fresh" ? 0.08 : 0);
    // «Незнакомое»: исполнители, которых у тебя нет, — выше
    const own = s.seeds.some((x) => norm(x.name) === norm(c.t.artist?.name ?? ""));
    // другие песни исполнителей из самого плейлиста — можно, но реже; в «Незнакомом» — совсем редко
    if (own) sc -= q.character === "new" ? 0.3 : 0.1;
    return sc + this.random() * 0.06;
  }

  /** Следующие песни волны. */
  async next(q: HitsQuery): Promise<Track[]> {
    const s = this.session(q);
    const count = Math.max(1, Math.min(20, q.count ?? 6));
    const seen = new Set(q.exclude);
    const disliked = new Set((q.dislikedArtists ?? []).map(norm));
    const usable = () =>
      [...s.pool.values()].filter((c) => {
        if (s.given.has(c.t.id) || seen.has(webId(deezerTrackUrl(c.t.id)))) return false;
        const me = { title: c.t.title, artist: c.t.artist?.name ?? "" };
        if (disliked.has(norm(me.artist))) return false;
        return !q.own.some((o) => sameSong(o, me));
      });
    let list = usable();
    // запас кончается — расширяем (не больше трёх этапов за раз и пока есть толк)
    for (let i = 0; i < 3 && list.length < count * 2 && s.dry < 2 && s.stage < 8; i++) {
      await this.expand(s, q);
      list = usable();
    }
    // плейлист без узнаваемых исполнителей (или нет сети у Deezer) — общий чарт, чтобы волна не молчала
    if (!list.length && s.stage <= 8) {
      this.add(s, await this.list<DzTrack>(`/chart/0/tracks?limit=50`), 0.3, "chart");
      s.stage = 9;
      list = usable();
    }
    const ranked = list.map((c) => ({ c, sc: this.score(c, s, q), ru: isRu({ title: c.t.title, artist: c.t.artist?.name ?? "" }) })).sort((a, b) => b.sc - a.sc);
    // язык — долями, как в плейлисте: почти весь русский → всё русское, наполовину → пополам
    const share = s.ruShare >= 0.85 ? 1 : s.ruShare <= 0.1 ? 0 : s.ruShare;
    const ruWant = q.mood === "mine" ? Math.round(share * count) : -1;
    // исполнители самого плейлиста — по имени (id есть не у всех: ищем их постепенно)
    const seedNames = new Set(s.seeds.map((x) => norm(x.name)));
    const isSeed = (c: Cand) => seedNames.has(norm(c.t.artist?.name ?? ""));
    const out: (typeof ranked)[number][] = [];
    const titleOf = (c: Cand) => norm(c.t.title_short ?? c.t.title);
    const take = (onlyRu: boolean | undefined, need: number) => {
      const origins = new Map<number, number>();
      for (const o of out) if (o.c.origin) origins.set(o.c.origin, (origins.get(o.c.origin) ?? 0) + 1);
      while (out.length < count && need > 0) {
        let best: (typeof ranked)[number] | undefined;
        let bestSc = -Infinity;
        for (const x of ranked) {
          if (out.includes(x) || (onlyRu !== undefined && x.ru !== onlyRu)) continue;
          const a = x.c.t.artist?.id ?? 0;
          // один исполнитель — не больше двух на 12 песен подряд; исполнитель из самого плейлиста — не больше одного
          const lately = s.recent.filter((r) => r === a).length + out.filter((o) => o.c.t.artist?.id === a).length;
          if (lately >= (isSeed(x.c) ? 1 : 2)) continue;
          if (out.some((o) => titleOf(o.c) === titleOf(x.c) && o.c.t.artist?.id === a)) continue;
          // смешанный плейлист: не всё от одного исполнителя плейлиста
          const sc = x.sc - 0.07 * (origins.get(x.c.origin ?? 0) ?? 0);
          if (sc > bestSc) {
            bestSc = sc;
            best = x;
          }
        }
        if (!best) break;
        out.push(best);
        if (best.c.origin) origins.set(best.c.origin, (origins.get(best.c.origin) ?? 0) + 1);
        need--;
      }
    };
    if (ruWant >= 0) {
      take(true, ruWant);
      take(false, count - ruWant);
    }
    take(undefined, count); // добрать, если какого-то языка не хватило
    out.sort(() => this.random() - 0.5);
    for (const x of out) if (x.c.t.artist) s.recent.push(x.c.t.artist.id);
    s.recent = s.recent.slice(-12);
    for (const x of out) s.given.add(x.c.t.id);
    return out.map((x) => toTrack(x.c.t, x.sc));
  }

  /** Адрес отрывка (у него короткий срок жизни — спрашиваем прямо перед проигрыванием). */
  async previewUrl(id: string): Promise<string | undefined> {
    const hit = this.previews.get(id);
    if (hit && Date.now() - hit.at < 8 * 60_000) return hit.url;
    const t = await this.get<DzTrack>(`/track/${id}`, 5 * 60_000);
    if (!t?.preview) return undefined;
    this.previews.set(id, { at: Date.now(), url: t.preview });
    if (this.previews.size > 300) this.previews.delete(this.previews.keys().next().value!);
    return t.preview;
  }
}

export function toTrack(t: DzTrack, score = 0): Track {
  const url = deezerTrackUrl(t.id);
  return {
    id: webId(url),
    path: url,
    title: t.title,
    artist: t.artist?.name ?? "",
    album: t.album?.title ?? "",
    duration: 30,
    hasLyrics: false,
    cover: t.album?.cover_big ?? t.album?.cover_medium,
    web: { url, source: "Deezer", page: `https://www.deezer.com/track/${t.id}`, preview: true, plays: t.rank ?? 0, score: Math.round(score * 1000) / 1000, fullDuration: t.duration },
  };
}
