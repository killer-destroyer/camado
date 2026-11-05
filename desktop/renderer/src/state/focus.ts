// Таймер фокуса (помодоро): работает в фоне, даже если ты на другом экране.
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { createStore } from "../lib/store";
import { app, toast } from "./app";
import { player, togglePlay } from "./player";

export type FocusMode = "work" | "short" | "long";

interface FocusState {
  mode: FocusMode;
  running: boolean;
  endsAt: number; // Date.now() окончания, если идёт
  remaining: number; // мс, если на паузе
  total: number; // мс всей сессии
  subject: string;
  rounds: number; // сколько рабочих сессий подряд
  startedAt?: string;
}

const minutesFor = (m: FocusMode) => app.get().settings.focus[m === "work" ? "work" : m === "short" ? "short" : "long"];

export const focus = createStore<FocusState>({
  mode: "work",
  running: false,
  endsAt: 0,
  remaining: 25 * 60e3,
  total: 25 * 60e3,
  subject: "",
  rounds: 0,
});

export const focusToday = createStore({ minutes: 0, week: [] as { day: string; minutes: number }[] });

export function remainingMs(): number {
  const s = focus.get();
  return s.running ? Math.max(0, s.endsAt - Date.now()) : s.remaining;
}

export function setMode(mode: FocusMode): void {
  const ms = minutesFor(mode) * 60e3;
  focus.set({ mode, running: false, remaining: ms, total: ms });
}

export function start(): void {
  const s = focus.get();
  focus.set({ running: true, endsAt: Date.now() + s.remaining, startedAt: s.startedAt ?? new Date().toISOString() });
  if (s.mode === "work" && app.get().settings.focus.autoMusic && !player.get().playing && player.get().library.tracks.length) {
    togglePlay();
  }
}

export function pause(): void {
  focus.set({ running: false, remaining: remainingMs() });
}

export function reset(): void {
  setMode(focus.get().mode);
  focus.set({ startedAt: undefined });
}

function chime(): void {
  // Короткий приятный звук из трёх нот — без файлов.
  const ctx = new AudioContext();
  [660, 880, 1320].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const t0 = ctx.currentTime + i * 0.16;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 1);
  });
  setTimeout(() => void ctx.close(), 1800);
}

async function complete(): Promise<void> {
  const s = focus.get();
  chime();
  if (s.mode === "work") {
    const minutes = s.total / 60e3;
    await api.focus.add({ subject: s.subject || null, minutes, startedAt: s.startedAt ?? new Date().toISOString() });
    const rounds = s.rounds + 1;
    const nextMode: FocusMode = rounds % 4 === 0 ? "long" : "short";
    void api.notify("Фокус завершён 🎉", `${Math.round(minutes)} минут${s.subject ? ` · ${s.subject}` : ""}. Время отдохнуть.`);
    toast("Сессия фокуса завершена — перерыв!", "ok");
    focus.set({ rounds });
    setMode(nextMode);
    if (player.get().playing && engine.el.volume > 0.3) engine.el.volume = 0.3; // на перерыве потише
    void refreshFocusStats();
  } else {
    void api.notify("Перерыв окончен", "Погнали дальше 💪");
    toast("Перерыв окончен", "info");
    engine.el.volume = app.get().settings.volume;
    setMode("work");
  }
  focus.set({ startedAt: undefined });
}

export function initFocus(): () => void {
  const t = window.setInterval(() => {
    const s = focus.get();
    if (s.running && Date.now() >= s.endsAt) {
      focus.set({ running: false, remaining: 0 });
      void complete();
    }
  }, 250);
  void refreshFocusStats();
  return () => clearInterval(t);
}

export async function refreshFocusStats(): Promise<void> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const sessions = await api.focus.list(start.toISOString());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toDateString();
    return {
      day: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d),
      minutes: sessions.filter((s) => new Date(s.startedAt).toDateString() === key).reduce((a, s) => a + s.minutes, 0),
    };
  });
  focusToday.set({ week, minutes: week.at(-1)?.minutes ?? 0 });
}
