// Ачивки, уровни и серии: за фокус, сданные задания и привычки. Считаются из того, что уже есть в базе.

export interface AchStats {
  /** Сессии фокуса: минуты и время начала. */
  focus: { minutes: number; startedAt: string }[];
  /** Сданные задания: срок (если был) и когда отметили. */
  done: { dueAt: string | null; doneAt: string }[];
  plays: number;
  links: number;
  cardsReviewed: number;
}

export interface Achievement {
  id: string;
  name: string;
  hint: string;
  icon: string;
  check: (s: AchStats, d: Derived) => boolean;
}

interface Derived {
  focusMin: number;
  bestDayMin: number;
  streak: number;
}

/** Сколько дней подряд был фокус (сегодня или вчера — серия ещё живая). */
export function focusStreak(focus: AchStats["focus"], now = new Date()): number {
  const days = new Set(focus.map((f) => new Date(f.startedAt).toDateString()));
  let streak = 0;
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function derive(s: AchStats, now = new Date()): Derived {
  const byDay = new Map<string, number>();
  for (const f of s.focus) byDay.set(new Date(f.startedAt).toDateString(), (byDay.get(new Date(f.startedAt).toDateString()) ?? 0) + f.minutes);
  return {
    focusMin: s.focus.reduce((a, f) => a + f.minutes, 0),
    bestDayMin: Math.max(0, ...byDay.values()),
    streak: focusStreak(s.focus, now),
  };
}

const hourOf = (iso: string) => new Date(iso).getHours();

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_focus", name: "Первый шаг", hint: "первая сессия фокуса", icon: "🌱", check: (s) => s.focus.length >= 1 },
  { id: "streak3", name: "Втянулся", hint: "фокус 3 дня подряд", icon: "🔥", check: (_s, d) => d.streak >= 3 },
  { id: "streak7", name: "Неделя огня", hint: "фокус 7 дней подряд", icon: "🌋", check: (_s, d) => d.streak >= 7 },
  { id: "focus10h", name: "10 часов", hint: "10 часов в фокусе всего", icon: "⏳", check: (_s, d) => d.focusMin >= 600 },
  { id: "focus50h", name: "Полсотни", hint: "50 часов в фокусе всего", icon: "🏔️", check: (_s, d) => d.focusMin >= 3000 },
  { id: "marathon", name: "Марафон", hint: "3 часа фокуса за один день", icon: "🏃", check: (_s, d) => d.bestDayMin >= 180 },
  { id: "night", name: "Ночная сова", hint: "фокус после 23:00", icon: "🦉", check: (s) => s.focus.some((f) => hourOf(f.startedAt) >= 23 || hourOf(f.startedAt) < 4) },
  { id: "early", name: "Ранняя пташка", hint: "фокус до 8 утра", icon: "🐦", check: (s) => s.focus.some((f) => hourOf(f.startedAt) >= 5 && hourOf(f.startedAt) < 8) },
  { id: "done10", name: "Десяточка", hint: "10 заданий сдано", icon: "✅", check: (s) => s.done.length >= 10 },
  { id: "done50", name: "Машина", hint: "50 заданий сдано", icon: "🤖", check: (s) => s.done.length >= 50 },
  { id: "ontime", name: "Всё вовремя", hint: "10 заданий сдано до срока", icon: "🎯", check: (s) => s.done.filter((t) => t.dueAt && t.doneAt <= t.dueAt).length >= 10 },
  {
    id: "clutch",
    name: "На последней минуте",
    hint: "сдал меньше чем за час до срока",
    icon: "😅",
    check: (s) => s.done.some((t) => t.dueAt && t.doneAt <= t.dueAt && new Date(t.dueAt).getTime() - new Date(t.doneAt).getTime() < 3600e3),
  },
  { id: "music100", name: "Меломан", hint: "100 прослушиваний", icon: "🎧", check: (s) => s.plays >= 100 },
  { id: "links10", name: "Всё по полочкам", hint: "10 ссылок на уроки", icon: "🗂️", check: (s) => s.links >= 10 },
  { id: "cards50", name: "Память как сейф", hint: "50 повторений карточек", icon: "🧠", check: (s) => s.cardsReviewed >= 50 },
];

/** Уровень: опыт = минуты фокуса + 30 за каждое сданное задание. */
export function levelOf(s: AchStats): { level: number; xp: number; next: number; pct: number } {
  const xp = Math.round(s.focus.reduce((a, f) => a + f.minutes, 0) + s.done.length * 30);
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const cur = (level - 1) ** 2 * 60;
  const next = level ** 2 * 60;
  return { level, xp, next, pct: Math.round(((xp - cur) / (next - cur)) * 100) };
}

export function unlocked(s: AchStats, now = new Date()): string[] {
  const d = derive(s, now);
  return ACHIEVEMENTS.filter((a) => a.check(s, d)).map((a) => a.id);
}
