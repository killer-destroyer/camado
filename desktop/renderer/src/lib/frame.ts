// Единый цикл кадров. Работает на частоте монитора (60, 144, 165 Гц…)
// или с ограничением из настроек. Все анимации получают dt — время кадра в секундах,
// поэтому скорость одинакова при любой частоте.
import { useEffect, useRef } from "react";

export type FrameFn = (dt: number, t: number) => void;

interface Sub {
  fn: FrameFn;
  priority: number;
}

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
  for (const s of subs) {
    try {
      s.fn(dt, t);
    } catch (err) {
      console.error("Ошибка в кадре:", err);
    }
  }
}

export function onFrame(fn: FrameFn, priority = 0): () => void {
  const sub = { fn, priority };
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
export function useFrame(fn: FrameFn, priority = 0): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => onFrame((dt, t) => ref.current(dt, t), priority), [priority]);
}
