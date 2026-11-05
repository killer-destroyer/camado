// «Заметки»: список слева, редактор справа, автосохранение.
import { useEffect, useMemo, useRef, useState } from "react";
import { NotebookPen, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import type { Note } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import { data } from "../state/data";
import { Empty } from "../components/ui";

export function Notes() {
  const notes = useStore(data, (s) => s.notes);
  const subjects = useStore(data, (s) => s.subjects);
  const [sel, setSel] = useState<number | null>(notes[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Note | null>(null);
  const timer = useRef<number>(undefined);
  const [saved, setSaved] = useState(true);

  const current = notes.find((n) => n.id === sel) ?? null;
  useEffect(() => {
    if (current && current.id !== draft?.id) setDraft(current);
    if (!current) setDraft(null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? notes.filter((n) => `${n.title} ${n.body} ${n.subject ?? ""}`.toLowerCase().includes(s)) : notes;
  }, [notes, q]);

  const edit = (patch: Partial<Note>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await api.notes.save({ id: next.id, title: next.title, body: next.body, subject: next.subject, pinned: next.pinned });
      setSaved(true);
    }, 450);
  };

  const create = async () => {
    const n = await api.notes.save({ title: "", body: "" });
    setSel(n.id);
    setDraft(n);
  };

  const remove = async () => {
    if (!draft) return;
    await api.notes.remove(draft.id);
    toast("Заметка удалена", "info");
    setSel(null);
  };

  return (
    <div className="screen notes">
      <header className="screen-head">
        <h1 className="display">Заметки</h1>
        <button className="btn primary" onClick={() => void create()}>
          <Plus size={18} /> Новая
        </button>
      </header>
      <div className="notes-layout">
        <aside className="notes-list glass">
          <div className="search">
            <Search size={16} />
            <input placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {list.map((n) => (
            <button key={n.id} className={`note-item ${n.id === sel ? "active" : ""}`} onClick={() => setSel(n.id)}>
              <div className="ni-title">
                {n.pinned && <Pin size={12} />} {n.title || "Без названия"}
              </div>
              <div className="ni-body">{n.body.slice(0, 80) || "Пусто"}</div>
              {n.subject && <span className="ni-subj">{n.subject}</span>}
            </button>
          ))}
          {list.length === 0 && <div className="muted small pad">Ничего нет</div>}
        </aside>
        <section className="note-editor glass">
          {draft ? (
            <>
              <div className="ne-tools">
                <select className="input sm" value={draft.subject ?? ""} onChange={(e) => edit({ subject: e.target.value || null })}>
                  <option value="">Без предмета</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className={`save-state ${saved ? "ok" : ""}`}>{saved ? "сохранено" : "сохраняю…"}</span>
                <button className="icon-btn" title={draft.pinned ? "Открепить" : "Закрепить"} onClick={() => edit({ pinned: !draft.pinned })}>
                  {draft.pinned ? <PinOff size={17} /> : <Pin size={17} />}
                </button>
                <button className="icon-btn danger" title="Удалить" onClick={() => void remove()}>
                  <Trash2 size={17} />
                </button>
              </div>
              <input className="ne-title" placeholder="Заголовок" value={draft.title} onChange={(e) => edit({ title: e.target.value })} />
              <textarea className="ne-body" placeholder="Пиши всё, что нужно запомнить: билеты, формулы, идеи…" value={draft.body} onChange={(e) => edit({ body: e.target.value })} />
            </>
          ) : (
            <Empty icon={<NotebookPen size={30} />} title="Выбери заметку или создай новую" text="Конспекты, формулы, вопросы к экзамену — всё здесь.">
              <button className="btn primary" onClick={() => void create()}>
                <Plus size={18} /> Новая заметка
              </button>
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
