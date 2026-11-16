// Фоновые звуки для учёбы: дождь, гроза, кафе, шумы, камин, лес, ветер, море, поезд, мурчание.
// Всё синтезируется на лету — без файлов, каждый раз чуть по-разному, ничего не повторяется по кругу.
// Звук идёт через общую громкость Камадо, но мимо визуализатора: волны и тряска — только от музыки.
import { engine } from "./audio";

export interface AmbienceSound {
  id: string;
  name: string;
}

export const AMBIENCE: AmbienceSound[] = [
  { id: "rain", name: "Дождь" },
  { id: "storm", name: "Гроза" },
  { id: "cafe", name: "Кафе" },
  { id: "fire", name: "Камин" },
  { id: "forest", name: "Лес" },
  { id: "wind", name: "Ветер" },
  { id: "ocean", name: "Море" },
  { id: "train", name: "Поезд" },
  { id: "purr", name: "Котик" },
  { id: "white", name: "Белый шум" },
  { id: "pink", name: "Розовый шум" },
  { id: "brown", name: "Коричневый шум" },
];

type Kind = "white" | "pink" | "brown";
const buffers = new Map<Kind, AudioBuffer>();

/** 6 секунд шума нужного «цвета» (готовим один раз). */
function noise(ctx: AudioContext, kind: Kind): AudioBuffer {
  const have = buffers.get(kind);
  if (have && have.sampleRate === ctx.sampleRate) return have;
  const len = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.5;
      else if (kind === "pink") {
        // фильтр Пола Келлета: −3 дБ на октаву
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // мягкий стык, чтобы петля не щёлкала
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i]! * k + d[len - fade + i]! * (1 - k);
    }
  }
  buffers.set(kind, buf);
  return buf;
}

function loop(ctx: AudioContext, kind: Kind, out: AudioNode): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, kind);
  src.loop = true;
  src.loopEnd = src.buffer.duration - 0.05;
  src.connect(out);
  src.start(0, Math.random() * 5);
  return src;
}

function filter(ctx: AudioContext, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Медленное «дыхание» параметра: громкость волн, порывы ветра. */
function lfo(ctx: AudioContext, target: AudioParam, rate: number, depth: number): OscillatorNode {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = rate;
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

interface Voice {
  out: GainNode;
  stop(): void;
}

/** Повторять событие (капля, треск, птица) со случайными паузами, пока звук включён. */
function every(ctx: AudioContext, minS: number, maxS: number, fire: (t: number) => void): () => void {
  let next = ctx.currentTime + Math.random() * maxS;
  const id = window.setInterval(() => {
    while (next < ctx.currentTime + 0.3) {
      fire(next);
      next += minS + Math.random() * (maxS - minS);
    }
  }, 100);
  return () => clearInterval(id);
}

function burst(ctx: AudioContext, out: AudioNode, t: number, dur: number, gain: number, f: number, type: BiquadFilterType = "bandpass", q = 1): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, "white");
  const flt = filter(ctx, type, f, q);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt).connect(g).connect(out);
  src.start(t, Math.random() * 5, dur + 0.05);
}

function chirp(ctx: AudioContext, out: AudioNode, t: number, f0: number, f1: number, dur: number, gain: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

type Builder = (ctx: AudioContext, out: GainNode) => () => void;

export const BUILD: Record<string, Builder> = {
  white(ctx, out) {
    const s = loop(ctx, "white", out);
    return () => s.stop();
  },
  pink(ctx, out) {
    const s = loop(ctx, "pink", out);
    return () => s.stop();
  },
  brown(ctx, out) {
    const s = loop(ctx, "brown", out);
    return () => s.stop();
  },
  rain(ctx, out) {
    // шелест + отдельные капли по подоконнику
    const hiss = filter(ctx, "bandpass", 2400, 0.4);
    const hg = ctx.createGain();
    hg.gain.value = 0.5;
    hiss.connect(hg).connect(out);
    const s = loop(ctx, "pink", hiss);
    const l = lfo(ctx, hg.gain, 0.07, 0.12);
    const stopDrops = every(ctx, 0.02, 0.12, (t) => burst(ctx, out, t, 0.02 + Math.random() * 0.03, 0.05 + Math.random() * 0.12, 2500 + Math.random() * 4000, "bandpass", 3));
    return () => {
      s.stop();
      l.stop();
      stopDrops();
    };
  },
  storm(ctx, out) {
    const stopRain = BUILD.rain!(ctx, out);
    // далёкий гром: низкий гул, нарастает и раскатывается
    const stopThunder = every(ctx, 9, 22, (t) => {
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx, "brown");
      const lp = filter(ctx, "lowpass", 160 + Math.random() * 120);
      const g = ctx.createGain();
      const dur = 3 + Math.random() * 4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.25 + Math.random() * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(lp).connect(g).connect(out);
      src.start(t, Math.random() * 3, dur + 0.1);
    });
    return () => {
      stopRain();
      stopThunder();
    };
  },
  cafe(ctx, out) {
    // гул голосов: «бубнёж» в полосе речи, плавающий по громкости
    const band = filter(ctx, "bandpass", 700, 0.6);
    const g = ctx.createGain();
    g.gain.value = 0.55;
    band.connect(g).connect(out);
    const s = loop(ctx, "pink", band);
    const l1 = lfo(ctx, g.gain, 0.9, 0.12);
    const l2 = lfo(ctx, band.frequency, 0.13, 220);
    // звон чашек и ложечек
    const stopClinks = every(ctx, 2.5, 8, (t) => {
      const f = 2200 + Math.random() * 2600;
      chirp(ctx, out, t, f, f * 0.995, 0.35 + Math.random() * 0.3, 0.025);
      if (Math.random() < 0.5) chirp(ctx, out, t + 0.09, f * 1.33, f * 1.32, 0.25, 0.015);
    });
    return () => {
      s.stop();
      l1.stop();
      l2.stop();
      stopClinks();
    };
  },
  fire(ctx, out) {
    // ровный гул пламени + треск поленьев
    const lp = filter(ctx, "lowpass", 500);
    const g = ctx.createGain();
    g.gain.value = 0.7;
    lp.connect(g).connect(out);
    const s = loop(ctx, "brown", lp);
    const l = lfo(ctx, g.gain, 0.3, 0.15);
    const stopCrackle = every(ctx, 0.04, 0.35, (t) => {
      burst(ctx, out, t, 0.004 + Math.random() * 0.01, 0.15 + Math.random() * 0.35, 1800 + Math.random() * 5000, "highpass", 0.7);
      if (Math.random() < 0.06) burst(ctx, out, t, 0.05, 0.5, 900, "bandpass", 2); // хлопок
    });
    return () => {
      s.stop();
      l.stop();
      stopCrackle();
    };
  },
  forest(ctx, out) {
    // тихий ветер в листве + птицы
    const bp = filter(ctx, "bandpass", 1200, 0.5);
    const g = ctx.createGain();
    g.gain.value = 0.18;
    bp.connect(g).connect(out);
    const s = loop(ctx, "pink", bp);
    const l = lfo(ctx, g.gain, 0.09, 0.08);
    const stopBirds = every(ctx, 0.8, 4.5, (t) => {
      const base = 2200 + Math.random() * 2500;
      const notes = 2 + Math.floor(Math.random() * 5);
      for (let i = 0; i < notes; i++) {
        const up = Math.random() < 0.5;
        chirp(ctx, out, t + i * (0.09 + Math.random() * 0.05), up ? base : base * 1.4, up ? base * 1.45 : base * 0.9, 0.07 + Math.random() * 0.06, 0.035);
      }
    });
    return () => {
      s.stop();
      l.stop();
      stopBirds();
    };
  },
  wind(ctx, out) {
    const bp = filter(ctx, "bandpass", 500, 1.2);
    const g = ctx.createGain();
    g.gain.value = 0.7;
    bp.connect(g).connect(out);
    const s = loop(ctx, "brown", bp);
    const l1 = lfo(ctx, bp.frequency, 0.06, 280);
    const l2 = lfo(ctx, g.gain, 0.11, 0.35);
    return () => {
      s.stop();
      l1.stop();
      l2.stop();
    };
  },
  ocean(ctx, out) {
    // волна накатывает и отступает каждые ~8 секунд
    const lp = filter(ctx, "lowpass", 900);
    const g = ctx.createGain();
    g.gain.value = 0.45;
    lp.connect(g).connect(out);
    const s = loop(ctx, "pink", lp);
    const l1 = lfo(ctx, g.gain, 0.12, 0.4);
    const l2 = lfo(ctx, lp.frequency, 0.12, 600);
    return () => {
      s.stop();
      l1.stop();
      l2.stop();
    };
  },
  train(ctx, out) {
    // гул вагона + «тук-тук… тук-тук» на стыках рельсов
    const lp = filter(ctx, "lowpass", 220);
    const g = ctx.createGain();
    g.gain.value = 0.8;
    lp.connect(g).connect(out);
    const s = loop(ctx, "brown", lp);
    const stopClack = every(ctx, 1.05, 1.15, (t) => {
      for (const [dt, k] of [
        [0, 1],
        [0.16, 0.8],
      ] as const) {
        burst(ctx, out, t + dt, 0.06, 0.35 * k, 320, "bandpass", 1.5);
        burst(ctx, out, t + dt, 0.03, 0.12 * k, 2400, "bandpass", 2);
      }
    });
    return () => {
      s.stop();
      stopClack();
    };
  },
  purr(ctx, out) {
    // мурчание: низкий шум, «пульсирующий» ~25 раз в секунду, вдох-выдох
    const lp = filter(ctx, "lowpass", 380);
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const breath = ctx.createGain();
    breath.gain.value = 0.7;
    lp.connect(am).connect(breath).connect(out);
    const s = loop(ctx, "brown", lp);
    const l1 = lfo(ctx, am.gain, 24, 0.45);
    const l2 = lfo(ctx, breath.gain, 0.4, 0.25);
    return () => {
      s.stop();
      l1.stop();
      l2.stop();
    };
  },
};

/** Выравнивание: замерено отрисовкой каждого звука, чтобы одинаковый ползунок = одинаковая громкость (~−20 дБ). */
const TRIM: Record<string, number> = {
  white: 0.35,
  pink: 0.52,
  brown: 0.49,
  rain: 1.8,
  storm: 1.7,
  cafe: 2,
  fire: 0.7,
  forest: 2.4,
  wind: 1.3,
  ocean: 0.8,
  train: 0.7,
  purr: 1.1,
};

const voices = new Map<string, Voice>();
let bus: GainNode | undefined;

function busNode(): GainNode {
  const ctx = engine.context();
  if (!bus) {
    bus = ctx.createGain();
    bus.connect(engine.output());
  }
  return bus;
}

/** Общая громкость фона (0…1). */
export function setAmbienceVolume(v: number): void {
  const ctx = engine.context();
  busNode().gain.setTargetAtTime(Math.max(0, Math.min(1, v)) ** 2, ctx.currentTime, 0.1);
}

/** Включить/подстроить звуки: уровень 0 — выключен. Плавно, без щелчков. */
export function setAmbience(levels: Record<string, number>): void {
  const ctx = engine.context();
  const out = busNode();
  for (const s of AMBIENCE) {
    const level = Math.max(0, Math.min(1, levels[s.id] ?? 0));
    const v = voices.get(s.id);
    if (level > 0 && !v) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(out);
      const stop = BUILD[s.id]!(ctx, g);
      g.gain.setTargetAtTime(level * level * (TRIM[s.id] ?? 1), ctx.currentTime, 0.6);
      voices.set(s.id, { out: g, stop });
    } else if (level > 0 && v) {
      v.out.gain.setTargetAtTime(level * level * (TRIM[s.id] ?? 1), ctx.currentTime, 0.15);
    } else if (level === 0 && v) {
      voices.delete(s.id);
      v.out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => {
        v.stop();
        v.out.disconnect();
      }, 1600);
    }
  }
}

export const ambiencePlaying = () => voices.size > 0;
