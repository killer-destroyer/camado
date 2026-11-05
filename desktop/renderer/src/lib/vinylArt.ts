// Узор пластинки: рисуется один раз на трек, по «отпечатку» трека — у каждой песни свой,
// но у одной и той же песни всегда одинаковый. Цвета — из обложки.
import { seeded } from "./dsp";
import { hexToRgb } from "./palettes";

export interface VinylColors {
  bg: string;
  accent: string;
  accent2: string;
  accent3: string;
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

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export type VinylStyle = "rings" | "sunburst" | "marble" | "split" | "halo";
export const VINYL_STYLES: VinylStyle[] = ["rings", "sunburst", "marble", "split", "halo"];

/** Какой стиль узора достанется треку (для тестов и подписи). */
export function vinylStyleFor(seed: number): VinylStyle {
  return VINYL_STYLES[seed % VINYL_STYLES.length]!;
}

export function drawVinyl(canvas: HTMLCanvasElement, seedKey: string, colors: VinylColors, size = 1024): void {
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const seed = hashSeed(seedKey);
  const rnd = seeded(seed);
  const c = size / 2;
  const R = size / 2;
  const labelR = R * 0.34;
  const inks = [colors.accent, colors.accent2, colors.accent3];
  const style = vinylStyleFor(seed);

  g.clearRect(0, 0, size, size);
  g.save();
  g.beginPath();
  g.arc(c, c, R, 0, Math.PI * 2);
  g.clip();

  // Основа: очень тёмная, с оттенком обложки.
  const base = g.createRadialGradient(c, c, labelR, c, c, R);
  base.addColorStop(0, "#0d0d10");
  base.addColorStop(0.55, "#09090b");
  base.addColorStop(1, rgba(colors.bg, 1));
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  // Цветной слой — свой для каждого стиля.
  g.globalCompositeOperation = "screen";
  if (style === "sunburst") {
    const rays = 18 + Math.floor(rnd() * 30);
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / rays / (1.6 + rnd() * 2);
      g.fillStyle = rgba(inks[i % 3]!, 0.08 + rnd() * 0.14);
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, R, a0, a1);
      g.closePath();
      g.fill();
    }
  } else if (style === "marble") {
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2;
      const r = labelR + rnd() * (R - labelR);
      const len = 0.05 + rnd() * 0.35;
      g.strokeStyle = rgba(inks[Math.floor(rnd() * 3)]!, 0.05 + rnd() * 0.2);
      g.lineWidth = 2 + rnd() * 14;
      g.beginPath();
      g.arc(c, c, r, a, a + len);
      g.stroke();
    }
  } else if (style === "split") {
    const a0 = rnd() * Math.PI * 2;
    for (let k = 0; k < 2; k++) {
      g.fillStyle = rgba(inks[k]!, 0.22);
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, R, a0 + k * Math.PI, a0 + (k + 1) * Math.PI);
      g.closePath();
      g.fill();
    }
  } else if (style === "halo") {
    const halo = g.createRadialGradient(c, c, labelR, c, c, R);
    halo.addColorStop(0, rgba(colors.accent, 0.55));
    halo.addColorStop(0.45, rgba(colors.accent2, 0.18));
    halo.addColorStop(1, rgba(colors.accent3, 0.4));
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);
  }

  // Цветные дорожки-кольца (есть во всех стилях, но разные).
  const bands = 2 + Math.floor(rnd() * 4);
  for (let i = 0; i < bands; i++) {
    const r = labelR + 12 + rnd() * (R - labelR - 30);
    g.strokeStyle = rgba(inks[i % 3]!, 0.18 + rnd() * 0.35);
    g.lineWidth = 3 + rnd() * (style === "rings" ? 46 : 18);
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalCompositeOperation = "source-over";

  // Бороздки: сотни тонких колец разной яркости — именно они делают «винил».
  for (let r = labelR + 6; r < R * 0.985; r += 1.7) {
    const light = rnd() < 0.5;
    g.strokeStyle = light ? `rgba(255,255,255,${0.018 + rnd() * 0.035})` : `rgba(0,0,0,${0.12 + rnd() * 0.18})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.stroke();
  }
  // Пустые «паузы между песнями» на пластинке.
  for (let i = 0; i < 4; i++) {
    const r = labelR + 30 + rnd() * (R - labelR - 60);
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 2 + rnd() * 3;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.stroke();
  }
  // Кромка
  g.strokeStyle = "rgba(255,255,255,0.12)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(c, c, R * 0.992, 0, Math.PI * 2);
  g.stroke();
  // Тёмный ободок вокруг наклейки
  g.fillStyle = "#050506";
  g.beginPath();
  g.arc(c, c, labelR + 6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
