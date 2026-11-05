// Настройки приложения. Хранятся в базе (kv), меняются в окне «Настройки».

export type VisualizerStyle = "wave" | "ring" | "bars" | "off";
export type LyricsMode = "flow" | "burst" | "line" | "off";
export type ShakeTarget = "scene" | "cover" | "lyrics";

export interface AppSettings {
  palette: string;
  /** Брать цвета из обложки текущего трека (фон, пластинка, волны). */
  coverColors: boolean;
  /** 0 — по монитору (60, 144, 165…), иначе ограничение. */
  fpsCap: 0 | 30 | 60 | 120 | 144 | 240;
  showFps: boolean;
  background: "aurora" | "calm" | "static";
  /** Размытие под панелями. Красиво, но на живом фоне нагружает видеокарту — по умолчанию выключено. */
  blur: boolean;
  visualizer: VisualizerStyle;
  lyricsMode: LyricsMode;
  lyricsSize: number; // 0.7…1.4
  /** Ручной сдвиг текста по трекам, секунды (+ — текст позже). */
  lyricsOffsets: Record<string, number>;
  shake: {
    enabled: boolean;
    intensity: number; // 0…1
    sensitivity: number; // 0…1
    rotation: boolean;
    zoom: boolean;
    target: ShakeTarget;
  };
  vinyl: boolean;
  /** Плавный переход между треками, секунды (0 — выкл). */
  crossfade: number;
  /** Звук: обычный, slowed + reverb, nightcore. */
  soundMode: "normal" | "slowed" | "nightcore";
  volume: number; // 0…1
  focus: { work: number; short: number; long: number; autoMusic: boolean };
  runBot: boolean;
  /** Статус «Слушает в Camado» в Discord. */
  discord: { enabled: boolean; clientId: string };
  closeToTray: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  palette: "midnight",
  coverColors: true,
  fpsCap: 0,
  showFps: false,
  background: "aurora",
  blur: false,
  visualizer: "wave",
  lyricsMode: "flow",
  lyricsSize: 1,
  lyricsOffsets: {},
  shake: { enabled: true, intensity: 0.45, sensitivity: 0.55, rotation: true, zoom: true, target: "scene" },
  vinyl: true,
  crossfade: 6,
  soundMode: "normal",
  volume: 0.8,
  focus: { work: 25, short: 5, long: 15, autoMusic: true },
  runBot: true,
  discord: { enabled: false, clientId: "" },
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
    discord: { ...DEFAULT_SETTINGS.discord, ...(s.discord ?? {}) },
    lyricsOffsets: { ...(s.lyricsOffsets ?? {}) },
  };
}
