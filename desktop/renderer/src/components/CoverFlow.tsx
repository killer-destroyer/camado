// Выбор музыки: 3D-карусель обложек с инерцией. Колесо, перетаскивание, стрелки.
// Центральная обложка — крупно и прямо, боковые разворачиваются, снизу — отражение.
import { useEffect, useRef, useState } from "react";
import { Disc3, Play } from "lucide-react";
import type { Track } from "../../../shared/types";
import { damp } from "../lib/dsp";
import { useFrame } from "../lib/frame";

const WINDOW = 7; // сколько обложек по сторонам держим на экране

export function CoverFlow({
  tracks,
  playingId,
  onPlay,
  focusIndex,
}: {
  tracks: Track[];
  playingId?: string;
  onPlay: (index: number) => void;
  focusIndex?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pos = useRef(focusIndex ?? 0);
  const vel = useRef(0);
  const target = useRef<number | null>(null);
  const dragging = useRef<{ x: number; pos: number; lastX: number; lastT: number; moved: number } | null>(null);
  const items = useRef(new Map<number, HTMLDivElement>());
  const [center, setCenter] = useState(focusIndex ?? 0);
  const centerRef = useRef(center);
  const n = tracks.length;

  useEffect(() => {
    if (focusIndex !== undefined && focusIndex >= 0) target.current = focusIndex;
  }, [focusIndex]);

  const clamp = (v: number) => Math.max(0, Math.min(n - 1, v));

  useFrame((dt) => {
    if (n === 0) return;
    if (!dragging.current) {
      if (target.current !== null) {
        pos.current = damp(pos.current, target.current, 10, dt);
        if (Math.abs(pos.current - target.current) < 0.001) {
          pos.current = target.current;
          target.current = null;
        }
      } else {
        // инерция и мягкая «доводка» до ближайшей обложки
        pos.current += vel.current * dt;
        vel.current = damp(vel.current, 0, 4, dt);
        if (Math.abs(vel.current) < 1.2) {
          pos.current = damp(pos.current, Math.round(pos.current), 9, dt);
        }
        if (pos.current < 0 || pos.current > n - 1) {
          pos.current = damp(pos.current, clamp(pos.current), 14, dt);
          vel.current *= 0.5;
        }
      }
    }
    const c = Math.round(clamp(pos.current));
    if (c !== centerRef.current) {
      centerRef.current = c;
      setCenter(c);
    }
    const w = root.current?.clientWidth ?? 1200;
    const size = Math.min(300, w * 0.24);
    root.current?.style.setProperty("--cf", `${size}px`);
    for (const [i, el] of items.current) {
      const off = i - pos.current;
      const a = Math.abs(off);
      const sign = Math.sign(off);
      const x = a < 1 ? off * size * 0.82 : sign * (size * 0.82 + (a - 1) * size * 0.34);
      const rot = -Math.max(-1, Math.min(1, off)) * 62;
      const z = -Math.min(a, 6) * 110 - (a < 1 ? 0 : 60);
      const scale = a < 1 ? 1.12 - a * 0.12 : 1;
      el.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rot}deg) scale(${scale})`;
      el.style.zIndex = String(1000 - Math.round(a * 10));
      el.style.opacity = String(Math.max(0, 1 - Math.max(0, a - 4.5) * 0.6));
      // затемнение боковых — через прозрачность слоя, а не filter (filter перерисовывает картинку)
      el.style.setProperty("--shade", a > 0.6 ? Math.min(0.55, a * 0.1).toFixed(3) : "0");
    }
  }, 15);

  const go = (i: number) => {
    vel.current = 0;
    target.current = clamp(i);
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target.current = null;
      vel.current += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.035;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(centerRef.current + 1);
    else if (e.key === "ArrowLeft") go(centerRef.current - 1);
    else if (e.key === "Enter") onPlay(centerRef.current);
    else return;
    e.preventDefault();
  };

  if (n === 0) return null;
  const from = Math.max(0, center - WINDOW);
  const to = Math.min(n - 1, center + WINDOW);
  const visible: number[] = [];
  for (let i = from; i <= to; i++) visible.push(i);
  const t = tracks[center]!;

  return (
    <div className="coverflow" tabIndex={0} onKeyDown={onKey}>
      <div
        ref={root}
        className="cf-stage"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          target.current = null;
          dragging.current = { x: e.clientX, pos: pos.current, lastX: e.clientX, lastT: performance.now(), moved: 0 };
          vel.current = 0;
        }}
        onPointerMove={(e) => {
          const d = dragging.current;
          if (!d) return;
          const size = Math.min(300, (root.current?.clientWidth ?? 1200) * 0.24) * 0.5;
          pos.current = d.pos - (e.clientX - d.x) / size;
          const now = performance.now();
          const dtm = Math.max(1, now - d.lastT);
          vel.current = (-(e.clientX - d.lastX) / size / dtm) * 1000;
          d.moved += Math.abs(e.clientX - d.lastX);
          d.lastX = e.clientX;
          d.lastT = now;
        }}
        onPointerUp={(e) => {
          const d = dragging.current;
          dragging.current = null;
          if (d && d.moved < 6) {
            // это клик: по центральной — играть, по боковой — подъехать к ней
            const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
            if (hit) {
              const i = Number(hit.dataset.i);
              if (i === centerRef.current) onPlay(i);
              else go(i);
            }
          }
        }}
      >
        <div className="cf-track">
          {visible.map((i) => {
            const tr = tracks[i]!;
            return (
              <div
                key={tr.id}
                data-i={i}
                ref={(el) => {
                  if (el) items.current.set(i, el);
                  else items.current.delete(i);
                }}
                className={`cf-item ${i === center ? "center" : ""} ${tr.id === playingId ? "playing" : ""}`}
              >
                <div className="cf-cover" style={tr.cover ? { backgroundImage: `url("${tr.cover}")` } : undefined}>
                  <span className="cf-shade" />
                  {!tr.cover && (
                    <div className="cf-placeholder">
                      <Disc3 size={56} strokeWidth={1.1} />
                      <span>{tr.title}</span>
                    </div>
                  )}
                  {i === center && (
                    <div className="cf-play">
                      <Play size={30} fill="currentColor" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div key={t.id} className="cf-caption">
        <div className="cf-title">{t.title}</div>
        <div className="cf-artist">
          {t.artist}
          {t.album ? ` · ${t.album}` : ""}
        </div>
      </div>
      <div className="cf-counter">
        {center + 1} / {n}
      </div>
    </div>
  );
}
