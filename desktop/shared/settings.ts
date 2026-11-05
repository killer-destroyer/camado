// Настройки приложения. Хранятся в базе (kv), меняются в окне «Настройки».

export type VisualizerStyle = "wave" | "ring" | "bars" | "off";
export type LyricsMode = "flow" | "burst" | "line" | "off";
export type ShakeTarget = "scene" | "cover" | "lyrics";

export interface AppSettings {
  palette: string;
  /** Брать цвета из обложки текущего трека. */
  coverPalette: boolean;
  /** 0 — по монитору (60, 144, 165…), иначе ограничение. */
  fpsCap: 0 | 30 | 60 | 120 | 144 | 240;
  showFps: boolean;
  background: "aurora" | "calm" | "static";
  /** Размытие под панелями. Красиво, но на живом фоне нагружает видеокарту — по умолчанию выключено. */
  blur: boolean;
  visualizer: VisualizerStyle;
  lyricsMode: LyricsMode;
  lyricsSize: number; // 0.7…1.4
  shake: {
    enabled: boolean;
    intensity: number; // 0…1
    sensitivity: number; // 0…1
    rotation: boolean;
    zoom: boolean;
    target: ShakeTarget;
  };
  vinyl: boolean;
  volume: number; // 0…1
  focus: { work: number; short: number; long: number; autoMusic: boolean };
  runBot: boolean;
  closeToTray: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  palette: "midnight",
  coverPalette: false,
  fpsCap: 0,
  showFps: false,
  background: "aurora",
  blur: false,
  visualizer: "ring",
  lyricsMode: "flow",
  lyricsSize: 1,
  shake: { enabled: true, intensity: 0.45, sensitivity: 0.55, rotation: true, zoom: true, target: "scene" },
  vinyl: true,
  volume: 0.8,
  focus: { work: 25, short: 5, long: 15, autoMusic: true },
  runBot: true,
  closeToTray: true,
};

/** Аккуратно накладывает сохранённое на значения по умолчанию (новые поля не теряются). */
export function mergeSettings(saved: unknown): AppSettings {
  const s = (saved && typeof saved === "object" ? saved : {}) as Partial<AppSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    shake: { ...DEFAULT_SETTINGS.shake, ...(s.shake ?? {}) },
    focus: { ...DEFAULT_SETTINGS.focus, ...(s.focus ?? {}) },
  };
}
