// 1.3.0 «Кастом»: своя боковая панель и главный экран — и кнопками, и словами через ИИ.
import { describe, expect, it } from "vitest";
import { DEFAULT_CUSTOM, findSection, moveCard, normalizeCustom, offSidebar, setCard, setSidebar } from "../desktop/shared/custom.js";
import { buildAppTools, type AppAction } from "../desktop/main/appTools.js";
import { DEFAULT_SETTINGS, mergeSettings, type AppSettings } from "../desktop/shared/settings.js";

describe("кастом", () => {
  it("чистит сохранённое и добавляет новые карточки", () => {
    const c = normalizeCustom({ sidebar: ["today", "today", "evil", "music"], home: [{ id: "hot", size: "l" }, { id: "hot", size: "s" }, { id: "nope" }] });
    expect(c.sidebar).toEqual(["today", "music"]);
    expect(c.home[0]).toEqual({ id: "hot", size: "l" });
    expect(c.home.length).toBe(DEFAULT_CUSTOM.home.length);
    expect(normalizeCustom(undefined)).toEqual(DEFAULT_CUSTOM);
    expect(mergeSettings({}).custom.sidebar).toEqual(DEFAULT_CUSTOM.sidebar);
  });
  it("разделы не на панели — иконками на главном", () => {
    expect(offSidebar(DEFAULT_CUSTOM)).toEqual(["links", "money"]);
    expect(offSidebar(setSidebar(DEFAULT_CUSTOM, ["today"])).length).toBe(10);
    expect(setSidebar(DEFAULT_CUSTOM, []).sidebar).toEqual(["today"]);
  });
  it("порядок, размер и скрытие карточек", () => {
    let c = moveCard(DEFAULT_CUSTOM, "money", 0);
    expect(c.home[0]!.id).toBe("money");
    c = setCard(c, "money", { size: "l", hidden: true });
    expect(c.home[0]).toMatchObject({ size: "l", hidden: true });
    c = setCard(c, "money", { hidden: false });
    expect(c.home[0]!.hidden).toBeUndefined();
    expect(findSection("Музыку")).toBe("music");
    expect(findSection("главная")).toBe("today");
  });
  it("ИИ меняет кастом словами", async () => {
    let settings: AppSettings = { ...DEFAULT_SETTINGS };
    const acts: AppAction[] = [];
    const tools = buildAppTools({
      tracks: () => [],
      playlists: () => [],
      favorites: () => [],
      nowPlaying: () => null,
      settings: () => settings,
      saveSettings: (p) => (settings = { ...settings, ...p }),
      act: (a) => acts.push(a),
      showWindow: () => undefined,
      window: () => undefined,
    });
    const run = (name: string, i: unknown) => tools.find((t) => t.name === name)!.run(i);
    const out = await run("app_custom", { sidebar_remove: ["music"], sidebar_add: ["money"], cards: [{ card: "money", position: "first", size: "w" }, { card: "alarms", hide: true }] });
    expect(out).toMatch(/Сделал/);
    expect(settings.custom.sidebar).not.toContain("music");
    expect(settings.custom.sidebar).toContain("money");
    expect(settings.custom.home[0]).toMatchObject({ id: "money", size: "w" });
    expect(settings.custom.home.find((x) => x.id === "alarms")!.hidden).toBe(true);
    expect(await run("app_settings", { fps_cap: 60, background: "static", focus_work_min: 50 })).toMatch(/60 кадров/);
    expect(settings.fpsCap).toBe(60);
    expect(settings.focus.work).toBe(50);
  });
});
