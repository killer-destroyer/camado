// Визуализатор: «Волна», «Кольцо» вокруг пластинки и «Столбики».
// Рисует прямо в canvas каждый кадр, без перерисовки React.
import { useEffect, useRef } from "react";
import type { VisualizerStyle } from "../../../shared/settings";
import { BAND_COUNT, engine } from "../lib/audio";
import { useFrame } from "../lib/frame";

// Цвета палитры. Читаем из CSS только когда палитра меняется — getComputedStyle каждый кадр тормозит.
const theme = { a: "#ffffff", b: "#ffffff", c: "#ffffff" };
let watching = false;
function watchTheme(): void {
  if (watching) return;
  watching = true;
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    theme.a = cs.getPropertyValue("--accent").trim() || theme.a;
    theme.b = cs.getPropertyValue("--accent-2").trim() || theme.b;
    theme.c = cs.getPropertyValue("--accent-3").trim() || theme.c;
  };
  read();
  new MutationObserver(read).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
}

/** Кольцо вокруг пластинки: центр и радиус в пикселях холста. Без этого — по центру холста. */
export type RingGeometry = (w: number, h: number) => { cx: number; cy: number; r: number };

export function Visualizer({
  kind,
  className,
  ringRadius = 0.36,
  ring,
}: {
  kind: VisualizerStyle | "ring-only";
  className?: string;
  ringRadius?: number;
  ring?: RingGeometry;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
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
    watchTheme();
    return () => ro.disconnect();
  }, []);

  useFrame((dt) => {
    const c = ref.current;
    if (!c || kind === "off") return;
    const g = c.getContext("2d")!;
    const { w, h, dpr } = size.current;
    if (w === 0) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const { a, b, c: c3 } = theme;
    const bands = engine.smooth;

    if (kind === "ring" || kind === "ring-only") {
      // Столбики растут наружу от края пластинки. Бас — «на три часа», высокие — вверх и вниз.
      const geo = ring ? ring(w, h) : { cx: w / 2, cy: h / 2, r: Math.min(w, h) * ringRadius };
      const r0 = geo.r * (1 + engine.pulse * 0.01) + 10;
      const arc = ring ? Math.PI * 0.62 : Math.PI; // у пластинки за краем экрана рисуем только видимую дугу
      const n = ring ? 140 : BAND_COUNT * 2;
      const maxLen = Math.min(w, h) * 0.17;
      const grad = g.createLinearGradient(geo.cx, geo.cy - r0, geo.cx + r0, geo.cy + r0);
      grad.addColorStop(0, a);
      grad.addColorStop(0.5, b);
      grad.addColorStop(1, c3);
      g.strokeStyle = grad;
      g.lineCap = "round";
      g.lineWidth = Math.max(2.5, ((arc * 2 * r0) / n) * 0.55);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1); // 0…1 по дуге
        const ang = -arc + t * arc * 2; // от −arc до +arc, 0 — вправо
        const bi = Math.floor(Math.abs(t * 2 - 1) * (BAND_COUNT - 1) * 0.85);
        const v = bands[bi]!;
        const len = 3 + v * v * maxLen;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        g.moveTo(geo.cx + cos * r0, geo.cy + sin * r0);
        g.lineTo(geo.cx + cos * (r0 + len), geo.cy + sin * (r0 + len));
      }
      g.stroke();
      if (engine.pulse > 0.01) {
        g.globalAlpha = engine.pulse * 0.4;
        g.lineWidth = 14;
        g.strokeStyle = a;
        g.beginPath();
        g.arc(geo.cx, geo.cy, r0 - 4, -arc, arc);
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

    // «Волны»: три светящихся слоя из спектра + линия сигнала. Хорошо видны даже краем глаза.
    const layers = [
      { col: c3, amp: 0.6, off: 0.8, alpha: 0.45 },
      { col: b, amp: 0.8, off: 0.4, alpha: 0.55 },
      { col: a, amp: 1, off: 0, alpha: 0.75 },
    ];
    const base = h * 0.78;
    const t = performance.now() / 1000;
    g.globalCompositeOperation = "lighter"; // слои складываются в свечение
    for (const L of layers) {
      const fill = g.createLinearGradient(0, h * 0.2, 0, h);
      fill.addColorStop(0, L.col);
      fill.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = L.alpha;
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(0, h);
      const steps = 56;
      let px = 0;
      let py = base;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const bi = Math.floor(Math.abs((i / steps) * 2 - 1) * (BAND_COUNT - 1) * 0.8);
        const v = bands[bi]!;
        const y = base - (v * h * 0.62 + (Math.sin(i * 0.45 + t * 1.3 + L.off * 4) * 0.5 + 0.5) * 14 * (0.35 + engine.energy)) * L.amp;
        if (i === 0) g.lineTo(x, y);
        else g.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        px = x;
        py = y;
      }
      g.lineTo(w, py);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
      // яркая кромка волны
      g.globalAlpha = Math.min(1, L.alpha + 0.25);
      g.strokeStyle = L.col;
      g.lineWidth = 2;
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }, 10);

  return <canvas ref={ref} className={className} aria-hidden />;
}

/** Крошечный спектр для мини-плеера. */
export function MiniSpectrum() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(watchTheme, []);
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const w = c.width;
    const h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = theme.a;
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
