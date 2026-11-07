// Инструменты ИИ для всего, что появилось в 1.2: деньги, сон и энергия, расписание пар, карточки, свои задачи,
// резервная копия, отвлечения во время фокуса, пословный текст песен. Работают и в чате программы, и в Telegram.
// Они вызывают те же обработчики, что и кнопки в окне, — данные одни и те же.
import { z } from "zod";
import { defineTool } from "../../src/llm/tool.js";
import type { ToolDef } from "../../src/llm/types.js";
import { cardsFromNote } from "../../src/camado/study.js";
import type { CamadoCore } from "../../src/core.js";
import { sameSubject } from "../../src/subjects.js";
import { classesOn, isoDate, sameSubjectLoose, moneySummary, nextMonthDay, weekParity, type EnergyEntry, type MoneyState, type Peak, type ScheduleState } from "../shared/life.js";
import type { BackupState, CustomProblem, DistractionLog } from "./life.js";

type Handlers = Record<string, (...args: never[]) => unknown>;
const WD = ["", "пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const rub = (n: number) => `${Math.round(n * 100) / 100} ₽`;

export function lifeTools(deps: {
  handlers: Handlers;
  core: CamadoCore;
  timeZone: string;
  /** Окно: перерасчитать пословный текст песни. */
  act: (a: { type: "words-redo"; trackId?: string }) => void;
}): ToolDef[] {
  const call = async <T>(name: string, ...args: unknown[]): Promise<T> => (await (deps.handlers[name] as (...a: unknown[]) => unknown)(...args)) as T;
  const { store, llm } = deps.core;
  /** «2026-11-07» → полдень этого дня по местному времени; ISO — как есть. */
  const when = (s?: string) => {
    // сегодняшняя дата — значит «сейчас» (иначе трата встанет раньше запомненного остатка и не вычтется)
    if (!s || s === isoDate(new Date())) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00`).toISOString();
    return Number.isNaN(Date.parse(s)) ? undefined : s;
  };
  const summary = (m: MoneyState) => {
    const s = moneySummary(m, new Date());
    return [
      s.balance !== undefined ? `на карте ≈ ${rub(s.balance)}` : "остаток на карте не задан",
      `сегодня потрачено ${rub(s.spentToday)}, за месяц ${rub(s.spentMonth)}`,
      s.perDay !== undefined ? `можно ${rub(s.perDay)} в день, до «${m.income?.name}» ${s.daysLeft} дн.` : m.income ? "" : "стипендия/зарплата не задана",
      s.subsBefore ? `подписки до неё: ${rub(s.subsBefore)}` : "",
    ]
      .filter(Boolean)
      .join("; ");
  };

  return [
    // ---------- деньги ----------
    defineTool({
      name: "money_add",
      description:
        "Записать траты и приходы денег (раздел «Деньги»). Можно сразу несколько: «кофе 250, такси 340, обед 420». " +
        "Траты — income=false (по умолчанию), стипендия/зарплата/перевод мне — income=true. Сумма всегда положительная.",
      schema: z.object({
        items: z
          .array(
            z.object({
              title: z.string().min(1).max(60).describe("На что / откуда: «кофе», «такси», «стипендия»"),
              amount: z.number().positive().max(10_000_000),
              income: z.boolean().optional(),
              date: z.string().optional().describe("Когда, если не сегодня: ГГГГ-ММ-ДД"),
            }),
          )
          .min(1)
          .max(50),
      }),
      run: async (i) => {
        let m: MoneyState | undefined;
        for (const x of i.items) m = await call<MoneyState>("money.add", x.income ? x.amount : -x.amount, x.title, when(x.date));
        return `Записал ${i.items.length}: ${i.items.map((x) => `${x.title} ${x.income ? "+" : "−"}${rub(x.amount)}`).join(", ")}. ${summary(m!)}.`;
      },
    }),
    defineTool({
      name: "money_report",
      description: "Деньги: сколько на карте, сколько можно тратить в день до стипендии, траты за период по статьям, последние записи (с id для удаления), подписки.",
      schema: z.object({ days: z.number().int().min(1).max(366).optional().describe("За сколько последних дней показать траты (по умолчанию 30)") }),
      run: async (i) => {
        const m = await call<MoneyState>("money.get");
        const since = Date.now() - (i.days ?? 30) * 86400e3;
        const by = new Map<string, number>();
        for (const e of m.entries) if (e.amount < 0 && Date.parse(e.at) >= since) by.set(e.title.toLowerCase(), (by.get(e.title.toLowerCase()) ?? 0) - e.amount);
        const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
        const recent = m.entries.slice(-15).reverse();
        return [
          summary(m),
          m.income ? `доход: ${m.income.name} ${rub(m.income.amount)} каждое ${m.income.day} число` : "",
          top.length ? `траты за ${i.days ?? 30} дн. по статьям: ${top.map(([k, v]) => `${k} ${rub(v)}`).join(", ")}` : "трат за период нет",
          m.subs.length ? `подписки: ${m.subs.map((s) => `${s.name} ${rub(s.amount)} (${s.day} числа, след. ${nextMonthDay(s.day, new Date()).toLocaleDateString("ru-RU")}) id=${s.id}`).join("; ")}` : "",
          recent.length ? `последние записи: ${recent.map((e) => `[${e.id}] ${new Date(e.at).toLocaleDateString("ru-RU", { timeZone: deps.timeZone })} ${e.title} ${e.amount > 0 ? "+" : "−"}${rub(Math.abs(e.amount))}`).join("; ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      },
    }),
    defineTool({
      name: "money_remove",
      description: "Удалить записи о деньгах по id (id — из money_report). Только то, что человек просит удалить.",
      schema: z.object({ ids: z.array(z.string()).min(1).max(50) }),
      run: async (i) => {
        for (const id of i.ids) await call("money.remove", id);
        return `Удалил записей: ${i.ids.length}.`;
      },
    }),
    defineTool({
      name: "money_setup",
      description:
        "Настроить «Деньги»: стипендию/зарплату (сумма и число месяца), сколько сейчас на карте, добавить или убрать подписку (Spotify, связь…).",
      schema: z.object({
        income: z.object({ name: z.string().max(40).optional(), amount: z.number().positive(), day: z.number().int().min(1).max(31) }).optional(),
        balance: z.number().optional().describe("Сколько сейчас на карте"),
        add_subscription: z.object({ name: z.string().min(1).max(40), amount: z.number().positive(), day: z.number().int().min(1).max(31) }).optional(),
        remove_subscription_id: z.string().optional(),
      }),
      run: async (i) => {
        let m: MoneyState | undefined;
        if (i.income) m = await call("money.setIncome", { name: i.income.name ?? "Стипендия", amount: i.income.amount, day: i.income.day });
        if (i.balance !== undefined) m = await call("money.setBalance", i.balance);
        if (i.add_subscription) m = await call("money.saveSub", i.add_subscription);
        if (i.remove_subscription_id) m = await call("money.removeSub", i.remove_subscription_id);
        m ??= await call<MoneyState>("money.get");
        return `Готово. ${summary(m)}.`;
      },
    }),

    // ---------- сон и энергия ----------
    defineTool({
      name: "energy_log",
      description: "Записать, сколько спал и как себя чувствуешь (1 — никак, 5 — бодрый), и/или когда голова лучше работает (утром/днём/вечером). Это влияет на советы и на «Разложить сам».",
      schema: z.object({
        sleep: z.number().min(0).max(16).optional().describe("Часы сна"),
        energy: z.number().int().min(1).max(5).optional(),
        date: z.string().optional().describe("ГГГГ-ММ-ДД, если не сегодня"),
        peak: z.enum(["morning", "day", "evening"]).optional(),
      }),
      run: async (i) => {
        let st = await call<{ log: EnergyEntry[]; peak: Peak }>("energy.get");
        const date = i.date && /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : isoDate(new Date());
        if (i.sleep !== undefined || i.energy !== undefined) {
          const cur = st.log.find((e) => e.date === date);
          st = await call("energy.check", { date, sleep: i.sleep ?? cur?.sleep ?? 7, energy: i.energy ?? cur?.energy ?? 3 });
        }
        if (i.peak) st = await call("energy.setPeak", i.peak);
        const last = st.log.slice(-7).map((e) => `${e.date}: сон ${e.sleep} ч, силы ${e.energy}/5`);
        return `Записал. Голова лучше работает: ${{ morning: "утром", day: "днём", evening: "вечером" }[st.peak]}. Последние дни: ${last.join("; ") || "нет записей"}.`;
      },
    }),

    // ---------- расписание пар ----------
    defineTool({
      name: "schedule_list",
      description: "Расписание пар: на день, на неделю или всё целиком (с чётностью недель).",
      schema: z.object({ date: z.string().optional().describe("ГГГГ-ММ-ДД — пары этого дня; без даты — вся неделя от сегодня") }),
      run: async (i) => {
        const s = await call<ScheduleState>("schedule.get");
        if (!s.classes.length) return "Расписания пар пока нет.";
        const days = i.date ? [new Date(`${i.date}T12:00:00`)] : Array.from({ length: 7 }, (_, k) => new Date(Date.now() + k * 86400e3));
        const out = days.map((d) => {
          const list = classesOn(d, s);
          return `${d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })} (${weekParity(d, s.oddMonday) === "odd" ? "нечётная" : "чётная"}): ${list.length ? list.map((c) => `${c.start}–${c.end} ${c.subject}${c.room ? ` ауд. ${c.room}` : ""}${c.kind ? ` (${c.kind})` : ""}`).join("; ") : "пар нет"}`;
        });
        return out.join("\n");
      },
    }),
    defineTool({
      name: "schedule_edit",
      description:
        "Расписание пар (занятия в вузе, повторяются каждую неделю): «добавь пару…», «по средам у меня…», «пару перенесли», «убери физику». " +
        "Изменить расписание пар: добавить пары, убрать пары (по дню недели и времени начала или по предмету), заменить всё расписание, " +
        "за сколько минут напоминать, поменять чётность текущей недели. День недели: 1 — пн … 7 — вс; weeks: all/odd (нечётные, числитель)/even (чётные, знаменатель).",
      schema: z.object({
        add: z
          .array(
            z.object({
              weekday: z.number().int().min(1).max(7),
              start: z.string().describe("ЧЧ:ММ"),
              end: z.string().describe("ЧЧ:ММ"),
              subject: z.string().min(1),
              room: z.string().optional(),
              kind: z.string().optional(),
              teacher: z.string().optional(),
              weeks: z.enum(["all", "odd", "even"]).optional(),
            }),
          )
          .max(80)
          .optional(),
        replace_all: z.boolean().optional().describe("true — новое расписание вместо старого"),
        remove: z.array(z.object({ weekday: z.number().int().min(1).max(7).optional(), start: z.string().optional(), subject: z.string().optional() })).max(80).optional(),
        remind_minutes: z.number().int().min(0).max(120).optional(),
        flip_parity: z.boolean().optional().describe("Текущая неделя на самом деле другой чётности"),
      }),
      run: async (i) => {
        const s = await call<ScheduleState>("schedule.get");
        let classes = i.replace_all ? [] : [...s.classes];
        let removed = 0;
        for (const r of i.remove ?? []) {
          const before = classes.length;
          classes = classes.filter(
            (c) => !((r.weekday === undefined || c.weekday === r.weekday) && (r.start === undefined || c.start === r.start.replace(/^(\d):/, "0$1:")) && (r.subject === undefined || sameSubject(c.subject, r.subject) || sameSubjectLoose(c.subject, r.subject))),
          );
          removed += before - classes.length;
        }
        for (const a of i.add ?? []) classes.push({ ...a, weeks: a.weeks ?? "all" });
        const patch: Partial<ScheduleState> = { classes };
        if (i.remind_minutes !== undefined) patch.remindMin = i.remind_minutes;
        if (i.flip_parity) {
          const [y, m, d] = s.oddMonday.split("-").map(Number) as [number, number, number];
          patch.oddMonday = isoDate(new Date(y, m - 1, d + 7));
        }
        const next = await call<ScheduleState>("schedule.save", patch);
        return `Расписание: ${next.classes.length} пар${i.add?.length ? `, добавил ${i.add.length}` : ""}${removed ? `, убрал ${removed}` : ""}. Напоминаю за ${next.remindMin} мин.`;
      },
    }),

    // ---------- карточки ----------
    defineTool({
      name: "cards",
      description: "Карточки для повторения: добавить свои (вопрос — ответ), сделать карточки из заметки (по id заметки), показать, что пора повторить.",
      schema: z.object({
        add: z.array(z.object({ q: z.string().min(2), a: z.string().min(1), subject: z.string().optional() })).max(50).optional(),
        from_note_id: z.number().int().optional(),
        show_due: z.boolean().optional(),
      }),
      run: async (i) => {
        const out: string[] = [];
        if (i.add?.length) out.push(`Добавил карточек: ${store.addCards(i.add.map((c) => ({ question: c.q, answer: c.a, subject: c.subject ?? null })))}.`);
        if (i.from_note_id !== undefined) {
          const note = store.getNote(i.from_note_id);
          out.push(note ? `Из заметки «${note.title}» сделал карточек: ${await cardsFromNote(llm, store, note)}.` : "Такой заметки нет.");
        }
        if (i.show_due || !out.length) {
          const due = store.listCards({ dueBefore: new Date() });
          out.push(due.length ? `Пора повторить ${due.length}: ${due.slice(0, 15).map((c) => `«${c.question}»${c.subject ? ` (${c.subject})` : ""}`).join("; ")}` : "Повторять сейчас нечего.");
        }
        return out.join(" ");
      },
    }),

    // ---------- билеты ----------
    defineTool({
      name: "ticket_status",
      description: "Отметить билеты экзамена: known — знаю, review — повторить, new — не знаю. Номера билетов — из list_exams. Удобно после того, как ты погонял человека по билету в чате.",
      schema: z.object({ exam_id: z.number().int(), tickets: z.array(z.object({ num: z.number().int(), status: z.enum(["known", "review", "new"]) })).min(1).max(200) }),
      run: (i) => {
        const ex = store.listExams().find((e) => e.id === i.exam_id);
        if (!ex) return "Такого экзамена нет.";
        let n = 0;
        for (const t of i.tickets) {
          const tk = ex.tickets.find((x) => x.num === t.num);
          if (tk) {
            store.setTicketStatus(tk.id, t.status);
            n++;
          }
        }
        return `Отметил билетов: ${n}.`;
      },
    }),

    // ---------- свои задачи ----------
    defineTool({
      name: "my_problem",
      description: "Сделать задачу для «Задачника» из условия (лаба, контест): Камадо напишет тесты и проверит их запуском. Или показать свои задачи.",
      schema: z.object({ text: z.string().min(15).max(12000).optional().describe("Условие задачи"), list: z.boolean().optional() }),
      run: async (i) => {
        if (i.text) {
          const r = await call<{ problem: CustomProblem } | { error: string }>("grow.custom.create", { text: i.text });
          if ("error" in r) return r.error;
          return `Готово: «${r.problem.title}» (${r.problem.topic}), тестов ${r.problem.tests.length}${r.problem.verified ? ", ответы проверены запуском" : ""}. Она в «Прокачка» → «Задачник» → «Мои задачи».`;
        }
        const l = await call<CustomProblem[]>("grow.custom.list");
        return l.length ? l.map((p) => `${p.title} (${p.topic}, ${"★".repeat(p.level)})`).join("; ") : "Своих задач пока нет.";
      },
    }),

    // ---------- резервная копия ----------
    defineTool({
      name: "backup",
      description: "Резервная копия всех данных: узнать, когда была последняя, или сделать прямо сейчас (в папку, выбранную в Настройках).",
      schema: z.object({ now: z.boolean().optional() }),
      run: async (i) => {
        const b = i.now ? await call<BackupState>("backup.now") : await call<BackupState>("backup.get");
        if (!b.folder) return "Резервная копия выключена — включить можно в Настройках → «Резервная копия» (выбрать папку облака).";
        return `${i.now ? (b.error ? `Не получилось: ${b.error}` : "Копия сделана. ") : ""}Папка: ${b.folder}. Последняя копия: ${b.last ? new Date(b.last).toLocaleString("ru-RU", { timeZone: deps.timeZone }) : "ещё не было"}.`;
      },
    }),

    // ---------- отвлечения ----------
    defineTool({
      name: "focus_distractions",
      description: "Куда человек отвлекался во время фокуса: программы и сайты за последние сессии.",
      schema: z.object({ sessions: z.number().int().min(1).max(30).optional() }),
      run: async (i) => {
        const logs = (await call<DistractionLog[]>("distract.list")).slice(-(i.sessions ?? 7));
        if (!logs.length) return "Пока нет данных: учёт включается во время фокуса (Настройки фокуса → «считать, куда отвлекаюсь»).";
        const total = new Map<string, { s: number; n: number }>();
        for (const l of logs) for (const a of l.apps) total.set(a.app, { s: (total.get(a.app)?.s ?? 0) + a.seconds, n: (total.get(a.app)?.n ?? 0) + a.switches });
        const top = [...total.entries()].sort((a, b) => b[1].s - a[1].s).slice(0, 10);
        return `Сессий: ${logs.length}, всего ${logs.reduce((a, l) => a + l.minutes, 0)} мин. Куда переключался: ${top.map(([k, v]) => `${k} — ${v.n} раз, ${Math.round(v.s / 60)} мин`).join("; ")}.`;
      },
    }),

    // ---------- текст песни по словам ----------
    defineTool({
      name: "lyrics_words",
      description: "Пересчитать текст песни по словам: Камадо заново послушает песню (текущую, если не указано) и расставит время каждому слову.",
      schema: z.object({}),
      run: () => {
        deps.act({ type: "words-redo" });
        return "Слушаю песню заново — через минуту-две текст встанет по словам.";
      },
    }),
  ];
}
