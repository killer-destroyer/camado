// «Прокачка»: прогресс по курсам, серия дней, разминка, повторение.
import { COURSES, courseById } from "../../../shared/courses";
import { streak, warmupFor, type Course, type CourseId, type Lesson, type Quiz } from "../../../shared/courses/format";
import type { Card, GrowProgress } from "../../../shared/types";
import { api } from "../lib/api";
import { createStore } from "../lib/store";

export type GrowTab = CourseId | "library" | "syllabus" | "review" | "problems";

interface GrowState {
  progress: GrowProgress;
  loaded: boolean;
  tab: GrowTab;
  /** Открытый урок по каждому курсу. */
  open: Partial<Record<CourseId, string>>;
  /** Карточки «Прокачки», которые пора повторить. */
  due: Card[];
  tools?: Record<"python" | "java" | "cpp", { ok: boolean; hint: string }>;
  /** Какой раздел библиотеки открыть. */
  libSection?: string;
  /** Панель ИИ-помощника: открыта ли и что спросить сразу. */
  assistant?: { open: boolean; ask?: string; n?: number };
}

export const CARD_SUBJECT = (c: Course) => `Прокачка · ${c.name}`;

export const grow = createStore<GrowState>({
  progress: { lessons: {}, days: [], wrong: {}, code: {}, goal: 1 },
  loaded: false,
  tab: "python",
  open: {},
  due: [],
});

/** Сегодня в виде ГГГГ-ММ-ДД по часам компьютера. */
export const today = () => new Date().toLocaleDateString("sv-SE");

export async function loadGrow(): Promise<void> {
  const [progress, cards] = await Promise.all([api.grow.get(), api.cards.list({ due: true })]);
  const due = cards.filter((c) => c.subject?.startsWith("Прокачка"));
  const last = progress.last;
  const open = { ...grow.get().open };
  if (last && courseById(last.course as CourseId)) open[last.course as CourseId] = last.lesson;
  grow.set((s) => ({ progress, due, loaded: true, open, tab: s.loaded ? s.tab : ((last?.course as GrowTab) ?? s.tab) }));
}

export async function loadTools(force = false): Promise<void> {
  grow.set({ tools: await api.grow.tools(force) });
}

export async function saveProgress(patch: Partial<GrowProgress>): Promise<void> {
  const progress = await api.grow.save(patch);
  grow.set({ progress });
}

/** Сегодня занимался (урок, задача, разминка, повторение) — серия и цель дня. */
export function markActive(): Promise<void> {
  const d = today();
  const acts = grow.get().progress.acts;
  return saveProgress({ days: [d], acts: { day: d, n: acts?.day === d ? acts.n + 1 : 1 } });
}

export function currentStreak(p = grow.get().progress): number {
  return streak(p.days, today());
}

/** Сколько всего пройдено уроков. */
export function doneCount(p: GrowProgress, c?: Course): number {
  const ids = (c ? [c] : COURSES).flatMap((x) => x.lessons.map((l) => l.id));
  return ids.filter((id) => p.lessons[id]?.done).length;
}

/** Следующий непройденный урок курса. */
export function nextLesson(c: Course, p: GrowProgress): Lesson | undefined {
  return c.lessons.find((l) => !p.lessons[l.id]?.done);
}

/** Что продолжить: последний открытый курс, его первый непройденный урок. */
export function continueTarget(p: GrowProgress): { course: Course; lesson: Lesson } | undefined {
  const course = courseById((p.last?.course as CourseId) ?? "python") ?? COURSES[0]!;
  const lesson = nextLesson(course, p);
  if (lesson) return { course, lesson };
  for (const c of COURSES) {
    const l = nextLesson(c, p);
    if (l) return { course: c, lesson: l };
  }
  return undefined;
}

/** Вопросы для разминки дня — только из пройденных уроков. */
export function warmupQuestions(p: GrowProgress): { key: string; quiz: Quiz; course: string }[] {
  const pool = COURSES.flatMap((c) =>
    c.lessons.filter((l) => p.lessons[l.id]?.done).flatMap((l) => l.quiz.map((q, i) => ({ key: `${l.id}:${i}`, quiz: q, course: c.name }))),
  );
  const picked = warmupFor(pool, today(), p.wrong, 3);
  return picked.map((x) => ({ ...x, course: pool.find((y) => y.key === x.key)!.course }));
}

/** Сколько сегодня занятий — для цели дня. */
export function todayDone(p: GrowProgress): number {
  return p.acts?.day === today() ? p.acts.n : 0;
}

/** Урок пройден: в повторение уходят его карточки, день засчитывается. */
export async function completeLesson(c: Course, l: Lesson, extra: { quiz?: number; task?: boolean } = {}): Promise<void> {
  const p = grow.get().progress;
  const was = p.lessons[l.id];
  if (!was?.done && l.cards.length) await api.grow.cards(CARD_SUBJECT(c), l.cards);
  await saveProgress({ lessons: { [l.id]: { ...was, ...extra, done: was?.done ?? today() } } });
  if (!was?.done) await markActive();
}

/** Открыть ИИ-помощника и сразу задать вопрос (из читалки, выделенного текста, задачи). */
export function askAssistant(ask?: string): void {
  grow.set((s) => ({ assistant: { open: true, ask, n: (s.assistant?.n ?? 0) + 1 } }));
}
