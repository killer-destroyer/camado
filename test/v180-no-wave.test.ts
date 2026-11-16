// 1.8.0: «Моя волна» убрана по решению владельца. Шаффл/повтор на нижней панели и скачивание по ссылке — на месте.
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAppTools } from "../desktop/main/appTools.js";
import { importFromUrl, setHostLookup, siteReferer } from "../desktop/main/download.js";
import { HOTKEYS } from "../desktop/shared/hotkeys.js";
import { mergeSettings } from "../desktop/shared/settings.js";
import { modelFile } from "../desktop/main/wordsync.js";

describe("волны больше нет", () => {
  it("нет инструмента ИИ, клавиши и настроек волны; чужую модель скачать нельзя", () => {
    const tools = buildAppTools({
      tracks: () => [],
      playlists: () => [],
      favorites: () => [],
      nowPlaying: () => null,
      settings: () => ({}) as never,
      saveSettings: () => undefined,
      act: () => undefined,
      showWindow: () => undefined,
      window: () => undefined,
    });
    expect(tools.some((t) => t.name === "app_wave")).toBe(false);
    expect(tools.some((t) => t.name === "app_music")).toBe(true);
    expect(HOTKEYS.some((h) => h.id === "wave")).toBe(false);
    // старые сохранённые настройки волны не мешают
    const s = mergeSettings({ waveSource: "hits", waveCharacter: "new", trackEnergy: { a: { bpm: 1, e: 1 } } }) as unknown as Record<string, unknown>;
    expect(s.volume).toBe(0.8);
    expect(modelFile("/d", "Xenova/larger_clap_music_and_speech/resolve/main/config.json")).toBeUndefined();
    expect(modelFile("/d", "onnx-community/whisper-small_timestamped/resolve/main/config.json")).toBeTruthy();
  });

  it("скачивание по ссылке с ccMixter по-прежнему работает (сайт отдаёт файл только «со своей страницы»)", async () => {
    expect(siteReferer(new URL("https://ccmixter.org/content/a/b.mp3"))).toBe("https://ccmixter.org/");
    expect(siteReferer(new URL("https://archive.org/download/a/b.mp3"))).toBeUndefined();
    setHostLookup(async () => ["93.184.216.34"]);
    const dir = await mkdtemp(join(tmpdir(), "camado-dl-"));
    const f = (async (_u: string, init: RequestInit) =>
      (init.headers as Record<string, string> | undefined)?.Referer === "https://ccmixter.org/"
        ? new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]), { headers: { "content-type": "audio/mpeg" } })
        : new Response("Forbidden", { status: 403, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    const r = await importFromUrl("https://ccmixter.org/content/dj/Night_Drive.mp3", dir, () => undefined, f);
    expect(r.kind).toBe("saved");
    expect(await readdir(dir)).toEqual(["Night_Drive.mp3"]);
  });
});
