// Напоминания со звуком: звенит выбранный звук (плавно громче), музыка притихает,
// на экране — «Стоп» и «Отложить». Свои напоминания («напомни в 18:00») живут в настройках.
import type { AlarmItem } from "../../../shared/settings";
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { startAlarm, stopAlarm } from "../lib/alarmSounds";
import { createStore } from "../lib/store";
import { app, updateSettings } from "./app";

export const alarms = createStore<{ ringing?: { text: string } }>({});

const AUTO_STOP_MS = 90_000;
let autoStop: number | undefined;

function soundOptions(once = false) {
  const a = app.get().settings.alarm;
  return {
    sound: a.sound,
    ramp: once ? 0 : a.ramp,
    volume: a.volume,
    customUrl: a.customUrl,
    once,
  };
}

/** Позвонить: звук по кругу, пока не нажмут «Стоп» (или полторы минуты). */
export function ring(text: string): void {
  alarms.set({ ringing: { text } });
  // музыку приглушаем, чтобы будильник было слышно
  engine.volume = app.get().settings.volume * 0.45;
  startAlarm(soundOptions());
  clearTimeout(autoStop);
  autoStop = window.setTimeout(dismiss, AUTO_STOP_MS);
}

export function dismiss(): void {
  clearTimeout(autoStop);
  stopAlarm();
  engine.volume = app.get().settings.volume;
  alarms.set({ ringing: undefined });
}

/** Отложить на N минут. */
export function snooze(minutes = 10): void {
  const text = alarms.get().ringing?.text ?? "Напоминание";
  dismiss();
  addAlarm(text.replace(/^⏰\s*/, ""), new Date(Date.now() + minutes * 60e3));
}

/** Короткий звук один раз — для проверки и конца фокуса. */
export function chimeOnce(): void {
  startAlarm(soundOptions(true));
}

export function addAlarm(text: string, at: Date): void {
  const item: AlarmItem = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: at.toISOString(),
    text,
  };
  const list = [...app.get().settings.alarms, item].sort((a, b) => a.at.localeCompare(b.at));
  void updateSettings({ alarms: list });
}

export function removeAlarm(id: string): void {
  void updateSettings({
    alarms: app.get().settings.alarms.filter((a) => a.id !== id),
  });
}

/** Проверяем свои напоминания раз в 10 секунд — окно может быть скрыто в трей, это не мешает. */
export function initAlarms(): () => void {
  const tick = () => {
    const now = Date.now();
    const list = app.get().settings.alarms;
    const due = list.filter((a) => new Date(a.at).getTime() <= now);
    if (!due.length) return;
    void updateSettings({ alarms: list.filter((a) => !due.includes(a)) });
    const text = due.map((a) => a.text).join(" · ");
    void api.notify("⏰ Камадо", text);
    ring(text);
  };
  tick();
  const t = window.setInterval(tick, 10_000);
  return () => clearInterval(t);
}
