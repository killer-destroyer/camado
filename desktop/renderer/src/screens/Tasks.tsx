// «Задания»: запись, группы по срочности, отметка «сдано» с салютом, карточки предметов.
import { useMemo, useState } from "react";
import { BookOpen, Check, ListChecks, Plus, Trash2, Undo2 } from "lucide-react";
import { StepsPanel, TaskHelpButtons, TutorModal } from "../components/TaskHelp";
import type { Task, TaskKind } from "../../../shared/types";
import { api } from "../lib/api";
import { countdown, fmtDue, fromLocalInput, KIND_LABEL, urgency, type Urgency } from "../lib/format";
import { useStore } from "../lib/store";
import { app, toast } from "../state/app";
import { data } from "../state/data";
import { sameSubject } from "../../../../src/subjects";
import { Empty, Segmented, Toggle } from "../components/ui";

const GROUPS: { id: Urgency | "closed"; title: string }[] = [
  { id: "overdue", title: "Просрочено" },
  { id: "hot", title: "Горит — меньше суток" },
  { id: "soon", title: "Скоро — до 3 дней" },
  { id: "later", title: "Позже" },
  { id: "none", title: "Без срока" },
  { id: "closed", title: "Сдано и отменено" },
];

function hue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 3;
  return h;
}

function Burst() {
  return (
    <span className="confetti" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ ["--a" as string]: `${i * 36}deg`, ["--c" as string]: `var(--accent${i % 3 ? `-${(i % 3) + 1}` : ""})` }} />
      ))}
    </span>
  );
}

function TaskRow({ t, tz, index }: { t: Task; tz: string; index: number }) {
  const [celebrate, setCelebrate] = useState(false);
  const allSteps = useStore(data, (s) => s.steps);
  const steps = allSteps.filter((x) => x.taskId === t.id);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const closed = t.status === "done" || t.status === "cancelled";
  const toggle = async () => {
    if (!closed) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 900);
    }
    await api.tasks.update(t.id, { status: closed ? "todo" : "done" });
  };
  return (
    <li className={`task-row u-${urgency(t.dueAt)} ${closed ? "closed" : ""}`} style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <button className={`check ${t.status === "done" ? "on" : ""}`} onClick={() => void toggle()} title={closed ? "Вернуть" : "Сдано!"}>
        {t.status === "done" ? <Check size={15} strokeWidth={3} /> : null}
        {celebrate && <Burst />}
      </button>
      <div className="task-main">
        <div className="task-title">{t.title}</div>
        {t.details && <div className="task-details">{t.details}</div>}
        <div className="task-meta">
          {steps.length > 0 && (
            <button className="steps-chip" onClick={() => setStepsOpen(!stepsOpen)}>
              <ListChecks size={12} /> {steps.filter((x) => x.done).length}/{steps.length}
            </button>
          )}
          <span className={`kind k-${t.kind}`}>{KIND_LABEL[t.kind]}</span>
          {t.subject && <span className={`subj h${hue(t.subject)}`}>{t.subject}</span>}
          {t.dueAt && <span className="due">{fmtDue(t.dueAt, tz)}</span>}
        </div>
        {stepsOpen && <StepsPanel task={t} steps={steps} />}
      </div>
      {t.dueAt && !closed && <div className="task-count">{countdown(t.dueAt)}</div>}
      <div className="task-actions">
        {!closed && <TaskHelpButtons stepsOpen={stepsOpen} onSteps={() => setStepsOpen(!stepsOpen)} onTutor={() => setTutorOpen(true)} />}
        {closed ? (
          <button className="icon-btn" title="Вернуть в работу" onClick={() => void api.tasks.update(t.id, { status: "todo" })}>
            <Undo2 size={16} />
          </button>
        ) : (
          <button className="icon-btn danger" title="Убрать (отменено)" onClick={() => void api.tasks.update(t.id, { status: "cancelled" })}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {tutorOpen && <TutorModal task={t} onClose={() => setTutorOpen(false)} />}
    </li>
  );
}

function AddForm({ subjects }: { subjects: string[] }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<TaskKind>("homework");
  const [due, setDue] = useState("");
  const [details, setDetails] = useState("");
  const submit = async () => {
    if (!title.trim()) return toast("Напиши, что задали", "warn");
    await api.tasks.add({
      title: title.trim(),
      subject: subject.trim() || null,
      kind,
      dueAt: fromLocalInput(due),
      details: details.trim() || null,
    });
    toast("Записал ✍️", "ok");
    setTitle("");
    setDetails("");
    setDue("");
  };
  return (
    <div className="card glass add-form">
      <div className="af-row">
        <input className="input big" placeholder="Что задали? Например: решить №5–12" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} />
        <button className="btn primary" onClick={() => void submit()}>
          <Plus size={18} /> Записать
        </button>
      </div>
      <div className="af-row">
        <input className="input" list="subjects" placeholder="Предмет" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <datalist id="subjects">
          {subjects.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} title="Срок" />
        <Segmented size="sm" value={kind} onChange={setKind} options={(Object.keys(KIND_LABEL) as TaskKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
      </div>
      <input className="input" placeholder="Подробности, ссылки, куда сдавать (необязательно)" value={details} onChange={(e) => setDetails(e.target.value)} />
    </div>
  );
}

const longer = (a: string, b: string) => (b.length > a.length ? b : a);
const shorter = (a: string, b: string) => (b.length > a.length ? a : b);

function Subjects() {
  const subjects = useStore(data, (s) => s.subjects);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [info, setInfo] = useState("");
  const dupes = useMemo(() => {
    const out: [string, string][] = [];
    for (let i = 0; i < subjects.length; i++)
      for (let j = i + 1; j < subjects.length; j++) if (sameSubject(subjects[i]!.name, subjects[j]!.name)) out.push([longer(subjects[i]!.name, subjects[j]!.name), shorter(subjects[i]!.name, subjects[j]!.name)]);
    return out;
  }, [subjects]);
  const merge = async (from: string[], into: string) => {
    if (!confirm(`Объединить «${from.join("», «")}» в «${into}»? Задания, заметки и ссылки переедут в «${into}».`)) return;
    const r = await api.subjects.merge(from, into);
    toast(`Объединено в «${into}» · перенесено записей: ${r.moved}`);
  };
  const save = async () => {
    if (!name.trim()) return;
    await api.subjects.save({ name: name.trim(), teacher: teacher.trim() || undefined, info: info.trim() || undefined });
    setName("");
    setTeacher("");
    setInfo("");
  };
  return (
    <aside className="subjects">
      <h3 className="section-title">
        <BookOpen size={17} /> Предметы
      </h3>
      {dupes.map(([a, b]) => (
        <div key={`${a}|${b}`} className="subject-dupe glass">
          <span>
            Похоже, это один предмет: «{a}» и «{b}»
          </span>
          <button className="btn sm" onClick={() => void merge([b], a)}>
            Объединить
          </button>
        </div>
      ))}
      {subjects.map((s) => (
        <div key={s.id} className={`subject-card glass h${hue(s.name)}`}>
          <div className="sc-name">{s.name}</div>
          {s.teacher && <div className="sc-teacher">{s.teacher}</div>}
          {s.info && <div className="sc-info">{s.info}</div>}
          <div className="sc-actions">
            {subjects.length > 1 && (
              <select
                className="input sm"
                value=""
                title="Это тот же предмет, что…"
                onChange={(e) => e.target.value && void merge([s.name], e.target.value)}
              >
                <option value="">Объединить с…</option>
                {subjects
                  .filter((x) => x.id !== s.id)
                  .map((x) => (
                    <option key={x.id} value={x.name}>
                      {x.name}
                    </option>
                  ))}
              </select>
            )}
            <button
              className="icon-btn sm"
              title="Удалить предмет"
              onClick={() => {
                if (!confirm(`Удалить предмет «${s.name}»? Задания и заметки по нему останутся.`)) return;
                void api.subjects.remove(s.name);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <div className="subject-card glass add">
        <input className="input" placeholder="Предмет" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Преподаватель" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
        <textarea className="input" rows={2} placeholder="Где сдавать, сайт, правила…" value={info} onChange={(e) => setInfo(e.target.value)} />
        <button className="btn" onClick={() => void save()}>
          Сохранить карточку
        </button>
      </div>
    </aside>
  );
}

export function Tasks() {
  const tasks = useStore(data, (s) => s.tasks);
  const subjects = useStore(data, (s) => s.subjects);
  const tz = useStore(app, (s) => s.info.timeZone);
  const [filter, setFilter] = useState<TaskKind | "all">("all");
  const [showClosed, setShowClosed] = useState(false);
  const [closed, setClosed] = useState<Task[]>([]);

  const toggleClosed = async (v: boolean) => {
    setShowClosed(v);
    if (v) setClosed((await api.tasks.list(true)).filter((t) => t.status === "done" || t.status === "cancelled"));
  };

  const groups = useMemo(() => {
    const list = tasks.filter((t) => filter === "all" || t.kind === filter);
    const by = new Map<string, Task[]>();
    for (const t of list) {
      const g = urgency(t.dueAt);
      by.set(g, [...(by.get(g) ?? []), t]);
    }
    if (showClosed) by.set("closed", closed.filter((t) => filter === "all" || t.kind === filter).reverse());
    return GROUPS.map((g) => ({ ...g, items: by.get(g.id) ?? [] })).filter((g) => g.items.length > 0);
  }, [tasks, filter, showClosed, closed]);

  const subjectNames = [...new Set([...subjects.map((s) => s.name), ...tasks.map((t) => t.subject).filter(Boolean)])] as string[];
  let i = 0;

  return (
    <div className="screen tasks">
      <header className="screen-head">
        <h1 className="display">Задания</h1>
        <div className="head-tools">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[{ value: "all" as const, label: "Все" }, ...(["homework", "test", "exam", "lab"] as const).map((k) => ({ value: k, label: KIND_LABEL[k] }))]}
          />
          <label className="inline-toggle">
            <Toggle value={showClosed} onChange={(v) => void toggleClosed(v)} /> сданные
          </label>
        </div>
      </header>
      <div className="tasks-layout">
        <div className="tasks-main">
          <AddForm subjects={subjectNames} />
          {groups.length === 0 ? (
            <Empty icon={<Check size={30} />} title="Всё чисто" text="Заданий нет. Запиши первое выше или перешли сообщение препода боту в Telegram." />
          ) : (
            groups.map((g) => (
              <section key={g.id} className={`task-group g-${g.id}`}>
                <h3 className="group-title">
                  {g.title} <span className="count">{g.items.length}</span>
                </h3>
                <ul className="task-list">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} t={t} tz={tz} index={i++} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <Subjects />
      </div>
    </div>
  );
}
