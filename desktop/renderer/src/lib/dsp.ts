// Обработка звука для визуализации: полосы спектра, биты, тряска.
// Всё зависит от dt (времени кадра), поэтому выглядит одинаково на 60 и 144 Гц.

/** Логарифмические полосы спектра (как слышит ухо): 0…1. */
export function logBands(
  fft: Uint8Array,
  sampleRate: number,
  count: number,
  out: Float32Array = new Float32Array(count),
  minHz = 32,
  maxHz = 16000,
): Float32Array {
  const nyquist = sampleRate / 2;
  const binHz = nyquist / fft.length;
  const ratio = maxHz / minHz;
  for (let i = 0; i < count; i++) {
    const f0 = minHz * ratio ** (i / count);
    const f1 = minHz * ratio ** ((i + 1) / count);
    let b0 = Math.floor(f0 / binHz);
    let b1 = Math.max(b0 + 1, Math.ceil(f1 / binHz));
    b0 = Math.min(b0, fft.length - 1);
    b1 = Math.min(b1, fft.length);
    let sum = 0;
    let peak = 0;
    for (let b = b0; b < b1; b++) {
      const v = fft[b]!;
      sum += v;
      if (v > peak) peak = v;
    }
    const avg = sum / Math.max(1, b1 - b0);
    // Смесь среднего и пика: живее на высоких, не дёргается на низких.
    out[i] = (avg * 0.6 + peak * 0.4) / 255;
  }
  return out;
}

/** Средняя громкость в диапазоне частот, 0…1. */
export function bandEnergy(fft: Uint8Array, sampleRate: number, fromHz: number, toHz: number): number {
  const binHz = sampleRate / 2 / fft.length;
  const b0 = Math.max(0, Math.floor(fromHz / binHz));
  const b1 = Math.min(fft.length, Math.max(b0 + 1, Math.ceil(toHz / binHz)));
  let sum = 0;
  for (let b = b0; b < b1; b++) sum += fft[b]!;
  return sum / (b1 - b0) / 255;
}

/** Плавное приближение к цели, не зависящее от частоты кадров. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * Детектор битов: удар — когда энергия баса заметно выше её скользящего среднего.
 * sensitivity 0…1: выше — ловит более слабые удары.
 */
export class BeatDetector {
  private avg = 0;
  private lastBeat = -Infinity;
  sensitivity: number;

  constructor(sensitivity = 0.5) {
    this.sensitivity = sensitivity;
  }

  private started = false;

  push(energy: number, t: number, dt: number): boolean {
    // Первый кадр задаёт уровень, иначе «ударом» показался бы сам старт трека.
    if (!this.started) {
      this.started = true;
      this.avg = energy;
      return false;
    }
    const threshold = 1.12 + (1 - this.sensitivity) * 0.6;
    const minEnergy = 0.12 - this.sensitivity * 0.08;
    const beat = energy > this.avg * threshold && energy > minEnergy && t - this.lastBeat > 0.16;
    this.avg = damp(this.avg, energy, 1.6, dt);
    if (beat) this.lastBeat = t;
    return beat;
  }

  reset(): void {
    this.started = false;
    this.avg = 0;
    this.lastBeat = -Infinity;
  }
}

// Гладкий псевдошум из суммы синусов с «некратными» частотами.
function noise(t: number, seed: number): number {
  return (
    Math.sin(t * 1.0 + seed) * 0.5 +
    Math.sin(t * 2.31 + seed * 1.7) * 0.3 +
    Math.sin(t * 4.13 + seed * 2.9) * 0.2
  );
}

export interface ShakeOffset {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

/** Тряска «как в играх»: удар добавляет «травму», она плавно затухает. */
export class Shaker {
  trauma = 0;

  hit(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number, t: number, opts: { intensity: number; rotation: boolean; zoom: boolean }): ShakeOffset {
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    const s = this.trauma * this.trauma;
    const amp = 26 * opts.intensity;
    const f = t * 28;
    return {
      x: amp * s * noise(f, 1.3),
      y: amp * s * noise(f, 7.7),
      rotate: opts.rotation ? 3.2 * opts.intensity * s * noise(f, 4.1) : 0,
      scale: opts.zoom ? 1 + 0.045 * opts.intensity * s : 1,
    };
  }
}

/** Детерминированный генератор случайных чисел (одна строка — одна раскладка слов). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BurstWord {
  text: string;
  time: number;
  x: number; // 0…1 от ширины
  y: number; // 0…1 от высоты
  size: number; // px
  rotate: number; // градусы
  style: 0 | 1 | 2; // заливка / контур / акцент
}

/**
 * Раскладка слов для режима «Взрыв»: случайные места, без наложений,
 * в стороне от центральной зоны (там обложка).
 */
export function layoutBurst(
  words: { text: string; time: number }[],
  seed: number,
  width: number,
  height: number,
  baseSize: number,
): BurstWord[] {
  const rnd = seeded(seed * 9973 + words.length);
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const out: BurstWord[] = [];
  const hole = { x0: width * 0.36, x1: width * 0.64, y0: height * 0.28, y1: height * 0.72 };
  const hit = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) =>
    a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

  for (const w of words) {
    const long = w.text.length > 7;
    let size = baseSize * (long ? 0.7 + rnd() * 0.5 : 0.85 + rnd() * 1.1);
    let best: BurstWord | undefined;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (attempt > 0 && attempt % 12 === 0) size *= 0.82;
      const bw = w.text.length * size * 0.62 + 12;
      const bh = size * 1.15;
      const x = 24 + rnd() * Math.max(1, width - bw - 48);
      const y = 70 + rnd() * Math.max(1, height - bh - 160);
      const box = { x0: x, y0: y, x1: x + bw, y1: y + bh };
      const candidate: BurstWord = {
        text: w.text,
        time: w.time,
        x: (x + bw / 2) / width,
        y: (y + bh / 2) / height,
        size,
        rotate: (rnd() - 0.5) * 22,
        style: rnd() < 0.18 ? 1 : rnd() < 0.3 ? 2 : 0,
      };
      if (!hit(box, hole) && !placed.some((p) => hit(p, box))) {
        placed.push(box);
        best = candidate;
        break;
      }
      best ??= candidate;
    }
    out.push(best!);
  }
  return out;
}
