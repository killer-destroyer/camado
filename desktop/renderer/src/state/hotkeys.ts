// Горячие клавиши окна: одно место, где нажатие превращается в действие.
import { actionFor, comboOf, isBare } from "../../../shared/hotkeys";
import { app, go, toast, updateSettings, type ScreenId } from "./app";
import { cycleRepeat, currentTrack, toggleTranslation, next, player, position, prev, seek, toggleFavorite, togglePlay } from "./player";
import { focus, pause as pauseFocus, start as startFocus } from "./focus";

export const isMac = () => app.get().info.platform === "darwin";

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** Пока в Настройках ждём новое сочетание — клавиши не срабатывают. */
export const capture = { on: false };

/** Действия, на которые подписываются другие части (голос, перевод). */
const extra = new Map<string, (down: boolean) => void>();
export function onHotkey(id: string, fn: (down: boolean) => void): () => void {
  extra.set(id, fn);
  return () => {
    if (extra.get(id) === fn) extra.delete(id);
  };
}

let beforeMute = 0.6;

export function runAction(id: string): void {
  const s = app.get();
  const vol = (d: number) => {
    const v = Math.max(0, Math.min(1, Math.round((s.settings.volume + d) * 100) / 100));
    updateSettings({ volume: v });
    toast(`Громкость ${Math.round(v * 100)}%`, "info");
  };
  if (id.startsWith("go:")) return go(id.slice(3) as ScreenId);
  switch (id) {
    case "palette":
      return app.set((x) => ({ palette: !x.palette }));
    case "cheatsheet":
      return app.set((x) => ({ cheatsheet: !x.cheatsheet }));
    case "chat":
      app.set({ nowPlaying: false });
      return go("chat");
    case "settings":
      app.set({ nowPlaying: false });
      return go("settings");
    case "focus":
      return focus.get().running ? pauseFocus() : startFocus();
    case "screensaver":
      return app.set({ screensaver: true, screensaverScene: undefined });
    case "playpause":
      return togglePlay();
    case "next":
      return next();
    case "prev":
      return prev();
    case "seekFwd":
      return seek(position() + 5);
    case "seekBack":
      return seek(position() - 5);
    case "volUp":
      return vol(0.05);
    case "volDown":
      return vol(-0.05);
    case "mute":
      if (s.settings.volume > 0) {
        beforeMute = s.settings.volume;
        updateSettings({ volume: 0 });
        toast("Без звука", "info");
      } else updateSettings({ volume: beforeMute || 0.6 });
      return;
    case "like": {
      const t = currentTrack();
      if (!t) return;
      const was = player.get().favorites.includes(t.id);
      void toggleFavorite(t.id);
      toast(was ? "Убрал из «Любимого»" : `«${t.title}» — в «Любимом»`, "ok");
      return;
    }
    case "shuffle": {
      const on = !player.get().shuffle;
      player.set({ shuffle: on });
      toast(on ? "Вперемешку" : "По порядку", "info");
      return;
    }
    case "repeat": {
      cycleRepeat();
      const r = player.get().repeat;
      toast(r === "one" ? "Повтор одной песни" : r === "all" ? "Повтор всего" : "Без повтора", "info");
      return;
    }
    case "player":
      if (currentTrack()) app.set((x) => ({ nowPlaying: !x.nowPlaying }));
      return;
    case "editTrack": {
      const t = currentTrack();
      if (t && player.get().library.tracks.some((x) => x.id === t.id)) app.set({ trackEdit: t.id });
      return;
    }
    case "translate":
      return toggleTranslation();
    default:
      extra.get(id)?.(true);
  }
}

/** Обработчик нажатий окна. true — нажатие использовано. */
export function handleKey(e: KeyboardEvent): boolean {
  if (capture.on) return false;
  const combo = comboOf(e, isMac());
  if (!combo) return false;
  if (isTyping(e) && isBare(combo)) return false;
  const id = actionFor(combo, app.get().settings.hotkeys, app.get().nowPlaying);
  if (!id) return false;
  e.preventDefault();
  if (e.repeat && !["volUp", "volDown", "seekFwd", "seekBack"].includes(id)) return true;
  if (extra.has(id)) held = id;
  runAction(id);
  return true;
}

/** Зажатое действие («зажми и говори») — отпускаем при отпускании любой клавиши сочетания. */
let held: string | null = null;
export function handleKeyUp(): void {
  if (!held) return;
  const id = held;
  held = null;
  extra.get(id)?.(false);
}
