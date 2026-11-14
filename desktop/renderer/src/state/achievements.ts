// Ачивки и уровень: пересчитываем после изменений, новые — поздравляем.
import { levelOf, unlocked, focusStreak, type AchStats } from "../../../shared/achievements";
import { ACHIEVEMENTS } from "../../../shared/achievements";
import { api } from "../lib/api";
import { createStore } from "../lib/store";
import { app, toast, updateSettings } from "./app";

export const achievements = createStore<{ level: number; pct: number; xp: number; streak: number; got: string[] }>({
  level: 1,
  pct: 0,
  xp: 0,
  streak: 0,
  got: [],
});

let busy = false;
export async function refreshAchievements(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const yearAgo = new Date(Date.now() - 365 * 86400e3).toISOString();
    const [focus, tasks, plays, links, cards] = await Promise.all([
      api.focus.list(yearAgo),
      api.tasks.list(true),
      api.plays.stats(yearAgo, 10000),
      api.links.list(),
      api.cards.list(),
    ]);
    const s: AchStats = {
      focus: focus.map((f) => ({ minutes: f.minutes, startedAt: f.startedAt })),
      done: tasks.filter((t) => t.status === "done").map((t) => ({ dueAt: t.dueAt, doneAt: t.updatedAt })),
      plays: plays.reduce((a, p) => a + p.plays, 0),
      links: links.length,
      cardsReviewed: cards.reduce((a, c) => a + c.reps, 0),
    };
    const got = unlocked(s);
    const lv = levelOf(s);
    achievements.set({ ...lv, streak: focusStreak(s.focus), got });
    // новые — поздравить и запомнить (первый запуск — просто запомнить, без салюта на старые)
    const saved = app.get().settings.achievements;
    const fresh = got.filter((id) => !saved[id]);
    if (fresh.length) {
      const first = Object.keys(saved).length === 0 && fresh.length > 2;
      if (!first) for (const id of fresh) {
        const a = ACHIEVEMENTS.find((x) => x.id === id)!;
        toast(`${a.icon} Ачивка: «${a.name}» — ${a.hint}`, "ok");
      }
      const now = new Date().toISOString();
      updateSettings({ achievements: { ...saved, ...Object.fromEntries(fresh.map((id) => [id, now])) } });
    }
  } finally {
    busy = false;
  }
}

export function watchAchievements(): () => void {
  let t: number | undefined;
  const later = () => {
    clearTimeout(t);
    t = window.setTimeout(() => void refreshAchievements(), 1500);
  };
  const off = api.on("data-changed", later);
  setTimeout(() => void refreshAchievements(), 3000);
  return () => {
    off();
    clearTimeout(t);
  };
}
