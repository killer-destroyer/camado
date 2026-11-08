// Жизнь студента: деньги, сон и энергия, расписание пар. Только расчёты — без окна и базы, чтобы проверять тестами.

// ---------- Деньги ----------

export interface MoneyEntry {
  id: string;
  /** ISO, когда записано. */
  at: string;
  /** Минус — трата, плюс — пришли деньги. */
  amount: number;
  title: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  /** Число месяца, когда списывается (1–31). */
  day: number;
}

export interface MoneyState {
  entries: MoneyEntry[];
  subs: Subscription[];
  /** Стипендия/зарплата: сколько и какого числа. */
  income?: { amount: number; day: number; name: string };
  /** Сколько было на карте и когда — от этого считаем остаток. */
  balance?: { amount: number; at: string };
}

const STUDY = /(^|\s)(дз|лаб|задач|контрольн|кр\b|экзам|зач[её]т|пар[аыу]\b|урок|сдать|сдача|дедлайн|до\s|к\s|№|семинар|практик|реферат|курсов)/i;
const CUR = "(?:₽|р\\.?|руб(?:\\.|лей|ля)?|rub|\\$|€|usd|eur)";

/**
 * «кофе 250», «250 кофе», «такси 340,5 р», «+5000 стипендия», «стипендия +5000».
 * Только когда это явно трата: одна сумма, короткое название, без слов про учёбу, времени и номеров.
 */
export function parseMoney(raw: string): { amount: number; title: string } | undefined {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text || text.length > 60 || STUDY.test(text) || /\d{1,2}[:.]\d{2}\b(?!\s*(₽|р|руб))/i.test(text)) return undefined;
  if ((text.match(/\d+(?:[.,]\d+)?/g) ?? []).length !== 1) return undefined;
  const a = new RegExp(`^(\\+|-)?\\s*([^\\d+\\-][^\\d]{0,40}?)\\s+(\\+|-)?\\s*(\\d{1,7}(?:[.,]\\d{1,2})?)\\s*${CUR}?$`, "i").exec(text);
  const b = new RegExp(`^(\\+|-)?\\s*(\\d{1,7}(?:[.,]\\d{1,2})?)\\s*${CUR}?\\s+([^\\d]{1,40})$`, "i").exec(text);
  let sign = -1;
  let num: string;
  let title: string;
  if (a) {
    sign = a[1] === "+" || a[3] === "+" ? 1 : -1;
    num = a[4]!;
    title = a[2]!;
  } else if (b) {
    sign = b[1] === "+" ? 1 : -1;
    num = b[2]!;
    title = b[3]!;
  } else return undefined;
  title = title.replace(new RegExp(`\\s*${CUR}\\s*$`, "i"), "").trim();
  if (!/\p{L}/u.test(title) || title.split(" ").length > 4) return undefined;
  const amount = Number(num.replace(",", "."));
  if (!(amount > 0)) return undefined;
  // «стипендия 5000», «зарплата 20000», «вернули за продукты 300» — это приход и без плюса
  if (/стипенд|зарплат|аванс|перевод от|подарил|вернул|возврат|кэшб|кешб|cashback|refund|компенсац/i.test(title)) sign = 1;
  return { amount: sign * amount, title: title.slice(0, 60) };
}

const REFUND = /вернул|возврат|кэшб|кешб|cashback|refund|компенсац|отдали за|вернули/i;

/** Возврат за покупку (уменьшает траты), а не новый доход. */
export const isRefund = (e: { amount: number; title: string }) => e.amount > 0 && REFUND.test(e.title);

/** К какой статье относится возврат: «вернули за продукты» → «продукты». */
export function refundCategory(title: string): string | undefined {
  const m = /(?:^|\s)за\s+(.+)$/i.exec(title.trim());
  return m ? m[1]!.trim().toLowerCase() : undefined;
}

/** Траты по статьям за период: минус возвраты по той же статье. */
export function spendingByTitle(entries: MoneyEntry[], sinceMs: number): [string, number][] {
  const by = new Map<string, number>();
  for (const e of entries) {
    if (Date.parse(e.at) < sinceMs) continue;
    if (e.amount < 0) by.set(e.title.toLowerCase(), (by.get(e.title.toLowerCase()) ?? 0) - e.amount);
    else if (isRefund(e)) {
      const cat = refundCategory(e.title) ?? "возвраты";
      by.set(cat, (by.get(cat) ?? 0) - e.amount);
    }
  }
  return [...by.entries()].filter(([, v]) => Math.abs(v) > 0.001).sort((a, b) => b[1] - a[1]);
}

const dayMs = 86_400_000;
const atNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

/** Ближайшая дата с этим числом месяца (сегодня — считается). Если в месяце нет 31-го — последний день. */
export function nextMonthDay(day: number, from: Date): Date {
  for (let k = 0; k < 3; k++) {
    const y = from.getFullYear();
    const m = from.getMonth() + k;
    const last = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(day, last), 12);
    if (d.getTime() >= atNoon(from).getTime()) return d;
  }
  return new Date(from.getFullYear(), from.getMonth() + 1, day, 12);
}

export interface MoneySummary {
  /** Сколько на карте сейчас (если задан стартовый остаток). */
  balance?: number;
  /** Потрачено за вычетом возвратов. */
  spentMonth: number;
  spentToday: number;
  /** Сколько из этого вернули (возвраты, кэшбэк). */
  refundMonth: number;
  refundToday: number;
  /** Пришло денег (стипендия, переводы), без возвратов. */
  incomeMonth: number;
  incomeToday: number;
  /** До прихода денег: дней (сегодня включительно) и подписки, которые спишутся раньше. */
  daysLeft?: number;
  subsBefore: number;
  /** Сколько можно тратить в день до прихода денег. */
  perDay?: number;
  nextIncome?: Date;
}

export function moneySummary(s: MoneyState, now: Date): MoneySummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let spentMonth = 0;
  let spentToday = 0;
  let refundMonth = 0;
  let refundToday = 0;
  let incomeMonth = 0;
  let incomeToday = 0;
  for (const e of s.entries) {
    const t = Date.parse(e.at);
    const refund = isRefund(e);
    if (t >= monthStart) {
      if (e.amount < 0) spentMonth -= e.amount;
      else if (refund) refundMonth += e.amount;
      else incomeMonth += e.amount;
    }
    if (t >= todayStart) {
      if (e.amount < 0) spentToday -= e.amount;
      else if (refund) refundToday += e.amount;
      else incomeToday += e.amount;
    }
  }
  // возврат уменьшает траты (но не ниже нуля)
  spentMonth = Math.max(0, spentMonth - refundMonth);
  spentToday = Math.max(0, spentToday - refundToday);
  let balance: number | undefined;
  if (s.balance) {
    const from = Date.parse(s.balance.at);
    balance = s.balance.amount + s.entries.filter((e) => Date.parse(e.at) > from).reduce((a, e) => a + e.amount, 0);
  }
  const nextIncome = s.income ? nextMonthDay(s.income.day, now) : undefined;
  let daysLeft: number | undefined;
  let subsBefore = 0;
  if (nextIncome) {
    daysLeft = Math.max(1, Math.round((nextIncome.getTime() - atNoon(now).getTime()) / dayMs));
    for (const sub of s.subs) {
      const d = nextMonthDay(sub.day, now);
      if (d.getTime() < nextIncome.getTime()) subsBefore += sub.amount;
    }
  }
  const perDay = balance !== undefined && daysLeft ? Math.max(0, Math.floor((balance - subsBefore) / daysLeft)) : undefined;
  return { balance, spentMonth, spentToday, refundMonth, refundToday, incomeMonth, incomeToday, daysLeft, subsBefore, perDay, nextIncome };
}

// ---------- Сон и энергия ----------

export interface EnergyEntry {
  /** ГГГГ-ММ-ДД */
  date: string;
  /** Сколько спал, часы. */
  sleep: number;
  /** Как себя чувствую: 1 — никак, 5 — бодрый. */
  energy: number;
}

export type Peak = "morning" | "day" | "evening";

/** Часы, когда голова работает лучше всего (для тяжёлых заданий). */
export const PEAK_HOURS: Record<Peak, [number, number]> = { morning: [9, 13], day: [13, 18], evening: [18, 23] };

export function avgSleep(log: EnergyEntry[], today: string, days = 3): number | undefined {
  const recent = log.filter((e) => e.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, days);
  if (!recent.length) return undefined;
  return recent.reduce((a, e) => a + e.sleep, 0) / recent.length;
}

/** Совет на день: что делать с такой энергией и не пора ли выспаться перед экзаменом. */
export function energyAdvice(
  log: EnergyEntry[],
  today: string,
  examsSoon: { title: string; days: number }[],
): { tone: "ok" | "low" | "warn"; text: string } | undefined {
  const e = log.find((x) => x.date === today);
  const avg = avgSleep(log, today);
  const exam = examsSoon.filter((x) => x.days >= 0 && x.days <= 3).sort((a, b) => a.days - b.days)[0];
  if (exam && avg !== undefined && avg < 6.5) {
    const when = exam.days === 0 ? "сегодня" : exam.days === 1 ? "завтра" : `через ${exam.days} дня`;
    return {
      tone: "warn",
      text: `Экзамен «${exam.title}» ${when}, а спишь ты в среднем ${avg.toFixed(1)} ч. Недосып съедает память сильнее, чем лишний час зубрёжки — ляг сегодня пораньше.`,
    };
  }
  if (!e) return undefined;
  if (e.energy <= 2 || e.sleep < 5.5)
    return { tone: "low", text: "Сил мало — сегодня лёгкое: повторение, оформление, мелкие задания. Тяжёлое — на завтра, если срок позволяет." };
  if (e.energy >= 4) return { tone: "ok", text: "Хороший день для тяжёлого: курсовая, лаба, сложная тема — бери самое страшное первым." };
  return { tone: "ok", text: "Обычный день: начни с одного трудного дела, пока свежий, остальное — после." };
}

// ---------- Расписание пар ----------

export interface ClassSlotLite {
  weekday: number;
  start: string;
  end: string;
  subject: string;
  room?: string;
  kind?: string;
  teacher?: string;
  weeks: "all" | "odd" | "even";
}

export interface ScheduleState {
  classes: ClassSlotLite[];
  /** Понедельник недели, которая считается нечётной (первая неделя семестра). */
  oddMonday: string;
  /** За сколько минут напоминать. */
  remindMin: number;
}

const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Чётность недели: нечётная — как первая неделя семестра. */
export function weekParity(d: Date, oddMonday: string): "odd" | "even" {
  const [y, m, dd] = oddMonday.split("-").map(Number) as [number, number, number];
  const ref = mondayOf(new Date(y, m - 1, dd));
  const weeks = Math.round((mondayOf(d).getTime() - ref.getTime()) / (7 * dayMs));
  return ((weeks % 2) + 2) % 2 === 0 ? "odd" : "even";
}

/** Понедельник первой недели семестра по умолчанию: 1 сентября или 9 февраля (ближайшее прошедшее). */
export function defaultOddMonday(now: Date): string {
  const y = now.getFullYear();
  const autumn = new Date(now.getMonth() >= 8 ? y : y - 1, 8, 1);
  const spring = new Date(y, 1, 9);
  const start = now.getTime() >= spring.getTime() && now.getMonth() < 8 ? spring : autumn;
  return isoDate(mondayOf(start));
}

const at = (d: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
};

export interface ClassOn extends ClassSlotLite {
  startAt: Date;
  endAt: Date;
}

/** Пары в этот день (с учётом чётности недели). */
export function classesOn(d: Date, s: ScheduleState): ClassOn[] {
  const wd = ((d.getDay() + 6) % 7) + 1;
  const parity = weekParity(d, s.oddMonday);
  return s.classes
    .filter((c) => c.weekday === wd && (c.weeks === "all" || c.weeks === parity))
    .map((c) => ({ ...c, startAt: at(d, c.start), endAt: at(d, c.end) }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Ближайшая пара от этого момента (идущая сейчас — тоже), до 14 дней вперёд. */
export function nextClass(now: Date, s: ScheduleState): ClassOn | undefined {
  for (let k = 0; k < 14; k++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k);
    const c = classesOn(d, s).find((x) => x.endAt.getTime() > now.getTime());
    if (c) return c;
  }
  return undefined;
}

/** Пары, о которых пора напомнить в эту минуту (начало через remindMin минут, ±30 с). */
export function classesToRemind(now: Date, s: ScheduleState, minutes = s.remindMin): ClassOn[] {
  const target = now.getTime() + minutes * 60_000;
  return classesOn(now, s).filter((c) => Math.abs(c.startAt.getTime() - target) < 30_000);
}

/** Похоже на тот же предмет («Мат. анализ» ~ «Математический анализ»). */
export function sameSubjectLoose(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter((w) => w.length > 1);
  const A = n(a);
  const B = n(b);
  if (!A.length || !B.length) return false;
  if (A.join(" ") === B.join(" ")) return true;
  const hit = A.filter((w) => B.some((v) => v.startsWith(w.slice(0, 4)) || w.startsWith(v.slice(0, 4)))).length;
  return hit >= Math.min(A.length, B.length);
}
