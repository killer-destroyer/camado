// Окно звонящего напоминания: большой текст, «Стоп» и «Отложить».
import { AlarmClock } from "lucide-react";
import { useStore } from "../lib/store";
import { alarms, dismiss, snooze } from "../state/alarms";

export function AlarmModal() {
  const ringing = useStore(alarms, (s) => s.ringing);
  if (!ringing) return null;
  return (
    <div className="alarm-modal" onKeyDown={(e) => e.key === "Escape" && dismiss()}>
      <div className="alarm-card glass">
        <div className="alarm-icon">
          <AlarmClock size={44} />
        </div>
        <div className="alarm-text">{ringing.text}</div>
        <div className="alarm-actions">
          <button className="btn" onClick={() => snooze(10)}>
            Через 10 минут
          </button>
          <button className="btn primary" autoFocus onClick={dismiss}>
            Стоп
          </button>
        </div>
      </div>
    </div>
  );
}
