import { DEFAULT_SETTINGS, type AppSettings } from "../../../shared/settings";
import type { AppInfo, UpdateStatus } from "../../../shared/types";
import { api } from "../lib/api";
import { setFpsCap } from "../lib/frame";
import { createStore } from "../lib/store";
import { engine } from "../lib/audio";
import { ambiencePlaying, setAmbience, setAmbienceVolume } from "../lib/ambience";

export type ScreenId = "today" | "tasks" | "notes" | "links" | "music" | "focus" | "chat" | "settings";

export interface Toast {
  id: number;
  text: string;
  tone?: "info" | "ok" | "warn";
}

interface AppState {
  screen: ScreenId;
  nowPlaying: boolean;
  palette: boolean; // командная строка Ctrl+K
  /** Открыты «Итоги недели». */
  recap: boolean;
  /** Идёт заставка; screensaverScene — показать конкретную сцену (предпросмотр). */
  screensaver: boolean;
  screensaverScene?: string;
  settings: AppSettings;
  info: AppInfo;
  toasts: Toast[];
  update: UpdateStatus;
  /** Открыт ли текст песни поверх окон. */
  overlay: boolean;
}

export const app = createStore<AppState>({
  screen: "today",
  recap: false,
  screensaver: false,
  nowPlaying: false,
  palette: false,
  settings: DEFAULT_SETTINGS,
  info: { platform: "win32", version: "", timeZone: "UTC", refreshRate: 60 },
  toasts: [],
  update: { state: "idle", current: "" },
  overlay: false,
});

export async function toggleOverlay(): Promise<void> {
  const open = await api.overlay.toggle();
  app.set({ overlay: open });
  if (open) toast("Текст песни теперь поверх всех окон. Выключить — та же кнопка или меню в трее.", "ok");
}

let toastId = 0;
export function toast(text: string, tone: Toast["tone"] = "info"): void {
  const id = ++toastId;
  app.set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
  setTimeout(() => app.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
}

export function go(screen: ScreenId): void {
  app.set({ screen, nowPlaying: false, palette: false, recap: false });
}

function applySettings(s: AppSettings): void {
  setFpsCap(s.fpsCap);
  engine.shakeEnabled = s.shake.enabled;
  engine.shakeOpts = {
    intensity: s.shake.intensity,
    rotation: s.shake.rotation,
    zoom: s.shake.zoom,
  };
  engine.beat.sensitivity = s.shake.sensitivity;
  engine.volume = s.volume;
  engine.setRates(s.slowedRate, s.nightcoreRate);
  engine.setEq(s.eq.bands);
  if (s.ambience.on || ambiencePlaying()) {
    setAmbienceVolume(s.ambience.volume);
    setAmbience(s.ambience.on ? s.ambience.levels : {});
  }
  engine.setMode(s.soundMode);
  document.documentElement.dataset.blur = s.blur ? "1" : "0";
  document.documentElement.style.setProperty("--lyrics-scale", String(s.lyricsSize));
}

export async function initApp(): Promise<void> {
  const [settings, info, update] = await Promise.all([api.settings.get(), api.info(), api.updates.status()]);
  app.set({ update, overlay: await api.overlay.isOpen() });
  api.on("overlay-changed", (open) => app.set({ overlay: open }));
  api.on("update-status", (u) => {
    const was = app.get().update.state;
    app.set({ update: u });
    if (u.state === "ready" && was !== "ready")
      toast(`Новая версия ${u.version} скачана — перезапусти Камадо в Настройках или из полоски сверху.`, "ok");
  });
  applySettings(settings);
  document.documentElement.dataset.platform = info.platform;
  app.set({ settings, info });
}

let saveTimer: number | undefined;
/** Меняет настройки сразу на экране, а сохраняет с небольшой задержкой (для слайдеров). */
export function updateSettings(patch: Partial<AppSettings>): void {
  const next = { ...app.get().settings, ...patch };
  applySettings(next);
  app.set({ settings: next });
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void api.settings.set(next), 250);
}
