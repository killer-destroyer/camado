// Огромная пластинка у левого края экрана «Сейчас играет».
// Узор свой для каждого трека, цвета из обложки, в центре крутится круглая обложка.
// Крути её мышкой или двумя пальцами на трекпаде — это скретч: звук «иглы» и перемотка.
import { useEffect, useRef } from "react";
import { engine } from "../lib/audio";
import { damp } from "../lib/dsp";
import { useFrame } from "../lib/frame";
import { scratchSpeed, scratchStart, scratchStop } from "../lib/scratch";
import { drawVinyl, type VinylColors } from "../lib/vinylArt";
import { player, position, seek } from "../state/player";

const DEG_PER_SEC = 72; // ~12 об/мин: спокойнее настоящих 33⅓ — на огромном диске так приятнее
const SEC_PER_TURN = 6; // скретч: полный оборот = 6 секунд трека

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
  const scratch = useRef<{ last: number; turned: number; start: number; lastT: number } | null>(null);
  const wheelEnd = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (canvas.current) drawVinyl(canvas.current, trackKey, colors);
  }, [trackKey, colors.accent, colors.accent2, colors.accent3, colors.bg]);

  useFrame((dt) => {
    const playing = player.get().playing;
    if (!scratch.current) {
      speed.current = damp(speed.current, playing ? DEG_PER_SEC : 0, playing ? 1.6 : 2.6, dt);
      angle.current = (angle.current + speed.current * dt) % 360;
    }
    if (disc.current) disc.current.style.transform = `rotate(${angle.current.toFixed(2)}deg)`;
    if (pulse.current) pulse.current.style.transform = `scale(${(1 + engine.pulse * 0.012).toFixed(4)})`;
    if (glow.current) glow.current.style.opacity = (0.25 + engine.pulse * 0.75).toFixed(3);
  });

  const begin = () => {
    if (scratch.current) return;
    scratch.current = { last: 0, turned: 0, start: position(), lastT: performance.now() };
    engine.el.muted = true;
    scratchStart();
  };
  const turn = (deltaDeg: number) => {
    const s = scratch.current;
    if (!s) return;
    const now = performance.now();
    const dt = Math.max(0.008, (now - s.lastT) / 1000);
    s.lastT = now;
    s.turned += deltaDeg;
    angle.current += deltaDeg;
    scratchSpeed(deltaDeg / 360 / dt);
  };
  const end = () => {
    const s = scratch.current;
    scratch.current = null;
    scratchStop();
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
        title="Крути пластинку — это скретч и перемотка"
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
        <div className="disc-hole" />
      </div>
      <div className="disc-sheen" />
    </div>
  );
}
