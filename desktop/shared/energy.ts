// Темп и энергия песни — чтобы «Моя волна» подбирала под настроение и твои треки («бодро», «спокойно», «учёба»).
// Считается на компьютере из уже раскодированного звука: огибающая громкости → удары (онсеты) → темп по автокорреляции.

export interface TrackEnergy {
  /** Удары в минуту (60–180). */
  bpm: number;
  /** 0 — тихо и спокойно, 1 — громко, плотно, быстро. */
  e: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** samples — моно; sr — частота. Берём до 4 минут из середины песни. */
export function tempoEnergy(samples: Float32Array, sr: number): TrackEnergy | undefined {
  const hop = Math.max(1, Math.round(sr * 0.0116)); // ~11.6 мс
  const maxLen = sr * 240;
  const start = samples.length > maxLen ? Math.floor((samples.length - maxLen) / 2) : 0;
  const end = Math.min(samples.length, start + maxLen);
  const frames = Math.floor((end - start) / hop);
  if (frames < 600) return undefined; // меньше ~7 секунд — не мерим
  const env = new Float32Array(frames);
  let loudSum = 0;
  for (let f = 0; f < frames; f++) {
    let e = 0;
    const a = start + f * hop;
    for (let i = a; i < a + hop; i += 2) e += samples[i]! * samples[i]!;
    const ms = e / (hop / 2);
    loudSum += ms;
    env[f] = Math.log10(1e-6 + ms);
  }
  // онсеты: рост громкости кадр к кадру (только вверх)
  const on = new Float32Array(frames);
  let onSum = 0;
  for (let f = 1; f < frames; f++) {
    const d = env[f]! - env[f - 1]!;
    on[f] = d > 0 ? d : 0;
    onSum += on[f]!;
  }
  const mean = onSum / frames;
  for (let f = 0; f < frames; f++) on[f] = on[f]! - mean;
  // автокорреляция на лагах 60–180 ударов в минуту, лёгкий приоритет около 120
  const fps = sr / hop;
  const minLag = Math.floor((fps * 60) / 180);
  const maxLag = Math.ceil((fps * 60) / 60);
  let best = 0;
  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let f = 0; f + lag < frames; f++) s += on[f]! * on[f + lag]!;
    const bpm = (60 * fps) / lag;
    const w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (s * w > best) {
      best = s * w;
      bestLag = lag;
    }
  }
  const bpm = Math.round((60 * fps) / bestLag);
  const loudDb = 10 * Math.log10(1e-9 + loudSum / frames);
  // энергия: громкость (−30…−8 дБ), плотность ударов и темп
  const e = clamp01(0.4 * clamp01((loudDb + 30) / 22) + 0.4 * clamp01(mean / 0.06) + 0.2 * clamp01((bpm - 70) / 90));
  return { bpm, e: Math.round(e * 100) / 100 };
}

/** Подходит ли трек к настроению (по энергии). Неизвестная энергия — только для «под меня» и «нового». */
export function fitsMood(mood: string, en: TrackEnergy | undefined): boolean {
  if (mood === "mine" || mood === "new") return true;
  if (!en) return false;
  if (mood === "energy") return en.e >= 0.55;
  if (mood === "calm") return en.e <= 0.45;
  if (mood === "study") return en.e <= 0.5;
  return true;
}
