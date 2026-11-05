import { describe, expect, it } from "vitest";
import { activeLineIndex, parseLrc, timedWords } from "../desktop/shared/lrc.js";
import { DEFAULT_SETTINGS, mergeSettings } from "../desktop/shared/settings.js";
import { BeatDetector, bandEnergy, layoutBurst, logBands, Shaker } from "../desktop/renderer/src/lib/dsp.js";
import { luminance, onColor, PALETTES, paletteFromPixels } from "../desktop/renderer/src/lib/palettes.js";

describe("LRC", () => {
  it("строки с метками, несколько меток на строку, сортировка, offset", () => {
    const l = parseLrc(`[ar:Кто-то]
[offset:+500]
[00:12.50]Вторая
[00:01.00][00:20.00]Припев
[00:05]Первая`);
    expect(l.synced).toBe(true);
    expect(l.lines.map((x) => [x.time, x.text])).toEqual([
      [0.5, "Припев"],
      [4.5, "Первая"],
      [12, "Вторая"],
      [19.5, "Припев"],
    ]);
  });

  it("пословные метки (расширенный LRC)", () => {
    const l = parseLrc("[00:10.00]<00:10.00>Я <00:10.50>иду <00:11.20>домой");
    expect(l.lines[0]!.text).toBe("Я иду домой");
    expect(l.lines[0]!.words).toEqual([
      { time: 10, text: "Я" },
      { time: 10.5, text: "иду" },
      { time: 11.2, text: "домой" },
    ]);
  });

  it("текст без меток — несинхронный", () => {
    const l = parseLrc("Просто\n\nтекст песни");
    expect(l.synced).toBe(false);
    expect(l.lines.map((x) => x.text)).toEqual(["Просто", "текст песни"]);
  });

  it("активная строка", () => {
    const lines = parseLrc("[00:01]a\n[00:05]b\n[00:09]c").lines;
    expect([0, 1, 4.9, 5, 100].map((t) => activeLineIndex(lines, t))).toEqual([-1, 0, 0, 1, 2]);
  });

  it("слова распределяются по строке, длинные дольше", () => {
    const lines = parseLrc("[00:10]я иду домой\n[00:14]дальше").lines;
    const w = timedWords(lines, 0);
    expect(w.map((x) => x.text)).toEqual(["я", "иду", "домой"]);
    expect(w[0]!.time).toBe(10);
    expect(w[2]!.time).toBeLessThan(14);
    expect(w[2]!.time - w[1]!.time).toBeGreaterThan(w[1]!.time - w[0]!.time);
  });
});

describe("звук", () => {
  it("полосы спектра в диапазоне 0…1", () => {
    const fft = new Uint8Array(1024).fill(128);
    fft.fill(255, 1, 3); // самый низ (23–70 Гц)
    const bands = logBands(fft, 48000, 32);
    expect(bands).toHaveLength(32);
    expect(Math.max(...bands)).toBeLessThanOrEqual(1);
    expect(bands[0]).toBeGreaterThan(bands[20]!);
    expect(bandEnergy(new Uint8Array(1024).fill(255), 48000, 20, 150)).toBe(1);
  });

  it("бит ловится на всплеске баса, не чаще раза в 160 мс", () => {
    const d = new BeatDetector(0.5);
    const dt = 1 / 144;
    let t = 0;
    for (let i = 0; i < 300; i++, t += dt) expect(d.push(0.2, t, dt)).toBe(false);
    expect(d.push(0.6, t, dt)).toBe(true);
    expect(d.push(0.6, t + dt, dt)).toBe(false);
  });

  it("тряска затухает одинаково на 60 и 144 Гц", () => {
    const run = (hz: number) => {
      const s = new Shaker();
      s.hit(1);
      const steps = Math.round(0.25 * hz);
      for (let i = 0; i < steps; i++) s.update(1 / hz, i / hz, { intensity: 1, rotation: true, zoom: true });
      return s.trauma;
    };
    expect(Math.abs(run(60) - run(144))).toBeLessThan(0.03);
  });

  it("слова «Взрыва» не налезают друг на друга и детерминированы", () => {
    const words = "я иду по городу и слушаю музыку".split(" ").map((text, i) => ({ text, time: i }));
    const a = layoutBurst(words, 7, 1400, 860, 54);
    const b = layoutBurst(words, 7, 1400, 860, 54);
    expect(a).toEqual(b);
    expect(a.every((w) => w.x > 0 && w.x < 1 && w.y > 0 && w.y < 1)).toBe(true);
  });
});

describe("палитры и настройки", () => {
  it("у всех палитр читаемый текст", () => {
    for (const p of PALETTES) {
      const contrast = (Math.max(luminance(p.text), luminance(p.bg)) + 0.05) / (Math.min(luminance(p.text), luminance(p.bg)) + 0.05);
      expect(contrast, p.name).toBeGreaterThan(7);
    }
    expect(onColor("#ffffff")).toBe("#0d0b14");
    expect(onColor("#101010")).toBe("#ffffff");
  });

  it("палитра из обложки берёт главный цвет", () => {
    const px: number[] = [];
    for (let i = 0; i < 100; i++) px.push(220, 30, 60, 255); // красный
    for (let i = 0; i < 30; i++) px.push(30, 80, 220, 255); // синий
    const p = paletteFromPixels(px, PALETTES[0]!);
    expect(p.id).toBe("cover");
    const [r, , b] = [parseInt(p.accent.slice(1, 3), 16), 0, parseInt(p.accent.slice(5, 7), 16)];
    expect(r).toBeGreaterThan(b);
    expect(luminance(p.bg)).toBeLessThan(0.02);
  });

  it("сохранённые настройки дополняются новыми полями", () => {
    const s = mergeSettings({ palette: "sakura", shake: { intensity: 0.9 } });
    expect(s.palette).toBe("sakura");
    expect(s.shake.intensity).toBe(0.9);
    expect(s.shake.sensitivity).toBe(DEFAULT_SETTINGS.shake.sensitivity);
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
