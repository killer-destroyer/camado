// ИИ-помощник «Прокачки» сбоку: видит открытый урок, задачу, твой код и результат тестов.
// Отвечает на вопросы и управляет разделом: открыть урок, запустить тесты, засчитать урок, разминка, задача посложнее.
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, SendHorizontal, Trash2, X } from "lucide-react";
import { COURSES, courseById } from "../../../shared/courses";
import type { CourseId } from "../../../shared/courses/format";
import type { GrowAction } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { grow, type GrowTab } from "../state/grow";
import { RichText } from "./RichText";

type Msg = { role: "user" | "assistant"; content: string };
let saved: Msg[] = []; // переписка живёт, пока открыта программа

const CATALOG = COURSES.map((c) => `${c.name} (${c.id}):\n${c.lessons.map((l) => `${l.id} — ${l.title}`).join("\n")}`).join("\n\n");

const SUGGEST = ["Почему у меня не проходят тесты?", "Объясни тему проще", "Дай задачу посложнее", "Что мне повторить сегодня?"];

export function applyGrowAction(a: GrowAction): void {
  const g = grow.get();
  if (a.type === "open_lesson" && courseById(a.course as CourseId)) grow.set({ tab: a.course as GrowTab, open: { ...g.open, [a.course]: a.lesson }, task: 0 });
  else if (a.type === "open_tab") grow.set({ tab: a.tab as GrowTab });
  else if (a.type === "run_tests") grow.set({ runReq: (g.runReq ?? 0) + 1 });
  else if (a.type === "complete_lesson") grow.set({ finishReq: (g.finishReq ?? 0) + 1 });
  else if (a.type === "warmup") grow.set({ modal: "warmup" });
  else if (a.type === "review") grow.set({ modal: "review" });
  else if (a.type === "task") {
    const c = courseById(g.tab as CourseId);
    const lesson = c?.lessons.find((l) => l.id === g.open[c.id]) ?? c?.lessons[0];
    if (!lesson) return;
    const cur = g.task ?? 0;
    const idx = lesson.tasks.findIndex((t, i) => (a.level >= 3 ? t.level >= 2 && i > cur : a.level <= 1 ? t.level === 1 : t.level === a.level));
    grow.set({ task: idx >= 0 ? idx : a.level >= 3 ? lesson.tasks.length - 1 : 0 });
  }
}

export function GrowAssistant() {
  const ask = useStore(grow, (x) => x.assistant);
  const [msgs, setMsgs] = useState<Msg[]>(saved);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const lastAsk = useRef<number | undefined>(undefined);

  useEffect(() => {
    saved = msgs;
    log.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [msgs]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || busy) return;
    const history = msgs.slice(-10);
    setMsgs((x) => [...x, { role: "user", content: m }]);
    setText("");
    setBusy(true);
    try {
      const work = grow.get().work;
      const g = grow.get();
      const where = work?.where ?? (g.tab === "library" ? "Библиотека" : g.tab === "syllabus" ? "Программа курса" : g.tab === "problems" ? "Задачник" : `Прокачка · ${g.tab}`);
      const r = await api.grow.ask({ where, task: work?.task, code: work?.code, lang: work?.lang, runs: work?.runs, catalog: CATALOG }, history, m);
      if ("error" in r) setMsgs((x) => [...x, { role: "assistant", content: `⚠️ ${r.error}` }]);
      else {
        r.actions.forEach(applyGrowAction);
        setMsgs((x) => [...x, { role: "assistant", content: r.answer || "Готово." }]);
      }
    } finally {
      setBusy(false);
    }
  };

  // вопрос пришёл из урока / читалки / кнопки «Спросить»
  useEffect(() => {
    if (ask?.n !== undefined && ask.n !== lastAsk.current && ask.ask) {
      lastAsk.current = ask.n;
      void send(ask.ask);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="grow-assistant card glass">
      <div className="ga-head">
        <MessageCircleQuestion size={18} />
        <b>ИИ-помощник</b>
        <span className="muted small">видит урок и твой код</span>
        <button className="icon-btn sm" title="Очистить" onClick={() => setMsgs([])}>
          <Trash2 size={14} />
        </button>
        <button className="icon-btn sm" title="Закрыть" onClick={() => grow.set({ assistant: { open: false } })}>
          <X size={15} />
        </button>
      </div>
      <div ref={log} className="ga-log">
        {msgs.length === 0 && (
          <div className="ga-empty">
            <p className="muted small">Спроси что угодно по уроку или задаче — или попроси: «открой урок про словари», «запусти тесты», «засчитай урок».</p>
            {SUGGEST.map((s) => (
              <button key={s} className="chip-btn" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`ga-msg ${m.role}`}>
            {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
          </div>
        ))}
        {busy && <div className="ga-msg assistant typing">Думаю…</div>}
      </div>
      <div className="ga-input">
        <textarea
          className="input"
          rows={2}
          placeholder="Спроси или попроси… (Enter — отправить)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
        />
        <button className="icon-btn" disabled={busy || !text.trim()} onClick={() => void send(text)} title="Отправить">
          <SendHorizontal size={17} />
        </button>
      </div>
    </aside>
  );
}
