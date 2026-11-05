// Звуковой движок: две «деки», как у диджея, — для плавных переходов между треками.
// Цепочка: дека → громкость деки (кроссфейд) → эффекты (реверб) → анализатор → общая громкость → колонки.
// Анализатор стоит до общей громкости: визуализатор живой, даже если сделать тише.
import { BeatDetector, bandEnergy, damp, logBands, Shaker, type ShakeOffset } from "./dsp";

export const BAND_COUNT = 72;

export type SoundMode = "normal" | "slowed" | "nightcore";

const MODES: Record<SoundMode, { rate: number; wet: number }> = {
  normal: { rate: 1, wet: 0 },
  slowed: { rate: 0.85, wet: 0.42 }, // slowed + reverb
  nightcore: { rate: 1.25, wet: 0 },
};

function makeDeck(): HTMLAudioElement {
  const a = new Audio();
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  return a;
}

/** «Эхо зала» для slowed + reverb: затухающий шум, без файлов. */
function impulse(ctx: AudioContext, seconds = 3.2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  return buf;
}

export class AudioEngine {
  readonly decks: [HTMLAudioElement, HTMLAudioElement] = [makeDeck(), makeDeck()];
  private active = 0;
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private deckGains: GainNode[] = [];
  private master?: GainNode;
  private wetGain?: GainNode;
  private fadeTimer?: number;
  private volumeValue = 0.8;
  private mode: SoundMode = "normal";

  readonly fft = new Uint8Array(1024);
  readonly wave = new Uint8Array(2048);
  readonly bands = new Float32Array(BAND_COUNT);
  /** Сглаженные полосы — для плавной картинки. */
  readonly smooth = new Float32Array(BAND_COUNT);

  bass = 0;
  mid = 0;
  high = 0;
  energy = 0;
  /** 1 в момент удара, затухает до 0. */
  pulse = 0;
  beatCount = 0;

  readonly beat = new BeatDetector(0.55);
  readonly shaker = new Shaker();
  shakeEnabled = true;
  shakeOpts = { intensity: 0.45, rotation: true, zoom: true };
  /** Текущее смещение тряски — считается каждый кадр, даже если экран плеера закрыт. */
  shake: ShakeOffset = { x: 0, y: 0, rotate: 0, scale: 1 };

  /** Дека, которая сейчас играет главный трек. */
  get el(): HTMLAudioElement {
    return this.decks[this.active]!;
  }

  get volume(): number {
    return this.volumeValue;
  }

  set volume(v: number) {
    this.volumeValue = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volumeValue, this.ctx.currentTime, 0.05);
  }

  /**
   * Сколько секунд звук идёт от плеера до ушей: буфер Web Audio + задержка устройства.
   * На Mac с AirPods это 0.15–0.3 с — без поправки текст и визуализатор «торопятся».
   */
  get outputLatency(): number {
    const c = this.ctx;
    if (!c) return 0;
    const out = (c as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
    return Math.min(0.6, Math.max(0, (c.baseLatency || 0) + (Number.isFinite(out) ? out : 0)));
  }

  /** Позиция того, что слышно прямо сейчас (с учётом задержки звука и скорости). */
  get audibleTime(): number {
    const el = this.el;
    return Math.max(0, (el.currentTime || 0) - (el.paused ? 0 : this.outputLatency * el.playbackRate));
  }

  /** Общий звуковой контекст (для скретча и эффектов). */
  context(): AudioContext {
    return this.ensureContext();
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      this.ctx = ctx;
      const fxIn = ctx.createGain();
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.7;
      // эффекты: сухой сигнал + реверб
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse(ctx);
      this.wetGain = ctx.createGain();
      this.wetGain.gain.value = MODES[this.mode].wet;
      fxIn.connect(this.analyser);
      fxIn.connect(convolver).connect(this.wetGain).connect(this.analyser);
      this.master = ctx.createGain();
      this.master.gain.value = this.volumeValue;
      this.analyser.connect(this.master).connect(ctx.destination);
      this.deckGains = this.decks.map((d, i) => {
        const g = ctx.createGain();
        g.gain.value = i === this.active ? 1 : 0;
        ctx.createMediaElementSource(d).connect(g).connect(fxIn);
        return g;
      });
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** slowed + reverb / nightcore / обычный — для обеих дек сразу. */
  setMode(mode: SoundMode): void {
    this.mode = mode;
    for (const d of this.decks) {
      d.preservesPitch = false; // как на пластинке: медленнее — ниже
      d.playbackRate = MODES[mode].rate;
    }
    if (this.wetGain && this.ctx) this.wetGain.gain.setTargetAtTime(MODES[mode].wet, this.ctx.currentTime, 0.3);
  }

  get soundMode(): SoundMode {
    return this.mode;
  }

  /**
   * Играть трек. fade > 0 — плавный переход: новый трек на второй деке нарастает,
   * старый затихает, потом останавливается.
   */
  async play(url?: string, fade = 0): Promise<void> {
    const ctx = this.ensureContext();
    if (!url || this.el.src === url) {
      await this.el.play();
      return;
    }
    this.beat.reset();
    clearTimeout(this.fadeTimer);
    const now = ctx.currentTime;
    const oldIdx = this.active;
    const old = this.decks[oldIdx]!;
    const crossfade = fade > 0.05 && !old.paused;
    const nextIdx = crossfade ? 1 - oldIdx : oldIdx;
    const deck = this.decks[nextIdx]!;
    const otherIdx = 1 - nextIdx;

    if (!crossfade) {
      // обычная смена: вторая дека молчит и стоит
      this.decks[otherIdx]!.pause();
      this.deckGains[otherIdx]!.gain.cancelScheduledValues(now);
      this.deckGains[otherIdx]!.gain.setValueAtTime(0, now);
      this.deckGains[nextIdx]!.gain.cancelScheduledValues(now);
      this.deckGains[nextIdx]!.gain.setValueAtTime(1, now);
    }
    deck.src = url;
    deck.playbackRate = MODES[this.mode].rate;
    deck.preservesPitch = false;
    this.active = nextIdx;
    if (crossfade) {
      const gIn = this.deckGains[nextIdx]!.gain;
      const gOut = this.deckGains[oldIdx]!.gain;
      gIn.cancelScheduledValues(now);
      gOut.cancelScheduledValues(now);
      gIn.setValueAtTime(0, now);
      gIn.linearRampToValueAtTime(1, now + fade);
      gOut.setValueAtTime(gOut.value, now);
      gOut.linearRampToValueAtTime(0, now + fade);
      this.fadeTimer = window.setTimeout(() => old.pause(), fade * 1000 + 80);
    }
    await deck.play();
  }

  /** Плавно приглушить и поставить на паузу (для таймера сна). */
  async fadeOutAndPause(seconds = 8): Promise<void> {
    const ctx = this.ensureContext();
    const g = this.deckGains[this.active]!.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
    await new Promise((r) => setTimeout(r, seconds * 1000));
    this.el.pause();
    g.setValueAtTime(1, ctx.currentTime);
  }

  /** Вызывается каждый кадр раньше всех: обновляет спектр, биты, тряску. */
  update(dt: number, t: number): void {
    const a = this.analyser;
    const live = a && this.decks.some((d) => !d.paused);
    if (a && live) {
      a.getByteFrequencyData(this.fft);
      a.getByteTimeDomainData(this.wave);
      const sr = this.ctx!.sampleRate;
      logBands(this.fft, sr, BAND_COUNT, this.bands);
      const bassRaw = bandEnergy(this.fft, sr, 30, 160);
      this.bass = damp(this.bass, bassRaw, 18, dt);
      this.mid = damp(this.mid, bandEnergy(this.fft, sr, 400, 2500), 14, dt);
      this.high = damp(this.high, bandEnergy(this.fft, sr, 4000, 12000), 14, dt);
      if (this.beat.push(bassRaw, t, dt)) {
        this.pulse = 1;
        this.beatCount++;
        if (this.shakeEnabled) this.shaker.hit(0.32 + bassRaw * 0.55);
      }
    } else {
      this.bands.fill(0);
      this.wave.fill(128);
      this.bass = damp(this.bass, 0, 6, dt);
      this.mid = damp(this.mid, 0, 6, dt);
      this.high = damp(this.high, 0, 6, dt);
    }
    for (let i = 0; i < BAND_COUNT; i++) {
      const target = this.bands[i]!;
      // Быстро вверх, медленнее вниз — как у настоящих индикаторов.
      this.smooth[i] = damp(this.smooth[i]!, target, target > this.smooth[i]! ? 30 : 9, dt);
    }
    this.energy = this.bass * 0.55 + this.mid * 0.3 + this.high * 0.15;
    this.pulse = Math.max(0, this.pulse - dt * 3.2);
    this.shake = this.shaker.update(dt, t, this.shakeOpts);
  }
}

export const engine = new AudioEngine();
