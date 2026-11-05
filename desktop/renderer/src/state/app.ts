import { DEFAULT_SETTINGS, type AppSettings } from "../../../shared/settings";
import type { AppInfo } from "../../../shared/types";
import { api } from "../lib/api";
import { setFpsCap } from "../lib/frame";
import { createStore } from "../lib/store";
import { engine } from "../lib/audio";

export type ScreenId = "today" | "tasks" | "notes" | "music" | "focus" | "chat" | "settings";

export interface Toast {
  id: number;
  text: string;
  tone?: "info" | "ok" | "warn";
}

interface AppState {
  screen: ScreenId;
  nowPlaying: boolean;
  palette: boolean; // командная строка Ctrl+K
  settings: AppSettings;
  info: AppInfo;
  toasts: Toast[];
}

export const app = createStore<AppState>({
  screen: "today",
  nowPlaying: false,
  palette: false,
  settings: DEFAULT_SETTINGS,
  info: { platform: "win32", version: "", timeZone: "UTC", refreshRate: 60, loopbackSupported: false },
  toasts: [],
});

let toastId = 0;
export function toast(text: string, tone: Toast["tone"] = "info"): void {
  const id = ++toastId;
  app.set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
  setTimeout(() => app.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
}

export function go(screen: ScreenId): void {
  app.set({ screen, nowPlaying: false, palette: false });
}

function applySettings(s: AppSettings): void {
  setFpsCap(s.fpsCap);
  engine.shakeEnabled = s.shake.enabled;
  engine.shakeOpts = { intensity: s.shake.intensity, rotation: s.shake.rotation, zoom: s.shake.zoom };
  engine.beat.sensitivity = s.shake.sensitivity;
  engine.el.volume = s.volume;
  document.documentElement.dataset.glass = s.glass ? "1" : "0";
  document.documentElement.style.setProperty("--lyrics-scale", String(s.lyricsSize));
}

export async function initApp(): Promise<void> {
  const [settings, info] = await Promise.all([api.settings.get(), api.info()]);
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
