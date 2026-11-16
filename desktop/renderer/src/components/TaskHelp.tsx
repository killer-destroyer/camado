// Помощь с заданием: шаги с галочками («разбей на шаги») и репетитор «помоги понять».
import { useEffect, useRef, useState } from "react";
import { Check, Lightbulb, ListChecks, Plus, Send, Wand2, X } from "lucide-react";
import type { Task, TaskStep } from "../../../shared/types";
import { api } from "../lib/api";
import { toast } from "../state/app";
import { refreshData } from "../state/data";
import { RichText } from "./RichText";

export function StepsPanel({ task, steps }: { task: Task; steps: TaskStep[] }) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const done = steps.filter((s) => s.done).length;
  const ai = async () => {
    setBusy(true);
    const r = await api.steps.ai(task.id);
    setBusy(false);
    if ("error" in r) toast(r.error, "warn");
    void refreshData();
  };
  const add = async () => {
    if (!text.trim()) return;
    await api.steps.set(task.id, [...steps.map((s) => s.title), text.trim()]);
    setText("");
    void refreshData();
  };
  return (
    <div className="steps">
      {steps.length > 0 && (
        <div className="steps-bar" title={`${done} из ${steps.length}`}>
          <i style={{ transform: `scaleX(${steps.length ? done / steps.length : 0})` }} />
        </div>
      )}
      {steps.map((s) => (
        <button key={s.id} className={`step ${s.done ? "done" : ""}`} onClick={() => void api.steps.toggle(s.id).then(refreshData)}>
          <span className="step-check">{s.done && <Check size={12} strokeWidth={3} />}</span>
          <span>{s.title}</span>
        </button>
      ))}
      <div className="steps-add">
        <input className="input sm" placeholder="Свой шаг…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} />
        <button className="btn sm-link" onClick={() => void add()}>
          <Plus size={14} />
        </button>
        <button className="btn sm-link primary" disabled={busy} onClick={() => void ai()} title="Камадо разобьёт задание на 3–7 маленьких шагов">
          <Wand2 size={14} /> {busy ? "Думаю…" : steps.length ? "Переразбить" : "Разбей на шаги"}
        </button>
      </div>
    </div>
  );
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** Репетитор: объясняет и наводит, но не решает за тебя. */
export function TutorModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const ask = async (message: string) => {
    if (busy) return;
    const history = msgs;
    setMsgs([...history, { role: "user", content: message || "Помоги разобраться, с чего начать." }]);
    setText("");
    setBusy(true);
    const r = await api.tutor.ask(task.id, history, message);
    setBusy(false);
    if ("error" in r) {
      toast(r.error, "warn");
      setMsgs(history);
      return;
    }
    setMsgs((m) => [...m, { role: "assistant", content: r.answer }]);
  };
  useEffect(() => {
    void ask("");
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs.length, busy]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass tutor" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <div className="card-head">
          <Lightbulb size={18} />
          <span>Помоги понять: {task.title}</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="tutor-hint">Камадо объясняет тему и подсказывает шаги, но не решает за тебя — так ты правда разберёшься.</div>
        <div className="tutor-log">
          {msgs.map((m, i) => (
            <div key={i} className={`tutor-msg ${m.role}`}>
              {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
            </div>
          ))}
          {busy && <div className="tutor-msg assistant typing">думаю…</div>}
          <div ref={end} />
        </div>
        <div className="tutor-input">
          <textarea
            className="input"
            rows={2}
            placeholder="Спроси, что непонятно, или вставь своё решение — найду, где ошибка"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) void ask(text.trim());
              }
            }}
          />
          <button className="btn primary" disabled={busy || !text.trim()} onClick={() => void ask(text.trim())}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskHelpButtons({ onSteps, onTutor, stepsOpen }: { onSteps: () => void; onTutor: () => void; stepsOpen: boolean }) {
  return (
    <>
      <button className={`icon-btn ${stepsOpen ? "active" : ""}`} title="Шаги: разбить задание на маленькие части" onClick={onSteps}>
        <ListChecks size={16} />
      </button>
      <button className="icon-btn" title="Помоги понять: репетитор объяснит тему" onClick={onTutor}>
        <Lightbulb size={16} />
      </button>
    </>
  );
}
