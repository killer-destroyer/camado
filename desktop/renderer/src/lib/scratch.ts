// Скретч как у диджея: крутишь пластинку — звучит сама песня, вперёд или назад,
// быстрее или медленнее, ровно с той скоростью, с какой крутишь. Держишь на месте — тишина.
// Звук идёт через общую громкость и слегка приглушён фильтром, чтобы не резал уши.
import { engine } from "./audio";

let buffer: AudioBuffer | undefined;
let bufferUrl = "";
let loading: Promise<void> | undefined;

/** Трек уже раскодирован кем-то другим (замер громкости) — берём, если это текущий. */
export function offerScratchBuffer(url: string, b: AudioBuffer): void {
  if (url === engine.el.src) {
    buffer = b;
    bufferUrl = url;
  }
}

/** Заранее раскодировать трек (при наведении на пластинку), чтобы скретч звучал сразу. */
export function prepareScratch(url: string): void {
  if (!url || bufferUrl === url || loading) return;
  const ctx = engine.context();
  loading = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((b) => {
      buffer = b;
      bufferUrl = url;
    })
    .catch(() => undefined)
    .finally(() => {
      loading = undefined;
    });
}

interface Session {
  gain: GainNode;
  filter: BiquadFilterNode;
  src?: AudioBufferSourceNode;
  srcGain?: GainNode;
  dir: 1 | -1 | 0;
  /** Где сейчас «игла» (секунды трека) — по нашему счёту. */
  pos: number;
  /** Где, по нашей оценке, сейчас играет источник, и когда мы это считали. */
  est: number;
  estAt: number;
  speed: number;
}

let s: Session | undefined;
const SILENT_BELOW = 0.06; // медленнее — уже не звук, а тишина
const MAX_RATE = 3.2;

/** Короткий кусок трека задом наперёд — для прокрутки назад. */
function reversedChunk(ctx: AudioContext, b: AudioBuffer, at: number, seconds = 6): AudioBuffer {
  const end = Math.max(1, Math.floor(at * b.sampleRate));
  const start = Math.max(0, end - Math.floor(seconds * b.sampleRate));
  const len = end - start;
  const out = ctx.createBuffer(b.numberOfChannels, Math.max(1, len), b.sampleRate);
  for (let ch = 0; ch < b.numberOfChannels; ch++) {
    const from = b.getChannelData(ch);
    const to = out.getChannelData(ch);
    for (let i = 0; i < len; i++) to[i] = from[end - 1 - i]!;
  }
  return out;
}

function stopSource(sess: Session, ctx: AudioContext): void {
  const { src, srcGain } = sess;
  if (!src || !srcGain) return;
  srcGain.gain.setTargetAtTime(0, ctx.currentTime, 0.012);
  setTimeout(() => {
    try {
      src.stop();
    } catch {
      // уже остановлен
    }
    src.disconnect();
    srcGain.disconnect();
  }, 90);
  sess.src = undefined;
  sess.srcGain = undefined;
}

function startSource(sess: Session, ctx: AudioContext, dir: 1 | -1, rate: number): void {
  if (!buffer) return;
  stopSource(sess, ctx);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = 0;
  if (dir > 0) {
    src.buffer = buffer;
    src.connect(g).connect(sess.filter);
    src.playbackRate.value = rate;
    src.start(0, Math.min(buffer.duration - 0.01, Math.max(0, sess.pos)));
  } else {
    src.buffer = reversedChunk(ctx, buffer, sess.pos);
    src.connect(g).connect(sess.filter);
    src.playbackRate.value = rate;
    src.start(0, 0);
  }
  g.gain.setTargetAtTime(1, ctx.currentTime, 0.01);
  sess.src = src;
  sess.srcGain = g;
  sess.dir = dir;
}

export function scratchBegin(pos: number): void {
  if (s) return;
  const ctx = engine.context();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 5200;
  filter.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  filter.connect(gain).connect(engine.output());
  s = { gain, filter, dir: 0, pos, est: pos, estAt: ctx.currentTime, speed: 0 };
}

/**
 * pos — куда сейчас «докрутили» трек, rate — скорость в «разах» (1 = как обычно, минус — назад).
 */
export function scratchMove(pos: number, rate: number): void {
  if (!s) return;
  const ctx = engine.context();
  s.pos = pos;
  const speed = Math.min(MAX_RATE, Math.abs(rate));
  const now = ctx.currentTime;
  if (speed < SILENT_BELOW || !buffer || bufferUrl !== engine.el.src) {
    s.gain.gain.setTargetAtTime(0, now, 0.03);
    if (s.src && speed < SILENT_BELOW) stopSource(s, ctx);
    s.dir = 0;
    return;
  }
  const dir: 1 | -1 = rate > 0 ? 1 : -1;
  // Где сейчас реально звучит источник — если ушёл от руки дальше чем на четверть секунды, переставляем.
  if (s.src) s.est += s.dir * s.speed * (now - s.estAt);
  s.estAt = now;
  if (dir !== s.dir || !s.src || Math.abs(s.est - pos) > 0.25) {
    startSource(s, ctx, dir, speed);
    s.est = pos;
  } else s.src.playbackRate.setTargetAtTime(speed, now, 0.025);
  s.speed = speed;
  // Чем быстрее крутишь, тем ярче звук, но без визга.
  s.filter.frequency.setTargetAtTime(2600 + Math.min(1, speed / 2) * 3600, now, 0.03);
  s.gain.gain.setTargetAtTime(0.85, now, 0.02);
}

export function scratchEnd(): void {
  if (!s) return;
  const ctx = engine.context();
  const sess = s;
  s = undefined;
  sess.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
  stopSource(sess, ctx);
  setTimeout(() => {
    sess.filter.disconnect();
    sess.gain.disconnect();
  }, 200);
}

export const scratching = () => !!s;
