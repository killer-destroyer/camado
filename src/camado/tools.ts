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

/** Ссылку сравниваем без «https://», «www.», регистра и хвостового «/». */
const urlKey = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#]+$/, "");

/** Инструменты, которыми Камадо пользуется сам во время разговора. turnText — текст этого сообщения и недавней переписки. */
export function buildTools(store: Store, timeZone: string, turnText: () => string = () => ""): ToolDef[] {
  // Ссылку можно сохранить, только если она правда встречалась: в переписке или уже лежит в Камадо.
  // Иначе модель иногда «додумывает» адрес (…/placeholder), и ссылка никуда не ведёт.
  const knownText = () =>
    [
      turnText(),
      ...store.listTasks({ includeClosed: true }).map((t) => `${t.title} ${t.details ?? ""}`),
      ...store.listSubjects().map((s) => `${s.teacher ?? ""} ${s.info ?? ""}`),
      ...store.listNotes().map((n) => n.body),
      ...store.listLinks().map((l) => l.url),
    ]
      .join("\n");
  /** Все адреса, которые встречаются в тексте (с «https://» и без, вроде kgeorgiy.info или t.me/…). */
  const knownUrls = () => new Set((knownText().match(/(?:https?:\/\/)?[\p{L}\p{N}][\p{L}\p{N}.-]*\.[\p{L}]{2,}(?:[/?#][^\s<>"'«»)\]]*)?/gu) ?? []).map((u) => urlKey(u.replace(/[.,;:!?]+$/, ""))));
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

    // ---------- Ссылки (вкладка «Ссылки» в приложении) ----------
    defineTool({
      name: "save_links",
      description:
        "Сохранить ссылки во вкладку «Ссылки»: ссылки преподов на ДЗ, таблицы для сдачи, чаты, записи пар, репозитории, формы. " +
        "Когда пользователь присылает сообщение со ссылками (например, список по предметам) — сохрани КАЖДУЮ ссылку отдельно, " +
        "с понятным названием и предметом. Ссылки — не задания: в add_task их не клади. Та же ссылка не задвоится.",
      schema: z.object({
        links: z
          .array(
            z.object({
              url: z.string().min(4).describe("Адрес ссылки целиком"),
              title: z.string().optional().describe("Коротко, что это: «Общий чат», «Таблица сдачи ДЗ», «Записи на YouTube»"),
              subject: z.string().optional().describe("Предмет, например «Матанализ»"),
              note: z.string().optional().describe("Пояснение: кто препод, когда открывать"),
            }),
          )
          .min(1),
      }),
      run: (i) => {
        const saved: string[] = [];
        const bad: string[] = [];
        const made: string[] = [];
        const known = knownUrls();
        for (const l of i.links) {
          if (!known.has(urlKey(l.url))) {
            made.push(l.url);
            continue;
          }
          try {
            const url = /^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`;
            const x = store.saveLink({ url, title: l.title ?? "", subject: l.subject ?? null, note: l.note });
            saved.push(`#${x.id} ${x.subject ? `${x.subject}: ` : ""}${x.title}`);
          } catch {
            bad.push(l.url);
          }
        }
        return (
          `Сохранено в «Ссылки»: ${saved.length}${saved.length ? `\n${saved.join("\n")}` : ""}` +
          (bad.length ? `\nНе похоже на ссылки: ${bad.join(", ")}` : "") +
          (made.length ? `\nНЕ сохранено — этих адресов не было в переписке (не выдумывай ссылки, скажи хозяину, что адреса нет): ${made.join(", ")}` : "")
        );
      },
    }),

    defineTool({
      name: "list_links",
      description: "Все сохранённые ссылки (вкладка «Ссылки»), можно по предмету.",
      schema: z.object({ subject: z.string().optional() }),
      run: (i) => {
        const all = store.listLinks().filter((l) => !i.subject || (l.subject ?? "").toLowerCase().includes(i.subject.toLowerCase()));
        if (!all.length) return "Ссылок пока нет.";
        return all.map((l) => `#${l.id} ${l.subject ? `[${l.subject}] ` : ""}${l.title} — ${l.url}${l.note ? ` (${l.note})` : ""}`).join("\n");
      },
    }),

    defineTool({
      name: "update_link",
      description: "Поправить ссылку: название, предмет, пояснение, закрепить.",
      schema: z.object({ id: z.number().int(), title: z.string().optional(), subject: z.string().optional(), note: z.string().optional(), pinned: z.boolean().optional() }),
      run: (i) => {
        const cur = store.getLink(i.id);
        if (!cur) throw new Error(`Ссылки #${i.id} нет`);
        const x = store.saveLink({ id: i.id, url: cur.url, title: i.title ?? cur.title, subject: i.subject ?? cur.subject, note: i.note, pinned: i.pinned });
        return `Ссылка #${x.id} обновлена: ${x.title}.`;
      },
    }),

    defineTool({
      name: "delete_links",
      description: "Удалить ссылки по номерам.",
      schema: z.object({ ids: z.array(z.number().int()).min(1) }),
      run: (i) => `Удалено ссылок: ${i.ids.filter((id) => store.deleteLink(id)).length}.`,
    }),

    // ---------- Убрать лишнее из заданий ----------
    defineTool({
      name: "remove_tasks",
      description:
        "Убрать задания из списка (статус «отменено»): ошибочно записанные, дубли, то, что на самом деле ссылки или справка. " +
        "Сначала посмотри номера через list_tasks.",
      schema: z.object({ ids: z.array(z.number().int()).min(1) }),
      run: (i) => {
        const done = i.ids.filter((id) => store.updateTask(id, { status: "cancelled" }));
        return `Убрано из заданий: ${done.length}${done.length < i.ids.length ? ` (не найдено: ${i.ids.filter((x) => !done.includes(x)).join(", ")})` : ""}.`;
      },
    }),

    defineTool({
      name: "set_task_steps",
      description: "Разбить задание на шаги-галочки (заменяет прежние шаги).",
      schema: z.object({ id: z.number().int(), steps: z.array(z.string().min(1)).min(1).max(12) }),
      run: (i) => {
        if (!store.getTask(i.id)) throw new Error(`Задания #${i.id} нет`);
        store.setSteps(i.id, i.steps);
        return `У задания #${i.id} теперь ${i.steps.length} шагов.`;
      },
    }),

    // ---------- Заметки ----------
    defineTool({
      name: "save_note",
      description: "Создать заметку (конспект, шпаргалка, мысль) или дописать/заменить текст существующей (id). Формулы — в $...$.",
      schema: z.object({ id: z.number().int().optional(), title: z.string().min(1), body: z.string().optional(), subject: z.string().optional(), pinned: z.boolean().optional() }),
      run: (i) => {
        const n = store.saveNote({ id: i.id, title: i.title, body: i.body, subject: i.subject ?? null, pinned: i.pinned });
        return `Заметка #${n.id} «${n.title}» сохранена.`;
      },
    }),

    defineTool({
      name: "list_notes",
      description: "Список заметок с началом текста.",
      schema: z.object({}),
      run: () => {
        const ns = store.listNotes();
        if (!ns.length) return "Заметок пока нет.";
        return ns.map((n) => `#${n.id} ${n.subject ? `[${n.subject}] ` : ""}${n.title}: ${n.body.replace(/\s+/g, " ").slice(0, 120)}`).join("\n");
      },
    }),

    // ---------- Сессия: экзамены и билеты ----------
    defineTool({
      name: "save_exam",
      description: "Записать экзамен/зачёт в раздел «Сессия» (дата и время) и, если есть, список билетов/вопросов.",
      schema: z.object({
        subject: z.string().optional(),
        title: z.string().min(1).describe("«Экзамен по матанализу»"),
        at: isoDate.describe("Когда экзамен, ISO 8601 со смещением пояса"),
        tickets: z.array(z.string().min(1)).max(200).optional().describe("Билеты/вопросы по порядку"),
      }),
      run: (i) => {
        const id = store.saveExam({ subject: i.subject ?? null, title: i.title, at: i.at });
        if (i.tickets?.length) store.setTickets(id, i.tickets);
        return `Экзамен записан в «Сессию»${i.tickets?.length ? `, билетов: ${i.tickets.length}` : ""}.`;
      },
    }),

    defineTool({
      name: "list_exams",
      description: "Экзамены из «Сессии» с прогрессом по билетам.",
      schema: z.object({}),
      run: () => {
        const ex = store.listExams();
        if (!ex.length) return "Экзаменов пока нет.";
        return ex
          .map((e) => {
            const known = e.tickets.filter((t) => t.status === "known").length;
            return `#${e.id} ${e.subject ? `${e.subject}: ` : ""}${e.title} — ${new Date(e.at).toLocaleString("ru-RU", { timeZone })}; билеты: знаю ${known} из ${e.tickets.length}`;
          })
          .join("\n");
      },
    }),

    // ---------- План недели ----------
    defineTool({
      name: "plan_time",
      description: "Поставить блок в план недели: когда и сколько минут заниматься (можно привязать к заданию).",
      schema: z.object({ title: z.string().min(1), start_at: isoDate, minutes: z.number().int().min(10).max(600), task_id: z.number().int().optional() }),
      run: (i) => {
        store.savePlanBlock({ title: i.title, startAt: i.start_at, minutes: i.minutes, taskId: i.task_id ?? null });
        return `В план: «${i.title}» — ${new Date(i.start_at).toLocaleString("ru-RU", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit" })}, ${i.minutes} мин.`;
      },
    }),

    defineTool({
      name: "list_plan",
      description: "Что стоит в плане на ближайшие 7 дней.",
      schema: z.object({}),
      run: () => {
        const now = new Date();
        const bl = store.listPlan(now, new Date(now.getTime() + 7 * 86400e3));
        if (!bl.length) return "В плане на неделю пусто.";
        return bl.map((b) => `#${b.id} ${new Date(b.startAt).toLocaleString("ru-RU", { timeZone, weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} — ${b.title} (${b.minutes} мин)`).join("\n");
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
