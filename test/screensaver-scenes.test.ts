// Сцены заставки: у каждой своё имя и функция scene(); «Своя картинка» есть; настройки картинки по умолчанию.
import { describe, expect, it } from "vitest";
import { SCENES, SHADER_HEAD, sceneById } from "../desktop/renderer/src/lib/scenes.js";
import { DEFAULT_SETTINGS, mergeSettings } from "../desktop/shared/settings.js";

describe("сцены заставки", () => {
  it("у каждой сцены свой id и тело шейдера", () => {
    const ids = SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SCENES) expect(s.body).toMatch(/vec3 scene\(vec2 uv, vec2 p\)/);
  });
  it("есть «Своя картинка» и новая чёрная дыра с трассировкой лучей", () => {
    expect(sceneById("picture").name).toBe("Своя картинка");
    expect(sceneById("blackhole").body).toContain("h2");
    expect(SHADER_HEAD).toContain("uImgAspect");
  });
  it("старые настройки получают эффект поверх картинки", () => {
    expect(DEFAULT_SETTINGS.screensaver.imageFx).toBe("dust");
    const old = mergeSettings({ screensaver: { enabled: true, delay: 5, scene: "rain", lyrics: true, clock: false, fullscreen: true } } as never);
    expect(old.screensaver.imageFx).toBe("dust");
    expect(old.screensaver.delay).toBe(5);
  });
});
