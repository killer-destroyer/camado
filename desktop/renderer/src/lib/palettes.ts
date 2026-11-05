// Готовые цветовые палитры и применение палитры к интерфейсу через CSS-переменные.

export interface Palette {
  id: string;
  name: string;
  /** Короткое настроение для карточки в настройках. */
  vibe: string;
  light?: boolean;
  bg: string;
  bg2: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  accent3: string;
}

export const PALETTES: Palette[] = [
  { id: "midnight", name: "Полночь", vibe: "фиолетовая ночь", bg: "#0b0a14", bg2: "#14112a", text: "#f3f0ff", muted: "#9c96c4", accent: "#8b5cf6", accent2: "#22d3ee", accent3: "#f472b6" },
  { id: "sakura", name: "Сакура", vibe: "нежно-розовый", bg: "#140b11", bg2: "#22121c", text: "#fff0f5", muted: "#c79aae", accent: "#ff7eb6", accent2: "#ffc2d6", accent3: "#b388ff" },
  { id: "tokyo", name: "Неон-Токио", vibe: "кислотный неон", bg: "#06060c", bg2: "#10101e", text: "#eefffb", muted: "#8aa0a8", accent: "#00f5d4", accent2: "#f15bb5", accent3: "#fee440" },
  { id: "sunset", name: "Закат", vibe: "тёплый оранжевый", bg: "#130a07", bg2: "#22130c", text: "#fff4ec", muted: "#c99f86", accent: "#ff6b35", accent2: "#ffb627", accent3: "#e63946" },
  { id: "matcha", name: "Матча", vibe: "спокойный зелёный", bg: "#09110c", bg2: "#112018", text: "#f0fff4", muted: "#93b39f", accent: "#a3e635", accent2: "#34d399", accent3: "#fde68a" },
  { id: "ocean", name: "Океан", vibe: "глубокий синий", bg: "#050f19", bg2: "#0b1b2c", text: "#eef8ff", muted: "#8eabc4", accent: "#38bdf8", accent2: "#2dd4bf", accent3: "#818cf8" },
  { id: "cherry", name: "Вишня", vibe: "тёмно-красный", bg: "#110809", bg2: "#1f0f12", text: "#fff1f2", muted: "#c4949b", accent: "#f43f5e", accent2: "#fb7185", accent3: "#fbbf24" },
  { id: "nord", name: "Нордика", vibe: "северный холод", bg: "#191d25", bg2: "#232934", text: "#eceff4", muted: "#9aa5b8", accent: "#88c0d0", accent2: "#a3be8c", accent3: "#b48ead" },
  { id: "dracula", name: "Дракула", vibe: "классика ночи", bg: "#17181f", bg2: "#22232d", text: "#f8f8f2", muted: "#9ea3c4", accent: "#bd93f9", accent2: "#ff79c6", accent3: "#50fa7b" },
  { id: "y2k", name: "Y2K", vibe: "2000-е, глянец", bg: "#0c0220", bg2: "#1a0638", text: "#fdf4ff", muted: "#b49ad6", accent: "#ff00c8", accent2: "#00e5ff", accent3: "#fff200" },
  { id: "mono", name: "Монохром", vibe: "строго и чисто", bg: "#0a0a0a", bg2: "#161616", text: "#fafafa", muted: "#9a9a9a", accent: "#f5f5f5", accent2: "#a3a3a3", accent3: "#6b6b6b" },
  { id: "vanilla", name: "Ваниль", vibe: "светлая, дневная", light: true, bg: "#f6f1ea", bg2: "#ece4d8", text: "#1f1a17", muted: "#7a6f66", accent: "#d9480f", accent2: "#0f766e", accent3: "#7c3aed" },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Относительная яркость (WCAG), 0…1. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Цвет текста, который хорошо читается поверх данного фона. */
export function onColor(hex: string): string {
  return luminance(hex) > 0.45 ? "#0d0b14" : "#ffffff";
}

export function applyPalette(p: Palette, root: HTMLElement = document.documentElement): void {
  const vars: Record<string, string> = {
    "--bg": p.bg,
    "--bg-2": p.bg2,
    "--text": p.text,
    "--muted": p.muted,
    "--accent": p.accent,
    "--accent-2": p.accent2,
    "--accent-3": p.accent3,
    "--on-accent": onColor(p.accent),
    "--accent-rgb": hexToRgb(p.accent).join(" "),
    "--accent-2-rgb": hexToRgb(p.accent2).join(" "),
    "--accent-3-rgb": hexToRgb(p.accent3).join(" "),
    "--text-rgb": hexToRgb(p.text).join(" "),
    "--bg-rgb": hexToRgb(p.bg).join(" "),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.light = p.light ? "1" : "0";
}

// ---------- Палитра из обложки ----------

type RGB = [number, number, number];

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

/**
 * Палитра из пикселей обложки (RGBA подряд): группируем цвета по оттенку,
 * берём самые «сочные» как акценты, фон — очень тёмная версия главного.
 */
export function paletteFromPixels(data: Uint8ClampedArray | number[], base: Palette): Palette {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; sat: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const rgb: RGB = [data[i]!, data[i + 1]!, data[i + 2]!];
    const [h, s, l] = rgbToHsl(rgb);
    if (l < 0.08 || l > 0.95) continue;
    const key = s < 0.15 ? -1 : Math.floor(h * 18);
    const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat: 0 };
    bk.n++;
    bk.r += rgb[0];
    bk.g += rgb[1];
    bk.b += rgb[2];
    bk.sat += s;
    buckets.set(key, bk);
  }
  const groups = [...buckets.entries()]
    .filter(([k]) => k >= 0)
    .map(([, b]) => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n] as RGB, n: b.n, sat: b.sat / b.n }))
    .sort((a, b) => b.n * (0.4 + b.sat) - a.n * (0.4 + a.sat));
  if (groups.length === 0) return { ...base, id: "cover", name: "Обложка" };

  const vivid = (rgb: RGB, minL: number, maxL: number, minS: number): string => {
    const [h, s, l] = rgbToHsl(rgb);
    return rgbToHex(hslToRgb([h, Math.max(s, minS), Math.min(maxL, Math.max(minL, l))]));
  };
  const main = groups[0]!.rgb;
  const second = (groups[1] ?? groups[0]!).rgb;
  const third = (groups[2] ?? groups[1] ?? groups[0]!).rgb;
  const [h] = rgbToHsl(main);
  return {
    id: "cover",
    name: "Обложка",
    vibe: "цвета трека",
    bg: rgbToHex(hslToRgb([h, 0.35, 0.05])),
    bg2: rgbToHex(hslToRgb([h, 0.35, 0.1])),
    text: rgbToHex(hslToRgb([h, 0.3, 0.96])),
    muted: rgbToHex(hslToRgb([h, 0.18, 0.66])),
    accent: vivid(main, 0.55, 0.68, 0.55),
    accent2: vivid(second, 0.6, 0.75, 0.45),
    accent3: vivid(third, 0.55, 0.72, 0.45),
  };
}
