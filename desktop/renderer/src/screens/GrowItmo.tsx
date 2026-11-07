// «Программа ИТМО»: загрузил программу предмета (PDF, текст, скриншот) — темы по занятиям,
// к каждой — конспект в Викиконспектах, книги ИТМО, задачи от ИИ; подготовка раскладывается в задания.
import { useEffect, useState } from "react";
import { BookMarked, CalendarPlus, Check, ExternalLink, FileUp, GraduationCap, ListChecks, Sparkles, Trash2 } from "lucide-react";
import { booksFor, bookUrl } from "../../../shared/itmoBooks";
import type { Programme, ProgrammeTopic } from "../../../shared/types";
import { api } from "../lib/api";
import { toast } from "../state/app";
import { markActive } from "../state/grow";
import { RichText } from "../components/RichText";
import { plural } from "../lib/format";
import { Empty } from "../components/ui";

const wikiUrl = (topic: string) => `https://neerc.ifmo.ru/wiki/index.php?search=${encodeURIComponent(topic)}`;

export function ItmoView() {
  const [list, setList] = useState<Programme[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const reload = async () => setList(await api.itmo.list());
  useEffect(() => {
    void reload();
  }, []);
  const cur = list.find((p) => p.id === open) ?? list[0];
  return (
    <div className="itmo">
      <ImportBox
        onDone={(p) => {
          void reload();
          setOpen(p.id);
        }}
        compact={list.length > 0}
      />
      {list.length === 0 ? (
        <Empty icon={<GraduationCap size={30} />} title="Пока нет ни одной программы" text="Скинь программу предмета — Камадо разложит темы по занятиям и подберёт материалы.">
          <div className="itmo-help muted small">
            Где взять: my.itmo.ru → Учёба → дисциплина → «Рабочая программа» (PDF), или скриншот страницы с темами по неделям.
          </div>
        </Empty>
      ) : (
        <>
          <div className="chips">
            {list.map((p) => (
              <button key={p.id} className={`chip-btn ${cur?.id === p.id ? "on" : ""}`} onClick={() => setOpen(p.id)}>
                {p.subject}
              </button>
            ))}
          </div>
          {cur && <ProgrammeView key={cur.id} prog={cur} onChange={(p) => setList((l) => l.map((x) => (x.id === p.id ? p : x)))} onRemoved={() => void reload()} />}
        </>
      )}
    </div>
  );
}

function ImportBox({ onDone, compact }: { onDone: (p: Programme) => void; compact: boolean }) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [openBox, setOpenBox] = useState(!compact);
  const run = async (pickFile: boolean) => {
    setBusy(true);
    try {
      const r = await api.itmo.import({ text: pickFile ? undefined : text, pickFile, subject });
      if ("cancelled" in r) return;
      if ("error" in r) {
        toast(r.error, "warn");
        return;
      }
      toast(`Готово: «${r.programme.subject}», ${r.programme.topics.length} тем`, "ok");
      setText("");
      setSubject("");
      setOpenBox(false);
      onDone(r.programme);
    } finally {
      setBusy(false);
    }
  };
  if (!openBox)
    return (
      <button className="btn" onClick={() => setOpenBox(true)}>
        <FileUp size={16} /> Добавить программу предмета
      </button>
    );
  return (
    <section className="card glass itmo-import">
      <h3 className="section-title">
        <FileUp size={16} /> Программа предмета
      </h3>
      <p className="muted small">Выбери PDF рабочей программы или скриншот, или вставь текст с темами. ИИ найдёт темы по занятиям, даты и литературу.</p>
      <input className="input" placeholder="Предмет (необязательно): например, Математический анализ" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="input" rows={5} placeholder="…или вставь сюда текст программы" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row-actions">
        <button className="btn primary" disabled={busy} onClick={() => void run(true)}>
          <FileUp size={16} /> {busy ? "Разбираю…" : "Выбрать файл"}
        </button>
        <button className="btn" disabled={busy || !text.trim()} onClick={() => void run(false)}>
          Разобрать текст
        </button>
        {compact && (
          <button className="btn ghost" onClick={() => setOpenBox(false)}>
            Отмена
          </button>
        )}
      </div>
    </section>
  );
}

function ProgrammeView({ prog, onChange, onRemoved }: { prog: Programme; onChange: (p: Programme) => void; onRemoved: () => void }) {
  const [topic, setTopic] = useState<ProgrammeTopic | null>(prog.topics.find((t) => !t.done) ?? prog.topics[0] ?? null);
  const books = booksFor(prog.subject);
  const done = prog.topics.filter((t) => t.done).length;
  const withDates = prog.topics.filter((t) => t.date).length;
  const toggle = async (t: ProgrammeTopic) => {
    const p = await api.itmo.topic(prog.id, t.n, { done: !t.done });
    if (p) onChange(p);
    if (!t.done) void markActive();
  };
  const plan = async () => {
    const r = await api.itmo.plan(prog.id);
    toast(r.added ? `Добавил ${r.added} ${plural(r.added, "задание", "задания", "заданий")} «Подготовиться» — к каждому занятию` : "Новых заданий нет: у будущих тем нет дат или они уже добавлены", r.added ? "ok" : "info");
    const fresh = (await api.itmo.list()).find((x) => x.id === prog.id);
    if (fresh) onChange(fresh);
  };
  return (
    <div className="itmo-prog">
      <aside className="card glass itmo-topics">
        <div className="gc-about">
          <b>{prog.subject}</b>
          <span className="muted small">
            пройдено {done} из {prog.topics.length}
          </span>
          <div className="gd-bar">
            <i style={{ width: `${(done / Math.max(1, prog.topics.length)) * 100}%` }} />
          </div>
        </div>
        <ol>
          {prog.topics.map((t) => (
            <li key={t.n}>
              <div className={`gc-item ${topic?.n === t.n ? "on" : ""} ${t.done ? "done" : ""}`}>
                <button className="gc-num" title={t.done ? "Не пройдено" : "Пройдено"} onClick={() => void toggle(t)}>
                  {t.done ? <Check size={13} /> : t.n}
                </button>
                <button className="gc-title" onClick={() => setTopic(t)}>
                  {t.title}
                  {t.date && <span className="gc-date">{new Date(`${t.date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>}
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div className="itmo-side-actions">
          <button className="btn sm" disabled={!withDates} title={withDates ? "Задание «подготовиться» к каждому будущему занятию" : "В программе нет дат занятий"} onClick={() => void plan()}>
            <CalendarPlus size={15} /> Подготовку — в задания
          </button>
          <button
            className="icon-btn danger"
            title="Удалить программу"
            onClick={() => {
              if (!confirm(`Удалить программу «${prog.subject}»? Задания останутся.`)) return;
              void api.itmo.remove(prog.id).then(onRemoved);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </aside>
      <div className="itmo-main">
        {topic ? <TopicView key={`${prog.id}:${topic.n}`} prog={prog} topic={topic} /> : null}
        {books.length > 0 && (
          <section className="card glass itmo-books">
            <h3 className="section-title">
              <BookMarked size={16} /> Книги ИТМО по предмету (PDF бесплатно)
            </h3>
            <ul>
              {books.map((b) => (
                <li key={b.id}>
                  <a href={bookUrl(b.id)} target="_blank" rel="noreferrer">
                    {b.title} <ExternalLink size={12} />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {prog.literature.length > 0 && (
          <section className="card glass itmo-books">
            <h3 className="section-title">
              <ListChecks size={16} /> Литература из программы
            </h3>
            <ul>
              {prog.literature.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function TopicView({ prog, topic }: { prog: Programme; topic: ProgrammeTopic }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAns, setShowAns] = useState(false);
  const practice = async () => {
    setBusy(true);
    try {
      const r = await api.itmo.practice(prog.subject, topic.title, topic.reading);
      if ("error" in r) toast(r.error, "warn");
      else {
        setText(r.text);
        setShowAns(false);
        void markActive();
      }
    } finally {
      setBusy(false);
    }
  };
  const [body, answers] = text.split(/\n\s*(?:#{1,4}\s*)?\**\s*Ответы\s*:?\s*\**\s*:?\s*\n/i);
  return (
    <section className="card glass itmo-topic">
      <span className="eyebrow">
        Тема {topic.n}
        {topic.date ? ` · ${new Date(`${topic.date}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}` : ""}
      </span>
      <h2>{topic.title}</h2>
      {topic.reading && <p className="muted">Читать по программе: {topic.reading}</p>}
      <div className="row-actions">
        <a className="btn" href={wikiUrl(topic.title)} target="_blank" rel="noreferrer">
          <BookMarked size={16} /> Конспект в Викиконспектах ИТМО
        </a>
        <button className="btn primary" disabled={busy} onClick={() => void practice()}>
          <Sparkles size={16} /> {busy ? "Готовлю…" : text ? "Ещё задачи" : "Подготовка и задачи"}
        </button>
      </div>
      {text && (
        <div className="itmo-practice">
          <RichText text={body ?? text} />
          {answers && (
            <details open={showAns} onToggle={(e) => setShowAns((e.target as HTMLDetailsElement).open)}>
              <summary>Ответы</summary>
              <RichText text={answers} />
            </details>
          )}
        </div>
      )}
    </section>
  );
}
