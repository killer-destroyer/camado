// Узор пластинки: рисуется один раз на трек, по «отпечатку» трека — у каждой песни свой,
// но у одной и той же песни всегда одинаковый. Цвета — из обложки.
// Стили — как у настоящих цветных пластинок: брызги, мрамор, дым, половинки, «цвет в цвете»…
import { seeded } from "./dsp";
import { hexToRgb } from "./palettes";

export interface VinylColors {
  bg: string;
  accent: string;
  accent2: string;
  accent3: string;
  /** Настоящие цвета обложки — если есть, пластинка красится ими. */
  swatches?: string[];
}

/** Строка → число для генератора случайностей. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type RGB = [number, number, number];
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
/** k < 0 — темнее, k > 0 — светлее. */
const shade = ([r, g, b]: RGB, k: number): RGB =>
  k < 0 ? [r * (1 + k), g * (1 + k), b * (1 + k)] : [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k];

export type VinylStyle =
  | "classic"
  | "solid"
  | "splatter"
  | "marble"
  | "split"
  | "pinwheel"
  | "sunburst"
  | "galaxy"
  | "spiral"
  | "colorInColor"
  | "ripple"
  | "stripes"
  | "wheel"
  | "leopard"
  | "mesh"
  | "zigzag"
  | "neon"
  | "mosaic"
  | "watercolor"
  | "melted"
  | "picture"
  | "smoke";

export const VINYL_STYLES: VinylStyle[] = [
  "splatter",
  "marble",
  "split",
  "solid",
  "galaxy",
  "spiral",
  "colorInColor",
  "sunburst",
  "pinwheel",
  "classic",
  "ripple",
  "stripes",
  "wheel",
  "leopard",
  "mesh",
  "zigzag",
  "neon",
  "mosaic",
  "watercolor",
  "melted",
  "picture",
  "smoke",
];

/** Какой стиль достанется треку. */
export function vinylStyleFor(seed: number): VinylStyle {
  return VINYL_STYLES[seed % VINYL_STYLES.length]!;
}

interface Ctx {
  /** Обложка (для пластинки-картинки и полупрозрачной). */
  img?: CanvasImageSource;
  g: CanvasRenderingContext2D;
  c: number;
  R: number;
  labelR: number;
  rnd: () => number;
  inks: RGB[];
  dark: RGB;
}

const TAU = Math.PI * 2;

function fillDisc(x: Ctx, fill: string | CanvasGradient): void {
  x.g.fillStyle = fill;
  x.g.fillRect(0, 0, x.c * 2, x.c * 2);
}

function sector(x: Ctx, a0: number, a1: number, fill: string): void {
  const { g, c, R } = x;
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(c, c);
  g.arc(c, c, R * 1.02, a0, a1);
  g.closePath();
  g.fill();
}

/** Капля краски: пятно неровной формы с брызгами вокруг. */
function splat(x: Ctx, px: number, py: number, size: number, color: string): void {
  const { g, rnd } = x;
  g.fillStyle = color;
  g.beginPath();
  const pts = 14;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * TAU;
    const r = size * (0.65 + rnd() * 0.55);
    const X = px + Math.cos(a) * r;
    const Y = py + Math.sin(a) * r;
    if (i === 0) g.moveTo(X, Y);
    else g.lineTo(X, Y);
  }
  g.closePath();
  g.fill();
  const drops = 3 + Math.floor(rnd() * 7);
  for (let i = 0; i < drops; i++) {
    const a = rnd() * TAU;
    const d = size * (1.1 + rnd() * 1.8);
    g.beginPath();
    g.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, size * (0.08 + rnd() * 0.22), 0, TAU);
    g.fill();
  }
}

function blob(x: Ctx, color: RGB, alpha: number, minR: number, maxR: number): void {
  const { g, c, R, rnd } = x;
  const a = rnd() * TAU;
  const d = rnd() * R;
  const px = c + Math.cos(a) * d;
  const py = c + Math.sin(a) * d;
  const r = minR + rnd() * (maxR - minR);
  const grad = g.createRadialGradient(px, py, 0, px, py, r);
  grad.addColorStop(0, rgba(color, alpha));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(px, py, r, 0, TAU);
  g.fill();
}

/** Нарисовать на отдельном холсте и положить его с размытием одним проходом — так в десятки раз быстрее. */
function blurred(x: Ctx, px: number, paint: (x: Ctx) => void): void {
  const off = document.createElement("canvas");
  off.width = off.height = x.c * 2;
  const og = off.getContext("2d")!;
  paint({ ...x, g: og });
  x.g.filter = `blur(${px}px)`;
  x.g.drawImage(off, 0, 0);
  x.g.filter = "none";
}

/** Те же радиусы для резких колец неона, что и для их свечения. */
const ringCache = new Map<number, number>();
function seededRing(i: number, rnd: () => number): number {
  if (!ringCache.has(i)) ringCache.set(i, rnd());
  return ringCache.get(i)!;
}

const PAINT: Record<VinylStyle, (x: Ctx) => void> = {
  // Чёрная классика с цветными дорожками.
  classic(x) {
    fillDisc(x, "#0b0b0e");
    const { g, c, R, labelR, rnd, inks } = x;
    const bands = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < bands; i++) {
      const r = labelR + 20 + rnd() * (R - labelR - 40);
      g.strokeStyle = rgba(inks[i % 3]!, 0.35 + rnd() * 0.3);
      g.lineWidth = 6 + rnd() * 40;
      g.beginPath();
      g.arc(c, c, r, 0, TAU);
      g.stroke();
    }
  },

  // Прозрачный цветной винил одного цвета.
  solid(x) {
    const { g, c, R, labelR, inks } = x;
    const base = inks[0]!;
    const grad = g.createRadialGradient(c * 0.85, c * 0.8, labelR * 0.5, c, c, R);
    grad.addColorStop(0, rgba(shade(base, 0.25), 1));
    grad.addColorStop(0.6, rgba(base, 1));
    grad.addColorStop(1, rgba(shade(base, -0.45), 1));
    fillDisc(x, grad);
    for (let i = 0; i < 18; i++) blob(x, shade(base, x.rnd() < 0.5 ? 0.35 : -0.4), 0.18, R * 0.1, R * 0.4);
  },

  // Брызги краски разных цветов.
  splatter(x) {
    const { g, c, R, rnd, inks } = x;
    const base = inks[2]!;
    const grad = g.createRadialGradient(c, c, 0, c, c, R);
    grad.addColorStop(0, rgba(shade(base, 0.1), 1));
    grad.addColorStop(1, rgba(shade(base, -0.25), 1));
    fillDisc(x, grad);
    const colors = [inks[0]!, inks[1]!, shade(inks[0]!, -0.55), [250, 248, 240] as RGB];
    const count = 40 + Math.floor(rnd() * 40);
    for (let i = 0; i < count; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * R;
      const col = colors[Math.floor(rnd() * colors.length)]!;
      splat(x, c + Math.cos(a) * d, c + Math.sin(a) * d, R * (0.012 + rnd() * rnd() * 0.07), rgba(col, 0.75 + rnd() * 0.25));
    }
    // мелкая пыль
    for (let i = 0; i < 500; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * R;
      g.fillStyle = rgba(colors[Math.floor(rnd() * colors.length)]!, 0.8);
      g.beginPath();
      g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + rnd() * 2.5, 0, TAU);
      g.fill();
    }
  },

  // Мрамор / дым: мягкие облака двух цветов.
  marble(x) {
    const { g, R, rnd, inks } = x;
    fillDisc(x, rgba(shade(inks[0]!, -0.35), 1));
    blurred(x, 26, (y) => {
      for (let i = 0; i < 46; i++) {
        const col = i % 3 === 0 ? shade(inks[1]!, 0.15) : i % 3 === 1 ? shade(inks[0]!, 0.35) : shade(inks[0]!, -0.6);
        blob(y, col, 0.55, R * 0.08, R * 0.38);
      }
    });
    blurred(x, 5, ({ g }) => veins(g));
    function veins(g: CanvasRenderingContext2D) {
      // прожилки
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = rgba(shade(inks[1]!, 0.5), 0.25 + rnd() * 0.3);
        g.lineWidth = 2 + rnd() * 7;
        g.beginPath();
        let px = rnd() * R * 2;
        let py = rnd() * R * 2;
        g.moveTo(px, py);
        for (let k = 0; k < 5; k++) {
          const nx = px + (rnd() - 0.5) * R * 0.7;
          const ny = py + (rnd() - 0.5) * R * 0.7;
          g.quadraticCurveTo(px + (rnd() - 0.5) * R * 0.5, py + (rnd() - 0.5) * R * 0.5, nx, ny);
          px = nx;
          py = ny;
        }
        g.stroke();
      }
    }
  },

  // Две половинки разного цвета.
  split(x) {
    const { rnd, inks } = x;
    const a0 = rnd() * TAU;
    sector(x, a0, a0 + Math.PI, rgba(inks[0]!, 1));
    sector(x, a0 + Math.PI, a0 + TAU, rgba(shade(inks[1]!, -0.15), 1));
    blurred(x, 30, (y) => {
      for (let i = 0; i < 10; i++) blob(y, shade(inks[i % 2]!, -0.5), 0.25, x.R * 0.1, x.R * 0.3);
    });
  },

  // Вертушка: 4–8 цветных секторов.
  pinwheel(x) {
    const { rnd, inks } = x;
    const n = [4, 6, 8][Math.floor(rnd() * 3)]!;
    const a0 = rnd() * TAU;
    for (let i = 0; i < n; i++) {
      const col = i % 2 === 0 ? inks[0]! : inks[(i >> 1) % 2 === 0 ? 1 : 2]!;
      sector(x, a0 + (i / n) * TAU, a0 + ((i + 1) / n) * TAU, rgba(shade(col, i % 2 ? -0.2 : 0), 1));
    }
  },

  // Лучи из центра на тёмном.
  sunburst(x) {
    const { rnd, inks, dark } = x;
    fillDisc(x, rgba(dark, 1));
    const rays = 16 + Math.floor(rnd() * 24);
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * TAU;
      const a1 = a0 + TAU / rays / (1.4 + rnd() * 1.5);
      sector(x, a0, a1, rgba(inks[i % 3]!, 0.35 + rnd() * 0.4));
    }
  },

  // Галактика: тёмный космос, туманности и звёзды.
  galaxy(x) {
    const { g, c, R, rnd, inks } = x;
    fillDisc(x, "#07070d");
    blurred(x, 34, (y) => {
      for (let i = 0; i < 22; i++) blob(y, inks[i % 3]!, 0.5, R * 0.12, R * 0.45);
    });
    for (let i = 0; i < 900; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * R;
      const big = rnd() < 0.04;
      g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.65})`;
      g.beginPath();
      g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, big ? 2 + rnd() * 2.5 : 0.6 + rnd() * 1.1, 0, TAU);
      g.fill();
    }
  },

  // Тай-дай: спиральные рукава.
  spiral(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    fillDisc(x, rgba(shade(inks[2]!, -0.3), 1));
    const arms = 3 + Math.floor(rnd() * 3);
    const twist = 1.4 + rnd() * 1.6;
    blurred(x, 10, ({ g }) => {
      for (let k = 0; k < arms; k++) {
        g.strokeStyle = rgba(inks[k % 2]!, 0.85);
        g.lineCap = "round";
        for (let r = labelR * 0.8; r < R * 1.05; r += 3) {
          const a = (k / arms) * TAU + (r / R) * twist * TAU;
          g.lineWidth = 6 + (r / R) * 50;
          g.beginPath();
          g.arc(c, c, r, a, a + 0.35 + (r / R) * 0.5);
          g.stroke();
        }
      }
    });
  },

  // «Цвет в цвете»: центр одного цвета, края другого, граница размыта.
  colorInColor(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    fillDisc(x, rgba(inks[1]!, 1));
    const inner = labelR + (R - labelR) * (0.35 + rnd() * 0.3);
    blurred(x, 18, ({ g }) => {
      g.fillStyle = rgba(inks[0]!, 1);
      g.beginPath();
      // чуть неровная граница — как у залитого винила
      const pts = 40;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * TAU;
        const r = inner * (0.93 + rnd() * 0.14);
        if (i === 0) g.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
        else g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    });
  },
  // Рябь: волны цвета расходятся кругами.
  ripple(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    fillDisc(x, rgba(shade(inks[0]!, -0.5), 1));
    const k = 18 + rnd() * 30;
    for (let r = labelR; r < R; r += 2) {
      const t = 0.5 + 0.5 * Math.sin(r / k + Math.sin(r / (k * 3)) * 2);
      g.strokeStyle = rgba(t > 0.5 ? inks[1 % inks.length]! : inks[0]!, 0.25 + t * 0.6);
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(c + Math.sin(r / 40) * 3, c, r, 0, TAU);
      g.stroke();
    }
  },

  // Полосы-кольца всех цветов обложки, чёткие, как у слоёного винила.
  stripes(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    let r = R;
    let i = 0;
    while (r > labelR * 0.8) {
      const w = 14 + rnd() * 60;
      g.fillStyle = rgba(inks[i % inks.length]!, 1);
      g.beginPath();
      g.arc(c, c, r, 0, TAU);
      g.fill();
      r -= w;
      i++;
    }
  },

  // Цветовой круг: плавный переход по кругу через все цвета обложки.
  wheel(x) {
    const { g, c, rnd, inks } = x;
    const grad = g.createConicGradient(rnd() * TAU, c, c);
    inks.forEach((ink, i) => grad.addColorStop(i / inks.length, rgba(ink, 1)));
    grad.addColorStop(1, rgba(inks[0]!, 1));
    fillDisc(x, grad);
    const dark = g.createRadialGradient(c, c, 0, c, c, x.R);
    dark.addColorStop(0, "rgba(0,0,0,0.35)");
    dark.addColorStop(0.6, "rgba(0,0,0,0)");
    fillDisc(x, dark);
  },

  // Пятна «под леопарда»: светлая основа, пятна с тёмной каймой.
  leopard(x) {
    const { g, c, R, rnd, inks } = x;
    fillDisc(x, rgba(shade(inks[0]!, 0.15), 1));
    for (let i = 0; i < 140; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * R;
      const px = c + Math.cos(a) * d;
      const py = c + Math.sin(a) * d;
      const sz = R * (0.02 + rnd() * 0.035);
      g.fillStyle = rgba(shade(inks[1 % inks.length]!, -0.1), 0.9);
      g.beginPath();
      g.ellipse(px, py, sz, sz * (0.6 + rnd() * 0.5), rnd() * TAU, 0, TAU);
      g.fill();
      g.strokeStyle = rgba(shade(inks[2 % inks.length]!, -0.75), 0.9);
      g.lineWidth = sz * 0.35;
      g.beginPath();
      g.arc(px, py, sz * 1.1, rnd() * TAU, rnd() * TAU + 3.5);
      g.stroke();
    }
  },

  // Сетка точек, как на колонке: точки крупнее к краю.
  mesh(x) {
    const { g, c, R, inks } = x;
    fillDisc(x, rgba(shade(inks[0]!, -0.65), 1));
    const step = R / 26;
    for (let yy = -R; yy <= R; yy += step) {
      for (let xx = -R; xx <= R; xx += step) {
        const d = Math.hypot(xx, yy) / R;
        if (d > 1) continue;
        g.fillStyle = rgba(d > 0.66 ? inks[1 % inks.length]! : inks[0]!, 0.5 + d * 0.4);
        g.beginPath();
        g.arc(c + xx, c + yy, step * (0.12 + d * 0.28), 0, TAU);
        g.fill();
      }
    }
  },

  // Зигзаги-молнии по кругу.
  zigzag(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    fillDisc(x, rgba(x.dark, 1));
    const rings = 5 + Math.floor(rnd() * 5);
    for (let k = 0; k < rings; k++) {
      const r0 = labelR + ((R - labelR) * (k + 0.5)) / rings;
      const amp = ((R - labelR) / rings) * 0.35;
      const teeth = 24 + Math.floor(rnd() * 30);
      g.strokeStyle = rgba(inks[k % inks.length]!, 0.9);
      g.lineWidth = 4 + rnd() * 10;
      g.lineJoin = "miter";
      g.beginPath();
      for (let i = 0; i <= teeth * 2; i++) {
        const a = (i / (teeth * 2)) * TAU;
        const r = r0 + (i % 2 ? amp : -amp);
        const px = c + Math.cos(a) * r;
        const py = c + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
  },

  // Неон: тёмный диск и светящиеся тонкие кольца.
  neon(x) {
    const { c, R, labelR, rnd, inks } = x;
    fillDisc(x, "#06060a");
    blurred(x, 14, ({ g }) => {
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = rgba(inks[i % inks.length]!, 1);
        g.lineWidth = 6;
        g.beginPath();
        g.arc(c, c, labelR + 20 + rnd() * (R - labelR - 40), 0, TAU);
        g.stroke();
      }
    });
    const g = x.g;
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = rgba(shade(inks[i % inks.length]!, 0.6), 0.95);
      g.lineWidth = 2;
      g.beginPath();
      g.arc(c, c, labelR + 20 + seededRing(i, rnd) * (R - labelR - 40), 0, TAU);
      g.stroke();
    }
  },

  // Мозаика: осколки по кругу.
  mosaic(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    const rings = 7;
    for (let k = 0; k < rings; k++) {
      const r0 = labelR * 0.8 + ((R - labelR * 0.8) * k) / rings;
      const r1 = labelR * 0.8 + ((R - labelR * 0.8) * (k + 1)) / rings + 1;
      const n = 10 + k * 5;
      const off = rnd() * TAU;
      for (let i = 0; i < n; i++) {
        const a0 = off + (i / n) * TAU;
        const a1 = off + ((i + 1) / n) * TAU + 0.004;
        g.fillStyle = rgba(shade(inks[Math.floor(rnd() * inks.length)]!, (rnd() - 0.5) * 0.5), 1);
        g.beginPath();
        g.arc(c, c, r1, a0, a1);
        g.arc(c, c, r0, a1, a0, true);
        g.closePath();
        g.fill();
      }
    }
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 2;
    for (let k = 0; k <= rings; k++) {
      g.beginPath();
      g.arc(c, c, labelR * 0.8 + ((R - labelR * 0.8) * k) / rings, 0, TAU);
      g.stroke();
    }
  },

  // Акварель: полупрозрачные мазки с тёмным краем, как краска на бумаге.
  watercolor(x) {
    const { R, rnd, inks } = x;
    fillDisc(x, rgba(shade(inks[0]!, 0.75), 1));
    for (let i = 0; i < 9; i++) {
      blurred(x, 8 + rnd() * 10, (y) => blob(y, inks[i % inks.length]!, 0.55, R * 0.15, R * 0.5));
    }
  },

  // «Расплавленный»: цвет стекает от центра к краю каплями.
  melted(x) {
    const { g, c, R, labelR, rnd, inks } = x;
    fillDisc(x, rgba(shade(inks[1 % inks.length]!, -0.35), 1));
    g.fillStyle = rgba(inks[0]!, 1);
    g.beginPath();
    const n = 160;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const drip = Math.pow(Math.max(0, Math.sin(a * (5 + Math.floor(rnd() * 0)) + 1.3) * Math.sin(a * 3.7)), 3);
      const r = labelR * 1.4 + R * 0.12 + drip * (R * 0.5) + Math.sin(a * 11) * 6;
      const px = c + Math.cos(a) * r;
      const py = c + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.beginPath();
    g.arc(c - R * 0.15, c - R * 0.2, R * 0.25, 0, TAU);
    g.fill();
  },

  // Пластинка-картинка: обложка во весь диск (если обложки нет — цветной круг).
  picture(x) {
    const { g, c, R, img } = x;
    if (!img) return PAINT.wheel(x);
    g.drawImage(img, c - R, c - R, R * 2, R * 2);
    const sheen = g.createRadialGradient(c, c, R * 0.3, c, c, R);
    sheen.addColorStop(0, "rgba(0,0,0,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.45)");
    fillDisc(x, sheen);
  },

  // Дымчатый полупрозрачный винил: сквозь него просвечивает размытая обложка.
  smoke(x) {
    const { g, c, R, img, inks } = x;
    if (img) {
      g.filter = "blur(18px) saturate(1.3)";
      g.drawImage(img, c - R, c - R, R * 2, R * 2);
      g.filter = "none";
    } else fillDisc(x, rgba(inks[0]!, 1));
    fillDisc(x, rgba(shade(inks[0]!, -0.6), 0.45));
    for (let i = 0; i < 12; i++) blob(x, shade(inks[i % inks.length]!, -0.5), 0.25, R * 0.1, R * 0.4);
  },

};

/** Лёгкие узоры поверх основы (без заливки). Пустые — чтобы часть пластинок оставалась «чистой». */
const OVERLAYS: ((x: Ctx) => void)[] = [
  () => undefined,
  () => undefined,
  () => undefined,
  // крапинки
  ({ g, c, R, rnd, inks }) => {
    for (let i = 0; i < 400; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * R;
      g.fillStyle = rgba(rnd() < 0.3 ? [250, 248, 240] : inks[Math.floor(rnd() * inks.length)]!, 0.7);
      g.beginPath();
      g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + rnd() * 2.2, 0, TAU);
      g.fill();
    }
  },
  // светящиеся кольца
  (x) =>
    blurred(x, 10, ({ g }) => {
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = rgba(shade(x.inks[i % x.inks.length]!, 0.3), 0.8);
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x.c, x.c, x.labelR + 30 + x.rnd() * (x.R - x.labelR - 60), 0, TAU);
        g.stroke();
      }
    }),
  // прожилки
  (x) =>
    blurred(x, 3, ({ g }) => {
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = rgba(shade(x.inks[i % x.inks.length]!, 0.5), 0.35);
        g.lineWidth = 1.5 + x.rnd() * 3;
        g.beginPath();
        let px = x.rnd() * x.R * 2;
        let py = x.rnd() * x.R * 2;
        g.moveTo(px, py);
        for (let k = 0; k < 4; k++) {
          px += (x.rnd() - 0.5) * x.R * 0.6;
          py += (x.rnd() - 0.5) * x.R * 0.6;
          g.quadraticCurveTo(px + (x.rnd() - 0.5) * 80, py + (x.rnd() - 0.5) * 80, px, py);
        }
        g.stroke();
      }
    }),
];

export function drawVinyl(canvas: HTMLCanvasElement, seedKey: string, colors: VinylColors, size = 1024, img?: CanvasImageSource): void {
  ringCache.clear();
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const seed = hashSeed(seedKey);
  const rnd = seeded(seed);
  const c = size / 2;
  const R = size / 2;
  const labelR = R * 0.34;
  // Цвета — настоящие цвета обложки (до 6), а если их нет — акценты палитры.
  const base = colors.swatches && colors.swatches.length >= 3 ? colors.swatches : [colors.accent, colors.accent2, colors.accent3];
  const inks: RGB[] = base.map(hexToRgb);
  // порядок цветов тоже свой у каждого трека
  for (let i = inks.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [inks[i], inks[j]] = [inks[j]!, inks[i]!];
  }
  const x: Ctx = {
    g,
    c,
    R,
    labelR,
    rnd,
    inks,
    dark: shade(hexToRgb(colors.bg), -0.6),
    img,
  };
  const style = vinylStyleFor(seed);

  g.clearRect(0, 0, size, size);
  g.save();
  g.beginPath();
  g.arc(c, c, R, 0, TAU);
  g.clip();

  PAINT[style](x);
  // Иногда поверх основы — второй, лёгкий узор: так видов в разы больше.
  if (style !== "picture") OVERLAYS[Math.floor(rnd() * OVERLAYS.length)]!(x);

  // Бороздки поверх цвета: тонкие кольца, цвет под ними остаётся.
  const grooveFrom = labelR + R * 0.05; // гладкая полоска у наклейки, как у настоящих
  for (let r = grooveFrom; r < R * 0.975; r += 1.6) {
    g.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.02 + rnd() * 0.035})` : `rgba(0,0,0,${0.06 + rnd() * 0.1})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(c, c, r, 0, TAU);
    g.stroke();
  }
  // Паузы между песнями.
  for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
    const r = grooveFrom + 20 + rnd() * (R * 0.95 - grooveFrom - 40);
    g.strokeStyle = "rgba(0,0,0,0.28)";
    g.lineWidth = 2 + rnd() * 2;
    g.beginPath();
    g.arc(c, c, r, 0, TAU);
    g.stroke();
  }
  // Объём: края темнее, как у настоящего диска.
  const vign = g.createRadialGradient(c, c, R * 0.55, c, c, R);
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = vign;
  g.fillRect(0, 0, size, size);
  // Кромка
  g.strokeStyle = "rgba(255,255,255,0.16)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(c, c, R * 0.992, 0, TAU);
  g.stroke();
  g.restore();
}
