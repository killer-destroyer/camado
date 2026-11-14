// Единый цикл кадров. Работает на частоте монитора (60, 144, 165 Гц…)
// или с ограничением из настроек. Все анимации получают dt — время кадра в секундах,
// поэтому скорость одинакова при любой частоте.
import { useEffect, useRef } from "react";

export type FrameFn = (dt: number, t: number) => void;

interface Sub {
  fn: FrameFn;
  priority: number;
  /** Откуда подписались — для замера, кто сколько ест в кадре. */
  label: string;
}

// Замер для проверки производительности: window.__camadoFrameStats(true) — начать, (false) — итог.
const prof = { on: false, frames: 0, total: 0, by: new Map<string, number>() };
(globalThis as { __camadoFrameStats?: (start: boolean) => unknown }).__camadoFrameStats = (start: boolean) => {
  if (start) {
    prof.on = true;
    prof.frames = 0;
    prof.total = 0;
    prof.by.clear();
    return true;
  }
  prof.on = false;
  const per = (ms: number) => Math.round((ms / Math.max(1, prof.frames)) * 100) / 100;
  return {
    frames: prof.frames,
    msPerFrame: per(prof.total),
    top: [...prof.by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, per(v)]),
  };
};

const subs: Sub[] = [];
let cap = 0;
let last = 0;
let running = false;

// Счётчик FPS
let fpsFrames = 0;
let fpsTime = 0;
export const fps = { value: 0 };

export function setFpsCap(value: number): void {
  cap = value;
}

function loop(now: number): void {
  requestAnimationFrame(loop);
  if (last === 0) last = now;
  const elapsed = now - last;
  if (cap > 0) {
    const interval = 1000 / cap;
    if (elapsed < interval - 1) return;
    last = now - (elapsed % interval);
  } else {
    last = now;
  }
  const dt = Math.min(elapsed / 1000, 0.1);

  fpsFrames++;
  fpsTime += elapsed;
  if (fpsTime >= 500) {
    fps.value = Math.round((fpsFrames * 1000) / fpsTime);
    fpsFrames = 0;
    fpsTime = 0;
  }

  const t = now / 1000;
  if (prof.on) prof.frames++;
  for (const s of subs) {
    const t0 = prof.on ? performance.now() : 0;
    try {
      s.fn(dt, t);
    } catch (err) {
      console.error("Ошибка в кадре:", err);
    }
    if (prof.on) {
      const d = performance.now() - t0;
      prof.total += d;
      prof.by.set(s.label, (prof.by.get(s.label) ?? 0) + d);
    }
  }
}

export function onFrame(fn: FrameFn, priority = 0, label = `p${priority}:${String(fn).replace(/\s+/g, " ").slice(0, 70)}`): () => void {
  const sub = { fn, priority, label };
  subs.push(sub);
  subs.sort((a, b) => a.priority - b.priority);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
  return () => {
    const i = subs.indexOf(sub);
    if (i >= 0) subs.splice(i, 1);
  };
}

/** Хук: функция вызывается каждый кадр. Последняя версия функции берётся из ref. */
export function useFrame(fn: FrameFn, priority = 0, label?: string): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => onFrame((dt, t) => ref.current(dt, t), priority, label ?? `p${priority}:${String(fn).replace(/\s+/g, " ").slice(0, 70)}`), [priority, label]); // eslint-disable-line react-hooks/exhaustive-deps
}
