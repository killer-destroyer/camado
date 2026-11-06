// Настройки приложения. Хранятся в базе (kv), меняются в окне «Настройки».

export type VisualizerStyle = "wave" | "ring" | "bars" | "off";
export type LyricsMode = "flow" | "burst" | "line" | "off";
export type ShakeTarget = "scene" | "cover" | "lyrics";

export interface LyricsSync {
  s: number;
  o: number;
  t1?: number;
  l1?: number;
  /** «Пойманные» строки: в момент песни t звучала строка текста l. Между точками текст растягивается. */
  anchors?: { t: number; l: number }[];
}

export interface AlarmItem {
  id: string;
  at: string; // ISO
  text: string;
}

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
  /**
   * Подгонка текста по трекам: время текста = s × время песни + o.
   * s ≠ 1 — текст сделан под версию с другим темпом. t1/l1 — первая «пойманная» строка (время песни и текста).
   */
  lyricsSync: Record<string, LyricsSync>;
  /** Подгонять текст по звуку сам (ИИ слушает песню), когда текст в базе от версии другой длины. */
  lyricsByEar: boolean;
  shake: {
    enabled: boolean;
    intensity: number; // 0…1
    sensitivity: number; // 0…1
    rotation: boolean;
    zoom: boolean;
    target: ShakeTarget;
  };
  vinyl: boolean;
  /** Выбранный вид пластинки для песни (кнопка «другой вид»): номер варианта. */
  vinylVariant: Record<string, number>;
  /** Плавный переход между треками, секунды (0 — выкл). */
  crossfade: number;
  /** Звук: обычный, slowed + reverb, nightcore. */
  soundMode: "normal" | "slowed" | "nightcore";
  /** Скорость slowed (0.7…0.95) и nightcore (1.05…1.4). */
  slowedRate: number;
  nightcoreRate: number;
  volume: number; // 0…1 — положение ползунка; громкость «по слуху» считает движок
  /** Заставка-визуализатор: через сколько минут бездействия, какая сцена ("random" — новая на каждый трек), что показывать. */
  screensaver: {
    enabled: boolean;
    delay: number;
    scene: string;
    lyrics: boolean;
    clock: boolean;
    fullscreen: boolean;
    /** Своя картинка для сцены «Своя картинка» (адрес camado-media://picture/…) и её имя файла. */
    image?: string;
    imageName?: string;
    /** Что поверх своей картинки: ничего, пылинки, капли дождя. */
    imageFx: "none" | "dust" | "rain";
  };
  /** Фоновые звуки: включены ли, общая громкость, уровень каждого (0 — выкл), включать ли вместе с фокусом. */
  ambience: { on: boolean; volume: number; levels: Record<string, number>; withFocus: boolean };
  /** Эквалайзер: пресет (или "custom") и 10 полос в дБ. */
  eq: { preset: string; bands: number[] };
  /** Выравнивать громкость песен автоматически (тихие подтянуть, громкие приглушить). */
  autoLevel: boolean;
  /** Своя громкость песни, дБ (+ — громче). Поверх автовыравнивания. */
  trackGain: Record<string, number>;
  /** Измеренная громкость песен, дБ — чтобы не мерить заново. */
  trackLoudness: Record<string, number>;
  /** preset — id пресета фокуса или "custom"; longEvery — длинный перерыв после N сессий (0 — никогда). */
  focus: {
    work: number;
    short: number;
    long: number;
    autoMusic: boolean;
    preset: string;
    longEvery: number;
    /** Дыхание и разминка на перерыве. */
    coach: boolean;
    /** Плейлисты для работы и для перерыва (id; 0 — не переключать). */
    workPlaylist: number;
    breakPlaylist: number;
  };
  /** Звук напоминаний: id встроенного звука или "custom"; ramp — за сколько секунд нарастает громкость (0 — сразу). */
  alarm: { sound: string; ramp: number; volume: number; customName: string; customUrl: string };
  /** Свои напоминания «напомни в 18:00». */
  alarms: AlarmItem[];
  runBot: boolean;
  /** Статус «Слушает в Camado» в Discord. */
  discord: { enabled: boolean; clientId: string };
  closeToTray: boolean;
  /** Показывать таймер фокуса и ближайший дедлайн в меню-баре (Mac) / подсказке трея. */
  menubar: boolean;
  /** Открытые ачивки: id → когда. */
  achievements: Record<string, string>;
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
  lyricsSync: {},
  lyricsByEar: true,
  shake: { enabled: true, intensity: 0.45, sensitivity: 0.55, rotation: true, zoom: true, target: "scene" },
  vinyl: true,
  vinylVariant: {},
  crossfade: 6,
  soundMode: "normal",
  slowedRate: 0.85,
  nightcoreRate: 1.15,
  volume: 0.8,
  eq: { preset: "flat", bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  screensaver: { enabled: true, delay: 2, scene: "random", lyrics: true, clock: true, fullscreen: true, imageFx: "dust" },
  ambience: { on: false, volume: 0.7, levels: { rain: 0.6 }, withFocus: false },
  autoLevel: true,
  trackGain: {},
  trackLoudness: {},
  focus: { work: 25, short: 5, long: 15, autoMusic: true, preset: "pomodoro", longEvery: 4, coach: true, workPlaylist: 0, breakPlaylist: 0 },
  alarm: { sound: "marimba", ramp: 10, volume: 0.9, customName: "", customUrl: "" },
  alarms: [],
  runBot: true,
  discord: { enabled: false, clientId: "" },
  closeToTray: true,
  menubar: true,
  achievements: {},
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
    alarm: { ...DEFAULT_SETTINGS.alarm, ...(s.alarm ?? {}) },
    eq: { ...DEFAULT_SETTINGS.eq, ...(s.eq ?? {}) },
    screensaver: { ...DEFAULT_SETTINGS.screensaver, ...(s.screensaver ?? {}) },
    ambience: { ...DEFAULT_SETTINGS.ambience, ...(s.ambience ?? {}), levels: { ...(s.ambience?.levels ?? DEFAULT_SETTINGS.ambience.levels) } },
    alarms: Array.isArray(s.alarms) ? s.alarms : [],
    lyricsOffsets: { ...(s.lyricsOffsets ?? {}) },
    lyricsSync: { ...(s.lyricsSync ?? {}) },
    vinylVariant: { ...(s.vinylVariant ?? {}) },
    achievements: { ...(s.achievements ?? {}) },
    trackGain: { ...(s.trackGain ?? {}) },
    trackLoudness: { ...(s.trackLoudness ?? {}) },
  };
}
