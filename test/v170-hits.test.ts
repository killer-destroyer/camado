// 1.7.0: волна из актуальных хитов — подбор по «похожим исполнителям» Deezer (подменённый сервер).
import { describe, expect, it } from "vitest";
import { DEEZER_TRACK, deezerTrackUrl, Hits, seedArtists, splitArtists } from "../desktop/main/hits.js";
import { fullLinks } from "../desktop/shared/waveRank.js";

// Маленький «Deezer»: 2 исполнителя плейлиста (русский и нет), у каждого похожие, у похожих — топ.
const ARTISTS: Record<number, { name: string; related: number[] }> = {
  1: { name: "Кино", related: [11, 12] },
  2: { name: "Linkin Park", related: [21, 22] },
  11: { name: "Наутилус Помпилиус", related: [] },
  12: { name: "Агата Кристи", related: [] },
  21: { name: "Papa Roach", related: [] },
  22: { name: "Evanescence", related: [] },
};
let tid = 100;
const TOPS: Record<number, { id: number; title: string; rank: number }[]> = {};
for (const id of Object.keys(ARTISTS).map(Number)) TOPS[id] = [1, 2, 3, 4].map((n) => ({ id: tid++, title: `${ARTISTS[id]!.name} песня ${n}`, rank: 300_000 + n * 1000 }));
TOPS[1]![0]!.title = "Группа крови";
const track = (aid: number, t: { id: number; title: string; rank: number }, preview = true) => ({
  id: t.id,
  title: t.title,
  rank: t.rank,
  duration: 200,
  preview: preview ? `https://cdnt-preview.dzcdn.net/x/${t.id}.mp3?hdnea=exp` : "",
  artist: { id: aid, name: ARTISTS[aid]!.name },
  album: { id: 1, title: "Альбом", cover_big: `https://cdn-images.dzcdn.net/c/${t.id}.jpg` },
});
function server(calls: string[] = [], down = false) {
  return (async (input: string) => {
    const u = new URL(String(input));
    calls.push(u.pathname + u.search);
    if (down) throw new Error("offline");
    const json = (data: unknown) => new Response(JSON.stringify(data));
    let m: RegExpMatchArray | null;
    if (u.pathname === "/search/artist") {
      const q = (u.searchParams.get("q") ?? "").toLowerCase();
      return json({ data: Object.entries(ARTISTS).filter(([, a]) => a.name.toLowerCase() === q).map(([id, a]) => ({ id: Number(id), name: a.name, nb_fan: 1000 })) });
    }
    if ((m = u.pathname.match(/^\/artist\/(\d+)\/related$/))) return json({ data: ARTISTS[Number(m[1])]!.related.map((id) => ({ id, name: ARTISTS[id]!.name })) });
    if ((m = u.pathname.match(/^\/artist\/(\d+)\/top$/))) return json({ data: TOPS[Number(m[1])]!.map((t) => track(Number(m![1]), t)) });
    if ((m = u.pathname.match(/^\/artist\/(\d+)\/radio$/))) {
      const a = Number(m[1]);
      return json({ data: [...TOPS[a]!.slice(0, 2).map((t) => track(a, t)), ...ARTISTS[a]!.related.map((r) => track(r, TOPS[r]![0]!))] });
    }
    if ((m = u.pathname.match(/^\/artist\/(\d+)\/albums$/))) return json({ data: [] });
    if ((m = u.pathname.match(/^\/track\/(\d+)$/))) return json({ id: Number(m[1]), title: "t", preview: `https://cdnt-preview.dzcdn.net/x/${m[1]}.mp3?fresh` });
    if (u.pathname.startsWith("/chart/")) return json({ data: [track(21, { id: 900, title: "Чарт-хит", rank: 990_000 })] });
    if (u.pathname.startsWith("/radio/")) return json({ data: [track(22, { id: 901, title: "Calm one", rank: 500_000 })] });
    return json({ error: { code: 800 } });
  }) as unknown as typeof fetch;
}
const base = { mood: "mine" as const, character: "popular" as const, exclude: [], own: [] };

describe("исполнители плейлиста", () => {
  it("фиты, кривые теги, веса", () => {
    expect(splitArtists("Miyagi & Эндшпиль feat. Рем Дигга")).toEqual(["Miyagi", "Эндшпиль", "Рем Дигга"]);
    expect(splitArtists("Неизвестный исполнитель")).toEqual([]);
    const s = seedArtists([
      { artist: "Кино", title: "Группа крови" },
      { artist: "Кино", title: "Пачка сигарет" },
      { artist: "Неизвестный исполнитель", title: "Linkin Park - Numb" },
    ]);
    expect(s.map((x) => x.name)).toEqual(["Кино", "Linkin Park"]);
    expect(s[0]!.w).toBeGreaterThan(s[1]!.w);
  });
});

describe("волна хитов", () => {
  it("русский плейлист → песни похожих русских исполнителей; своих песен нет; не больше двух на исполнителя", async () => {
    const h = new Hits(server(), () => 0.5);
    const out = await h.next({ ...base, seeds: [{ artist: "Кино", title: "Группа крови" }], own: [{ artist: "Кино", title: "Группа крови" }], count: 6 });
    const artists = out.map((t) => t.artist);
    expect(artists).toContain("Наутилус Помпилиус");
    expect(artists).toContain("Агата Кристи");
    expect(artists.every((a) => ["Наутилус Помпилиус", "Агата Кристи", "Кино"].includes(a))).toBe(true);
    expect(out.some((t) => t.title === "Группа крови")).toBe(false); // эта песня и так есть
    expect(artists.filter((a) => a === "Кино").length).toBeLessThanOrEqual(1); // исполнитель из плейлиста — редко
    for (const a of new Set(artists)) expect(artists.filter((x) => x === a).length).toBeLessThanOrEqual(2);
    expect(out[0]).toMatchObject({ duration: 30, web: { source: "Deezer", preview: true } });
    expect(DEEZER_TRACK.test(out[0]!.web!.url)).toBe(true);
  });

  it("смешанный плейлист → язык долями, обе стороны плейлиста", async () => {
    const h = new Hits(server(), () => 0.5);
    const out = await h.next({ ...base, seeds: [{ artist: "Кино", title: "a" }, { artist: "Linkin Park", title: "b" }], count: 6 });
    const ru = out.filter((t) => /[а-яё]/i.test(t.artist)).length;
    expect(ru).toBe(3);
    expect(out.some((t) => ["Papa Roach", "Evanescence"].includes(t.artist))).toBe(true);
  });

  it("не повторяет выданное, «не то» убирает исполнителя", async () => {
    const h = new Hits(server(), () => 0.5);
    const seeds = [{ artist: "Linkin Park", title: "Numb" }];
    const a = await h.next({ ...base, seeds, count: 4 });
    const b = await h.next({ ...base, seeds, exclude: a.map((t) => t.id), count: 4 });
    expect(b.some((t) => a.some((x) => x.id === t.id))).toBe(false);
    const h2 = new Hits(server(), () => 0.5);
    const c = await h2.next({ ...base, seeds, dislikedArtists: ["papa roach"], count: 6 });
    expect(c.some((t) => t.artist === "Papa Roach")).toBe(false);
  });

  it("настроение — подборки под него; плейлист без известных исполнителей — чарт; нет сети — пусто, без падения", async () => {
    const calls: string[] = [];
    const h = new Hits(server(calls), () => 0.5);
    const calm = await h.next({ ...base, mood: "calm", seeds: [{ artist: "Кино", title: "a" }], count: 2 });
    expect(calm.map((t) => t.title)).toContain("Calm one");
    expect(calls.some((c) => c.startsWith("/radio/"))).toBe(true);
    const none = await new Hits(server(), () => 0.5).next({ ...base, seeds: [{ artist: "Никому не известный", title: "x" }], count: 2 });
    expect(none.map((t) => t.title)).toEqual(["Чарт-хит"]);
    expect(await new Hits(server([], true)).next({ ...base, seeds: [{ artist: "Кино", title: "a" }] })).toEqual([]);
  });

  it("адрес отрывка узнаётся перед проигрыванием; ссылки «целиком»", async () => {
    const h = new Hits(server());
    expect(await h.previewUrl("123")).toBe("https://cdnt-preview.dzcdn.net/x/123.mp3?fresh");
    expect(deezerTrackUrl(5)).toBe("https://api.deezer.com/track/5");
    const links = fullLinks({ artist: "Кино", title: "Группа крови" });
    expect(links.map((l) => l.name)).toEqual(["Яндекс Музыка", "VK Музыка", "YouTube"]);
    expect(links[0]!.url).toBe("https://music.yandex.ru/search?text=%D0%9A%D0%B8%D0%BD%D0%BE%20%D0%93%D1%80%D1%83%D0%BF%D0%BF%D0%B0%20%D0%BA%D1%80%D0%BE%D0%B2%D0%B8");
  });
});
