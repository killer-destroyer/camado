// «Слежу за таблицами» в «Ссылках»: оценки, очередь на сдачу, рейтинг — Камадо сам смотрит и пишет, что поменялось.
import { useEffect, useState } from "react";
import { RefreshCw, Sheet, Trash2 } from "lucide-react";
import type { SheetView } from "../../../shared/types";
import { api } from "../lib/api";
import { toast } from "../state/app";

const ago = (iso?: string) => {
  if (!iso) return "ещё не проверял";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "только что" : m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.round(m / 60)} ч назад` : `${Math.round(m / 1440)} дн назад`;
};

export function SheetsCard() {
  const [list, setList] = useState<SheetView[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [match, setMatch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const load = () => void api.sheets.list().then(setList);
    load();
    return api.on("sheets-changed", load);
  }, []);

  const add = async () => {
    if (!url.trim()) return;
    setBusy("add");
    const r = await api.sheets.add({ url, name: name || undefined, match: match || undefined });
    setBusy(null);
    if (!("id" in r)) return toast(r.error, "warn");
    setUrl("");
    setName("");
    setMatch("");
    toast(r.error ? `Добавил, но: ${r.error}` : "Слежу — изменения пришлю сюда и в Telegram", r.error ? "warn" : "ok");
  };

  return (
    <section className="card glass sheets-card">
      <div className="card-head">
        <Sheet size={17} /> <b>Слежу за таблицами</b>
        <span className="muted small">оценки, очередь на сдачу, рейтинг — пишу, что поменялось</span>
      </div>
      {list.map((w) => (
        <div key={w.id} className={`sh-row ${w.error ? "bad" : ""}`}>
          <div className="sh-main" onClick={() => setOpen(open === w.id ? null : w.id)}>
            <b>{w.name}</b>
            <span className="muted small">
              {w.match ? `только «${w.match}» · ` : ""}каждые {w.everyMin} мин · {ago(w.lastCheck)}
              {w.lastChange ? ` · менялась ${ago(w.lastChange)}` : ""}
            </span>
            {w.error && <span className="sh-err small">{w.error}</span>}
          </div>
          <select
            className="input sm"
            value={w.everyMin}
            title="Как часто проверять"
            onChange={(e) => void api.sheets.update(w.id, { everyMin: Number(e.target.value) })}
          >
            {[5, 15, 30, 60, 180, 720].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} мин` : `${m / 60} ч`}
              </option>
            ))}
          </select>
          <button
            className="icon-btn"
            title="Проверить сейчас"
            disabled={busy === w.id}
            onClick={async () => {
              setBusy(w.id);
              const r = await api.sheets.check(w.id);
              setBusy(null);
              if (!r) return;
              if ("error" in r) toast(r.error, "warn");
              else toast(r.changes.length ? `Изменений: ${r.changes.length}` : "Без изменений", r.changes.length ? "ok" : "info");
            }}
          >
            <RefreshCw size={15} className={busy === w.id ? "spin-slow" : ""} />
          </button>
          <button className="icon-btn" title="Перестать следить" onClick={() => void api.sheets.remove(w.id)}>
            <Trash2 size={15} />
          </button>
          {open === w.id && (
            <div className="sh-recent">
              {w.recent?.length ? (
                w.recent.map((r) => (
                  <div key={r.at}>
                    <div className="muted small">{new Date(r.at).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    {r.lines.map((l, i) => (
                      <div key={i} className="small">
                        • {l}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="muted small">Пока без изменений. </div>
              )}
              <a className="link-btn small" href={w.url} target="_blank" rel="noreferrer">
                Открыть таблицу
              </a>
            </div>
          )}
        </div>
      ))}
      <div className="sh-add">
        <input className="input sm" placeholder="Ссылка на Google-таблицу" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} />
        <input className="input sm" placeholder="Название (Оценки по матану)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input sm" placeholder="Только строки с… (фамилия)" value={match} onChange={(e) => setMatch(e.target.value)} />
        <button className="btn sm primary" disabled={!url.trim() || busy === "add"} onClick={() => void add()}>
          Следить
        </button>
      </div>
      {list.length === 0 && <div className="muted small">Таблица должна открываться по ссылке (доступ «Все, у кого есть ссылка»). Можно и словами: «Камадо, следи за таблицей оценок, моя фамилия …».</div>}
    </section>
  );
}
