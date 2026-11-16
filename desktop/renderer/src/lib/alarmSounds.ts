// Звуки напоминаний. Все десять синтезируются прямо здесь — без файлов и без чужих записей.
// Будильник играет по кругу и плавно становится громче (как на Samsung), пока его не остановят.
import { volumeCurve } from "./audio";

export interface AlarmSound {
  id: string;
  name: string;
  hint: string;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: "marimba", name: "Маримба", hint: "мягкий будильник" },
  { id: "chime", name: "Колокольчик", hint: "чисто и спокойно" },
  { id: "sunrise", name: "Рассвет", hint: "нежные аккорды" },
  { id: "drops", name: "Капли", hint: "вода по стеклу" },
  { id: "classic", name: "Классика", hint: "пи-пи-пи" },
  { id: "retro", name: "8-бит", hint: "как в старой игре" },
  { id: "phonk", name: "Фонк", hint: "ковбелл и 808" },
  { id: "horn", name: "Горн", hint: "мем: ду-ду-дуууу" },
  { id: "boom", name: "Бум", hint: "мем: драматичный бум" },
  { id: "siren", name: "Тревога", hint: "точно проснёшься" },
];

type Pattern = (ctx: AudioContext, out: AudioNode, t: number) => number; // возвращает длину в секундах

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

function tone(
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  freq: number,
  dur: number,
  { type = "sine" as OscillatorType, gain = 0.3, attack = 0.005, glideTo = 0 } = {},
): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noise: AudioBuffer | undefined;
function noiseBurst(ctx: AudioContext, out: AudioNode, t: number, dur: number, gain: number, hp = 6000): void {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Колокол: несколько негармоничных обертонов с долгим затуханием. */
function bell(ctx: AudioContext, out: AudioNode, t: number, f: number, gain = 0.22): void {
  [1, 2.76, 5.4, 8.93].forEach((k, i) =>
    tone(ctx, out, t, f * k, 2.4 / (i + 1), {
      gain: gain / (i + 1.3),
      attack: 0.003,
    }),
  );
}

/** Ковбелл как в фонке: два квадрата через полосовой фильтр. */
function cowbell(ctx: AudioContext, out: AudioNode, t: number, pitch = 1, gain = 0.16): void {
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 2600 * pitch;
  f.Q.value = 1.2;
  f.connect(out);
  for (const base of [540, 800])
    tone(ctx, f, t, base * pitch, 0.32, {
      type: "square",
      gain,
      attack: 0.002,
    });
}

function kick808(ctx: AudioContext, out: AudioNode, t: number, gain = 0.6): void {
  tone(ctx, out, t, 150, 0.6, { gain, attack: 0.002, glideTo: 42 });
}

const PATTERNS: Record<string, Pattern> = {
  marimba(ctx, out, t) {
    const notes = [72, 76, 79, 84, 79, 76];
    notes.forEach((n, i) => {
      tone(ctx, out, t + i * 0.16, midi(n), 0.5, { gain: 0.3 });
      tone(ctx, out, t + i * 0.16, midi(n) * 4, 0.12, { gain: 0.05 });
    });
    return 1.9;
  },
  chime(ctx, out, t) {
    bell(ctx, out, t, midi(88));
    bell(ctx, out, t + 0.45, midi(83));
    return 2.6;
  },
  sunrise(ctx, out, t) {
    const chord = [60, 64, 67, 71, 74];
    chord.forEach((n, i) =>
      tone(ctx, out, t + i * 0.22, midi(n + 12), 2.2, {
        type: "triangle",
        gain: 0.12,
        attack: 0.15,
      }),
    );
    tone(ctx, out, t, midi(48), 3, { gain: 0.1, attack: 0.4 });
    return 3.4;
  },
  drops(ctx, out, t) {
    const at = [0, 0.18, 0.5, 0.62, 0.95];
    at.forEach((dt, i) => {
      const f = 900 + ((i * 337) % 700);
      tone(ctx, out, t + dt, f, 0.18, {
        gain: 0.32,
        attack: 0.002,
        glideTo: f * 0.45,
      });
    });
    return 1.6;
  },
  classic(ctx, out, t) {
    for (let i = 0; i < 4; i++)
      tone(ctx, out, t + i * 0.14, 2050, 0.09, {
        type: "square",
        gain: 0.12,
        attack: 0.002,
      });
    return 1.1;
  },
  retro(ctx, out, t) {
    const notes = [72, 76, 79, 84, 88, 91];
    notes.forEach((n, i) =>
      tone(ctx, out, t + i * 0.07, midi(n), 0.12, {
        type: "square",
        gain: 0.09,
        attack: 0.002,
      }),
    );
    tone(ctx, out, t + 0.5, midi(96), 0.35, {
      type: "square",
      gain: 0.08,
      attack: 0.002,
    });
    return 1.3;
  },
  phonk(ctx, out, t) {
    // 130 BPM, такт из 16 шестнадцатых: ковбелл-мелодия, 808 и хай-хэты.
    const s = 60 / 130 / 4;
    const bell = [0, 3, 6, 8, 10, 12, 14];
    const pitch = [1, 1, 1.19, 1, 0.89, 1, 1.33];
    bell.forEach((step, i) => cowbell(ctx, out, t + step * s, pitch[i]!));
    [0, 7, 10].forEach((step) => kick808(ctx, out, t + step * s));
    for (let i = 0; i < 16; i += 2) noiseBurst(ctx, out, t + i * s, 0.05, i % 4 === 2 ? 0.08 : 0.04);
    noiseBurst(ctx, out, t + 4 * s, 0.18, 0.12, 1800);
    noiseBurst(ctx, out, t + 12 * s, 0.18, 0.12, 1800);
    return 16 * s;
  },
  horn(ctx, out, t) {
    // «Ду-ду-дуууу»: аккорд пилой с лёгким дрожанием.
    const hit = (start: number, dur: number) => {
      for (const n of [57, 61, 64, 69]) {
        const o = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        lfo.frequency.value = 6;
        lfoGain.gain.value = 4;
        lfo.connect(lfoGain).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.06, start + 0.03);
        g.gain.setValueAtTime(0.06, start + dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g).connect(out);
        o.start(start);
        lfo.start(start);
        o.stop(start + dur + 0.05);
        lfo.stop(start + dur + 0.05);
      }
    };
    hit(t, 0.16);
    hit(t + 0.22, 0.16);
    hit(t + 0.44, 0.9);
    return 2;
  },
  boom(ctx, out, t) {
    tone(ctx, out, t, 95, 1.6, { gain: 0.7, attack: 0.004, glideTo: 38 });
    tone(ctx, out, t, 190, 0.5, { gain: 0.18, attack: 0.004, glideTo: 60 });
    noiseBurst(ctx, out, t, 0.25, 0.25, 200);
    return 2.2;
  },
  siren(ctx, out, t) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sawtooth";
    f.type = "lowpass";
    f.frequency.value = 2400;
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(1250, t + 0.5);
    o.frequency.linearRampToValueAtTime(620, t + 1);
    o.frequency.linearRampToValueAtTime(1250, t + 1.5);
    o.frequency.linearRampToValueAtTime(620, t + 2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
    g.gain.setValueAtTime(0.1, t + 1.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + 2.05);
    return 2.15;
  },
};

interface Playing {
  ctx: AudioContext;
  master: GainNode;
  timer?: number;
  el?: HTMLAudioElement;
  rampTimer?: number;
}

let cur: Playing | undefined;

export interface AlarmOptions {
  sound: string;
  /** Секунды, за которые звук нарастает от еле слышного до полной громкости. 0 — сразу. */
  ramp: number;
  volume: number; // 0…1, как ползунок
  customUrl?: string;
  /** Сыграть один раз (проверка звука, конец фокуса), а не по кругу. */
  once?: boolean;
}

export function stopAlarm(): void {
  const p = cur;
  cur = undefined;
  if (!p) return;
  clearInterval(p.timer);
  clearInterval(p.rampTimer);
  if (p.el) {
    p.el.pause();
    p.el.src = "";
  }
  const now = p.ctx.currentTime;
  p.master.gain.cancelScheduledValues(now);
  p.master.gain.setTargetAtTime(0, now, 0.05);
  setTimeout(() => void p.ctx.close(), 400);
}

export function startAlarm(o: AlarmOptions): void {
  stopAlarm();
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const full = Math.max(0.0002, volumeCurve(o.volume));
  const now = ctx.currentTime;
  if (o.ramp > 0) {
    master.gain.setValueAtTime(full * 0.02, now);
    // экспоненциально — на слух это ровное нарастание
    master.gain.exponentialRampToValueAtTime(full, now + o.ramp);
  } else master.gain.setValueAtTime(full, now);
  const p: Playing = { ctx, master };
  cur = p;

  if (o.sound === "custom" && o.customUrl) {
    const el = new Audio(o.customUrl);
    el.loop = !o.once;
    // свой файл играем через HTMLAudio: громкость нарастает ползунком самого элемента
    const t0 = performance.now();
    el.volume = o.ramp > 0 ? full * 0.02 : full;
    if (o.ramp > 0) {
      p.rampTimer = window.setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / 1000 / o.ramp);
        el.volume = full * 0.02 ** (1 - k);
        if (k >= 1) clearInterval(p.rampTimer);
      }, 100);
    }
    p.el = el;
    void el.play().catch(() => undefined);
    if (o.once) el.onended = () => cur === p && stopAlarm();
    return;
  }

  const pattern = PATTERNS[o.sound] ?? PATTERNS.marimba!;
  let next = now + 0.05;
  const schedule = () => {
    while (next < ctx.currentTime + 0.6) {
      next += pattern(ctx, master, next) + 0.25;
      if (o.once) {
        clearInterval(p.timer);
        setTimeout(() => cur === p && stopAlarm(), (next - ctx.currentTime) * 1000 + 300);
        return;
      }
    }
  };
  schedule();
  p.timer = window.setInterval(schedule, 200);
}

export const alarmPlaying = () => !!cur;
