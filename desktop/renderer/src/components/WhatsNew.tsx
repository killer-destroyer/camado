// «Что нового»: окно после обновления, перед скачиванием и история версий.
import { useEffect, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import type { ChangelogEntry } from "../../../shared/changelog";
import { CHANGELOG } from "../lib/changelog";
import { useStore } from "../lib/store";
import { app } from "../state/app";
import { RichText } from "./RichText";

export function EntryList({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <div className="wn-list">
      {entries.map((e) => (
        <section key={e.version} className="wn-entry">
          <h3>
            Версия {e.version}
            {e.date && <span className="muted small"> · {new Date(`${e.date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>}
          </h3>
          <ul>
            {e.items.map((it, i) => (
              <li key={i}>
                <RichText text={it} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function WhatsNewModal() {
  const wn = useStore(app, (s) => s.whatsNew);
  const close = () => app.set({ whatsNew: undefined });
  useEffect(() => {
    if (!wn) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [wn]);
  if (!wn) return null;
  return (
    <div className="modal-back" onClick={close}>
      <div className="modal glass whatsnew" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn wn-close" onClick={close} title="Закрыть (Esc)">
          <X size={18} />
        </button>
        <div className="wn-head">
          <Sparkles size={22} />
          <h2>{wn.title}</h2>
        </div>
        <EntryList entries={wn.entries} />
        <div className="wn-foot">
          <button className="btn primary" onClick={close}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

/** Настройки → Обновления → «История версий». */
export function VersionHistory() {
  const [open, setOpen] = useState(false);
  return (
    <div className="wn-history">
      <button className="btn sm" onClick={() => setOpen(!open)}>
        <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : undefined }} /> История версий
      </button>
      {open && <EntryList entries={CHANGELOG} />}
    </div>
  );
}
