// Плашка голосового Камадо: «Слушаю…» с живым микрофоном, «Думаю…», ответ и «Говорю» (нажми — замолчит).
import { useEffect, useRef } from "react";
import { Mic, Square, Volume2, X } from "lucide-react";
import { useStore } from "../lib/store";
import { cancelListening, finishListening, stopSpeaking, toggleVoice, voice, voiceLevel } from "../state/voice";

export function VoiceBubble() {
  const v = useStore(voice, (s) => s);
  const ring = useRef<HTMLSpanElement>(null);

  // микрофон «дышит» громкостью голоса: только transform через ref, без перерисовки
  useEffect(() => {
    if (v.phase !== "listening") return;
    const t = window.setInterval(() => {
      if (ring.current) ring.current.style.transform = `scale(${1 + voiceLevel.value * 0.9})`;
    }, 50);
    return () => clearInterval(t);
  }, [v.phase]);

  // ошибка — показать и спрятать
  useEffect(() => {
    if (!v.error) return;
    const t = window.setTimeout(() => voice.set({ error: undefined }), 5000);
    return () => clearTimeout(t);
  }, [v.error]);

  const show = v.phase !== "idle" || !!v.error;
  if (!show) return null;
  return (
    <div className={`voice-bubble glass ${v.phase}`} role="status">
      <button className="vb-mic" onClick={toggleVoice} title={v.phase === "listening" ? "Готово — отправить" : v.phase === "speaking" ? "Замолчать" : "Говорить"}>
        <span ref={ring} className="vb-ring" />
        {v.phase === "speaking" ? <Volume2 size={18} /> : v.phase === "listening" ? <Mic size={18} /> : <Mic size={18} />}
      </button>
      <div className="vb-text">
        {v.phase === "listening" && <b>Слушаю… замолчи — и я отвечу</b>}
        {v.phase === "thinking" && <b>{v.heard ? `«${v.heard}»` : "Думаю…"}</b>}
        {v.phase === "speaking" && <span>{v.answer}</span>}
        {v.phase === "idle" && v.error && <span className="vb-err">{v.error}</span>}
      </div>
      {v.phase === "listening" && (
        <button className="icon-btn" title="Отправить" onClick={() => void finishListening()}>
          <Square size={14} fill="currentColor" />
        </button>
      )}
      <button
        className="icon-btn"
        title="Закрыть"
        onClick={() => {
          if (v.phase === "listening") cancelListening();
          else if (v.phase === "speaking") stopSpeaking();
          voice.set({ error: undefined });
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
