// «План на сегодня»: что сделать в первую очередь и сколько времени на это заложить.
// Без ИИ — простые понятные правила: срочность, тип задания, сколько уже позанимался.
import type { Task } from "./types.js";

export interface PlanStep {
  task: Task;
  minutes: number;
  reason: string;
  score: number;
}

const H = 3600e3;
const DAY_BUDGET = 180; // минут учёбы в день по умолчанию

/** Сколько обычно уходит на задание такого типа (минуты). */
const BASE: Record<Task["kind"], number> = { homework: 50, lab: 75, test: 75, exam: 100, other: 25 };

function score(t: Task, now: number): { score: number; reason: string } {
  if (!t.dueAt) return { score: 10, reason: "без срока — когда будет время" };
  const left = new Date(t.dueAt).getTime() - now;
  const days = left / (24 * H);
  const big = t.kind === "test" || t.kind === "exam";
  if (left < 0) return { score: 100, reason: "просрочено — закрыть в первую очередь" };
  if (left < 24 * H) return { score: 90, reason: big ? "уже завтра — финальное повторение" : "сдать в ближайшие сутки" };
  if (big && days < 4) {
    const n = Math.ceil(days);
    return { score: 75, reason: `${t.kind === "exam" ? "экзамен" : "контрольная"} через ${n} ${n === 1 ? "день" : "дня"} — повтори` };
  }
  if (days < 3) return { score: 55, reason: "срок через пару дней" };
  if (big && days < 10) return { score: 40, reason: "готовиться понемногу каждый день" };
  return { score: 20 - Math.min(10, days / 3), reason: "можно начать заранее" };
}

export function buildDayPlan(tasks: Task[], now = Date.now(), doneToday = 0, session = 25): PlanStep[] {
  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const ranked = open
    .map((t) => ({ t, ...score(t, now) }))
    .sort((a, b) => b.score - a.score || (a.t.dueAt ?? "~").localeCompare(b.t.dueAt ?? "~"));

  let budget = Math.max(session, DAY_BUDGET - doneToday);
  const steps: PlanStep[] = [];
  for (const r of ranked) {
    if (budget < session / 2 || steps.length >= 5) break; // не втискиваем дело в последние 5 минут
    // Далёкие дела — короче: важно начать, а не закончить.
    const want = r.score >= 75 ? BASE[r.t.kind] : r.score >= 40 ? BASE[r.t.kind] * 0.6 : session;
    const sessions = Math.max(1, Math.round(Math.min(want, budget) / session));
    const minutes = sessions * session;
    steps.push({ task: r.t, minutes, reason: r.reason, score: r.score });
    budget -= minutes;
  }
  return steps;
}
