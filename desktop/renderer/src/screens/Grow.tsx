// «Прокачка»: курсы Python, Java, C++, HTML/CSS по модулям — гайд, тест, несколько задач от простой к сложной с запуском,
// итоговый тест модуля, задачник, библиотека, программа курса, ИИ-помощник сбоку. Каждый день — разминка и повторение.
import { useEffect, useMemo, useRef, useState } from "react";
import { imageToBase64 } from "../lib/media";
import { Brain, Camera, Check, ChevronRight, Code2, Flame, GraduationCap, Lightbulb, MessageCircleQuestion, Play, Plus, RefreshCw, Sparkles, Target, Wand2, X } from "lucide-react";
import { COURSES, courseById, PROBLEMS } from "../../../shared/courses";
import { checkHtml, problemStarter, sameOutput, type CodeTask, type Course, type CourseId, type Lesson, type Problem, type Quiz } from "../../../shared/courses/format";
import type { RunResult } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import {
  askAssistant,
  completeLesson,
  currentStreak,
  doneCount,
  grow,
  loadGrow,
  loadTools,
  markActive,
  saveProgress,
  setWork,
  today,
  todayDone,
  warmupQuestions,
  type GrowTab,
} from "../state/grow";
import { CodeEditor } from "../components/CodeEditor";
import { RichText } from "../components/RichText";
import { Review } from "../components/Cards";
import { Segmented } from "../components/ui";
import { GrowAssistant } from "../components/GrowAssistant";
import { Guard } from "../components/Guard";
import { SyllabusView } from "./GrowSyllabus";
import { LibraryView } from "./GrowLibrary";

type RunLang = "python" | "java" | "cpp";
const STARS = ["", "★", "★★", "★★★"];

export function Grow() {
  const s = useStore(grow, (x) => x);
  useEffect(() => {
    void loadGrow();
    void loadTools();
  }, []);

  const p = s.progress;
  const goal = Math.max(1, p.goal || 1);
  const doneToday = todayDone(p);
  const warmDone = p.warmupDone === today();
  const canWarm = warmupQuestions(p).length > 0;
  const course = courseById(s.tab as CourseId);
  const assistantOpen = !!s.assistant?.open;

  return (
    <div className={`screen grow ${assistantOpen ? "with-assistant" : ""}`}>
      <header className="screen-head">
        <h1 className="display">Прокачка</h1>
        <Segmented<GrowTab>
          size="sm"
          value={s.tab}
          onChange={(tab) => grow.set({ tab })}
          options={[
            ...COURSES.map((c) => ({ value: c.id as GrowTab, label: c.name })),
            { value: "problems", label: "Задачник" },
            { value: "library", label: "Библиотека" },
            { value: "syllabus", label: "Программа", title: "Программа курса: темы предмета и подготовка" },
            { value: "review", label: "Проверь код" },
          ]}
        />
      </header>

      <div className="grow-day card glass">
        <div className={`gd-streak ${currentStreak(p) ? "on" : ""}`} title="Дней подряд с занятиями">
          <Flame size={22} />
          <b>{currentStreak(p)}</b>
          <span>{plural(currentStreak(p), "день", "дня", "дней")} подряд</span>
        </div>
        <div className="gd-goal" title="Цель дня: занятий (урок, задача, разминка или повторение)">
          <Target size={18} />
          <span>
            Сегодня {Math.min(doneToday, goal)}/{goal}
          </span>
          <div className="gd-bar">
            <i style={{ width: `${Math.min(100, (doneToday / goal) * 100)}%` }} />
          </div>
          <select className="input sm" value={goal} title="Цель дня" onChange={(e) => void saveProgress({ goal: Number(e.target.value) })}>
            {[1, 2, 3, 5].map((g) => (
              <option key={g} value={g}>
                цель {g}
              </option>
            ))}
          </select>
        </div>
        <button className={`btn ${!warmDone && canWarm ? "primary" : ""}`} disabled={!canWarm} onClick={() => grow.set({ modal: "warmup" })} title={canWarm ? "3 вопроса из пройденных уроков" : "Пройди хотя бы один урок"}>
          <Sparkles size={16} /> {warmDone ? "Разминка ✓" : "Разминка дня"}
        </button>
        <button className={`btn ${s.due.length ? "glow" : ""}`} disabled={!s.due.length} onClick={() => grow.set({ modal: "review" })} title="Карточки из пройденных уроков — по интервалам, чтобы не забывалось">
          <Brain size={16} /> Повторить {s.due.length ? `(${s.due.length})` : ""}
        </button>
        <button className={`btn ${assistantOpen ? "on" : ""}`} onClick={() => grow.set({ assistant: { open: !assistantOpen } })} title="ИИ-помощник видит урок, задачу и твой код">
          <MessageCircleQuestion size={16} /> Спросить ИИ
        </button>
        <div className="gd-total muted small">
          уроков: {doneCount(p)} из {COURSES.reduce((a, c) => a + c.lessons.length, 0)} · задач: {Object.keys(p.problems ?? {}).length} из {PROBLEMS.length}
        </div>
      </div>

      <div className="grow-body">
        <div className="grow-main">
          <Guard inner name={`прокачка · ${s.tab}`} resetKey={s.tab} back={s.tab === "python" ? undefined : { label: "К курсу Python", onClick: () => grow.set({ tab: "python", modal: undefined }) }}>
          {course ? (
            <CourseView key={course.id} course={course} />
          ) : s.tab === "problems" ? (
            <ProblemsView />
          ) : s.tab === "library" ? (
            <LibraryView />
          ) : s.tab === "syllabus" ? (
            <SyllabusView />
          ) : (
            <ReviewView />
          )}
          </Guard>
        </div>
        {assistantOpen && <GrowAssistant />}
      </div>

      {s.modal === "warmup" && <WarmupModal onClose={() => grow.set({ modal: undefined })} />}
      {s.modal === "review" && (
        <Review
          cards={s.due}
          onClose={() => grow.set({ modal: undefined })}
          onDone={(n) => {
            if (n > 0) void markActive();
            void loadGrow();
          }}
        />
      )}
      {s.modal?.startsWith("exam:") && <ModuleExam courseId={s.modal.split(":")[1] as CourseId} module={s.modal.split(":").slice(2).join(":")} onClose={() => grow.set({ modal: undefined })} />}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ---------- Курс по модулям ----------

function CourseView({ course }: { course: Course }) {
  const p = useStore(grow, (x) => x.progress);
  const openId = useStore(grow, (x) => x.open[course.id]);
  const lesson = course.lessons.find((l) => l.id === openId) ?? course.lessons.find((l) => !p.lessons[l.id]?.done) ?? course.lessons[0]!;
  const done = doneCount(p, course);
  const modules = useMemo(() => {
    const m: { name: string; lessons: Lesson[] }[] = [];
    for (const l of course.lessons) {
      const last = m[m.length - 1];
      if (last && last.name === l.module) last.lessons.push(l);
      else m.push({ name: l.module, lessons: [l] });
    }
    return m;
  }, [course]);
  const openLesson = (l: Lesson) => {
    grow.set((s) => ({ open: { ...s.open, [course.id]: l.id }, task: 0 }));
    void saveProgress({ last: { course: course.id, lesson: l.id } });
    document.querySelector(".screen-wrap")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  let n = 0;
  return (
    <div className="grow-course">
      <aside className="gc-list card glass">
        <div className="gc-about">
          <b>{course.name}</b>
          <span className="muted small">
            {done} из {course.lessons.length} уроков · {course.lessons.reduce((a, l) => a + l.tasks.length, 0)} задач
          </span>
          <div className="gd-bar">
            <i style={{ width: `${(done / course.lessons.length) * 100}%` }} />
          </div>
        </div>
        {modules.map((m) => {
          const key = `${course.id}:${m.name}`;
          const best = p.exams?.[key];
          const mDone = m.lessons.filter((l) => p.lessons[l.id]?.done).length;
          return (
            <div key={m.name} className="gc-module">
              <div className="gc-mod-head">
                <span>{m.name}</span>
                <span className="muted small">
                  {mDone}/{m.lessons.length}
                </span>
              </div>
              <ol>
                {m.lessons.map((l) => {
                  n++;
                  const st = p.lessons[l.id];
                  return (
                    <li key={l.id}>
                      <button className={`gc-item ${l.id === lesson.id ? "on" : ""} ${st?.done ? "done" : ""}`} onClick={() => openLesson(l)}>
                        <span className="gc-num">{st?.done ? <Check size={13} /> : n}</span>
                        <span className="gc-title">{l.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {m.lessons.some((l) => l.quiz.length) && (
                <button className={`gc-exam ${best !== undefined && best >= 80 ? "passed" : ""}`} onClick={() => grow.set({ modal: `exam:${key}` })}>
                  <GraduationCap size={14} /> Итоговый тест модуля{best !== undefined ? ` · ${best}%` : ""}
                </button>
              )}
            </div>
          );
        })}
      </aside>
      <LessonView
        key={lesson.id}
        course={course}
        lesson={lesson}
        index={course.lessons.indexOf(lesson)}
        onNext={() => {
          const next = course.lessons[course.lessons.indexOf(lesson) + 1];
          if (next) openLesson(next);
        }}
      />
    </div>
  );
}

function LessonView({ course, lesson, index, onNext }: { course: Course; lesson: Lesson; index: number; onNext: () => void }) {
  const st = useStore(grow, (x) => x.progress.lessons[lesson.id]);
  const ti = useStore(grow, (x) => Math.min(x.task ?? 0, Math.max(0, lesson.tasks.length - 1)));
  const finishReq = useStore(grow, (x) => x.finishReq);
  const [quizRight, setQuizRight] = useState(0);
  const solved = st?.solved ?? (st?.task ? [0] : []);
  const finish = async () => {
    grow.set((s) => ({ open: { ...s.open, [course.id]: lesson.id } }));
    await completeLesson(course, lesson, { quiz: Math.max(quizRight, st?.quiz ?? 0), task: solved.length > 0 });
    toast(`Урок пройден! Карточки урока ушли в повторение — Камадо напомнит, когда пора вспомнить.`, "ok");
  };
  // «Засчитай урок» от ИИ-помощника
  const seenFinish = useRef(finishReq);
  useEffect(() => {
    if (finishReq !== seenFinish.current) {
      seenFinish.current = finishReq;
      if (!st?.done) void finish();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const task = lesson.tasks[ti];
  return (
    <article className="lesson">
      <div className="lesson-head">
        <span className="eyebrow">
          {course.name} · {lesson.module} · урок {index + 1} из {course.lessons.length}
        </span>
        <h2>{lesson.title}</h2>
      </div>
      <section className="card glass lesson-guide">
        <RichText text={lesson.guide} />
        <button
          className="btn sm ghost lg-ask"
          onClick={() => {
            const sel = String(window.getSelection() ?? "").trim();
            askAssistant(sel ? `Объясни подробнее этот кусок урока «${lesson.title}»:\n«${sel.slice(0, 2000)}»` : `Объясни проще главное из урока «${lesson.title}» и дай ещё пример.`);
          }}
          title="Выдели непонятный кусок текста и нажми"
        >
          <MessageCircleQuestion size={15} /> Непонятно — спросить ИИ
        </button>
      </section>

      {lesson.quiz.length > 0 && (
        <section className="card glass lesson-quiz">
          <h3 className="section-title">
            <Lightbulb size={16} /> Проверь себя
          </h3>
          {lesson.quiz.map((q, i) => (
            <QuizItem key={i} quiz={q} qkey={`${lesson.id}:${i}`} onAnswer={(ok) => ok && setQuizRight((k) => k + 1)} />
          ))}
        </section>
      )}

      {lesson.tasks.length > 1 && (
        <div className="task-tabs">
          {lesson.tasks.map((t, i) => (
            <button key={i} className={`task-tab ${i === ti ? "on" : ""} ${solved.includes(i) ? "solved" : ""}`} onClick={() => grow.set({ task: i })}>
              {solved.includes(i) ? <Check size={13} /> : null} Задача {i + 1} <span className="stars">{STARS[t.level]}</span>
            </button>
          ))}
          <span className="muted small">
            решено {solved.length} из {lesson.tasks.length}
          </span>
        </div>
      )}

      {task && (
        <TaskBlock
          key={`${lesson.id}#${ti}`}
          lang={course.lang}
          task={task}
          title={`${course.name} · ${lesson.title} · задача ${ti + 1} из ${lesson.tasks.length}`}
          lessonTitle={lesson.title}
          codeKey={ti === 0 ? lesson.id : `${lesson.id}#${ti}`}
          solved={solved.includes(ti)}
          onSolved={async () => {
            const cur = grow.get().progress.lessons[lesson.id];
            const was = cur?.solved ?? (cur?.task ? [0] : []);
            if (was.includes(ti)) return;
            await saveProgress({ lessons: { [lesson.id]: { ...cur, task: true, solved: [...was, ti].sort() } } });
            await markActive();
            const next = lesson.tasks.findIndex((_, i) => i > ti && !was.includes(i));
            if (next > 0) toast(`Решено! Дальше — задача ${next + 1} ${STARS[lesson.tasks[next]!.level]}`, "ok");
          }}
        />
      )}

      <MoreTask lang={course.lang} lessonTitle={lesson.title} guide={lesson.guide} />

      <div className="lesson-finish">
        {st?.done ? (
          <span className="lf-done">
            <Check size={16} /> Пройден {st.done === today() ? "сегодня" : new Date(st.done).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
          </span>
        ) : (
          <button className="btn primary" onClick={() => void finish()}>
            <Check size={16} /> Урок пройден
          </button>
        )}
        {index + 1 < course.lessons.length && (
          <button className="btn" onClick={onNext}>
            Следующий урок <ChevronRight size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

function QuizItem({ quiz, qkey, onAnswer }: { quiz: Quiz; qkey: string; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === quiz.answer;
    onAnswer(ok);
    if (!ok) {
      const wrong = grow.get().progress.wrong;
      void saveProgress({ wrong: { [qkey]: (wrong[qkey] ?? 0) + 1 } });
    }
  };
  return (
    <div className="quiz">
      <RichText text={quiz.q} />
      <div className="quiz-opts">
        {quiz.options.map((o, i) => (
          <button key={i} className={`quiz-opt ${picked === null ? "" : i === quiz.answer ? "right" : i === picked ? "wrong" : "dim"}`} onClick={() => pick(i)}>
            <RichText text={o} />
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className={`quiz-why ${picked === quiz.answer ? "ok" : "bad"}`}>
          {picked === quiz.answer ? "Верно! " : "Не совсем. "}
          {quiz.why}
        </div>
      )}
    </div>
  );
}

// ---------- Задача (урок или задачник) ----------

type TestRun = { input: string; expected: string; got: string; ok: boolean; err?: string };

function TaskBlock({
  lang,
  task,
  title,
  lessonTitle,
  codeKey,
  solved,
  onSolved,
}: {
  lang: Course["lang"];
  task: CodeTask & { solutionLang?: string };
  title: string;
  lessonTitle: string;
  codeKey: string;
  solved: boolean;
  onSolved: () => void | Promise<void>;
}) {
  const saved = useStore(grow, (x) => x.progress.code[codeKey]);
  const tools = useStore(grow, (x) => x.tools);
  const runReq = useStore(grow, (x) => x.runReq);
  const [code, setCode] = useState(saved ?? task.starter);
  const [busy, setBusy] = useState<"" | "run" | "ai">("");
  const [runs, setRuns] = useState<TestRun[] | null>(null);
  const [compileErr, setCompileErr] = useState("");
  const [ai, setAi] = useState<{ ok: boolean; text: string } | null>(null);
  const [failed, setFailed] = useState<string[] | null>(null);
  const [hints, setHints] = useState(0);
  const [showSol, setShowSol] = useState(false);
  const [custom, setCustom] = useState<string | null>(null);
  const [customOut, setCustomOut] = useState<RunResult | null>(null);
  const isHtml = lang === "html";
  const runner = !isHtml ? tools?.[lang as RunLang] : undefined;

  // код сохраняется сам
  const timer = useRef<number>(0);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (code !== (saved ?? task.starter)) void saveProgress({ code: { [codeKey]: code } });
    }, 900);
    return () => window.clearTimeout(timer.current);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ИИ-помощник видит, что сейчас открыто
  useEffect(() => {
    setWork({
      where: title,
      task: task.text,
      code,
      lang,
      runs: runs
        ? runs.map((r, i) => `Тест ${i + 1}: ${r.ok ? "ok" : "ошибка"}; вход: ${r.input.slice(0, 200)}; ждали: ${r.expected.slice(0, 200)}; вышло: ${r.got.slice(0, 200)}${r.err ? `; ${r.err.slice(0, 300)}` : ""}`).join("\n")
        : compileErr
          ? `Ошибка компиляции:\n${compileErr.slice(0, 1500)}`
          : failed
            ? `Не выполнено: ${failed.join("; ")}`
            : undefined,
    });
  }, [code, runs, compileErr, failed, title]); // eslint-disable-line react-hooks/exhaustive-deps

  const markSolved = () => void onSolved();

  const runTests = async () => {
    setBusy("run");
    setAi(null);
    setCompileErr("");
    try {
      const res = await api.grow.run(lang as RunLang, code, task.tests.map((t) => t.input));
      if ("error" in res) {
        toast(res.error === "not-installed" ? "Язык не установлен — проверю через ИИ" : res.error, "warn");
        return;
      }
      if (res[0]?.compile) {
        setCompileErr(res[0].stderr || res[0].stdout);
        setRuns(null);
        return;
      }
      const rr = task.tests.map((t, i) => {
        const r = res[i]!;
        return { input: t.input, expected: t.output, got: r.stdout, ok: r.ok && sameOutput(r.stdout, t.output), err: r.timeout ? "Не уложилось в 5 секунд — бесконечный цикл или слишком медленно" : r.ok ? undefined : r.stderr };
      });
      setRuns(rr);
      if (rr.every((r) => r.ok)) {
        toast("Все тесты пройдены! 🎉", "ok");
        markSolved();
      }
    } finally {
      setBusy("");
    }
  };

  const runCustom = async () => {
    setBusy("run");
    try {
      const res = await api.grow.run(lang as RunLang, code, [custom ?? ""]);
      if ("error" in res) return;
      setCustomOut(res[0] ?? null);
    } finally {
      setBusy("");
    }
  };

  const askAi = async () => {
    setBusy("ai");
    try {
      const r = await api.grow.check({ lang, lesson: lessonTitle, task: task.text, code, runs: runs ?? undefined });
      if ("error" in r) {
        toast(r.error, "warn");
        return;
      }
      setAi({ ok: r.ok, text: r.feedback });
      if (r.ok && (isHtml || !runner?.ok)) markSolved();
    } finally {
      setBusy("");
    }
  };

  const checkPage = () => {
    const doc = new DOMParser().parseFromString(code, "text/html");
    const f = checkHtml(doc, task.checks);
    setFailed(f);
    if (!f.length) {
      toast("Всё сделано! 🎉", "ok");
      markSolved();
    }
  };

  // «Запусти тесты» от ИИ-помощника
  const seenRun = useRef(runReq);
  useEffect(() => {
    if (runReq !== seenRun.current) {
      seenRun.current = runReq;
      if (isHtml) checkPage();
      else if (runner?.ok) void runTests();
      else void askAi();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // HTML: живой просмотр (без скриптов) с небольшой задержкой
  const [preview, setPreview] = useState(code);
  useEffect(() => {
    if (!isHtml) return;
    const t = window.setTimeout(() => setPreview(code), 350);
    return () => window.clearTimeout(t);
  }, [code, isHtml]);

  return (
    <section className="card glass lesson-task">
      <h3 className="section-title">
        <Code2 size={16} /> Задача <span className="stars">{STARS[task.level]}</span>
        {solved && (
          <span className="tk-solved">
            <Check size={13} /> решена
          </span>
        )}
      </h3>
      <RichText text={task.text} />
      {!isHtml && task.tests[0] && (
        <div className="tk-example">
          <div>
            <span className="muted small">Пример ввода</span>
            <pre>{task.tests[0].input || "(ничего)"}</pre>
          </div>
          <div>
            <span className="muted small">Вывод</span>
            <pre>{task.tests[0].output}</pre>
          </div>
        </div>
      )}
      <div className={`tk-work ${isHtml ? "html" : ""}`}>
        <CodeEditor value={code} onChange={setCode} lang={lang} minRows={isHtml ? 16 : 10} />
        {isHtml && <iframe className="tk-preview" title="Просмотр" sandbox="" srcDoc={preview} />}
      </div>
      <div className="tk-actions">
        {isHtml ? (
          <button className="btn primary" onClick={checkPage}>
            <Check size={16} /> Проверить
          </button>
        ) : runner?.ok ? (
          <button className="btn primary" disabled={!!busy} onClick={() => void runTests()}>
            <Play size={16} /> {busy === "run" ? "Запускаю…" : "Запустить тесты"}
          </button>
        ) : null}
        <button className={`btn ${!isHtml && !runner?.ok ? "primary" : ""}`} disabled={!!busy} onClick={() => void askAi()} title="ИИ посмотрит решение и подскажет">
          <Wand2 size={16} /> {busy === "ai" ? "Смотрю…" : !isHtml && !runner?.ok ? "Проверить ИИ" : "Совет ИИ"}
        </button>
        {hints < task.hints.length && (
          <button className="btn" onClick={() => setHints((h) => h + 1)}>
            <Lightbulb size={16} /> Подсказка {task.hints.length > 1 ? `${hints + 1}/${task.hints.length}` : ""}
          </button>
        )}
        {!isHtml && runner?.ok && (
          <button className="btn" onClick={() => setCustom((c) => (c === null ? (task.tests[0]?.input ?? "") : null))}>
            Свой ввод
          </button>
        )}
        <button className="btn ghost" onClick={() => askAssistant("Посмотри мой код к этой задаче: что не так и куда двигаться дальше? Готовое решение не пиши.")}>
          <MessageCircleQuestion size={15} /> Спросить
        </button>
        <button className="btn ghost" onClick={() => setShowSol((v) => !v)}>
          {showSol ? "Скрыть решение" : "Решение"}
        </button>
        <button className="btn ghost" title="Вернуть заготовку" onClick={() => confirm("Стереть свой код и вернуть заготовку?") && setCode(task.starter)}>
          <RefreshCw size={15} />
        </button>
      </div>
      {!isHtml && runner && !runner.ok && (
        <div className="tk-note muted small">
          Этот язык на компьютере не найден — решение проверит ИИ. Чтобы запускать код прямо здесь: {runner.hint}.{" "}
          <button className="link-btn" onClick={() => void loadTools(true)}>
            Проверить снова
          </button>
        </div>
      )}
      {task.hints.slice(0, hints).map((h, i) => (
        <div key={i} className="tk-hint">
          <Lightbulb size={14} /> <RichText text={h} />
        </div>
      ))}
      {custom !== null && (
        <div className="tk-custom">
          <textarea className="input mono" rows={3} value={custom} placeholder="Что подать на вход" onChange={(e) => setCustom(e.target.value)} />
          <button className="btn" disabled={!!busy} onClick={() => void runCustom()}>
            <Play size={15} /> Запустить
          </button>
          {customOut && <pre className={`tk-out ${customOut.ok ? "" : "bad"}`}>{(customOut.stdout + (customOut.stderr ? `\n${customOut.stderr}` : "")).trim() || "(пусто)"}</pre>}
        </div>
      )}
      {compileErr && (
        <div className="tk-result bad">
          <b>Ошибка компиляции</b>
          <pre>{compileErr.slice(0, 3000)}</pre>
        </div>
      )}
      {runs && (
        <div className="tk-tests">
          {runs.map((r, i) => (
            <details key={i} className={`tk-test ${r.ok ? "ok" : "bad"}`} open={!r.ok && runs.findIndex((x) => !x.ok) === i}>
              <summary>
                {r.ok ? <Check size={14} /> : <X size={14} />} Тест {i + 1}
              </summary>
              <div className="tk-io">
                <div>
                  <span>Ввод</span>
                  <pre>{r.input || "(ничего)"}</pre>
                </div>
                <div>
                  <span>Ожидалось</span>
                  <pre>{r.expected}</pre>
                </div>
                <div>
                  <span>Получилось</span>
                  <pre>{r.got || "(пусто)"}</pre>
                </div>
              </div>
              {r.err && <pre className="tk-err">{r.err.slice(0, 2000)}</pre>}
            </details>
          ))}
        </div>
      )}
      {failed && (
        <div className={`tk-result ${failed.length ? "bad" : "ok"}`}>
          {failed.length ? (
            <>
              <b>Ещё не всё:</b>
              <ul>
                {failed.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : (
            <b>Всё сделано — страница проходит все проверки!</b>
          )}
        </div>
      )}
      {ai && (
        <div className={`tk-result ${ai.ok ? "ok" : "bad"}`}>
          <b>{ai.ok ? "ИИ: решение верное" : "ИИ: есть ошибка"}</b>
          <RichText text={ai.text} />
        </div>
      )}
      {showSol && (
        <div className="tk-solution">
          {task.solutionLang && task.solutionLang !== lang && <p className="muted small">Эталонное решение на Python — идея та же на любом языке.</p>}
          <RichText text={"```" + (task.solutionLang ?? lang) + "\n" + task.solution + "\n```"} />
        </div>
      )}
    </section>
  );
}

function MoreTask({ lang, lessonTitle, guide }: { lang: string; lessonTitle: string; guide: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const more = async () => {
    setBusy(true);
    try {
      const r = await api.grow.more(lang, lessonTitle, guide);
      if ("error" in r) toast(r.error, "warn");
      else setText(r.text);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card glass lesson-more">
      <div className="lm-head">
        <h3 className="section-title">
          <Sparkles size={16} /> Ещё задача от ИИ
        </h3>
        <button className="btn sm" disabled={busy} onClick={() => void more()}>
          {busy ? "Придумываю…" : text ? "Другую" : "Дай задачу"}
        </button>
      </div>
      {text ? <RichText text={text} /> : <p className="muted small">Новая задача по теме урока — чтобы закрепить. Проверить решение можно во вкладке «Проверь код».</p>}
    </section>
  );
}

// ---------- Задачник ----------

function problemTask(p: Problem, lang: RunLang): CodeTask & { solutionLang?: string } {
  return { level: p.level, text: p.text, starter: problemStarter(lang), tests: p.tests, checks: [], hints: p.hints, solution: p.solution, solutionLang: "python" };
}

/** Один и тот же пустой объект: новый `{}` на каждый вызов заставлял React перерисовывать экран без конца. */
const NO_SOLVED: Record<string, string[]> = {};

function ProblemsView() {
  const tools = useStore(grow, (x) => x.tools);
  const solvedMap = useStore(grow, (x) => x.progress.problems ?? NO_SOLVED);
  const openId = useStore(grow, (x) => x.problem);
  const [lang, setLang] = useState<RunLang>("python");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(0);
  const [hideSolved, setHideSolved] = useState(false);
  const [mine, setMine] = useState<Problem[]>([]);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    void api.growCustom.list().then((l) => setMine(l.map((x) => ({ ...x, topic: x.topic, hints: [] }))));
  }, [adding]);
  const ALL = useMemo(() => [...mine, ...PROBLEMS], [mine]);
  const mineIds = useMemo(() => new Set(mine.map((x) => x.id)), [mine]);
  const topics = useMemo(() => [...new Set(PROBLEMS.map((x) => x.topic))], []);
  const list = ALL.filter((x) => (!topic || (topic === MY ? mineIds.has(x.id) : x.topic === topic)) && (!level || x.level === level) && (!hideSolved || !solvedMap[x.id]?.length));
  const cur = ALL.find((x) => x.id === openId) ?? list[0];
  const LN: Record<RunLang, string> = { python: "Python", java: "Java", cpp: "C++" };
  return (
    <div className="problems">
      <div className="pb-filters">
        <Segmented<RunLang> size="sm" value={lang} onChange={setLang} options={[{ value: "python", label: "Python" }, { value: "java", label: "Java" }, { value: "cpp", label: "C++" }]} />
        <select className="input sm" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">все темы</option>
          {mine.length > 0 && (
            <option value={MY}>
              {MY} · {mine.length}
            </option>
          )}
          {topics.map((t) => (
            <option key={t} value={t}>
              {t} · {PROBLEMS.filter((x) => x.topic === t).length}
            </option>
          ))}
        </select>
        <select className="input sm" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
          <option value={0}>любая сложность</option>
          <option value={1}>★ лёгкие</option>
          <option value={2}>★★ средние</option>
          <option value={3}>★★★ сложные</option>
        </select>
        <label className="inline-toggle sm">
          <input type="checkbox" checked={hideSolved} onChange={(e) => setHideSolved(e.target.checked)} /> скрыть решённые
        </label>
        <span className="muted small">
          решено {Object.values(solvedMap).filter((v) => v.length).length} из {ALL.length}
        </span>
        <button className="btn sm" onClick={() => setAdding(true)} title="Кинь условие лабы или задачи с контеста — Камадо сделает к ней тесты">
          <Plus size={14} /> Своя задача
        </button>
      </div>
      <div className="grow-course">
        <aside className="gc-list card glass">
          <ol>
            {list.map((x) => (
              <li key={x.id}>
                <button className={`gc-item ${cur?.id === x.id ? "on" : ""} ${solvedMap[x.id]?.length ? "done" : ""}`} onClick={() => grow.set({ problem: x.id })}>
                  <span className="gc-num">{solvedMap[x.id]?.length ? <Check size={13} /> : mineIds.has(x.id) ? "★" : PROBLEMS.indexOf(x) + 1}</span>
                  <span className="gc-title">
                    {x.title}
                    <span className="gc-date">
                      {x.topic} · {STARS[x.level]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
        {cur ? (
          <article className="lesson">
            <div className="lesson-head">
              <span className="eyebrow">
                Задачник · {cur.topic} · {STARS[cur.level]}
                {solvedMap[cur.id]?.length ? ` · решена на ${solvedMap[cur.id]!.map((l) => LN[l as RunLang] ?? l).join(", ")}` : ""}
              </span>
              <h2>{cur.title}</h2>
              {mineIds.has(cur.id) && (
                <button className="link-btn danger" onClick={() => void api.growCustom.remove(cur.id).then((l) => setMine(l.map((x) => ({ ...x, hints: [] }))))}>
                  удалить свою задачу
                </button>
              )}
            </div>
            <TaskBlock
              key={`${cur.id}:${lang}`}
              lang={lang}
              task={problemTask(cur, lang)}
              title={`Задачник · ${cur.title} (${cur.topic}) на ${LN[lang]}`}
              lessonTitle={`${cur.title} (${cur.topic})`}
              codeKey={`prob:${cur.id}:${lang}`}
              solved={!!solvedMap[cur.id]?.includes(lang)}
              onSolved={async () => {
                const was = grow.get().progress.problems?.[cur.id] ?? [];
                if (was.includes(lang)) return;
                await saveProgress({ problems: { [cur.id]: [...was, lang] } });
                await markActive();
              }}
            />
            {tools && !tools[lang]?.ok && <p className="muted small">Решения проверяются запуском на тестах, когда {LN[lang]} установлен на компьютере; пока — проверка ИИ.</p>}
          </article>
        ) : (
          <p className="muted">Ничего не нашлось — смени фильтр.</p>
        )}
      </div>
      {adding && (
        <CustomProblemModal
          onClose={(id) => {
            setAdding(false);
            if (id) grow.set({ problem: id });
          }}
        />
      )}
    </div>
  );
}

const MY = "Мои задачи";

/** «Своя задача»: условие лабы/контеста (текст или фото) → задача с тестами; ответы тестов Камадо проверяет запуском эталона. */
function CustomProblemModal({ onClose }: { onClose: (id?: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEscape(() => onClose());
  const make = async (files?: File[]) => {
    setBusy(true);
    try {
      const images = files ? await Promise.all(files.slice(0, 4).map((f) => imageToBase64(f, 2200))) : undefined;
      const r = await api.growCustom.create({ text: text.trim() || undefined, images });
      if ("error" in r) return toast(r.error, "warn");
      toast(r.problem.verified ? `Готово: «${r.problem.title}» — ${r.problem.tests.length} тестов, ответы проверены запуском` : `Готово: «${r.problem.title}» — ${r.problem.tests.length} тестов`, "ok");
      onClose(r.problem.id);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-back" onClick={() => onClose()}>
      <div className="modal glass custom-problem" onClick={(e) => e.stopPropagation()}>
        <h2>Своя задача</h2>
        <p className="muted small">Вставь условие (лаба, контест, домашка) или скинь фото — Камадо сделает задачу с тестами, и её можно решать на Python, Java или C++ с проверкой запуском.</p>
        <textarea className="input" rows={9} autoFocus placeholder="Условие задачи: что на входе, что вывести, ограничения, пример…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row-end">
          <button className="btn" disabled={busy} onClick={() => file.current?.click()}>
            <Camera size={16} /> Фото условия
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void make([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <button className="btn primary" disabled={busy || text.trim().length < 15} onClick={() => void make()}>
            {busy ? "Делаю задачу…" : "Сделать задачу"}
          </button>
        </div>
      </div>
    </div>
  );
}


/** Окно закрывается по Esc. */
function useEscape(onClose: () => void): void {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
}

// ---------- Итоговый тест модуля ----------

function ModuleExam({ courseId, module, onClose }: { courseId: CourseId; module: string; onClose: () => void }) {
  useEscape(onClose);
  const course = courseById(courseId)!;
  const key = `${courseId}:${module}`;
  const qs = useMemo(() => {
    const all = course.lessons.filter((l) => l.module === module).flatMap((l) => l.quiz.map((q, i) => ({ key: `${l.id}:${i}`, quiz: q })));
    return all.sort(() => Math.random() - 0.5).slice(0, 10);
  }, [course, module]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);
  const cur = qs[i];
  const pct = qs.length ? Math.round((right / qs.length) * 100) : 0;
  const finish = async () => {
    const best = grow.get().progress.exams?.[key] ?? 0;
    await saveProgress({ exams: { [key]: Math.max(best, pct) } });
    await markActive();
    onClose();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass warmup" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <GraduationCap size={18} />
          <span>
            Итоговый тест · {course.name} · {module}
          </span>
          <span className="muted small">{cur ? `${i + 1} из ${qs.length}` : ""}</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {cur ? (
          <>
            <QuizItem
              key={cur.key}
              quiz={cur.quiz}
              qkey={cur.key}
              onAnswer={(ok) => {
                setAnswered(true);
                if (ok) setRight((n) => n + 1);
              }}
            />
            <button className="btn primary" disabled={!answered} onClick={() => (setAnswered(false), setI((n) => n + 1))}>
              {i + 1 < qs.length ? "Дальше" : "Результат"}
            </button>
          </>
        ) : (
          <div className="rv-done">
            <div className="rv-big">{pct >= 80 ? "🎓" : "📚"}</div>
            <b>
              {right} из {qs.length} — {pct}%
            </b>
            <span className="muted">{pct >= 80 ? "Модуль сдан! Можно идти дальше." : "Для зачёта нужно 80%. Повтори уроки модуля и попробуй снова — вопросы перемешаются."}</span>
            <button className="btn primary" onClick={() => void finish()}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Разминка дня ----------

function WarmupModal({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const p = useStore(grow, (x) => x.progress);
  const qs = useMemo(() => warmupQuestions(p), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);
  const cur = qs[i];
  const finish = async () => {
    if (p.warmupDone !== today()) {
      await saveProgress({ warmupDone: today() });
      await markActive();
    }
    onClose();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass warmup" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <Sparkles size={18} />
          <span>Разминка дня</span>
          <span className="muted small">{cur ? `${i + 1} из ${qs.length} · ${cur.course}` : ""}</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {cur ? (
          <>
            <QuizItem
              key={cur.key}
              quiz={cur.quiz}
              qkey={cur.key}
              onAnswer={(ok) => {
                setAnswered(true);
                if (ok) setRight((n) => n + 1);
              }}
            />
            <button className="btn primary" disabled={!answered} onClick={() => (setAnswered(false), setI((n) => n + 1))}>
              {i + 1 < qs.length ? "Дальше" : "Готово"}
            </button>
          </>
        ) : (
          <div className="rv-done">
            <div className="rv-big">{right === qs.length ? "🔥" : "💪"}</div>
            <b>
              {right} из {qs.length} верно
            </b>
            <span className="muted">{right === qs.length ? "Отлично помнишь!" : "Вопросы с ошибками будут попадаться чаще, пока не запомнятся."}</span>
            <button className="btn primary" onClick={() => void finish()}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Проверь мой код ----------

function ReviewView() {
  const [lang, setLang] = useState<CourseId>("python");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => {
    setWork({ where: "Проверь мой код (своя лаба или задача)", code, lang });
  }, [code, lang]);
  const go = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await api.grow.review(lang, code, note);
      if ("error" in r) toast(r.error, "warn");
      else {
        setText(r.text);
        void markActive();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grow-review">
      <section className="card glass">
        <h3 className="section-title">Вставь свой код — лабу, задачу, что не работает</h3>
        <Segmented<CourseId> size="sm" value={lang} onChange={setLang} options={COURSES.map((c) => ({ value: c.id, label: c.name }))} />
        <CodeEditor value={code} onChange={setCode} lang={lang} minRows={14} />
        <textarea className="input" rows={3} placeholder="Необязательно: что должно получиться или текст ошибки" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn primary" disabled={busy || !code.trim()} onClick={() => void go()}>
          <Wand2 size={16} /> {busy ? "Смотрю код…" : "Проверить"}
        </button>
      </section>
      {text && (
        <section className="card glass">
          <RichText text={text} />
        </section>
      )}
    </div>
  );
}
