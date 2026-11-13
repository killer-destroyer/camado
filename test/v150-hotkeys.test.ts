// 1.5.0: горячие клавиши — разбор нажатий, свои сочетания, без двойных назначений.
import { describe, expect, it } from "vitest";
import { actionFor, bindings, comboOf, HOTKEYS, isBare, normalizeHotkeys, prettyCombo, rebind } from "../desktop/shared/hotkeys.js";
import { mergeSettings } from "../desktop/shared/settings.js";

const ev = (code: string, key: string, m: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) => ({
  code,
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...m,
});

describe("горячие клавиши", () => {
  it("нажатия в сочетания — и на русской раскладке", () => {
    expect(comboOf(ev("KeyK", "л", { ctrlKey: true }), false)).toBe("Mod+K");
    expect(comboOf(ev("KeyK", "k", { metaKey: true }), true)).toBe("Mod+K");
    expect(comboOf(ev("Slash", ".", { ctrlKey: true }), false)).toBe("Mod+/");
    expect(comboOf(ev("Space", " "), false)).toBe("Space");
    expect(comboOf(ev("ArrowRight", "ArrowRight", { shiftKey: true }), false)).toBe("Shift+ArrowRight");
    expect(comboOf(ev("Digit3", "#", { altKey: true }), true)).toBe("Alt+3");
    expect(comboOf(ev("ShiftLeft", "Shift", { shiftKey: true }), false)).toBe("");
  });

  it("действия по умолчанию и в плеере", () => {
    expect(actionFor("Mod+/", {}, false)).toBe("cheatsheet");
    expect(actionFor("Space", {}, false)).toBe("playpause");
    expect(actionFor("ArrowRight", {}, false)).toBeUndefined();
    expect(actionFor("ArrowRight", {}, true)).toBe("seekFwd");
    expect(actionFor("Alt+8", {}, false)).toBe("go:music");
  });

  it("у всех действий разные сочетания по умолчанию", () => {
    const combos = HOTKEYS.map((a) => a.combo);
    expect(new Set(combos).size).toBe(combos.length);
    // глобальное «быстрая запись» не перекрываем
    expect(combos).not.toContain("Mod+Shift+Space");
  });

  it("своё сочетание: занятое снимается у другого, стандартное не хранится", () => {
    let c = rebind({}, "like", "Mod+L");
    expect(actionFor("Mod+L", c, false)).toBe("like");
    expect(actionFor("L", c, false)).toBeUndefined();
    c = rebind(c, "shuffle", "Mod+L");
    expect(actionFor("Mod+L", c, false)).toBe("shuffle");
    expect(bindings(c).get("like")).toBeUndefined(); // у «Любимого» теперь пусто
    c = rebind(c, "shuffle", "S");
    expect(c.shuffle).toBeUndefined();
    expect(rebind({}, "mute", "")).toEqual({ mute: "" });
  });

  it("настройки: мусор отбрасывается, новые поля есть", () => {
    expect(normalizeHotkeys({ like: "Mod+L", evil: "x", mute: 5 })).toEqual({ like: "Mod+L" });
    expect(mergeSettings({}).hotkeys).toEqual({});
    expect(mergeSettings({ hotkeys: { player: "Mod+P" } }).hotkeys).toEqual({ player: "Mod+P" });
  });

  it("одиночные буквы не мешают печатать; красиво для Mac и Windows", () => {
    expect(isBare("L")).toBe(true);
    expect(isBare("Shift+ArrowRight")).toBe(true);
    expect(isBare("Mod+K")).toBe(false);
    expect(prettyCombo("Mod+Shift+ArrowRight", false)).toBe("Ctrl + Shift + →");
    expect(prettyCombo("Mod+Shift+ArrowRight", true)).toBe("⌘ ⇧ →");
  });
});
