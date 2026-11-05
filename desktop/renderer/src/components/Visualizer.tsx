// Визуализатор: «Волна», «Кольцо» вокруг пластинки и «Столбики».
// Рисует прямо в canvas каждый кадр, без перерисовки React.
import { useEffect, useRef } from "react";
import type { VisualizerStyle } from "../../../shared/settings";
import { BAND_COUNT, engine } from "../lib/audio";
import { useFrame } from "../lib/frame";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function Visualizer({ kind, className, ringRadius = 0.36 }: { kind: VisualizerStyle; className?: string; ringRadius?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const colors = useRef({ a: "#fff", b: "#fff", c: "#fff" });
  const peaks = useRef(new Float32Array(BAND_COUNT));
  const spin = useRef(0);

  useEffect(() => {
    const c = ref.current!;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = c.getBoundingClientRect();
      size.current = { w: r.width, h: r.height, dpr };
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
    });
    ro.observe(c);
    const readColors = () =>
      (colors.current = { a: cssVar("--accent"), b: cssVar("--accent-2"), c: cssVar("--accent-3") });
    readColors();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  useFrame((dt) => {
    const c = ref.current;
    if (!c || kind === "off") return;
    const g = c.getContext("2d")!;
    const { w, h, dpr } = size.current;
    if (w === 0) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const { a, b, c: c3 } = colors.current;
    const bands = engine.smooth;

    if (kind === "ring") {
      spin.current += dt * (0.08 + engine.energy * 0.5);
      const cx = w / 2;
      const cy = h / 2;
      const r0 = Math.min(w, h) * ringRadius * (1 + engine.pulse * 0.025);
      const n = BAND_COUNT * 2;
      const grad = g.createLinearGradient(cx - r0, cy - r0, cx + r0, cy + r0);
      grad.addColorStop(0, a);
      grad.addColorStop(0.5, b);
      grad.addColorStop(1, c3);
      g.strokeStyle = grad;
      g.lineCap = "round";
      g.lineWidth = Math.max(2, (Math.PI * 2 * r0) / n - 3);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        // зеркально: левая половина повторяет правую — кольцо симметричное
        const bi = i < BAND_COUNT ? i : n - 1 - i;
        const v = bands[Math.min(BAND_COUNT - 1, Math.floor(bi * 0.92))]!;
        const len = 4 + v * v * Math.min(w, h) * 0.2;
        const ang = (i / n) * Math.PI * 2 + spin.current - Math.PI / 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        g.moveTo(cx + cos * (r0 + 6), cy + sin * (r0 + 6));
        g.lineTo(cx + cos * (r0 + 6 + len), cy + sin * (r0 + 6 + len));
      }
      g.stroke();
      // мягкое свечение на ударе
      if (engine.pulse > 0.01) {
        g.globalAlpha = engine.pulse * 0.35;
        g.lineWidth = 18;
        g.strokeStyle = a;
        g.beginPath();
        g.arc(cx, cy, r0 + 2, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
      return;
    }

    if (kind === "bars") {
      const n = 56;
      const gap = 5;
      const bw = (w - gap * (n - 1)) / n;
      const grad = g.createLinearGradient(0, h, 0, h * 0.2);
      grad.addColorStop(0, a);
      grad.addColorStop(0.6, b);
      grad.addColorStop(1, c3);
      g.fillStyle = grad;
      const pk = peaks.current;
      for (let i = 0; i < n; i++) {
        const v = bands[Math.floor((i / n) * BAND_COUNT * 0.95)]!;
        const bh = Math.max(3, v * v * h * 0.85);
        const x = i * (bw + gap);
        g.globalAlpha = 0.85;
        g.beginPath();
        g.roundRect(x, h - bh, bw, bh, Math.min(6, bw / 2));
        g.fill();
        pk[i] = Math.max(pk[i]! - dt * 0.35 * h, bh);
        g.globalAlpha = 1;
        g.fillRect(x, h - pk[i]! - 6, bw, 3);
      }
      g.globalAlpha = 1;
      return;
    }

    // «Волна»: три слоя жидкости из спектра + форма сигнала поверх
    const layers = [
      { col: c3, amp: 0.55, off: 0.8, alpha: 0.35 },
      { col: b, amp: 0.75, off: 0.4, alpha: 0.45 },
      { col: a, amp: 1, off: 0, alpha: 0.7 },
    ];
    const base = h * 0.62;
    const t = performance.now() / 1000;
    for (const L of layers) {
      g.globalAlpha = L.alpha;
      g.fillStyle = L.col;
      g.beginPath();
      g.moveTo(0, h);
      const steps = 48;
      let px = 0;
      let py = base;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const bi = Math.floor((i / steps) * (BAND_COUNT - 1) * 0.85);
        const v = bands[bi]!;
        const y = base - (v * h * 0.42 + Math.sin(i * 0.5 + t * 1.4 + L.off * 4) * 10 * (0.4 + engine.energy)) * L.amp;
        if (i === 0) g.lineTo(x, y);
        else g.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        px = x;
        py = y;
      }
      g.lineTo(w, py);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 0.9;
    g.strokeStyle = colors.current.a;
    g.lineWidth = 2;
    g.beginPath();
    const wave = engine.wave;
    const step = wave.length / 256;
    for (let i = 0; i < 256; i++) {
      const v = (wave[Math.floor(i * step)]! - 128) / 128;
      const x = (i / 255) * w;
      const y = h * 0.3 + v * h * 0.16;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }, 10);

  return <canvas ref={ref} className={className} aria-hidden />;
}

/** Крошечный спектр для мини-плеера. */
export function MiniSpectrum() {
  const ref = useRef<HTMLCanvasElement>(null);
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const w = c.width;
    const h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = cssVar("--accent");
    const n = 14;
    const bw = w / n - 2;
    for (let i = 0; i < n; i++) {
      const v = engine.smooth[Math.floor((i / n) * BAND_COUNT * 0.8)]!;
      const bh = Math.max(2, v * h);
      g.globalAlpha = 0.5 + v * 0.5;
      g.beginPath();
      g.roundRect(i * (bw + 2), h - bh, bw, bh, 1.5);
      g.fill();
    }
    g.globalAlpha = 1;
  }, 11);
  return <canvas ref={ref} width={84} height={28} className="mini-spectrum" aria-hidden />;
}
