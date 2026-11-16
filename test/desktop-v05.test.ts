import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LyricsService } from "../desktop/main/lyrics.js";
import { FOCUS_PRESETS, presetById } from "../desktop/shared/focusPresets.js";
import { DEFAULT_SETTINGS, mergeSettings } from "../desktop/shared/settings.js";

describe("настройки 0.5", () => {
  it("старые сохранённые настройки получают новые поля по умолчанию", () => {
    const s = mergeSettings({ volume: 0.5, focus: { work: 30 }, alarm: { sound: "phonk" } });
    expect(s.volume).toBe(0.5);
    expect(s.focus).toMatchObject({ work: 30, short: 5, preset: "pomodoro", longEvery: 4 });
    expect(s.alarm).toMatchObject({ sound: "phonk", ramp: 10 });
    expect(s.alarms).toEqual([]);
    expect(s.trackGain).toEqual({});
    expect(s.autoLevel).toBe(true);
    expect(s.nightcoreRate).toBeLessThan(1.25); // был слишком быстрым
  });

  it("мусор вместо списка напоминаний не ломает настройки", () => {
    expect(mergeSettings({ alarms: "abc" }).alarms).toEqual([]);
  });
});

describe("пресеты фокуса", () => {
  it("у каждого есть длительности и гайд", () => {
    expect(FOCUS_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const p of FOCUS_PRESETS) {
      expect(p.work).toBeGreaterThan(0);
      expect(p.short).toBeGreaterThan(0);
      expect(p.rest.length).toBeGreaterThan(0);
      expect(p.during.length).toBeGreaterThan(0);
    }
    expect(presetById(DEFAULT_SETTINGS.focus.preset)?.work).toBe(DEFAULT_SETTINGS.focus.work);
  });
});

describe("тексты: из нескольких одинаковых песен в базе", () => {
  it("берёт ту, что ближе всего по длине к файлу", async () => {
    const dir = mkdtempSync(join(tmpdir(), "camado-lyr5-"));
    const impl = (async (url: string) => {
      if (url.includes("/api/get")) return new Response("{}", { status: 404 });
      return new Response(
        JSON.stringify([
          { duration: 69, syncedLyrics: "[00:01]обрезанная" },
          { duration: 107, syncedLyrics: "[00:02]почти" },
          { duration: 112, syncedLyrics: "[00:03]та самая" },
        ]),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const svc = new LyricsService(dir, () => undefined, impl);
    const l = await svc.get({ title: "Школа не нужна", artist: "Пошлая Молли", duration: 111 });
    expect(l.lines[0]?.text).toBe("та самая");
  });
});
