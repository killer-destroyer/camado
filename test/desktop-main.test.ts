import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Library } from "../desktop/main/library.js";
import { cleanTitle, LyricsService, mainArtist } from "../desktop/main/lyrics.js";
import { parseRange } from "../desktop/main/media.js";

/** Минимальный WAV: 0.2 с тишины. */
function wav(): Buffer {
  const samples = 8820;
  const b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + samples * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples * 2, 40);
  return b;
}

function fakeFetch(routes: Record<string, { status: number; body: unknown }>) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    const key = Object.keys(routes).find((k) => url.includes(k));
    const r = key ? routes[key]! : { status: 404, body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("библиотека музыки", () => {
  it("находит файлы в папке, берёт название из имени и видит .lrc", async () => {
    const dir = mkdtempSync(join(tmpdir(), "camado-lib-"));
    const music = join(dir, "music");
    const data = join(dir, "data");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(music);
    writeFileSync(join(music, "01 Моя песня.wav"), wav());
    writeFileSync(join(music, "01 Моя песня.lrc"), "[00:01]привет");
    writeFileSync(join(music, "обложка.jpg"), "не музыка");
    let changes = 0;
    const lib = new Library(data, () => changes++);
    await lib.load();
    const st = await lib.addPaths([music]);
    expect(st.tracks).toHaveLength(1);
    expect(st.tracks[0]).toMatchObject({ title: "Моя песня", hasLyrics: true });
    expect(st.tracks[0]!.duration).toBeCloseTo(0.2, 1);
    expect(lib.trackPath(st.tracks[0]!.id)).toBe(join(music, "01 Моя песня.wav"));
    expect(lib.trackPath("чужой")).toBeUndefined();
    expect(lib.coverPath("../../etc/passwd")).toBeUndefined();
    expect(changes).toBeGreaterThan(0);

    // Библиотека переживает перезапуск
    const again = new Library(data, () => {});
    await again.load();
    expect(again.view().tracks).toHaveLength(1);
  });
});

describe("тексты песен", () => {
  it("чистит названия для поиска", () => {
    expect(cleanTitle("Song (Official Video)")).toBe("Song");
    expect(cleanTitle("Трек [Премьера клипа] feat. Кто-то")).toBe("Трек");
    expect(cleanTitle("Yesterday - Remastered 2009")).toBe("Yesterday");
    expect(mainArtist("Скриптонит, 104 & Truwer")).toBe("Скриптонит");
  });

  it("LRCLIB: точный запрос не нашёл — ищет и берёт трек с похожей длиной", async () => {
    const dir = mkdtempSync(join(tmpdir(), "camado-lyr-"));
    const { impl, calls } = fakeFetch({
      "/api/get": { status: 404, body: {} },
      "/api/search": {
        status: 200,
        body: [
          { duration: 300, syncedLyrics: "[00:01]не та" },
          { duration: 181, syncedLyrics: "[00:02]та самая\n[00:05]строка" },
        ],
      },
    });
    const svc = new LyricsService(dir, () => undefined, impl);
    const l = await svc.get({ title: "Песня (Official Audio)", artist: "Артист feat. Друг", duration: 180 });
    expect(l).toMatchObject({ synced: true, source: "lrclib" });
    expect(l.lines.map((x) => x.text)).toEqual(["та самая", "строка"]);
    expect(calls[0]).toContain("track_name=%D0%9F%D0%B5%D1%81%D0%BD%D1%8F&");
    expect(calls[0]).toContain("artist_name=%D0%90%D1%80%D1%82%D0%B8%D1%81%D1%82");

    // второй раз — из кэша, без сети
    await svc.get({ title: "Песня (Official Audio)", artist: "Артист feat. Друг", duration: 180 });
    expect(calls).toHaveLength(2);
  });

  it("нет сети — пусто и без кэширования", async () => {
    const dir = mkdtempSync(join(tmpdir(), "camado-lyr-"));
    let n = 0;
    const svc = new LyricsService(dir, () => undefined, (async () => {
      n++;
      throw new Error("offline");
    }) as unknown as typeof fetch);
    expect((await svc.get({ title: "a", artist: "b" })).lines).toHaveLength(0);
    await svc.get({ title: "a", artist: "b" });
    expect(n).toBe(2);
  });

  it(".lrc рядом с файлом важнее интернета", async () => {
    const dir = mkdtempSync(join(tmpdir(), "camado-lyr-"));
    const audio = join(dir, "x.mp3");
    writeFileSync(join(dir, "x.lrc"), "[00:03]своя строка");
    const { impl, calls } = fakeFetch({});
    const svc = new LyricsService(dir, (id) => (id === "t1" ? audio : undefined), impl);
    const l = await svc.get({ title: "x", artist: "y", trackId: "t1" });
    expect(l).toMatchObject({ synced: true, source: "file" });
    expect(calls).toHaveLength(0);
  });
});

describe("перемотка (Range)", () => {
  it("разбирает диапазоны", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=0-5000", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=2000-", 1000)).toBeUndefined();
    expect(parseRange(null, 1000)).toBeUndefined();
  });
});
