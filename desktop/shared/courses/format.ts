// Курсы «Прокачки»: уроки пишутся простым текстом (python.md, java.md…) и разбираются здесь.
//
// Формат урока:
//   ## py-01 | Название урока
//   Гайд (как в заметках: абзацы, списки, **жирный**, `код`, блоки ```код```).
//   ?? Вопрос (дальше строки вопроса, можно с ```кодом```)
//   - неверный вариант
//   + верный вариант
//   = почему так
//   !! Задача (дальше строки условия)
//   <<<              ← начало заготовки кода
//   ...
//   <<<              ← конец
//   in: 3 5          ← тест: что подать на вход (\n — новая строка)
//   out: 8           ← что должно получиться (сравнивается без лишних пробелов по краям строк)
//   check: h1 | Нужен заголовок h1          ← для HTML: в странице должен быть такой элемент
//   check: li >= 3 | Нужно хотя бы 3 пункта списка
//   hint: подсказка
//   ===              ← начало решения
//   ...
//   ===              ← конец
//   card: Вопрос :: Ответ   (\n — новая строка)

export type CourseId = "python" | "java" | "cpp" | "html";

export interface Quiz {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface HtmlCheck {
  selector: string;
  min: number;
  message: string;
}

export interface CodeTask {
  text: string;
  starter: string;
  tests: { input: string; output: string }[];
  checks: HtmlCheck[];
  hints: string[];
  solution: string;
}

export interface Lesson {
  id: string;
  title: string;
  guide: string;
  quiz: Quiz[];
  task?: CodeTask;
  cards: { question: string; answer: string }[];
}

export interface Course {
  id: CourseId;
  name: string;
  about: string;
  /** Как запустить у себя (для подсказки), язык подсветки. */
  lang: "python" | "java" | "cpp" | "html";
  lessons: Lesson[];
}

const unescape = (s: string) => s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

export function parseCourse(id: CourseId, name: string, lang: Course["lang"], text: string): Course {
  const lines = text.replace(/\r/g, "").split("\n");
  const lessons: Lesson[] = [];
  let about: string[] = [];
  let lesson: Lesson | null = null;
  type Mode = "guide" | "quiz" | "task" | "starter" | "solution";
  let mode: Mode = "guide";
  let guide: string[] = [];
  let quiz: { q: string[]; options: string[]; answer: number; why: string } | null = null;
  let task: (Omit<CodeTask, "text" | "starter" | "solution"> & { text: string[]; starter: string[]; solution: string[] }) | null = null;
  let fence = false;
  let pendingIn: string | null = null;

  const flushQuiz = () => {
    if (lesson && quiz) {
      if (quiz.answer < 0) throw new Error(`${lesson.id}: у вопроса «${quiz.q[0]}» нет верного варианта (+)`);
      lesson.quiz.push({ q: quiz.q.join("\n").trim(), options: quiz.options, answer: quiz.answer, why: quiz.why });
    }
    quiz = null;
  };
  const flushLesson = () => {
    flushQuiz();
    if (!lesson) return;
    lesson.guide = guide.join("\n").trim();
    if (task) {
      lesson.task = {
        text: task.text.join("\n").trim(),
        starter: task.starter.join("\n"),
        tests: task.tests,
        checks: task.checks,
        hints: task.hints,
        solution: task.solution.join("\n"),
      };
    }
    lessons.push(lesson);
    lesson = null;
    task = null;
    guide = [];
  };

  for (const raw of lines) {
    const line = raw;
    // заготовка и решение — как есть, до закрывающей строки
    if (mode === "starter") {
      if (line.trim() === "<<<") mode = "task";
      else task!.starter.push(line);
      continue;
    }
    if (mode === "solution") {
      if (line.trim() === "===") mode = "task";
      else task!.solution.push(line);
      continue;
    }
    if (line.trimStart().startsWith("```")) fence = !fence;
    if (fence || line.trimStart().startsWith("```")) {
      if (mode === "guide") (lesson ? guide : about).push(line);
      else if (mode === "quiz" && quiz) quiz.q.push(line);
      else if (mode === "task" && task) task.text.push(line);
      continue;
    }
    const m = /^## +([\w-]+) *\| *(.+)$/.exec(line);
    if (m) {
      flushLesson();
      lesson = { id: m[1]!, title: m[2]!.trim(), guide: "", quiz: [], cards: [] };
      mode = "guide";
      continue;
    }
    if (line.startsWith("# ")) continue; // заголовок файла
    if (!lesson) {
      about.push(line);
      continue;
    }
    if (line.startsWith("?? ")) {
      flushQuiz();
      quiz = { q: [line.slice(3)], options: [], answer: -1, why: "" };
      mode = "quiz";
      continue;
    }
    if (line.startsWith("!! ")) {
      flushQuiz();
      task = { text: [line.slice(3)], starter: [], tests: [], checks: [], hints: [], solution: [] };
      mode = "task";
      continue;
    }
    if (line.startsWith("card: ")) {
      const [q, a] = line.slice(6).split(" :: ");
      if (!q || a === undefined) throw new Error(`${lesson.id}: карточка без « :: »`);
      lesson.cards.push({ question: unescape(q.trim()), answer: unescape(a.trim()) });
      continue;
    }
    if (mode === "quiz" && quiz) {
      if (/^[-+] /.test(line)) {
        if (line[0] === "+") quiz.answer = quiz.options.length;
        quiz.options.push(unescape(line.slice(2)));
      } else if (line.startsWith("= ")) quiz.why = line.slice(2);
      else if (!quiz.options.length) quiz.q.push(line);
      continue;
    }
    if (mode === "task" && task) {
      if (line.trim() === "<<<") mode = "starter";
      else if (line.trim() === "===") mode = "solution";
      else if (line.startsWith("in:")) pendingIn = unescape(line.slice(3).trim());
      else if (line.startsWith("out:")) {
        task.tests.push({ input: pendingIn ?? "", output: unescape(line.slice(4).trim()) });
        pendingIn = null;
      } else if (line.startsWith("hint: ")) task.hints.push(line.slice(6));
      else if (line.startsWith("check: ")) {
        const [sel, msg] = line.slice(7).split(" | ");
        const cm = /^(.*?)(?:\s*>=\s*(\d+))?$/.exec(sel!.trim())!;
        task.checks.push({ selector: cm[1]!.trim(), min: Number(cm[2] ?? 1), message: (msg ?? `Нужен элемент ${cm[1]}`).trim() });
      } else task.text.push(line);
      continue;
    }
    guide.push(line);
  }
  flushLesson();
  return { id, name, lang, about: about.join("\n").trim(), lessons };
}

/** Сравнение вывода: без пробелов в конце строк и пустых строк в конце. */
export function sameOutput(got: string, want: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .trim();
  return norm(got) === norm(want);
}

/** Разминка дня: несколько вопросов из пройденных уроков; одинаковые весь день, ошибки чаще. */
export function warmupFor(
  pool: { key: string; quiz: Quiz }[],
  day: string,
  wrong: Record<string, number>,
  count = 3,
): { key: string; quiz: Quiz }[] {
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const weighted = pool.map((p) => ({ p, w: rand() / (1 + (wrong[p.key] ?? 0) * 2) }));
  weighted.sort((a, b) => a.w - b.w);
  return weighted.slice(0, count).map((x) => x.p);
}

/** Серия: сколько дней подряд (до сегодня или вчера включительно) был хоть один урок/повторение. */
export function streak(days: string[], today: string): number {
  const set = new Set(days);
  const d = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/** То, что нужно от документа для проверки (DOMParser в окне или настоящая страница). */
export interface CheckableDoc {
  querySelectorAll(selector: string): ArrayLike<{ textContent: string | null; getAttribute(name: string): string | null }>;
}

/** Проверка HTML-задачи: какие требования не выполнены (пустой список — всё хорошо). */
export function checkHtml(doc: CheckableDoc, checks: HtmlCheck[]): string[] {
  const styles = [
    ...Array.from(doc.querySelectorAll("style")).map((s) => s.textContent ?? ""),
    ...Array.from(doc.querySelectorAll("[style]")).map((e) => e.getAttribute("style") ?? ""),
  ].join("\n");
  const failed: string[] = [];
  for (const c of checks) {
    let ok: boolean;
    if (c.selector.startsWith("css:")) {
      try {
        ok = new RegExp(c.selector.slice(4), "i").test(styles);
      } catch {
        ok = false;
      }
    } else {
      try {
        ok = doc.querySelectorAll(c.selector).length >= c.min;
      } catch {
        ok = false;
      }
    }
    if (!ok) failed.push(c.message);
  }
  return failed;
}
