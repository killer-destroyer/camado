// Огромная пластинка у левого края экрана «Сейчас играет».
// Узор свой для каждого трека, цвета из обложки, в центре крутится круглая обложка.
// Крути её мышкой или двумя пальцами на трекпаде — это скретч: песня звучит вперёд и назад, потом перемотка.
import { useEffect, useRef } from "react";
import { engine } from "../lib/audio";
import { damp } from "../lib/dsp";
import { useFrame } from "../lib/frame";
import { prepareScratch, scratchBegin, scratchEnd, scratchMove } from "../lib/scratch";
import { drawVinyl, type VinylColors } from "../lib/vinylArt";
import { player, position, seek } from "../state/player";

const DEG_PER_SEC = 72; // ~12 об/мин: спокойнее настоящих 33⅓ — на огромном диске так приятнее
// Скретч: один оборот = столько секунд трека, сколько диск проходит за оборот сам по себе.
// Тогда крутишь с обычной скоростью — песня звучит как обычно, быстрее — быстрее.
const SEC_PER_TURN = 360 / DEG_PER_SEC;

/** Где пластинка на экране (те же формулы, что в CSS: --D, left, top). */
export function discGeometry(w: number, h: number): { D: number; cx: number; cy: number; r: number } {
  const D = Math.min(h * 1.12, w * 0.62);
  return { D, cx: D * 0.18, cy: h / 2, r: D / 2 };
}

export function Vinyl({ trackKey, cover, colors }: { trackKey: string; cover?: string; colors: VinylColors }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const disc = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const speed = useRef(0);
  const scratch = useRef<{
    last: number;
    turned: number;
    start: number;
    lastT: number;
    rate: number;
  } | null>(null);
  const wheelEnd = useRef<number | undefined>(undefined);

  // Рисуем сразу, а когда загрузится обложка — ещё раз (для пластинки-картинки и дымчатой).
  const swatchKey = colors.swatches?.join(",") ?? "";
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    drawVinyl(c, trackKey, colors);
    if (!cover) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => alive && drawVinyl(c, trackKey, colors, 1024, img);
    img.src = cover;
    return () => {
      alive = false;
    };
  }, [trackKey, cover, colors.accent, colors.accent2, colors.accent3, colors.bg, swatchKey]);

  useFrame((dt) => {
    const playing = player.get().playing;
    const sc = scratch.current;
    if (!sc) {
      speed.current = damp(speed.current, playing ? DEG_PER_SEC : 0, playing ? 1.6 : 2.6, dt);
      angle.current = (angle.current + speed.current * dt) % 360;
    } else if (performance.now() - sc.lastT > 70 && sc.rate !== 0) {
      // Рука остановилась — пластинка стоит, звука нет.
      sc.rate = 0;
      scratchMove(sc.start + (sc.turned / 360) * SEC_PER_TURN, 0);
    }
    if (disc.current) disc.current.style.transform = `rotate(${angle.current.toFixed(2)}deg)`;
    if (pulse.current) pulse.current.style.transform = `scale(${(1 + engine.pulse * 0.012).toFixed(4)})`;
    if (glow.current) glow.current.style.opacity = (0.25 + engine.pulse * 0.75).toFixed(3);
  });

  const begin = () => {
    if (scratch.current) return;
    scratch.current = {
      last: 0,
      turned: 0,
      start: position(),
      lastT: performance.now(),
      rate: 0,
    };
    engine.el.muted = true;
    prepareScratch(engine.el.src);
    scratchBegin(position());
  };
  const turn = (deltaDeg: number) => {
    const s = scratch.current;
    if (!s) return;
    const now = performance.now();
    const dt = Math.max(0.008, (now - s.lastT) / 1000);
    s.lastT = now;
    s.turned += deltaDeg;
    angle.current += deltaDeg;
    // Скорость в «разах» от обычной, слегка сглаженная — рука дрожит, звук не должен.
    const raw = deltaDeg / dt / DEG_PER_SEC;
    s.rate = s.rate * 0.35 + raw * 0.65;
    scratchMove(s.start + (s.turned / 360) * SEC_PER_TURN, s.rate);
  };
  const end = () => {
    const s = scratch.current;
    scratch.current = null;
    scratchEnd();
    engine.el.muted = false;
    if (s && Math.abs(s.turned) > 3) seek(s.start + (s.turned / 360) * SEC_PER_TURN);
  };

  const pointerAngle = (e: React.PointerEvent) => {
    const g = discGeometry(window.innerWidth, window.innerHeight);
    return (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI;
  };

  return (
    <div ref={pulse} className="disc-pulse">
      <div ref={glow} className="disc-glow" />
      <div
        ref={disc}
        className="disc"
        onPointerEnter={() => prepareScratch(engine.el.src)}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          begin();
          scratch.current!.last = pointerAngle(e);
        }}
        onPointerMove={(e) => {
          const s = scratch.current;
          if (!s || e.buttons === 0) return;
          const a = pointerAngle(e);
          let d = a - s.last;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          s.last = a;
          turn(d);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onWheel={(e) => {
          // Два пальца по трекпаду над пластинкой — тоже скретч.
          begin();
          turn((e.deltaY + e.deltaX) * 0.35);
          clearTimeout(wheelEnd.current);
          wheelEnd.current = window.setTimeout(end, 180);
        }}
      >
        <canvas ref={canvas} className="disc-art" />
        <div className="disc-label" style={cover ? { backgroundImage: `url("${cover}")` } : undefined} />
      </div>
      <div className="disc-sheen" />
    </div>
  );
}
