// Звук скретча: шум через полосовой фильтр, высота и громкость — от скорости вращения пластинки.
import { engine } from "./audio";

let src: AudioBufferSourceNode | undefined;
let filter: BiquadFilterNode | undefined;
let gain: GainNode | undefined;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // «коричневый» шум — мягче белого, больше похож на иглу по винилу
    last = (last + (Math.random() * 2 - 1) * 0.08) * 0.985;
    d[i] = last * 3;
  }
  return buf;
}

export function scratchStart(): void {
  const ctx = engine.context();
  if (src) return;
  src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 2.2;
  gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

/** speed — обороты в секунду (знак не важен). */
export function scratchSpeed(speed: number): void {
  if (!filter || !gain) return;
  const ctx = engine.context();
  const v = Math.min(6, Math.abs(speed));
  filter.frequency.setTargetAtTime(250 + v * 900, ctx.currentTime, 0.015);
  gain.gain.setTargetAtTime(Math.min(0.55, v * 0.22), ctx.currentTime, 0.02);
}

export function scratchStop(): void {
  if (!src || !gain) return;
  const ctx = engine.context();
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
  const s = src;
  setTimeout(() => s.stop(), 150);
  src = undefined;
  filter = undefined;
  gain = undefined;
}
