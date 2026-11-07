// «Сессия»: экзамены с обратным отсчётом, билеты «знаю / повторить / не знаю», что учить сегодня.
import { useEffect, useState } from "react";
import { GraduationCap, ListPlus, Plus, Timer, Trash2, X } from "lucide-react";
import { progressOf, todaysTickets } from "../../../shared/session";
import type { Exam } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { go, toast } from "../state/app";
import { data } from "../state/data";
import { focus, setMode, start as startFocus } from "../state/focus";
import { Empty } from "../components/ui";
import { Examiner } from "../components/Examiner";

const STATUS = [
  { id: "new" as const, label: "Не знаю" },
  { id: "review" as const, label: "Повторить" },
  { id: "known" as const, label: "Знаю" },
];

function daysLeft(at: string): string {
  const ms = new Date(at).getTime() - Date.now();
  if (ms < 0) return "прошёл";
  const d = Math.floor(ms / 86400e3);
  const h = Math.floor((ms % 86400e3) / 3600e3);
  return d >= 1 ? `${d} ${d === 1 ? "день" : d < 5 ? "дня" : "дней"}` : `${h} ч`;
}

function ExamCard({ exam, reload }: { exam: Exam; reload: () => void }) {
  const [paste, setPaste] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const prog = progressOf(exam.tickets);
  const today = todaysTickets(exam.tickets, new Date(exam.at));
  const cycle = async (id: number, cur: string) => {
    const next = cur === "new" ? "review" : cur === "review" ? "known" : "new";
    await api.exams.ticketStatus(id, next);
    reload();
  };
  const studyNow = () => {
    focus.set({ subject: exam.subject ?? exam.title });
    setMode("work");
    startFocus();
    go("focus");
  };
  return (
    <section className="card glass exam">
      <div className="exam-head">
        <div>
          <div className="exam-title">{exam.title}</div>
          <div className="muted small">
            {exam.subject ? `${exam.subject} · ` : ""}
            {new Date(exam.at).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="exam-count">
          <b>{daysLeft(exam.at)}</b>
          <span>до экзамена</span>
        </div>
        {exam.tickets.length > 0 && (
          <button className="btn sm" onClick={() => setAsking(true)} title="ИИ спрашивает по билетам, как на экзамене, и ставит оценку">
            <GraduationCap size={15} /> Экзаменатор
          </button>
        )}
        <button className="icon-btn danger" title="Удалить экзамен" onClick={() => void api.exams.remove(exam.id).then(reload)}>
          <Trash2 size={15} />
        </button>
      </div>
      {exam.tickets.length > 0 ? (
        <>
          <div className="exam-prog">
            <div className="ep-bar">
              <i className="k" style={{ width: `${(prog.known / exam.tickets.length) * 100}%` }} />
              <i className="r" style={{ width: `${(prog.review / exam.tickets.length) * 100}%` }} />
            </div>
            <span>
              {prog.pct}% · знаю {prog.known}, повторить {prog.review}, не знаю {prog.fresh}
            </span>
          </div>
          {today.length > 0 && (
            <div className="exam-today">
              <div className="et-head">
                <span>Сегодня пройди</span>
                <button className="btn sm-link primary" onClick={studyNow}>
                  <Timer size={14} /> Начать фокус
                </button>
              </div>
              <div className="chips">
                {today.map((t) => (
                  <button key={t.id} className={`ticket s-${t.status}`} onClick={() => void cycle(t.id, t.status)} title="Нажми, чтобы отметить">
                    <b>{t.num}</b> {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="tickets">
            {exam.tickets.map((t) => (
              <div key={t.id} className={`ticket-row s-${t.status}`}>
                <b>{t.num}</b>
                <span>{t.title}</span>
                <div className="seg mini">
                  {STATUS.map((s) => (
                    <button key={s.id} className={t.status === s.id ? "on" : ""} onClick={() => void api.exams.ticketStatus(t.id, s.id).then(reload)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="muted small">Вставь список билетов — по строке на билет.</div>
      )}
      {paste === null ? (
        <button className="btn sm-link" onClick={() => setPaste(exam.tickets.map((t) => `${t.num}. ${t.title}`).join("\n"))}>
          <ListPlus size={14} /> {exam.tickets.length ? "Изменить список билетов" : "Добавить билеты"}
        </button>
      ) : (
        <div className="tickets-paste">
          <textarea className="input" rows={6} autoFocus placeholder={"1. Предел последовательности\n2. Теорема Больцано–Вейерштрасса\n…"} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <div className="row-end">
            <button className="btn" onClick={() => setPaste(null)}>
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={async () => {
                await api.exams.setTickets(exam.id, paste.split("\n"));
                setPaste(null);
                reload();
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
      {asking && (
        <Examiner
          exam={exam}
          onClose={() => {
            setAsking(false);
            reload();
          }}
        />
      )}
    </section>
  );
}

export function Session() {
  const subjects = useStore(data, (s) => s.subjects);
  const tasks = useStore(data, (s) => s.tasks);
  const [exams, setExams] = useState<Exam[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "Экзамен", subject: "", at: "" });
  const load = () => void api.exams.list().then(setExams);
  useEffect(load, []);
  // экзамены из «Заданий» — предложить добавить одним нажатием
  const fromTasks = tasks.filter((t) => t.kind === "exam" && t.dueAt && !exams.some((e) => e.title === t.title && e.at === t.dueAt));
  const add = async (title: string, subject: string | null, at: string) => {
    if (!at) return toast("Укажи дату экзамена", "warn");
    await api.exams.save({ title, subject, at: new Date(at).toISOString() });
    setAdding(false);
    load();
  };
  return (
    <div className="screen session">
      <header className="screen-head">
        <h1 className="display">Сессия</h1>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={17} /> Экзамен
        </button>
      </header>
      {fromTasks.length > 0 && (
        <div className="card glass from-tasks">
          <span>Экзамены из заданий:</span>
          {fromTasks.map((t) => (
            <button key={t.id} className="chip-btn" onClick={() => void api.exams.save({ title: t.title, subject: t.subject, at: t.dueAt! }).then(load)}>
              <Plus size={12} /> {t.subject ? `${t.subject}: ` : ""}
              {t.title}
            </button>
          ))}
        </div>
      )}
      {adding && (
        <div className="card glass exam-form">
          <input className="input" placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
            <option value="">Предмет</option>
            {subjects.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
          <input className="input" type="datetime-local" value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} />
          <button className="btn primary" onClick={() => void add(form.title, form.subject || null, form.at)}>
            Добавить
          </button>
          <button className="icon-btn" onClick={() => setAdding(false)}>
            <X size={16} />
          </button>
        </div>
      )}
      {exams.length === 0 && !adding ? (
        <Empty icon={<GraduationCap size={34} />} title="Сессия под контролем" text="Добавь экзамен и список билетов — Камадо скажет, сколько учить каждый день, чтобы успеть всё.">
          <button className="btn primary" onClick={() => setAdding(true)}>
            <Plus size={17} /> Добавить экзамен
          </button>
        </Empty>
      ) : (
        <div className="exams">
          {exams.map((e) => (
            <ExamCard key={e.id} exam={e} reload={load} />
          ))}
        </div>
      )}
    </div>
  );
}
