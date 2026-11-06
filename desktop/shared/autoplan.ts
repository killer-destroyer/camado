// Автораскладка недели: задания по срокам → в свободные «окна» (будни вечером, выходные днём),
// не залезая на уже поставленные блоки и не позже срока. Большие задания — кусками по часу.

export interface PlanTask {
  id: number;
  title: string;
  subject: string | null;
  kind: string;
  dueAt: string | null;
}

export interface PlanSlot {
  taskId: number | null;
  title: string;
  startAt: string;
  minutes: number;
}

/** Сколько всего минут обычно уходит на задание такого типа. */
export const ESTIMATE: Record<string, number> = { homework: 60, lab: 120, test: 120, exam: 240, other: 45 };

/** Учебные окна: будни 16:00–22:00, выходные 11:00–19:00 (часы местного времени компьютера). */
export function windowsOf(day: Date): [number, number][] {
  const wd = day.getDay();
  return wd === 0 || wd === 6 ? [[11, 19]] : [[16, 22]];
}

const MIN = 60e3;

export function autoPlan(tasks: PlanTask[], existing: PlanSlot[], weekStart: Date, now = new Date(), chunk = 60): PlanSlot[] {
  const busy = existing.map((b) => [new Date(b.startAt).getTime(), new Date(b.startAt).getTime() + b.minutes * MIN] as const);
  const planned = new Map<number, number>();
  for (const b of existing) if (b.taskId != null) planned.set(b.taskId, (planned.get(b.taskId) ?? 0) + b.minutes);
  const out: PlanSlot[] = [];
  const weekEnd = weekStart.getTime() + 7 * 24 * 60 * MIN;
  const order = [...tasks].sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  const free = (s: number, e: number) => !busy.some(([bs, be]) => s < be && e > bs);

  for (const t of order) {
    let need = (ESTIMATE[t.kind] ?? 60) - (planned.get(t.id) ?? 0);
    const due = t.dueAt ? new Date(t.dueAt).getTime() : weekEnd;
    for (let d = 0; d < 7 && need > 0; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      for (const [h0, h1] of windowsOf(day)) {
        const ws = new Date(day);
        ws.setHours(h0, 0, 0, 0);
        const we = new Date(day);
        we.setHours(h1, 0, 0, 0);
        // начинаем не раньше «сейчас», округлив до ближайших 15 минут
        let s = Math.max(ws.getTime(), Math.ceil(now.getTime() / (15 * MIN)) * 15 * MIN);
        while (need > 0 && s + 30 * MIN <= Math.min(we.getTime(), due)) {
          const len = Math.min(chunk, need, (Math.min(we.getTime(), due) - s) / MIN);
          const e = s + len * MIN;
          if (len >= 30 && free(s, e)) {
            out.push({ taskId: t.id, title: t.subject ? `${t.subject}: ${t.title}` : t.title, startAt: new Date(s).toISOString(), minutes: Math.round(len) });
            busy.push([s, e + 10 * MIN] as const); // 10 минут перерыва между блоками
            need -= len;
            s = e + 10 * MIN;
          } else s += 15 * MIN;
        }
      }
    }
  }
  return out;
}

/** Понедельник 00:00 той недели, где лежит дата. */
export function weekStartOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
