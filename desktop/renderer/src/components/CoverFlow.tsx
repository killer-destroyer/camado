// Выбор музыки: 3D-карусель обложек с инерцией.
// Листается свайпом/перетаскиванием влево-вправо и стрелками. Вертикальная прокрутка — для страницы.
// Остановился на обложке — через 1.2 с включается её трек (полоска под названием показывает отсчёт).
import { useEffect, useRef, useState } from "react";
import { Disc3, Play } from "lucide-react";
import type { Track } from "../../../shared/types";
import { damp } from "../lib/dsp";
import { useFrame } from "../lib/frame";

const WINDOW = 7; // сколько обложек по сторонам держим на экране
const AUTOPLAY_MS = 1200;
const MAX_VEL = 14; // обложек в секунду
const DRAG_PX = 0.5; // сколько ширин обложки нужно протащить мышью на одну обложку (меньше — легче)

export function CoverFlow({
  tracks,
  playingIndex,
  onPlay,
  onOpen,
}: {
  tracks: Track[];
  /** Индекс играющего трека в этом списке (−1, если играет что-то не отсюда). */
  playingIndex: number;
  onPlay: (index: number) => void;
  /** Клик по центральной обложке — открыть «Сейчас играет». */
  onOpen?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const countdown = useRef<HTMLDivElement>(null);
  const pos = useRef(Math.max(0, playingIndex));
  const vel = useRef(0);
  const target = useRef<number | null>(null);
  const dragging = useRef<{
    x: number;
    pos: number;
    lastX: number;
    lastT: number;
    moved: number;
  } | null>(null);
  const items = useRef(new Map<number, HTMLDivElement>());
  const lastWritten = useRef(new Map<number, string>());
  const userMoved = useRef(false);
  const settledAt = useRef<number | null>(null);
  const [centerState, setCenter] = useState(Math.max(0, playingIndex));
  const centerRef = useRef(centerState);
  const playingRef = useRef(playingIndex);
  playingRef.current = playingIndex;
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const n = tracks.length;

  // Трек сменился не из карусели (кнопка «дальше», список) — подъезжаем к нему, но ничего не включаем.
  useEffect(() => {
    if (playingIndex >= 0 && playingIndex !== centerRef.current) {
      userMoved.current = false;
      target.current = playingIndex;
    }
  }, [playingIndex]);

  const clamp = (v: number) => Math.max(0, Math.min(n - 1, v));

  useFrame((dt) => {
    if (n === 0) return;
    if (!dragging.current) {
      if (target.current !== null) {
        pos.current = damp(pos.current, target.current, 9, dt);
        if (Math.abs(pos.current - target.current) < 0.001) {
          pos.current = target.current;
          target.current = null;
        }
      } else {
        // инерция с заметным трением и мягкая доводка до ближайшей обложки
        pos.current += vel.current * dt;
        vel.current = damp(vel.current, 0, 4.2, dt);
        if (Math.abs(vel.current) < 1.5) pos.current = damp(pos.current, Math.round(pos.current), 10, dt);
        if (pos.current < 0 || pos.current > n - 1) {
          pos.current = damp(pos.current, clamp(pos.current), 14, dt);
          vel.current *= 0.5;
        }
        if (Math.abs(pos.current - Math.round(pos.current)) < 0.0005 && Math.abs(vel.current) < 0.02) {
          pos.current = Math.round(pos.current);
          vel.current = 0;
        }
      }
    }

    const c = Math.round(clamp(pos.current));
    if (c !== centerRef.current) {
      centerRef.current = c;
      setCenter(c);
    }

    // Автозапуск: пользователь сам долистал до обложки и остановился.
    const moving = dragging.current !== null || target.current !== null || vel.current !== 0 || pos.current !== Math.round(pos.current);
    const now = performance.now();
    let progress = 0;
    if (moving || !userMoved.current || c === playingRef.current) {
      settledAt.current = null;
      if (c === playingRef.current) userMoved.current = false;
    } else {
      settledAt.current ??= now;
      progress = Math.min(1, (now - settledAt.current) / AUTOPLAY_MS);
      if (progress >= 1) {
        userMoved.current = false;
        settledAt.current = null;
        onPlayRef.current(c);
      }
    }
    countdown.current?.style.setProperty("transform", `scaleX(${progress.toFixed(3)})`);

    const w = root.current?.clientWidth ?? 1200;
    const size = Math.min(300, w * 0.24);
    root.current?.style.setProperty("--cf", `${size}px`);
    for (const [i, el] of items.current) place(i, el, size, c);
  }, 15);

  /** Поставить обложку на её место в 3D. Пишем в DOM, только если что-то поменялось. */
  function place(i: number, el: HTMLDivElement, size: number, c: number): void {
    const off = i - pos.current;
    const a = Math.abs(off);
    const sign = Math.sign(off);
    const x = a < 1 ? off * size * 0.82 : sign * (size * 0.82 + (a - 1) * size * 0.34);
    const rot = -Math.max(-1, Math.min(1, off)) * 62;
    const z = -Math.min(a, 6) * 110 - (a < 1 ? 0 : 60);
    const scale = a < 1 ? 1.12 - a * 0.12 : 1;
    // Порядок по глубине — по индексу относительно центра: у соседей никогда не совпадает, ничего не мигает.
    const zIndex = String(1000 - Math.abs(i - c) * 2 - (i < c ? 1 : 0));
    const shade = a > 0.6 ? Math.min(0.55, a * 0.1).toFixed(2) : "0";
    const opacity = Math.max(0, 1 - Math.max(0, a - 4.5) * 0.6).toFixed(2);
    const transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    const key = `${transform}|${zIndex}|${shade}|${opacity}`;
    if (lastWritten.current.get(i) === key) return;
    lastWritten.current.set(i, key);
    el.style.transform = transform;
    el.style.zIndex = zIndex;
    el.style.opacity = opacity;
    el.style.setProperty("--shade", shade);
  }

  const go = (i: number) => {
    vel.current = 0;
    userMoved.current = true;
    target.current = clamp(i);
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Вертикальный свайп двумя пальцами — прокрутка страницы, не трогаем.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      target.current = null;
      userMoved.current = true;
      vel.current = Math.max(-MAX_VEL, Math.min(MAX_VEL, vel.current + e.deltaX * 0.022));
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
  // Список сменился (другая вкладка, поиск) и стал короче — не выходим за его край, пока карусель не догонит.
  const center = Math.min(centerState, n - 1);
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
          dragging.current = {
            x: e.clientX,
            pos: pos.current,
            lastX: e.clientX,
            lastT: performance.now(),
            moved: 0,
          };
          vel.current = 0;
        }}
        onPointerMove={(e) => {
          const d = dragging.current;
          if (!d) return;
          // Одна обложка — на полширины обложки движения мышью: листается легко, но не улетает.
          const size = Math.min(300, (root.current?.clientWidth ?? 1200) * 0.24) * DRAG_PX;
          pos.current = d.pos - (e.clientX - d.x) / size;
          const now = performance.now();
          const dtm = Math.max(1, now - d.lastT);
          vel.current = Math.max(-MAX_VEL, Math.min(MAX_VEL, (-(e.clientX - d.lastX) / size / dtm) * 1000));
          d.moved += Math.abs(e.clientX - d.lastX);
          d.lastX = e.clientX;
          d.lastT = now;
          if (d.moved > 6) userMoved.current = true;
        }}
        onPointerUp={(e) => {
          const d = dragging.current;
          dragging.current = null;
          if (d && d.moved < 6) {
            // Это клик. Из-за захвата мыши e.target — сама сцена, поэтому ищем, что под курсором.
            const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            const hit = under?.closest<HTMLElement>("[data-i]");
            if (hit) {
              const i = Number(hit.dataset.i);
              userMoved.current = false;
              if (i === centerRef.current) {
                // Клик по центральной обложке: включить (если ещё не играет) и открыть плеер.
                if (i !== playingRef.current) onPlay(i);
                onOpenRef.current?.();
              } else {
                target.current = clamp(i);
                vel.current = 0;
                // по боковой — подъехать и сразу включить
                setTimeout(() => onPlayRef.current(i), 380);
              }
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
                  if (el) {
                    items.current.set(i, el);
                    // Сразу на своё место — иначе новая обложка на один кадр появляется в центре поверх других.
                    if (!lastWritten.current.has(i)) {
                      const size = Math.min(300, (root.current?.clientWidth ?? 1200) * 0.24);
                      place(i, el, size, Math.round(clamp(pos.current)));
                    }
                  } else {
                    items.current.delete(i);
                    lastWritten.current.delete(i);
                  }
                }}
                className={`cf-item ${i === center ? "center" : ""} ${i === playingIndex ? "playing" : ""}`}
              >
                {tr.cover && <div className="cf-reflect" style={{ backgroundImage: `url("${tr.cover}")` }} />}
                <div className="cf-cover" style={tr.cover ? { backgroundImage: `url("${tr.cover}")` } : undefined}>
                  <span className="cf-shade" />
                  {!tr.cover && (
                    <div className="cf-placeholder">
                      <Disc3 size={56} strokeWidth={1.1} />
                      <span>{tr.title}</span>
                    </div>
                  )}
                  {i === center && i !== playingIndex && (
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
        <div className="cf-countdown">
          <div ref={countdown} />
        </div>
      </div>
      <div className="cf-counter">
        {center + 1} / {n}
      </div>
    </div>
  );
}
