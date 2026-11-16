// Кнопки «фото» и «голос» для быстрой записи: Камадо сам разберёт и запишет задания.
import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Square } from "lucide-react";
import { api } from "../lib/api";
import { imageToBase64, startRecording, type Recording } from "../lib/media";

export function useMediaSend(onResult: (text: string, ok: boolean) => void) {
  const [busy, setBusy] = useState<"photo" | "voice" | null>(null);
  const send = async (kind: "photo" | "voice", file: { mime: string; data: string }) => {
    setBusy(kind);
    const r = await api.media.send(kind, file.mime, file.data);
    setBusy(null);
    if ("error" in r) onResult(r.error, false);
    else onResult(r.answer, true);
  };
  const sendImage = async (blob: Blob) => send("photo", await imageToBase64(blob));
  return { busy, send, sendImage };
}

export function MediaButtons({ onResult, compact = false }: { onResult: (text: string, ok: boolean) => void; compact?: boolean }) {
  const { busy, send, sendImage } = useMediaSend(onResult);
  const file = useRef<HTMLInputElement>(null);
  const rec = useRef<Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);
  useEffect(() => () => rec.current?.cancel(), []);

  const toggleVoice = async () => {
    if (recording) {
      setRecording(false);
      const r = rec.current;
      rec.current = null;
      if (!r) return;
      try {
        const out = await r.stop();
        if (out.seconds < 0.7) return onResult("Слишком коротко — зажми и скажи, что записать", false);
        await send("voice", out);
      } catch {
        onResult("Не получилось записать звук", false);
      }
      return;
    }
    try {
      rec.current = await startRecording();
      setSecs(0);
      setRecording(true);
    } catch {
      onResult("Нет доступа к микрофону — разреши его Камадо в настройках системы", false);
    }
  };

  return (
    <div className={`media-btns ${compact ? "compact" : ""}`}>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void sendImage(f);
        }}
      />
      <button className="icon-btn" title="Фото задания: доска, страница, скрин — Камадо прочитает и запишет" disabled={!!busy || recording} onClick={() => file.current?.click()}>
        <Camera size={17} className={busy === "photo" ? "spin-slow" : ""} />
      </button>
      <button className={`icon-btn ${recording ? "rec" : ""}`} title={recording ? "Остановить и отправить" : "Голосом: «по физике лаба к четвергу»"} disabled={!!busy} onClick={() => void toggleVoice()}>
        {recording ? <Square size={14} fill="currentColor" /> : <Mic size={17} className={busy === "voice" ? "spin-slow" : ""} />}
      </button>
      {recording && <span className="rec-time">● {secs} с</span>}
      {busy && <span className="rec-time">{busy === "photo" ? "читаю фото…" : "слушаю…"}</span>}
    </div>
  );
}
