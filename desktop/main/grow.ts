// «Прокачка» и «Программа ИТМО» в фоновой части: прогресс, запуск кода, проверка ИИ, разбор программы курса.
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { BrowserWindow, Dialog } from "electron";
import type { CamadoCore } from "../../src/core.js";
import { checkSolution, moreExercise, reviewCode, type CheckInput } from "../../src/camado/grow.js";
import { parseProgramme, topicPractice, type Programme, type ProgrammeTopic } from "../../src/camado/itmo.js";
import type { Store } from "../../src/store.js";
import { localToUtc } from "../../src/time.js";
import type { GrowProgress } from "../shared/types.js";
import { detectTools, hasRunner, installHint, runCode, type RunLang } from "./runner.js";

const PROGRESS_KV = "grow.progress";
const PROGRAMMES_KV = "itmo.programmes";

export const emptyProgress = (): GrowProgress => ({ lessons: {}, days: [], wrong: {}, code: {}, goal: 1 });

type Handler = (...args: never[]) => unknown;

export function growHandlers(deps: {
  store: Store;
  core: CamadoCore;
  timeZone: string;
  withAi: <T extends object>(fn: () => Promise<T | { error: string }>) => Promise<T | { error: string }>;
  dialog: Dialog;
  win: () => BrowserWindow | undefined;
}): Record<string, Handler> {
  const { store, core, withAi } = deps;

  const loadJson = <T>(key: string, fallback: T): T => {
    try {
      const raw = store.getKv(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const progress = (): GrowProgress => ({ ...emptyProgress(), ...loadJson<Partial<GrowProgress>>(PROGRESS_KV, {}) });
  const programmes = (): Programme[] => loadJson<Programme[]>(PROGRAMMES_KV, []);
  const savePrograms = (list: Programme[]) => store.setKv(PROGRAMMES_KV, JSON.stringify(list));

  return {
    "grow.get": () => progress(),
    /** Частичное обновление: lessons, code, wrong дополняются по ключам, остальное заменяется. */
    "grow.save": (patch: Partial<GrowProgress>) => {
      const cur = progress();
      const next: GrowProgress = {
        ...cur,
        ...patch,
        lessons: { ...cur.lessons, ...(patch.lessons ?? {}) },
        code: { ...cur.code, ...(patch.code ?? {}) },
        wrong: { ...cur.wrong, ...(patch.wrong ?? {}) },
        days: patch.days ? [...new Set([...cur.days, ...patch.days])].sort().slice(-400) : cur.days,
      };
      store.setKv(PROGRESS_KV, JSON.stringify(next));
      return next;
    },
    "grow.tools": async (force?: boolean) => {
      const t = await detectTools(!!force);
      const langs: RunLang[] = ["python", "java", "cpp"];
      return Object.fromEntries(langs.map((l) => [l, { ok: hasRunner(t, l), hint: installHint(l) }]));
    },
    "grow.run": async (lang: RunLang, code: string, inputs: string[]) => {
      if (!["python", "java", "cpp"].includes(lang)) return { error: "Неизвестный язык" };
      const res = await runCode(await detectTools(), lang, String(code).slice(0, 200_000), (inputs ?? []).slice(0, 20).map(String));
      return res;
    },
    "grow.check": (input: CheckInput) => withAi(() => checkSolution(core.llm, input)),
    "grow.more": (lang: string, lesson: string, guide: string) => withAi(async () => ({ text: await moreExercise(core.llm, lang, lesson, guide) })),
    "grow.review": (lang: string, code: string, note?: string) => withAi(async () => ({ text: await reviewCode(core.llm, lang, code, note) })),
    /** Карточки пройденного урока — в общее повторение (по интервалам). */
    "grow.cards": (subject: string, cards: { question: string; answer: string }[]) =>
      store.addCards(cards.slice(0, 20).map((c) => ({ question: c.question, answer: c.answer, subject }))),

    // ---------- Программа курса ИТМО ----------
    "itmo.list": () => programmes(),
    "itmo.import": (input: { text?: string; pickFile?: boolean; subject?: string }) =>
      withAi(async () => {
        let text = input.text ?? "";
        let attachments: { mime: string; data: string }[] | undefined;
        if (input.pickFile) {
          const w = deps.win();
          const res = await (w
            ? deps.dialog.showOpenDialog(w, {
                title: "Программа дисциплины",
                properties: ["openFile"],
                filters: [{ name: "PDF, текст, скриншот", extensions: ["pdf", "txt", "md", "png", "jpg", "jpeg", "webp"] }],
              })
            : deps.dialog.showOpenDialog({ properties: ["openFile"] }));
          if (res.canceled || !res.filePaths[0]) return { cancelled: true as const };
          const file = res.filePaths[0];
          const ext = extname(file).toLowerCase();
          const buf = await readFile(file);
          if (buf.length > 20 * 1024 * 1024) return { error: "Файл больше 20 МБ — скинь часть программы или текст." };
          if ([".txt", ".md"].includes(ext)) text = buf.toString("utf8");
          else {
            const mime = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
            attachments = [{ mime, data: buf.toString("base64") }];
          }
        }
        if (!text.trim() && !attachments) return { error: "Вставь текст программы или выбери файл." };
        const parsed = await parseProgramme(core.llm, { text, attachments, subjectHint: input.subject });
        if (!parsed) return { error: "ИИ не нашёл в этом тексте тем занятий. Попробуй другой файл или вставь текст." };
        const subject = store.saveSubject({ name: input.subject?.trim() || parsed.subject }).name;
        const list = programmes().filter((p) => p.subject !== subject);
        const prog: Programme = { ...parsed, subject, id: `${Date.now()}`, addedAt: new Date().toISOString() };
        savePrograms([...list, prog]);
        return { programme: prog };
      }),
    "itmo.topic": (id: string, n: number, patch: Partial<Pick<ProgrammeTopic, "done" | "date" | "title">>) => {
      const list = programmes();
      const p = list.find((x) => x.id === id);
      const t = p?.topics.find((x) => x.n === n);
      if (!t) return undefined;
      Object.assign(t, patch);
      if (patch.done && t.taskId) store.updateTask(t.taskId, { status: "done" });
      savePrograms(list);
      return p;
    },
    "itmo.remove": (id: string) => {
      savePrograms(programmes().filter((p) => p.id !== id));
    },
    /** Задания «подготовиться к теме» к каждому будущему занятию с датой (накануне вечером напомнит сам Камадо). */
    "itmo.plan": (id: string) => {
      const list = programmes();
      const p = list.find((x) => x.id === id);
      if (!p) return { added: 0 };
      const now = Date.now();
      let added = 0;
      for (const t of p.topics) {
        if (!t.date || t.done || t.taskId) continue;
        const [y, m, d] = t.date.split("-").map(Number) as [number, number, number];
        const due = localToUtc(y, m, d, 8, 0, deps.timeZone);
        if (due.getTime() < now) continue;
        const task = store.addTask({
          title: `Подготовиться: ${t.title}`,
          subject: p.subject,
          kind: "homework",
          dueAt: due.toISOString(),
          details: [t.reading ? `Читать: ${t.reading}` : "", "Материалы и задачи — в «Прокачка» → «Программа ИТМО»."].filter(Boolean).join("\n"),
        });
        t.taskId = task.id;
        added++;
      }
      savePrograms(list);
      return { added };
    },
    "itmo.practice": (subject: string, topic: string, reading?: string) => withAi(async () => ({ text: await topicPractice(core.llm, subject, topic, reading) })),
  };
}
