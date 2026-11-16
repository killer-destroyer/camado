// Карточки для повторения: из конспекта (ИИ) или вручную; повторение с интервалами, как в Anki.
import { useEffect, useState } from "react";
import { Brain, Layers, Plus, Trash2, Wand2, X } from "lucide-react";
import type { Card, Note } from "../../../shared/types";
import { api } from "../lib/api";
import { toast } from "../state/app";
import { RichText } from "./RichText";

/** Карточки одной заметки: сделать, добавить, удалить, начать повторение. */
export function NoteCards({ note, onClose, onReview }: { note: Note; onClose: () => void; onReview: (cards: Card[]) => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const load = () => void api.cards.list({ noteId: note.id }).then(setCards);
  useEffect(load, [note.id]);
  const ai = async () => {
    setBusy(true);
    const r = await api.cards.ai(note.id);
    setBusy(false);
    if ("error" in r) toast(r.error, "warn");
    else toast(`Сделал ${r.added} карточек`, "ok");
    load();
  };
  const add = async () => {
    if (!q.trim() || !a.trim()) return;
    await api.cards.add([{ question: q, answer: a, noteId: note.id, subject: note.subject }]);
    setQ("");
    setA("");
    load();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass cards-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <Layers size={18} />
          <span>Карточки: {note.title || "без названия"}</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="cards-actions">
          <button className="btn primary" disabled={busy} onClick={() => void ai()}>
            <Wand2 size={16} /> {busy ? "Делаю…" : "Сделать из конспекта"}
          </button>
          <button className="btn" disabled={!cards.length} onClick={() => onReview(cards)}>
            <Brain size={16} /> Повторить все ({cards.length})
          </button>
        </div>
        <div className="cards-list">
          {cards.map((c) => (
            <div key={c.id} className="card-item">
              <div className="ci-q">
                <RichText text={c.question} />
              </div>
              <div className="ci-a">
                <RichText text={c.answer} />
              </div>
              <button className="icon-btn danger" title="Удалить" onClick={() => void api.cards.remove(c.id).then(load)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!cards.length && <div className="muted small">Карточек пока нет — сделай из конспекта или добавь свою ниже.</div>}
        </div>
        <div className="cards-add">
          <input className="input" placeholder="Вопрос" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="input" placeholder="Ответ" value={a} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} />
          <button className="btn" onClick={() => void add()}>
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Повторение: вопрос → «Показать ответ» → «Не помню / Трудно / Помню». */
export function Review({ cards, onClose: close, onDone }: { cards: Card[]; onClose: () => void; onDone?: (reviewed: number) => void }) {
  const [queue, setQueue] = useState(cards);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const onClose = () => {
    onDone?.(done);
    close();
  };
  const cur = queue[0];
  const grade = async (g: 0 | 1 | 2) => {
    if (!cur) return;
    await api.cards.review(cur.id, g);
    setShown(false);
    setDone((d) => d + 1);
    // «не помню» — покажем ещё раз в конце этого же захода
    setQueue((q) => (g === 0 ? [...q.slice(1), cur] : q.slice(1)));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3"].includes(e.key)) void grade((Number(e.key) - 1) as 0 | 1 | 2);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass review" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <Brain size={18} />
          <span>Повторение</span>
          <span className="muted small">
            {done} сделано · {queue.length} осталось
          </span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {cur ? (
          <>
            <div className="rv-card">
              <div className="rv-q">
                <RichText text={cur.question} />
              </div>
              {shown && (
                <div className="rv-a">
                  <RichText text={cur.answer} />
                </div>
              )}
            </div>
            {!shown ? (
              <button className="btn primary rv-show" onClick={() => setShown(true)}>
                Показать ответ <kbd>пробел</kbd>
              </button>
            ) : (
              <div className="rv-grades">
                <button className="btn g0" onClick={() => void grade(0)}>
                  Не помню <kbd>1</kbd>
                </button>
                <button className="btn g1" onClick={() => void grade(1)}>
                  Трудно <kbd>2</kbd>
                </button>
                <button className="btn primary g2" onClick={() => void grade(2)}>
                  Помню <kbd>3</kbd>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rv-done">
            <div className="rv-big">🎉</div>
            <b>На сегодня всё!</b>
            <span className="muted">Камадо сам напомнит, когда пора повторить снова.</span>
            <button className="btn primary" onClick={onClose}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
