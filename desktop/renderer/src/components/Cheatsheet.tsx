// Шпаргалка Ctrl+/ — все горячие клавиши; свои сочетания — в Настройках.
import { Keyboard, X } from "lucide-react";
import { bindings, HOTKEYS, prettyCombo, type HotkeyGroup } from "../../../shared/hotkeys";
import { useStore } from "../lib/store";
import { app, go } from "../state/app";
import { isMac } from "../state/hotkeys";

const GROUPS: HotkeyGroup[] = ["Главное", "Музыка", "Разделы"];

export function Cheatsheet() {
  const open = useStore(app, (s) => !!s.cheatsheet);
  const custom = useStore(app, (s) => s.settings.hotkeys);
  if (!open) return null;
  const b = bindings(custom);
  const mac = isMac();
  const close = () => app.set({ cheatsheet: false });
  return (
    <div className="modal-back" onClick={close}>
      <div className="modal glass cheatsheet" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn wn-close" onClick={close} title="Закрыть (Esc)">
          <X size={18} />
        </button>
        <h2>
          <Keyboard size={20} /> Горячие клавиши
        </h2>
        <div className="cs-cols">
          {GROUPS.map((g) => (
            <div key={g} className="cs-group">
              <h4>{g}</h4>
              {HOTKEYS.filter((a) => a.group === g).map((a) => (
                <div key={a.id} className="cs-row">
                  <span>
                    {a.label}
                    {a.inPlayer && <small className="muted"> · в плеере</small>}
                  </span>
                  <kbd>{prettyCombo(b.get(a.id) ?? "", mac)}</kbd>
                </div>
              ))}
            </div>
          ))}
          <div className="cs-group">
            <h4>Везде</h4>
            <div className="cs-row">
              <span>Быстрая запись (даже когда Камадо свёрнут)</span>
              <kbd>{mac ? "⌘ ⇧ Пробел" : "Ctrl + Shift + Пробел"}</kbd>
            </div>
            <div className="cs-row">
              <span>Закрыть окно / плеер</span>
              <kbd>Esc</kbd>
            </div>
          </div>
        </div>
        <p className="muted small">
          Одиночные буквы не срабатывают, пока печатаешь.{" "}
          <button
            className="link-btn"
            onClick={() => {
              close();
              go("settings");
              setTimeout(() => document.querySelector(".hotkeys-section")?.scrollIntoView({ block: "start", behavior: "smooth" }), 300);
            }}
          >
            Поменять сочетания →
          </button>
        </p>
      </div>
    </div>
  );
}
