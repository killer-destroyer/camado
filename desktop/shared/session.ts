// Режим «Сессия»: сколько билетов повторять сегодня, чтобы к экзамену пройти всё и не по разу.

export interface SessionTicket {
  id: number;
  num: number;
  title: string;
  status: "new" | "review" | "known";
  seenAt: string | null;
}

/**
 * Билеты на сегодня. Сначала «не знаю», потом «повторить», потом давно не виденные «знаю».
 * Норма = все оставшиеся «не знаю»/«повторить» делим на дни до экзамена (последний день — повторение всего).
 */
export function todaysTickets(tickets: SessionTicket[], examAt: Date, now = new Date()): SessionTicket[] {
  const days = Math.max(1, Math.ceil((examAt.getTime() - now.getTime()) / 86400e3));
  const weight = { new: 0, review: 1, known: 2 } as const;
  const sorted = [...tickets].sort(
    (a, b) => weight[a.status] - weight[b.status] || (a.seenAt ?? "").localeCompare(b.seenAt ?? "") || a.num - b.num,
  );
  const todo = tickets.filter((t) => t.status !== "known").length;
  if (days <= 1) return sorted; // завтра экзамен — пробегаем всё
  // «не знаю» считаем дважды: их нужно увидеть хотя бы два раза до экзамена
  const work = tickets.filter((t) => t.status === "new").length * 2 + tickets.filter((t) => t.status === "review").length;
  const perDay = Math.max(todo ? 2 : 1, Math.ceil(work / (days - 1)));
  const seenToday = (t: SessionTicket) => t.seenAt && new Date(t.seenAt).toDateString() === now.toDateString();
  return sorted.filter((t) => !seenToday(t) || t.status !== "known").slice(0, perDay);
}

export function progressOf(tickets: SessionTicket[]): { known: number; review: number; fresh: number; pct: number } {
  const known = tickets.filter((t) => t.status === "known").length;
  const review = tickets.filter((t) => t.status === "review").length;
  return { known, review, fresh: tickets.length - known - review, pct: tickets.length ? Math.round(((known + review * 0.5) / tickets.length) * 100) : 0 };
}
