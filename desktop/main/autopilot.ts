// Автопилот сессии: билеты по дням до экзамена — в «План», вечером — напоминание «вечерний экзаменатор»
// с тем, что осталось на сегодня, и «готов на N%». Работает и из Telegram (инструмент ИИ).
import { z } from "zod";
import type { Store } from "../../src/store.js";
import { defineTool } from "../../src/llm/tool.js";
import type { ToolDef } from "../../src/llm/types.js";
import { localParts, localToUtc } from "../../src/time.js";
import { rangeText, readiness, sessionPlan } from "../shared/session.js";

const SENT_KV = "autopilot.sent";
export const PLAN_PREFIX = "Сессия · ";

type Exam = ReturnType<Store["listExams"]>[number];

/** «Сегодня» в поясе хозяина как обычная дата (для расчёта дней до экзамена). */
function localNow(now: Date, tz: string): Date {
  const { ymd, hour } = localParts(now, tz);
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hour);
}
function localDate(iso: string, tz: string): Date {
  const { ymd, hour } = localParts(new Date(iso), tz);
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hour);
}

/** Ближайшие экзамены с билетами (до 30 дней). */
export function upcoming(store: Store, now: Date): Exam[] {
  return store
    .listExams()
    .filter((e) => e.tickets.length > 0 && new Date(e.at).getTime() > now.getTime() && new Date(e.at).getTime() - now.getTime() < 30 * 86400e3)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Разложить билеты по дням в «План»: по блоку в день в hour:00 (старые блоки автопилота этого экзамена — заменяются). */
export function autopilotToPlan(store: Store, examId: number, opts: { hour?: number; minutes?: number; tz: string; now?: Date }): { blocks: number } | { error: string } {
  const now = opts.now ?? new Date();
  const exam = store.listExams().find((e) => e.id === examId);
  if (!exam) return { error: "Экзамен не найден" };
  if (!exam.tickets.length) return { error: "Сначала добавь список билетов" };
  const plan = sessionPlan(exam.tickets, localDate(exam.at, opts.tz), localNow(now, opts.tz));
  if (!plan.length) return { error: "До экзамена не осталось дней для плана" };
  const prefix = `${PLAN_PREFIX}${exam.title}`;
  for (const b of store.listPlan(now, new Date(exam.at))) if (b.title.startsWith(prefix)) store.deletePlanBlock(b.id);
  const hour = Math.max(6, Math.min(23, Math.round(opts.hour ?? 18)));
  const minutes = Math.max(20, Math.min(240, Math.round(opts.minutes ?? Math.max(45, 20 * (plan[0]?.nums.length ?? 1)))));
  const { ymd } = localParts(now, opts.tz);
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  let n = 0;
  for (const day of plan) {
    const start = localToUtc(y, m, d + day.offset, hour, 0, opts.tz);
    // сегодня этот час уже прошёл — ставим через час от «сейчас», а поздно вечером (после 22:00) сегодня не ставим
    let at = start;
    if (start.getTime() < now.getTime()) {
      at = new Date(Math.ceil(now.getTime() / 900_000) * 900_000 + 3600_000);
      if (localParts(at, opts.tz).hour >= 22 || localParts(at, opts.tz).ymd !== ymd) continue;
    }
    const title = day.kind === "final" ? `${prefix}: повторить всё (${rangeText(day.nums)})` : `${prefix}: билеты ${rangeText(day.nums)}`;
    store.savePlanBlock({ title, startAt: at.toISOString(), minutes: day.kind === "final" ? Math.max(minutes, 90) : minutes });
    n++;
  }
  return { blocks: n };
}

/** Текст «вечернего экзаменатора»: что осталось на сегодня и готовность. undefined — всё сделано или экзаменов нет. */
export function eveningMessage(store: Store, now: Date, tz: string): string | undefined {
  const today = localParts(now, tz).ymd;
  const lines: string[] = [];
  for (const e of upcoming(store, now).filter((x) => new Date(x.at).getTime() - now.getTime() < 21 * 86400e3)) {
    const plan = sessionPlan(e.tickets, localDate(e.at, tz), localNow(now, tz));
    const day = plan.find((p) => p.offset === 0);
    if (!day) continue;
    // норма на сегодня — столько билетов; отмеченные сегодня засчитываются (план после отметок сдвигается)
    const seen = new Set(e.tickets.filter((t) => t.seenAt && localParts(new Date(t.seenAt), tz).ymd === today).map((t) => t.num));
    if (seen.size >= day.nums.length) continue;
    const left = day.nums.filter((n) => !seen.has(n)).slice(0, day.nums.length - seen.size);
    if (!left.length) continue;
    const r = readiness(e.tickets, localDate(e.at, tz), localNow(now, tz));
    lines.push(`• «${e.title}» — через ${r.days} дн., готов на ${r.pct}%. На сегодня осталось: билеты ${rangeText(left)}.`);
  }
  if (!lines.length) return undefined;
  return `🎓 Вечерний экзаменатор\n${lines.join("\n")}\nОткрой «Сессию» → «Экзаменатор» или напиши мне «погоняй по билетам».`;
}

/** Раз в минуту: в час автопилота (по умолчанию 20:00) — одно напоминание в день. */
export function autopilotTick(store: Store, opts: { on: boolean; hour: number; tz: string; now?: Date; send: (text: string) => void }): boolean {
  if (!opts.on) return false;
  const now = opts.now ?? new Date();
  const { ymd, hour } = localParts(now, opts.tz);
  if (hour !== opts.hour || store.getKv(SENT_KV) === ymd) return false;
  store.setKv(SENT_KV, ymd);
  const msg = eveningMessage(store, now, opts.tz);
  if (msg) opts.send(msg);
  return !!msg;
}

export function autopilotTools(store: Store, tz: string, onPlan: () => void, clock: () => Date = () => new Date()): ToolDef[] {
  return [
    defineTool({
      name: "session_autopilot",
      description:
        "Автопилот сессии. status — по каждому экзамену: готов на N%, сколько билетов в день нужно, план по дням и что на сегодня. " +
        "to_plan — разложить билеты экзамена по дням в «План» (exam_id из list_exams, hour — во сколько заниматься, по умолчанию 18).",
      schema: z.object({ action: z.enum(["status", "to_plan"]), exam_id: z.number().int().optional(), hour: z.number().optional() }),
      run: (i) => {
        const now = clock();
        if (i.action === "to_plan") {
          const id = i.exam_id ?? upcoming(store, now)[0]?.id;
          if (!id) return "Нет ближайших экзаменов с билетами.";
          const r = autopilotToPlan(store, id, { hour: i.hour, tz, now });
          if ("error" in r) return r.error;
          onPlan();
          return `Разложил в «План»: ${r.blocks} занятий до экзамена.`;
        }
        const ex = upcoming(store, now);
        if (!ex.length) return "Ближайших экзаменов с билетами нет (добавь экзамен и список билетов в «Сессии»).";
        return ex
          .map((e) => {
            const r = readiness(e.tickets, localDate(e.at, tz), localNow(now, tz));
            const plan = sessionPlan(e.tickets, localDate(e.at, tz), localNow(now, tz));
            const days = plan
              .slice(0, 7)
              .map((p) => `${p.offset === 0 ? "сегодня" : `+${p.offset} дн.`}: ${p.kind === "final" ? "повторить всё " : ""}${rangeText(p.nums)}`)
              .join("; ");
            return `«${e.title}» (id ${e.id}) через ${r.days} дн.: готов на ${r.pct}%, нужно ~${r.perDay} билетов в день — ${r.verdict}. План: ${days || "—"}`;
          })
          .join("\n");
      },
    }),
  ];
}
