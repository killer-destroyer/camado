// 1.6.0: «Моя волна» 2.0 — подбор по звуку. На настоящих отпечатках CLAP 40 треков с Audius (5 групп по 8).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guessGenres, isRu, knn, moodSeeds, normalize, rankWave, sameSong } from "../desktop/shared/waveRank.js";
import { toTrack } from "../desktop/main/audius.js";
import { gatherCandidates } from "../desktop/main/wave.js";
import { serveRemote } from "../desktop/main/media.js";
import { STREAM_HOSTS } from "../desktop/main/wave.js";
import { setHostLookup } from "../desktop/main/download.js";

interface F {
  id: string;
  title: string;
  artist: string;
  genre: string;
  group: string;
  emb: number[];
}
const fx = JSON.parse(readFileSync(new URL("./fixtures/wave-emb.json", import.meta.url), "utf8")) as F[];
const items = fx.map((f) => ({ ...f, emb: normalize(f.emb) }));
const groups = [...new Set(fx.map((f) => f.group))];

describe("волна 2.0: похожесть по звуку", () => {
  it("плейлист из 4 песен одной группы → среди 6 подобранных большинство той же группы (случайно — 1 из 6)", () => {
    let hits = 0;
    let total = 0;
    for (const g of groups) {
      const mine = items.filter((x) => x.group === g);
      const seeds = mine.slice(0, 4).map((x) => x.emb);
      const rest = items.filter((x) => !mine.slice(0, 4).includes(x));
      const top = rankWave(rest, { seeds, perArtist: 6 }).slice(0, 6);
      // английский и русский рэп — один жанр: считаем по жанру
      const genre = mine[0]!.genre;
      const h = top.filter((x) => x.genre === genre).length;
      hits += h;
      total += 6;
      expect(h, `группа ${g}`).toBeGreaterThanOrEqual(3);
    }
    expect(hits / total).toBeGreaterThan(0.6);
  });

  it("жанры для поиска угадываются по звуку", () => {
    const byGroup = (g: string) => items.filter((x) => x.group === g).map((x) => x.emb);
    expect(guessGenres(byGroup("Metal"))).toContain("Metal");
    expect(guessGenres(byGroup("Classical"))).toContain("Classical");
    expect(guessGenres(byGroup("Hip-Hop/Rap"))).toContain("Hip-Hop/Rap");
  });

  it("русский плейлист → русские наверху; нерусский → наоборот", () => {
    const ru = items.filter((x) => x.group === "ru");
    const en = items.filter((x) => x.group === "Hip-Hop/Rap");
    expect(ru.every(isRu)).toBe(true);
    const rest = items.filter((x) => !ru.slice(0, 4).includes(x));
    const top = rankWave(rest, { seeds: ru.slice(0, 4).map((x) => x.emb), ruShare: 1, perArtist: 6 }).slice(0, 4);
    // русских среди остальных — 4 из 36 (случайно ~0.4 из 4)
    expect(top.filter(isRu).length).toBeGreaterThanOrEqual(2);
    const rest2 = items.filter((x) => !en.slice(0, 4).includes(x));
    const top2 = rankWave(rest2, { seeds: en.slice(0, 4).map((x) => x.emb), ruShare: 0, perArtist: 6 }).slice(0, 4);
    expect(top2.filter(isRu).length).toBeLessThanOrEqual(1);
  });

  it("«не то» уводит от похожего, ♡ — приближает; один исполнитель не подряд", () => {
    const metal = items.filter((x) => x.group === "Metal");
    const seeds = metal.slice(0, 3).map((x) => x.emb);
    const rest = items.filter((x) => !metal.slice(0, 3).includes(x));
    const before = rankWave(rest, { seeds });
    const worst = before[0]!;
    const after = rankWave(rest, { seeds, disliked: [worst.emb] });
    expect(after.indexOf(worst)).toBeGreaterThan(0);
    for (let i = 1; i < 6; i++) expect(after[i]!.artist).not.toBe(after[i - 1]!.artist);
    expect(knn(metal[0]!.emb, [metal[0]!.emb])).toBeCloseTo(1, 3);
    expect(moodSeeds("study").length).toBeGreaterThan(2);
  });
});

describe("своё в волну не попадает", () => {
  it("та же песня с Audius узнаётся, чужая с тем же названием — нет", () => {
    expect(sameSong({ title: "Rus Kot - Город", artist: "@ruslan_popov2706" }, { title: "Rus Kot - Город", artist: "@ruslan_popov2706" })).toBe(true);
    expect(sameSong({ title: "Город", artist: "Rus Kot" }, { title: "Rus Kot - Город (Official Audio)", artist: "kot_music" })).toBe(true);
    expect(sameSong({ title: "Lucifer", artist: "Ni Voz Ni Voto" }, { title: "Lucifer", artist: "Ni Voz Ni Voto" })).toBe(true);
    expect(sameSong({ title: "Город", artist: "Rus Kot" }, { title: "Город", artist: "Сплин" })).toBe(false);
    expect(sameSong({ title: "Lucifer", artist: "Ni Voz Ni Voto" }, { title: "Viaje Astral", artist: "Ni Voz Ni Voto" })).toBe(false);
  });
});

describe("Audius", () => {
  it("трек Audius → трек Камадо; закрытые и короткие — нет", () => {
    const t = toTrack({ id: "Ab1", title: "Песня", duration: 180, genre: "Rock", mood: "Brooding", play_count: 58, permalink: "/u/s", user: { name: "Группа" }, artwork: { "480x480": "https://cn4.x.org/c/480x480.jpg" } });
    expect(t).toMatchObject({ title: "Песня", artist: "Группа", web: { source: "Audius", url: "https://api.audius.co/v1/tracks/Ab1/stream?app_name=camado", tags: ["Rock", "Brooding"], plays: 58, page: "https://audius.co/u/s" } });
    expect(toTrack({ id: "x", title: "t", duration: 30 })).toBeUndefined();
    expect(toTrack({ id: "x", title: "t", duration: 200, is_stream_gated: true })).toBeUndefined();
  });

  it("кандидаты: жанры, исполнители и русское, без того, что уже было", async () => {
    const asked: string[] = [];
    const tr = (id: string, title: string, artist = "A") => ({ id, title, duration: 200, genre: "Rock", user: { name: artist } });
    const f = (async (u: string) => {
      asked.push(decodeURIComponent(u));
      const body = u.includes("trending") ? [tr("t1", "Song one"), tr("t2", "Song two")] : u.includes("search") ? [tr("s1", "Песня", "Кино"), tr("s2", "English")] : [];
      return new Response(JSON.stringify({ data: body }));
    }) as unknown as typeof fetch;
    const out = await gatherCandidates({ genres: ["Rock"], ruShare: 1, artists: ["Кино"], exclude: [] }, f);
    expect(asked.some((u) => u.includes("trending?genre=Rock"))).toBe(true);
    expect(asked.some((u) => u.includes("search?query=Кино"))).toBe(true);
    expect(out.map((t) => t.title).sort()).toContain("Песня");
    // английский трек из «русского» поиска по слову не берём, а из поиска по исполнителю — можно
    const out2 = await gatherCandidates({ genres: [], ruShare: 0, artists: [], exclude: [] }, f);
    expect(out2).toEqual([]);
  });

  it("поток: выданный Камадо адрес Audius можно, с переадресацией на узел хранения; чужой — нет", async () => {
    setHostLookup(async () => ["93.184.216.34"]);
    const url = "https://api.audius.co/v1/tracks/Ab1/stream?app_name=camado";
    const f = (async () => {
      const r = new Response("ID3", { headers: { "content-type": "audio/mpeg" } });
      Object.defineProperty(r, "url", { value: "https://audius-content-10.figment.io/tracks/cidstream/x" });
      return r;
    }) as unknown as typeof fetch;
    expect((await serveRemote(url, null, STREAM_HOSTS, f, (u) => u === url)).status).toBe(200);
    // не выдан — узел не из списка: нельзя
    expect((await serveRemote("https://audius-content-10.figment.io/x.mp3", null, STREAM_HOSTS, f)).status).toBe(403);
    // выдан, но ведёт в домашнюю сеть — нельзя
    setHostLookup(async () => ["192.168.1.1"]);
    expect((await serveRemote("https://cn.evil.org/c/1.jpg", null, STREAM_HOSTS, f, () => true)).status).toBe(403);
    setHostLookup(async () => ["93.184.216.34"]);
  });
});
