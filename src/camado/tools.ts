import { z } from "zod";
import { defineTool } from "../llm/tool.js";
import type { ToolDef } from "../llm/types.js";
import { TASK_KINDS, TASK_STATUSES, type Store } from "../store.js";
import { formatTask, formatTaskList } from "./format.js";

// Дата со смещением пояса, например 2026-11-07T23:59:00-05:00.
const isoDate = z
  .string()
  .refine((s) => /[zZ]|[+-]\d{2}:\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)), {
    message: "нужна дата в ISO 8601 со смещением пояса, например 2026-11-07T23:59:00-05:00",
  })
  .transform((s) => new Date(s).toISOString());

/** Инструменты, которыми Камадо пользуется сам во время разговора. */
export function buildTools(store: Store, timeZone: string): ToolDef[] {
  return [
    defineTool({
      name: "add_task",
      description:
        "Сохранить новое задание: ДЗ, контрольную, экзамен, лабу или другое учебное дело. " +
        "Перед вызовом проверь list_tasks, чтобы не создать дубликат.",
      schema: z.object({
        title: z.string().min(1).describe("Коротко, что сделать: «Решить №5–12», «Контрольная по теме 3»"),
        subject: z.string().optional().describe("Предмет, например «Матанализ»"),
        details: z
          .string()
          .optional()
          .describe("Подробности: условия, ссылки, куда и в каком виде сдавать"),
        kind: z.enum(TASK_KINDS).optional().describe("Тип; по умолчанию homework"),
        due_at: isoDate.optional().describe("Срок в ISO 8601 со смещением пояса пользователя"),
      }),
      run: (i) => {
        const task = store.addTask({
          title: i.title,
          subject: i.subject,
          details: i.details,
          kind: i.kind,
          dueAt: i.due_at,
        });
        return `Сохранено: ${formatTask(task, timeZone)}`;
      },
    }),

    defineTool({
      name: "list_tasks",
      description: "Список заданий. По умолчанию только открытые (не сданные и не отменённые).",
      schema: z.object({
        include_closed: z.boolean().optional().describe("Показать и сданные/отменённые"),
      }),
      run: (i) => {
        const tasks = store.listTasks({ includeClosed: i.include_closed });
        const lines = tasks.map((t) => {
          const base = formatTask(t, timeZone);
          return t.details ? `${base}\n   ${t.details}` : base;
        });
        return lines.length ? lines.join("\n") : formatTaskList([], timeZone);
      },
    }),

    defineTool({
      name: "update_task",
      description:
        "Изменить задание: статус (сдал, начал, отменили), срок, название, подробности, предмет.",
      schema: z.object({
        id: z.number().int().describe("Номер задания (#id)"),
        status: z.enum(TASK_STATUSES).optional(),
        due_at: isoDate.optional(),
        title: z.string().min(1).optional(),
        details: z.string().optional(),
        subject: z.string().optional(),
        kind: z.enum(TASK_KINDS).optional(),
      }),
      run: (i) => {
        const task = store.updateTask(i.id, {
          status: i.status,
          dueAt: i.due_at,
          title: i.title,
          details: i.details,
          subject: i.subject,
          kind: i.kind,
        });
        if (!task) throw new Error(`Задания #${i.id} нет`);
        return `Обновлено: ${formatTask(task, timeZone)}`;
      },
    }),

    defineTool({
      name: "save_subject",
      description:
        "Создать или дополнить карточку предмета: преподаватель и всё полезное — сайт, где сдавать, " +
        "где записываться, ссылка на чат, правила препода. Новые поля дополняют старые.",
      schema: z.object({
        name: z.string().min(1),
        teacher: z.string().optional(),
        info: z.string().optional().describe("Полный текст карточки (заменяет прежний). Сохрани старое, если оно ещё актуально."),
      }),
      run: (i) => {
        const s = store.saveSubject(i);
        return `Карточка «${s.name}» сохранена.`;
      },
    }),

    defineTool({
      name: "list_subjects",
      description: "Все карточки предметов с преподами, ссылками и правилами.",
      schema: z.object({}),
      run: () => {
        const subjects = store.listSubjects();
        if (subjects.length === 0) return "Карточек предметов пока нет.";
        return subjects
          .map((s) => `${s.name}${s.teacher ? ` (${s.teacher})` : ""}${s.info ? `\n   ${s.info}` : ""}`)
          .join("\n");
      },
    }),

    defineTool({
      name: "remember",
      description:
        "Запомнить надолго важный факт о пользователе, его учёбе, преподах или сайтах. " +
        "Не дублируй то, что уже есть в памяти.",
      schema: z.object({ fact: z.string().min(1) }),
      run: (i) => {
        const m = store.remember(i.fact);
        return `Запомнил (#${m.id}).`;
      },
    }),

    defineTool({
      name: "forget",
      description: "Удалить факт из памяти по номеру — если он устарел или пользователь просит забыть.",
      schema: z.object({ id: z.number().int() }),
      run: (i) => (store.forget(i.id) ? "Забыл." : `Факта #${i.id} нет.`),
    }),
  ];
}
