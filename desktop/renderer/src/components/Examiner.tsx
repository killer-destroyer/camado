// Экзаменатор: ИИ спрашивает по билету как на экзамене, ты отвечаешь текстом или голосом, он ставит оценку.
import { useEffect, useRef, useState } from "react";
import { GraduationCap, Mic, Send, Shuffle, Square, X } from "lucide-react";
import type { Exam } from "../../../shared/types";
import { api } from "../lib/api";
import { startRecording, type Recording } from "../lib/media";
import { toast } from "../state/app";
import { RichText } from "./RichText";

type Msg = { role: "user" | "assistant"; content: string; grade?: number };

/** Какой билет спросить: сначала «не знаю» и «повторить», давно не виденные — раньше. */
function pickTicket(exam: Exam, not?: number): Exam["tickets"][number] | undefined {
  const pool = exam.tickets.filter((t) => t.id !== not);
  const weight = (t: Exam["tickets"][number]) => (t.status === "new" ? 3 : t.status === "review" ? 2 : 0.5) + (t.seenAt ? 0 : 1);
  const total = pool.reduce((a, t) => a + weight(t), 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return pool[0];
}

export function Examiner({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const [ticket, setTicket] = useState(() => pickTicket(exam));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<Recording | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [msgs.length, busy]);

  const turn = async (history: Msg[], extra: { answer?: string; audio?: { mime: string; data: string } }) => {
    if (!ticket) return;
    setBusy(true);
    const r = await api.exam.turn({ examId: exam.id, ticketId: ticket.id, history: history.map(({ role, content }) => ({ role, content })), ...extra });
    setBusy(false);
    if ("error" in r) {
      toast(r.error, "warn");
      return;
    }
    setMsgs((m) => [...m, { role: "assistant", content: r.text, grade: r.grade }]);
  };

  // первый вопрос по билету
  useEffect(() => {
    setMsgs([]);
    void turn([], {});
  }, [ticket?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const text = answer.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setAnswer("");
    await turn(msgs, { answer: text });
  };

  const voice = async () => {
    if (rec) {
      const a = await rec.stop();
      setRec(null);
      const next = [...msgs, { role: "user" as const, content: `🎙 ответ голосом (${a.seconds} с)` }];
      setMsgs(next);
      await turn(msgs, { audio: { mime: a.mime, data: a.data } });
      return;
    }
    try {
      setRec(await startRecording());
    } catch {
      toast("Нет доступа к микрофону — разреши его Камадо в настройках системы", "warn");
    }
  };

  const last = [...msgs].reverse().find((m) => m.grade);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass examiner" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn wn-close" onClick={onClose} title="Закрыть (Esc)">
          <X size={18} />
        </button>
        <div className="ex-head">
          <GraduationCap size={22} />
          <div>
            <h2>Экзаменатор · {exam.title}</h2>
            <div className="muted small">{ticket ? `Билет №${ticket.num}: ${ticket.title}` : "Добавь билеты, чтобы начать"}</div>
          </div>
          <button className="btn sm" disabled={busy || exam.tickets.length < 2} onClick={() => setTicket(pickTicket(exam, ticket?.id))} title="Другой билет">
            <Shuffle size={14} /> Другой билет
          </button>
        </div>
        <div className="ex-chat" ref={scroller}>
          {msgs.map((m, i) => (
            <div key={i} className={`ex-msg ${m.role}`}>
              {m.grade && <div className={`ex-grade g${m.grade}`}>{m.grade}</div>}
              <RichText text={m.content} />
            </div>
          ))}
          {busy && <div className="ex-msg assistant typing">Экзаменатор думает…</div>}
        </div>
        {last?.grade && (
          <div className="muted small ex-note">
            {last.grade >= 5 ? "Билет отмечен «Знаю»." : "Билет отмечен «Повторить» — вернётся в повторение."} Можно ответить на уточняющий вопрос или взять другой билет.
          </div>
        )}
        <div className="ex-input">
          <textarea
            className="input"
            rows={3}
            placeholder={rec ? "Говори — нажми ■, когда закончишь" : "Отвечай, как на экзамене… (Enter — отправить, Shift+Enter — новая строка)"}
            value={answer}
            disabled={!!rec}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button className={`icon-btn ${rec ? "rec" : ""}`} disabled={busy} onClick={() => void voice()} title={rec ? "Закончить ответ" : "Ответить голосом"}>
            {rec ? <Square size={17} /> : <Mic size={17} />}
          </button>
          <button className="btn primary" disabled={busy || !answer.trim()} onClick={() => void send()}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
