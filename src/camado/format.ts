import type { Task, TaskKind } from "../store.js";
import { formatLocal } from "../time.js";

const KIND_LABEL: Record<TaskKind, string> = {
  homework: "ДЗ",
  test: "Контрольная",
  exam: "Экзамен",
  lab: "Лаба",
  other: "Дело",
};

const STATUS_LABEL = {
  todo: "не начато",
  in_progress: "в процессе",
  done: "сдано",
  cancelled: "отменено",
} as const;

export function formatTask(t: Task, timeZone: string): string {
  const subject = t.subject ? `[${t.subject}] ` : "";
  const due = t.dueAt ? ` — до ${formatLocal(t.dueAt, timeZone)}` : " — срок не указан";
  return `#${t.id} ${KIND_LABEL[t.kind]}: ${subject}${t.title}${due} (${STATUS_LABEL[t.status]})`;
}

export function formatTaskList(tasks: Task[], timeZone: string): string {
  if (tasks.length === 0) return "Заданий нет.";
  return tasks.map((t) => formatTask(t, timeZone)).join("\n");
}

export { KIND_LABEL };
