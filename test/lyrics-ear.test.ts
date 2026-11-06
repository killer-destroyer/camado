// Подгонка текста по звуку: выбор строк, разбор ответа ИИ, отсев ошибок ИИ.
import { describe, expect, it } from "vitest";
import { mapLyricsTime, pickSyncLines, syncFromHeard } from "../desktop/shared/lrc.js";
import { parseHeard } from "../src/camado/listen.js";

describe("подгонка текста по звуку", () => {
  it("берёт до 10 строк равномерно и без повторов припева", () => {
    const lines = Array.from({ length: 40 }, (_, i) => ({ time: i * 5, text: i % 4 === 0 ? "припев припев припев" : `строка номер ${i} уникальная` }));
    const idx = pickSyncLines(lines, 10);
    expect(idx.length).toBe(10);
    expect(idx.every((i) => i % 4 !== 0)).toBe(true);
    expect(idx[0]).toBeLessThan(5);
    expect(idx[idx.length - 1]).toBeGreaterThan(34);
  });

  it("понимает ответ модели с лишним текстом, ```json и временем вида 1:23.4", () => {
    const r = parseHeard('Вот:\n```json\n[{"n":3,"t":41.2},{"n":7,"t":"1:23.4"},{"n":99,"t":5},{"n":5,"t":-1}]\n```', new Set([3, 5, 7]));
    expect(r).toEqual([
      { n: 3, t: 41.2 },
      { n: 7, t: 83.4 },
    ]);
    expect(parseHeard("не могу", new Set([1]))).toEqual([]);
  });

  it("находит сдвиг и темп, а промахи ИИ отбрасывает", () => {
    // текст сделан под версию на 2% медленнее и сдвинут на 3 с; одна точка — промах ИИ (спутал строку)
    const truth = (t: number) => t * 1.02 - 3;
    const pts = [20, 45, 70, 95, 120, 150].map((t) => ({ t, l: truth(t) }));
    pts.push({ t: 100, l: 30 });
    const sync = syncFromHeard(pts)!;
    expect(sync.anchors!.length).toBe(2);
    for (const t of [5, 30, 80, 140, 200]) expect(Math.abs(mapLyricsTime(sync, t) - truth(t))).toBeLessThan(0.05);
  });

  it("шум ИИ в доли секунды не раздувает ошибку на краях песни", () => {
    const truth = (t: number) => t * 0.977 + 0.5;
    const noise = [0.4, -0.3, 0.2, -0.4, 0.3, -0.2, 0.1, -0.1];
    const pts = [20, 22, 25, 28, 45, 48, 52, 55].map((t, i) => ({ t, l: truth(t) + noise[i]! }));
    const sync = syncFromHeard(pts)!;
    for (const t of [2, 100]) expect(Math.abs(mapLyricsTime(sync, t) - truth(t))).toBeLessThan(0.6);
  });

  it("мало согласных точек — не верим и ничего не меняем", () => {
    expect(syncFromHeard([{ t: 10, l: 12 }, { t: 50, l: 20 }, { t: 90, l: 140 }])).toBeNull();
    expect(syncFromHeard([{ t: 10, l: 12 }])).toBeNull();
  });
});
