import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LyricsService, queryVariants } from "../desktop/main/lyrics.js";
import { approximateTimes, nextSync, scaleLyrics, speedHint, SYNC_SPAN } from "../desktop/shared/lrc.js";

describe("текст из другой версии песни", () => {
  it("две «пойманные» строки дают и сдвиг, и скорость", () => {
    // Файл ускорен на 2%: строка из текста на 100 с звучит в файле на 98 с.
    const truth = (lyricT: number) => lyricT / 1.02 + 0.5; // момент песни, когда поют строку
    let sync = { s: 1, o: 0 } as { s: number; o: number; t1?: number; l1?: number };
    sync = nextSync(sync, truth(20), 20); // первая — около начала
    expect(sync.s).toBe(1);
    sync = nextSync(sync, truth(180), 180); // вторая — ближе к концу
    expect(sync.s).toBeCloseTo(1.02, 3);
    // теперь любая строка совпадает
    for (const L of [10, 60, 120, 200]) expect(sync.s * truth(L) + sync.o).toBeCloseTo(L, 2);
  });

  it("вторая строка слишком близко к первой — просто сдвиг, без скорости", () => {
    const first = nextSync({ s: 1, o: 0 }, 30, 31);
    const second = nextSync(first, 30 + SYNC_SPAN / 2, 30 + SYNC_SPAN / 2 + 3);
    expect(second.s).toBe(1);
    expect(second.o).toBeCloseTo(3);
  });

  it("nightcore/slowed узнаются по названию, слово убирается из поиска", () => {
    expect(speedHint("nightcore - He is a Monster")).toBe("fast");
    expect(speedHint("Lovely (sped up)")).toBe("fast");
    expect(speedHint("Song slowed + reverb")).toBe("slow");
    expect(speedHint("Адская колыбельная")).toBeUndefined();
    const v = queryVariants("nightcore - He is a Monster", "DK_BIng").map((x) => x.track);
    expect(v).toContain("He is a Monster");
  });

  it("для nightcore берёт текст оригинала и растягивает его под ускорение", async () => {
    const impl = (async (url: string) => {
      if (url.includes("/api/get")) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify([{ duration: 210, syncedLyrics: "[00:21.00]первая\n[03:00.00]последняя" }]), { status: 200 });
    }) as unknown as typeof fetch;
    const svc = new LyricsService(mkdtempSync(join(tmpdir(), "camado-nc-")), () => undefined, impl);
    const l = await svc.get({ title: "nightcore - He is a Monster", artist: "DK_BIng", duration: 176.7 });
    expect(l.synced).toBe(true);
    expect(l.scaled).toBeCloseTo(176.7 / 210, 3);
    expect(l.lines[0]!.time).toBeCloseTo(21 * (176.7 / 210), 2);
    expect(l.lines[1]!.time).toBeCloseTo(180 * (176.7 / 210), 2);
  });

  it("запоминает длину версии, под которую сделан текст", async () => {
    const impl = (async (url: string) =>
      url.includes("/api/get")
        ? new Response(JSON.stringify({ duration: 178, syncedLyrics: "[00:10.00]строка" }), { status: 200 })
        : new Response("[]", { status: 200 })) as unknown as typeof fetch;
    const svc = new LyricsService(mkdtempSync(join(tmpdir(), "camado-vd-")), () => undefined, impl);
    const l = await svc.get({ title: "Адская колыбельная", artist: "ПОШЛАЯ МОЛЛИ", duration: 176 });
    expect(l.versionDuration).toBe(178);
    expect(l.scaled).toBeUndefined(); // обычная песня — сами не растягиваем, подсказываем «поймать»
  });

  it("scaleLyrics растягивает и строки, и слова", () => {
    const l = scaleLyrics({ synced: true, source: "lrclib", lines: [{ time: 10, text: "a b", words: [{ time: 10, text: "a" }, { time: 11, text: "b" }] }] }, 0.5);
    expect(l.lines[0]!.time).toBe(5);
    expect(l.lines[0]!.words!.map((w) => w.time)).toEqual([5, 5.5]);
  });
});

describe("текст без отметок времени", () => {
  it("строки расставляются по песне по порядку, длинные звучат дольше", () => {
    const lines = approximateTimes(
      [{ time: 0, text: "коротко" }, { time: 0, text: "очень длинная строка припева, которую поют долго" }, { time: 0, text: "конец" }],
      180,
    );
    expect(lines[0]!.time).toBeGreaterThan(5);
    expect(lines[1]!.time).toBeGreaterThan(lines[0]!.time);
    expect(lines[2]!.time - lines[1]!.time).toBeGreaterThan(lines[1]!.time - lines[0]!.time);
    expect(lines[2]!.time).toBeLessThan(180);
  });
});

describe("подгонка по многим точкам", () => {
  it("вырезанный кусок посередине: две части с разным сдвигом", async () => {
    const { addAnchor, mapLyricsTime } = await import("../desktop/shared/lrc.js");
    // В копии вырезано 6 секунд на 90-й секунде песни: до — сдвиг 0, после — текст на 6 с «позже».
    const truth = (T: number) => (T < 90 ? T : T + 6);
    let s = addAnchor({ s: 1, o: 0 }, 20, truth(20))!;
    s = addAnchor(s, 80, truth(80))!;
    s = addAnchor(s, 100, truth(100))!;
    s = addAnchor(s, 170, truth(170))!;
    for (const T of [30, 60, 120, 160]) expect(mapLyricsTime(s, T)).toBeCloseTo(truth(T), 1);
    expect(s.anchors).toHaveLength(4);
  });

  it("не та строка (слишком большой скачок) — точка не принимается", async () => {
    const { addAnchor } = await import("../desktop/shared/lrc.js");
    const s = addAnchor({ s: 1, o: 0 }, 20, 20)!;
    expect(addAnchor(s, 40, 80)).toBeNull();
  });

  it("точка рядом с уже пойманной заменяет её", async () => {
    const { addAnchor } = await import("../desktop/shared/lrc.js");
    let s = addAnchor({ s: 1, o: 0 }, 20, 21)!;
    s = addAnchor(s, 22, 22.5)!;
    expect(s.anchors).toHaveLength(1);
  });
});
