// Звуковой движок: играет локальные файлы и «слушает» звук для визуализатора.
// Для онлайн-плееров (Яндекс, SoundCloud) слушает системный звук (Windows/macOS).
import { BeatDetector, bandEnergy, damp, logBands, Shaker, type ShakeOffset } from "./dsp";

export const BAND_COUNT = 72;

export class AudioEngine {
  readonly el: HTMLAudioElement;
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private loopAnalyser?: AnalyserNode;
  private loopStream?: MediaStream;
  mode: "local" | "loopback" = "local";

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

  constructor() {
    this.el = new Audio();
    this.el.crossOrigin = "anonymous";
    this.el.preload = "auto";
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      const src = this.ctx.createMediaElementSource(this.el);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.7;
      src.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  async play(url?: string): Promise<void> {
    this.ensureContext();
    if (url && this.el.src !== url) {
      this.el.src = url;
      this.beat.reset();
    }
    await this.el.play();
  }

  get loopbackActive(): boolean {
    return this.mode === "loopback";
  }

  /** Захват системного звука. false — ОС не дала звук. */
  async startLoopback(): Promise<boolean> {
    if (this.loopStream) return true;
    const ctx = this.ensureContext();
    const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    stream.getVideoTracks().forEach((t) => t.stop());
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    const src = ctx.createMediaStreamSource(stream);
    this.loopAnalyser = ctx.createAnalyser();
    this.loopAnalyser.fftSize = 2048;
    this.loopAnalyser.smoothingTimeConstant = 0.7;
    src.connect(this.loopAnalyser); // не в динамики — иначе будет эхо
    this.loopStream = stream;
    this.mode = "loopback";
    this.beat.reset();
    return true;
  }

  stopLoopback(): void {
    this.loopStream?.getTracks().forEach((t) => t.stop());
    this.loopStream = undefined;
    this.loopAnalyser = undefined;
    this.mode = "local";
  }

  /** Вызывается каждый кадр раньше всех: обновляет спектр, биты, тряску. */
  update(dt: number, t: number): void {
    const a = this.mode === "loopback" ? this.loopAnalyser : this.analyser;
    const live = a && (this.mode === "loopback" || !this.el.paused);
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
