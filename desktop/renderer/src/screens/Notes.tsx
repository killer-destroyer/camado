// «Заметки»: список слева, редактор справа, автосохранение.
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Camera, Eye, FileDown, Layers, NotebookPen, Pencil, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { imageToBase64 } from "../lib/media";
import type { Card, Note } from "../../../shared/types";
import { NoteCards, Review } from "../components/Cards";
import { RichText } from "../components/RichText";
import { noteHtml } from "../lib/notePdf";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import { data } from "../state/data";
import { Empty } from "../components/ui";

export function Notes() {
  const [preview, setPreview] = useState(false);
  const [cardsFor, setCardsFor] = useState<Note | null>(null);
  const [review, setReview] = useState<Card[] | null>(null);
  const [due, setDue] = useState<Card[]>([]);
  useEffect(() => {
    void api.cards.list({ due: true }).then(setDue);
  }, [review, cardsFor]);
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

  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  /** Фото конспекта или доски → аккуратная заметка с формулами и карточки к ней. */
  const fromPhotos = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, 6);
    if (!imgs.length || photoBusy) return;
    setPhotoBusy(true);
    toast(`Разбираю ${imgs.length > 1 ? `${imgs.length} фото` : "фото"} — это займёт 10–40 секунд…`);
    try {
      const images = await Promise.all(imgs.map((f) => imageToBase64(f, 2200)));
      const r = await api.notes.fromPhotos(images, draft?.subject ?? null);
      if ("error" in r) toast(r.error, "warn");
      else {
        toast(`Готово: «${r.title}»${r.cards ? ` и ${r.cards} карточек для повторения` : ""}`, "ok");
        setSel(r.noteId);
        setPreview(true);
      }
    } catch {
      toast("Не получилось прочитать фото", "warn");
    } finally {
      setPhotoBusy(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    await api.notes.remove(draft.id);
    toast("Заметка удалена", "info");
    setSel(null);
  };

  return (
    <div
      className="screen notes"
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;
        e.preventDefault();
        void fromPhotos(files);
      }}
      onPaste={(e) => {
        const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
        if (files.length) {
          e.preventDefault();
          void fromPhotos(files);
        }
      }}
    >
      <header className="screen-head">
        <h1 className="display">Заметки</h1>
        <div className="head-tools">
          <button className={`btn ${due.length ? "glow" : ""}`} disabled={!due.length} onClick={() => setReview(due)} title="Карточки, которые пора повторить">
            <Brain size={17} /> Повторить {due.length ? `(${due.length})` : ""}
          </button>
          <button className="btn" disabled={photoBusy} onClick={() => photoInput.current?.click()} title="Сфоткай конспект, доску или слайд — Камадо перепишет в заметку с формулами и сделает карточки. Можно несколько фото одной темы.">
            <Camera size={17} /> {photoBusy ? "Разбираю…" : "Из фото"}
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void fromPhotos([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <button className="btn primary" onClick={() => void create()}>
            <Plus size={18} /> Новая
          </button>
        </div>
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
                <button className={`icon-btn ${preview ? "active" : ""}`} title={preview ? "Править" : "Просмотр с формулами: $x^2$, $$\\int f$$"} onClick={() => setPreview(!preview)}>
                  {preview ? <Pencil size={17} /> : <Eye size={17} />}
                </button>
                <button className="icon-btn" title="Карточки для повторения" onClick={() => setCardsFor(draft)}>
                  <Layers size={17} />
                </button>
                <button className="icon-btn" title="Сохранить в PDF" onClick={() => void api.notes.pdf(draft.title || "Заметка", noteHtml(draft)).then((r) => r && toast("PDF сохранён", "ok"))}>
                  <FileDown size={17} />
                </button>
                <button className="icon-btn danger" title="Удалить" onClick={() => void remove()}>
                  <Trash2 size={17} />
                </button>
              </div>
              <input className="ne-title" placeholder="Заголовок" value={draft.title} onChange={(e) => edit({ title: e.target.value })} />
              {preview ? (
                <div className="ne-preview" onDoubleClick={() => setPreview(false)}>
                  <RichText text={draft.body || "Пусто"} />
                </div>
              ) : (
                <textarea
                  className="ne-body"
                  placeholder="Пиши всё, что нужно запомнить: билеты, формулы ($x^2$, $$\int_0^1 f(x)\,dx$$), идеи…"
                  value={draft.body}
                  onChange={(e) => edit({ body: e.target.value })}
                />
              )}
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
      {cardsFor && (
        <NoteCards
          note={cardsFor}
          onClose={() => setCardsFor(null)}
          onReview={(c) => {
            setCardsFor(null);
            setReview(c);
          }}
        />
      )}
      {review && <Review cards={review} onClose={() => setReview(null)} />}
    </div>
  );
}
