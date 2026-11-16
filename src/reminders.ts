import { formatTask, formatTaskList, KIND_LABEL } from "./camado/format.js";
import type { Store, Task, TaskKind } from "./store.js";
import { localParts } from "./time.js";

const HOUR = 60 * 60 * 1000;

interface Rule {
  id: string;
  before: number; // за сколько мс до срока
  kinds?: TaskKind[]; // только для этих типов; без поля — для всех
  label: string;
}

// От самого раннего к самому позднему.
export const RULES: Rule[] = [
  { id: "3d", before: 72 * HOUR, kinds: ["test", "exam"], label: "через 3 дня" },
  { id: "24h", before: 24 * HOUR, label: "меньше чем через сутки" },
  { id: "3h", before: 3 * HOUR, label: "меньше чем через 3 часа" },
];

export interface DueReminder {
  task: Task;
  rule: Rule;
  /** Более ранние правила, которые уже неактуальны: отметить без отправки. */
  skipped: Rule[];
}

/**
 * Какие напоминания пора отправить. Если задание добавили поздно и
 * подходят сразу несколько правил, шлём только самое срочное.
 */
export function dueReminders(
  tasks: Task[],
  now: Date,
  wasSent: (taskId: number, rule: string) => boolean,
): DueReminder[] {
  const out: DueReminder[] = [];
  for (const task of tasks) {
    if (!task.dueAt || task.status === "done" || task.status === "cancelled") continue;
    const left = new Date(task.dueAt).getTime() - now.getTime();
    if (left <= 0) continue;

    const applicable = RULES.filter((r) => (!r.kinds || r.kinds.includes(task.kind)) && left <= r.before);
    const mostUrgent = applicable.at(-1);
    if (!mostUrgent || wasSent(task.id, mostUrgent.id)) continue;
    out.push({
      task,
      rule: mostUrgent,
      skipped: applicable.slice(0, -1).filter((r) => !wasSent(task.id, r.id)),
    });
  }
  return out;
}

export function reminderText(r: DueReminder, timeZone: string): string {
  const what = KIND_LABEL[r.task.kind];
  return `⏰ ${what} — срок ${r.rule.label}:\n${formatTask(r.task, timeZone)}`;
}

const MORNING_HOUR = 8;

/** Утренняя сводка: что горит сегодня и что на ближайшие 3 дня. Без модели — бесплатно. */
export function morningDigest(tasks: Task[], now: Date, timeZone: string): string {
  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const today = localParts(now, timeZone).ymd;
  const soonLimit = now.getTime() + 72 * HOUR;

  const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now.getTime());
  const dueToday = open.filter(
    (t) => t.dueAt && new Date(t.dueAt) >= now && localParts(new Date(t.dueAt), timeZone).ymd === today,
  );
  const soon = open.filter(
    (t) =>
      t.dueAt &&
      !dueToday.includes(t) &&
      new Date(t.dueAt).getTime() >= now.getTime() &&
      new Date(t.dueAt).getTime() <= soonLimit,
  );

  const parts = ["☀️ Доброе утро! Сводка на сегодня."];
  if (overdue.length) parts.push(`\n🔴 Просрочено:\n${formatTaskList(overdue, timeZone)}`);
  if (dueToday.length) parts.push(`\n🟠 Сегодня:\n${formatTaskList(dueToday, timeZone)}`);
  if (soon.length) parts.push(`\n🟡 Ближайшие 3 дня:\n${formatTaskList(soon, timeZone)}`);
  if (!overdue.length && !dueToday.length && !soon.length) parts.push("\nНа ближайшие 3 дня сроков нет. 👌");
  return parts.join("\n");
}

/** Раз в минуту проверяет сроки и шлёт напоминания и утреннюю сводку. */
export function startReminderLoop(
  store: Store,
  send: (text: string) => Promise<unknown>,
  timeZone: string,
  now: () => Date = () => new Date(),
): () => void {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const t = now();
      const tasks = store.listTasks();

      for (const r of dueReminders(tasks, t, (id, rule) => store.wasReminderSent(id, rule))) {
        await send(reminderText(r, timeZone));
        store.markReminderSent(r.task.id, r.rule.id);
        for (const s of r.skipped) store.markReminderSent(r.task.id, s.id);
      }

      const { ymd, hour } = localParts(t, timeZone);
      if (hour >= MORNING_HOUR && hour < MORNING_HOUR + 4 && store.getKv("morning_digest_day") !== ymd) {
        store.setKv("morning_digest_day", ymd);
        await send(morningDigest(tasks, t, timeZone));
      }
    } catch (err) {
      console.error("Ошибка в напоминаниях:", err);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), 60_000);
  return () => clearInterval(timer);
}
