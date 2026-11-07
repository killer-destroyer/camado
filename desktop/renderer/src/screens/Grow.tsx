// «Прокачка»: курсы Python, Java, C++, HTML/CSS — гайд, тест, задача с проверкой, повторение каждый день.
// И «Программа ИТМО»: загрузил программу предмета — темы по занятиям, материалы, задачи, подготовка в задания.
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Brain, Check, ChevronRight, Code2, Flame, Lightbulb, Play, RefreshCw, Sparkles, Target, Wand2, X } from "lucide-react";
import { COURSES, courseById } from "../../../shared/courses";
import { checkHtml, sameOutput, type Course, type CourseId, type Lesson, type Quiz } from "../../../shared/courses/format";
import type { RunResult } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import {
  completeLesson,
  continueTarget,
  currentStreak,
  doneCount,
  grow,
  loadGrow,
  loadTools,
  markActive,
  saveProgress,
  today,
  todayDone,
  warmupQuestions,
  type GrowTab,
} from "../state/grow";
import { CodeEditor } from "../components/CodeEditor";
import { RichText } from "../components/RichText";
import { Review } from "../components/Cards";
import { Segmented } from "../components/ui";
import { ItmoView } from "./GrowItmo";

export function Grow() {
  const s = useStore(grow, (x) => x);
  const [warm, setWarm] = useState(false);
  const [review, setReview] = useState(false);
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

  return (
    <div className="screen grow">
      <header className="screen-head">
        <h1 className="display">Прокачка</h1>
        <Segmented<GrowTab>
          value={s.tab}
          onChange={(tab) => grow.set({ tab })}
          options={[
            ...COURSES.map((c) => ({ value: c.id as GrowTab, label: c.name })),
            { value: "itmo", label: "Программа ИТМО" },
            { value: "review", label: "Проверь мой код" },
          ]}
        />
      </header>

      <div className="grow-day card glass">
        <div className={`gd-streak ${currentStreak(p) ? "on" : ""}`} title="Дней подряд с занятиями">
          <Flame size={22} />
          <b>{currentStreak(p)}</b>
          <span>{plural(currentStreak(p), "день", "дня", "дней")} подряд</span>
        </div>
        <div className="gd-goal" title="Цель дня: занятий (урок, разминка или повторение)">
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
        <button className={`btn ${!warmDone && canWarm ? "primary" : ""}`} disabled={!canWarm} onClick={() => setWarm(true)} title={canWarm ? "3 вопроса из пройденных уроков" : "Пройди хотя бы один урок"}>
          <Sparkles size={16} /> {warmDone ? "Разминка ✓" : "Разминка дня"}
        </button>
        <button className={`btn ${s.due.length ? "glow" : ""}`} disabled={!s.due.length} onClick={() => setReview(true)} title="Карточки из пройденных уроков — по интервалам, чтобы не забывалось">
          <Brain size={16} /> Повторить {s.due.length ? `(${s.due.length})` : ""}
        </button>
        <div className="gd-total muted small">
          пройдено уроков: {doneCount(p)} из {COURSES.reduce((a, c) => a + c.lessons.length, 0)}
        </div>
      </div>

      {course ? <CourseView key={course.id} course={course} /> : s.tab === "itmo" ? <ItmoView /> : <ReviewView />}

      {warm && <WarmupModal onClose={() => setWarm(false)} />}
      {review && (
        <Review
          cards={s.due}
          onClose={() => setReview(false)}
          onDone={(n) => {
            if (n > 0) void markActive();
            void loadGrow();
          }}
        />
      )}
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

// ---------- Курс ----------

function CourseView({ course }: { course: Course }) {
  const p = useStore(grow, (x) => x.progress);
  const openId = useStore(grow, (x) => x.open[course.id]);
  const lesson = course.lessons.find((l) => l.id === openId) ?? course.lessons.find((l) => !p.lessons[l.id]?.done) ?? course.lessons[0]!;
  const done = doneCount(p, course);
  const openLesson = (l: Lesson) => {
    grow.set((s) => ({ open: { ...s.open, [course.id]: l.id } }));
    void saveProgress({ last: { course: course.id, lesson: l.id } });
    document.querySelector(".screen-wrap")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="grow-course">
      <aside className="gc-list card glass">
        <div className="gc-about">
          <b>{course.name}</b>
          <span className="muted small">
            {done} из {course.lessons.length} уроков
          </span>
          <div className="gd-bar">
            <i style={{ width: `${(done / course.lessons.length) * 100}%` }} />
          </div>
        </div>
        <ol>
          {course.lessons.map((l, i) => {
            const st = p.lessons[l.id];
            return (
              <li key={l.id}>
                <button className={`gc-item ${l.id === lesson.id ? "on" : ""} ${st?.done ? "done" : ""}`} onClick={() => openLesson(l)}>
                  <span className="gc-num">{st?.done ? <Check size={13} /> : i + 1}</span>
                  <span className="gc-title">{l.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
      <LessonView key={lesson.id} course={course} lesson={lesson} onNext={() => {
        const i = course.lessons.indexOf(lesson);
        const next = course.lessons[i + 1];
        if (next) openLesson(next);
      }} />
    </div>
  );
}

function LessonView({ course, lesson, onNext }: { course: Course; lesson: Lesson; onNext: () => void }) {
  const st = useStore(grow, (x) => x.progress.lessons[lesson.id]);
  const idx = course.lessons.indexOf(lesson);
  const [quizRight, setQuizRight] = useState(0);
  const [solved, setSolved] = useState(!!st?.task);
  const finish = async () => {
    // остаёмся на этом уроке (иначе список сам перескочит на следующий непройденный)
    grow.set((s) => ({ open: { ...s.open, [course.id]: lesson.id } }));
    await completeLesson(course, lesson, { quiz: Math.max(quizRight, st?.quiz ?? 0), task: solved || st?.task });
    toast(`Урок пройден! Карточки урока ушли в повторение — Камадо напомнит, когда пора вспомнить.`, "ok");
  };
  return (
    <article className="lesson">
      <div className="lesson-head">
        <span className="eyebrow">
          {course.name} · урок {idx + 1} из {course.lessons.length}
        </span>
        <h2>{lesson.title}</h2>
      </div>
      <section className="card glass lesson-guide">
        <RichText text={lesson.guide} />
      </section>

      <section className="card glass lesson-quiz">
        <h3 className="section-title">
          <Lightbulb size={16} /> Проверь себя
        </h3>
        {lesson.quiz.map((q, i) => (
          <QuizItem key={i} quiz={q} qkey={`${lesson.id}:${i}`} onAnswer={(ok) => ok && setQuizRight((n) => n + 1)} />
        ))}
      </section>

      {lesson.task && <TaskBlock course={course} lesson={lesson} onSolved={() => setSolved(true)} />}

      <MoreTask course={course} lesson={lesson} />

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
        {idx + 1 < course.lessons.length && (
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
          <button
            key={i}
            className={`quiz-opt ${picked === null ? "" : i === quiz.answer ? "right" : i === picked ? "wrong" : "dim"}`}
            onClick={() => pick(i)}
          >
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

// ---------- Задача ----------

function TaskBlock({ course, lesson, onSolved }: { course: Course; lesson: Lesson; onSolved: () => void }) {
  const task = lesson.task!;
  const saved = useStore(grow, (x) => x.progress.code[lesson.id]);
  const tools = useStore(grow, (x) => x.tools);
  const st = useStore(grow, (x) => x.progress.lessons[lesson.id]);
  const [code, setCode] = useState(saved ?? task.starter);
  const [busy, setBusy] = useState<"" | "run" | "ai" | "check">("");
  const [runs, setRuns] = useState<{ input: string; expected: string; got: string; ok: boolean; err?: string }[] | null>(null);
  const [compileErr, setCompileErr] = useState("");
  const [ai, setAi] = useState<{ ok: boolean; text: string } | null>(null);
  const [failed, setFailed] = useState<string[] | null>(null);
  const [hints, setHints] = useState(0);
  const [showSol, setShowSol] = useState(false);
  const [custom, setCustom] = useState<string | null>(null);
  const [customOut, setCustomOut] = useState<RunResult | null>(null);
  const isHtml = course.lang === "html";
  const runner = !isHtml ? tools?.[course.lang as "python" | "java" | "cpp"] : undefined;

  // код сохраняется сам
  const timer = useRef<number>(0);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (code !== (saved ?? task.starter)) void saveProgress({ code: { [lesson.id]: code } });
    }, 900);
    return () => window.clearTimeout(timer.current);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const solved = async () => {
    onSolved();
    if (!st?.task) {
      await saveProgress({ lessons: { [lesson.id]: { ...st, task: true } } });
      await markActive();
    }
  };

  const runTests = async () => {
    setBusy("run");
    setAi(null);
    setCompileErr("");
    try {
      const res = await api.grow.run(course.lang as "python", code, task.tests.map((t) => t.input));
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
        void solved();
      }
    } finally {
      setBusy("");
    }
  };

  const runCustom = async () => {
    setBusy("run");
    try {
      const res = await api.grow.run(course.lang as "python", code, [custom ?? ""]);
      if ("error" in res) return;
      setCustomOut(res[0] ?? null);
    } finally {
      setBusy("");
    }
  };

  const askAi = async () => {
    setBusy("ai");
    try {
      const r = await api.grow.check({ lang: course.lang, lesson: lesson.title, task: task.text, code, runs: runs ?? undefined });
      if ("error" in r) {
        toast(r.error, "warn");
        return;
      }
      setAi({ ok: r.ok, text: r.feedback });
      if (r.ok && (isHtml || !runner?.ok)) void solved();
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
      void solved();
    }
  };

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
        <Code2 size={16} /> Задача {st?.task && <span className="tk-solved"><Check size={13} /> решена</span>}
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
        <CodeEditor value={code} onChange={setCode} lang={course.lang} minRows={isHtml ? 16 : 10} />
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
          <button className="btn" onClick={() => setCustom((c) => (c === null ? task.tests[0]?.input ?? "" : null))}>
            Свой ввод
          </button>
        )}
        <button className="btn ghost" onClick={() => setShowSol((v) => !v)}>
          {showSol ? "Скрыть решение" : "Решение"}
        </button>
        <button className="btn ghost" title="Вернуть заготовку" onClick={() => confirm("Стереть свой код и вернуть заготовку?") && setCode(task.starter)}>
          <RefreshCw size={15} />
        </button>
      </div>
      {!isHtml && runner && !runner.ok && (
        <div className="tk-note muted small">
          {course.name} на этом компьютере не найден — решение проверит ИИ. Чтобы запускать код прямо здесь: {runner.hint}.{" "}
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
          <RichText text={"```" + course.lang + "\n" + task.solution + "\n```"} />
        </div>
      )}
    </section>
  );
}

function MoreTask({ course, lesson }: { course: Course; lesson: Lesson }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const more = async () => {
    setBusy(true);
    try {
      const r = await api.grow.more(course.lang, lesson.title, lesson.guide);
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
      {text ? <RichText text={text} /> : <p className="muted small">Новая задача по теме урока — чтобы закрепить. Решай в задаче выше или у себя, а проверить можно во вкладке «Проверь мой код».</p>}
    </section>
  );
}

// ---------- Разминка дня ----------

function WarmupModal({ onClose }: { onClose: () => void }) {
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
        <h3 className="section-title">
          <BookOpen size={16} /> Вставь свой код — лабу, задачу, что не работает
        </h3>
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

/** Для «Сегодня»: что продолжить. */
export { continueTarget };
