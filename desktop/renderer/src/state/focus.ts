// Таймер фокуса (помодоро): работает в фоне, даже если ты на другом экране.
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { createStore } from "../lib/store";
import { app, toast, updateSettings } from "./app";
import { chimeOnce } from "./alarms";
import { player, playQueue, togglePlay } from "./player";
import type { DistractionLog } from "../../../shared/types";

/** Отвлечения: программы не из «рабочих», куда переключался во время фокуса. */
export function distractionsOf(log: DistractionLog | undefined): DistractionLog["apps"] {
  const work = new Set(app.get().settings.focus.workApps.map((x) => x.toLowerCase()));
  return (log?.apps ?? []).filter((a) => !work.has(a.app.toLowerCase()));
}

let watching = false;
function watchApps(on: boolean): void {
  if (on && !watching && app.get().settings.focus.trackApps) {
    watching = true;
    void api.distract.start();
  } else if (!on && watching) {
    watching = false;
    void api.distract.stop().then((log) => {
      if (!log) return;
      focus.set({ distractions: log });
      const d = distractionsOf(log);
      const times = d.reduce((a, x) => a + x.switches, 0);
      if (times) toast(`Во время фокуса отвлекался ${times} раз: ${d.slice(0, 3).map((x) => x.app).join(", ")}. Подробнее — в «Фокусе».`, "info");
    });
  }
}

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
  /** Куда отвлекался в прошлой рабочей сессии. */
  distractions?: DistractionLog;
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

export const focusToday = createStore({
  minutes: 0,
  week: [] as { day: string; minutes: number }[],
});

export function remainingMs(): number {
  const s = focus.get();
  return s.running ? Math.max(0, s.endsAt - Date.now()) : s.remaining;
}

export function setMode(mode: FocusMode): void {
  const ms = minutesFor(mode) * 60e3;
  focus.set({ mode, running: false, remaining: ms, total: ms });
}

/** Музыка под режим: на работу и на перерыв — свои плейлисты (если выбраны в «Фокусе»). */
let playingFor: "work" | "break" | null = null;
export function playFocusPlaylist(kind: "work" | "break"): boolean {
  const cfg = app.get().settings.focus;
  const id = kind === "work" ? cfg.workPlaylist : cfg.breakPlaylist;
  if (!id || playingFor === kind) return false;
  const pl = player.get().playlists.find((p) => p.id === id);
  const byId = new Map(player.get().library.tracks.map((t) => [t.id, t]));
  const tracks = (pl?.trackIds ?? []).map((t) => byId.get(t)).filter((t): t is NonNullable<typeof t> => !!t);
  if (!tracks.length) return false;
  playingFor = kind;
  void playQueue(tracks, Math.floor(Math.random() * tracks.length));
  return true;
}

/** Фоновые звуки «вместе с фокусом»: включаются на работу, выключаются на перерыв. */
function ambienceForFocus(on: boolean): void {
  const a = app.get().settings.ambience;
  if (a.withFocus && a.on !== on && Object.values(a.levels).some((v) => v > 0)) updateSettings({ ambience: { ...a, on } });
}

export function start(): void {
  const s = focus.get();
  if (s.mode === "work") ambienceForFocus(true);
  if (s.mode === "work") watchApps(true);
  focus.set({
    running: true,
    endsAt: Date.now() + s.remaining,
    startedAt: s.startedAt ?? new Date().toISOString(),
  });
  // Свой плейлист на работу — включаем его; иначе просто продолжаем музыку, если она стоит.
  if (s.mode === "work" && !playFocusPlaylist("work") && app.get().settings.focus.autoMusic && !player.get().playing && player.get().library.tracks.length) {
    togglePlay();
  }
}

export function pause(): void {
  focus.set({ running: false, remaining: remainingMs() });
  watchApps(false);
}

export function reset(): void {
  watchApps(false);
  playingFor = null;
  ambienceForFocus(false);
  setMode(focus.get().mode);
  focus.set({ startedAt: undefined });
}

async function complete(): Promise<void> {
  const s = focus.get();
  chimeOnce();
  watchApps(false);
  if (s.mode === "work") {
    const minutes = s.total / 60e3;
    await api.focus.add({
      subject: s.subject || null,
      minutes,
      startedAt: s.startedAt ?? new Date().toISOString(),
    });
    const rounds = s.rounds + 1;
    ambienceForFocus(false);
    playFocusPlaylist("break");
    const every = app.get().settings.focus.longEvery;
    const nextMode: FocusMode = every > 0 && rounds % every === 0 ? "long" : "short";
    void api.notify("Фокус завершён 🎉", `${Math.round(minutes)} минут${s.subject ? ` · ${s.subject}` : ""}. Время отдохнуть.`);
    toast("Сессия фокуса завершена — перерыв!", "ok");
    focus.set({ rounds });
    setMode(nextMode);
    if (player.get().playing) engine.volume = app.get().settings.volume * 0.75; // на перерыве потише
    void refreshFocusStats();
  } else {
    void api.notify("Перерыв окончен", "Погнали дальше 💪");
    toast("Перерыв окончен", "info");
    engine.volume = app.get().settings.volume;
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

/**
 * Меню-бар: идёт фокус — «⏱ 18:42 Матан», иначе ближайший дедлайн в пределах суток — «⚑ Матан · 5 ч».
 */
export function watchMenubar(tasks: () => { title: string; subject: string | null; dueAt: string | null; status: string }[]): () => void {
  let last = "";
  const tick = () => {
    let text = "";
    if (app.get().settings.menubar) {
      const s = focus.get();
      if (s.running) {
        const left = remainingMs();
        const mm = String(Math.floor(left / 60e3)).padStart(2, "0");
        const ss = String(Math.floor((left % 60e3) / 1000)).padStart(2, "0");
        text = `${s.mode === "work" ? "⏱" : "☕"} ${mm}:${ss}${s.subject ? ` ${s.subject}` : ""}`;
      } else {
        const now = Date.now();
        const soon = tasks()
          .filter((t) => (t.status === "todo" || t.status === "in_progress") && t.dueAt)
          .map((t) => ({ t, ms: new Date(t.dueAt!).getTime() - now }))
          .filter((x) => x.ms > 0 && x.ms < 24 * 3600e3)
          .sort((a, b) => a.ms - b.ms)[0];
        if (soon) {
          const h = Math.floor(soon.ms / 3600e3);
          const m = Math.floor((soon.ms % 3600e3) / 60e3);
          text = `⚑ ${soon.t.subject ?? soon.t.title} · ${h ? `${h} ч` : `${m} мин`}`;
        }
      }
    }
    if (text !== last) {
      last = text;
      void api.system.trayStatus(text);
    }
  };
  const t = window.setInterval(tick, 1000);
  tick();
  return () => clearInterval(t);
}
