// «Расписание пар»: загрузить из фото/скриншота/текста, поправить, чётные-нечётные недели, за сколько напоминать.
import { useEffect, useRef, useState } from "react";
import { Camera, Plus, Trash2, X } from "lucide-react";
import { defaultOddMonday, isoDate, weekParity, type ClassSlotLite, type ScheduleState } from "../../../shared/life";
import { api } from "../lib/api";
import { imageToBase64 } from "../lib/media";
import { toast } from "../state/app";

const WD = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKS = { all: "каждую", odd: "нечётн.", even: "чётн." } as const;

export function ScheduleModal({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<ScheduleState | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void api.schedule.get().then(setS);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!s) return null;
  const save = async (patch: Partial<ScheduleState>) => setS(await api.schedule.save(patch));
  const edit = (i: number, patch: Partial<ClassSlotLite>) => void save({ classes: s.classes.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const parity = weekParity(new Date(), s.oddMonday);

  const importIt = async (input: { text?: string; files?: File[] }) => {
    setBusy(true);
    toast("Разбираю расписание…");
    try {
      const images = input.files ? await Promise.all(input.files.slice(0, 4).map((f) => imageToBase64(f, 2200))) : undefined;
      const r = await api.schedule.import({ text: input.text, images, replace: true });
      if ("error" in r) toast(r.error, "warn");
      else {
        setS(r.schedule);
        setText("");
        toast(`Нашёл ${r.added} пар — проверь, всё ли так`, "ok");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal glass schedule-modal"
        onClick={(e) => e.stopPropagation()}
        onPaste={(e) => {
          const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
          if (files.length) {
            e.preventDefault();
            void importIt({ files });
          }
        }}
      >
        <button className="icon-btn wn-close" onClick={onClose} title="Закрыть (Esc)">
          <X size={18} />
        </button>
        <h2>Расписание пар</h2>
        <p className="muted small">
          Скинь фото или скриншот расписания (или вставь текст) — Камадо разложит пары по дням. Пары встанут в «План», о каждой — напоминание, а за {s.remindMin} минут — что к ней
          повторить.
        </p>
        <div className="sch-import">
          <button className="btn" disabled={busy} onClick={() => file.current?.click()}>
            <Camera size={16} /> Фото / скриншот
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void importIt({ files: [...(e.target.files ?? [])] });
              e.target.value = "";
            }}
          />
          <textarea className="input" rows={2} placeholder="…или вставь текст расписания" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn primary" disabled={busy || !text.trim()} onClick={() => void importIt({ text })}>
            Разобрать
          </button>
        </div>
        <div className="sch-opts">
          <span>
            Эта неделя — <b>{parity === "odd" ? "нечётная (числитель)" : "чётная (знаменатель)"}</b>
          </span>
          <button
            className="btn sm"
            onClick={() => {
              // сделать текущую неделю противоположной: сдвинуть «нечётный понедельник» на неделю
              const [y, m, d] = s.oddMonday.split("-").map(Number) as [number, number, number];
              void save({ oddMonday: isoDate(new Date(y, m - 1, d + 7)) });
            }}
          >
            Наоборот
          </button>
          <label className="muted small">
            напоминать за{" "}
            <input className="input sm num" type="number" min={0} max={120} value={s.remindMin} onChange={(e) => void save({ remindMin: Number(e.target.value) })} /> мин
          </label>
          <button className="link-btn" onClick={() => void save({ oddMonday: defaultOddMonday(new Date()) })} title="Считать от 1 сентября / 9 февраля">
            сбросить чётность
          </button>
        </div>
        <div className="sch-list">
          {s.classes.length === 0 && <div className="muted small">Пар пока нет.</div>}
          {s.classes
            .map((c, i) => ({ c, i }))
            .sort((a, b) => a.c.weekday - b.c.weekday || a.c.start.localeCompare(b.c.start))
            .map(({ c, i }) => (
              <div key={i} className="sch-row">
                <select className="input sm" value={c.weekday} onChange={(e) => edit(i, { weekday: Number(e.target.value) })}>
                  {WD.slice(1).map((w, k) => (
                    <option key={w} value={k + 1}>
                      {w}
                    </option>
                  ))}
                </select>
                <input className="input sm t" type="time" value={c.start} onChange={(e) => edit(i, { start: e.target.value })} />
                <input className="input sm t" type="time" value={c.end} onChange={(e) => edit(i, { end: e.target.value })} />
                <input className="input sm grow" value={c.subject} onChange={(e) => edit(i, { subject: e.target.value })} />
                <input className="input sm room" placeholder="ауд." value={c.room ?? ""} onChange={(e) => edit(i, { room: e.target.value })} />
                <select className="input sm" value={c.weeks} onChange={(e) => edit(i, { weeks: e.target.value as ClassSlotLite["weeks"] })}>
                  {(Object.keys(WEEKS) as (keyof typeof WEEKS)[]).map((w) => (
                    <option key={w} value={w}>
                      {WEEKS[w]}
                    </option>
                  ))}
                </select>
                <button className="icon-btn danger" onClick={() => void save({ classes: s.classes.filter((_, j) => j !== i) })}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          <button className="btn sm" onClick={() => void save({ classes: [...s.classes, { weekday: 1, start: "09:00", end: "10:30", subject: "Новая пара", weeks: "all" }] })}>
            <Plus size={14} /> Пара вручную
          </button>
        </div>
      </div>
    </div>
  );
}
