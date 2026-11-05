// Текст песни поверх всех окон: отдельное прозрачное окно внизу экрана, сквозь него можно кликать.
import { useEffect, useRef, useState } from "react";
import type { OverlayState } from "../../../shared/types";
import { activeLineIndex, timedWords } from "../../../shared/lrc";
import { api } from "../lib/api";
import { onFrame, useFrame } from "../lib/frame";
import { useStore } from "../lib/store";
import { app } from "../state/app";
import { duration, lyricsTime, player } from "../state/player";

/** В главном окне: пока поверх-окно открыто, шлёт ему текущую строку ~8 раз в секунду. */
export function OverlayFeed() {
  const open = useStore(app, (s) => s.overlay);
  const last = useRef({ at: 0, key: "" });

  useEffect(() => {
    if (!open) return;
    return onFrame(() => {
      const s = player.get();
      const lyrics = s.lyrics;
      const t = lyricsTime();
      let text = "";
      let next: string | undefined;
      let words: OverlayState["words"] = [];
      let lineEnd = 0;
      if (lyrics?.synced && lyrics.lines.length) {
        const i = activeLineIndex(lyrics.lines, t + 0.04);
        if (i >= 0) {
          text = lyrics.lines[i]!.text;
          words = timedWords(lyrics.lines, i, duration());
          lineEnd = lyrics.lines[i + 1]?.time ?? duration();
        }
        next = lyrics.lines[i + 1]?.text;
      }
      // Нет текста с таймингом — ничего не показываем (раньше тут было название трека).
      const now = Date.now();
      const key = `${text}|${s.playing}`;
      if (key === last.current.key && now - last.current.at < 125) return;
      last.current = { at: now, key };
      const cs = getComputedStyle(document.documentElement);
      void api.overlay.push({
        text,
        next,
        words,
        lineEnd,
        position: t,
        playing: s.playing,
        sentAt: now,
        colors: {
          text: cs.getPropertyValue("--text").trim(),
          accent: cs.getPropertyValue("--accent").trim(),
          accent2: cs.getPropertyValue("--accent-2").trim(),
        },
      });
    }, 50);
  }, [open]);

  return null;
}

/** Само поверх-окно. */
export function LyricsOverlay() {
  const [st, setSt] = useState<OverlayState | null>(null);
  const stRef = useRef<OverlayState | null>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("overlay-mode");
    return api.on("overlay-state", (s) => {
      stRef.current = s;
      setSt((prev) => (prev?.text === s.text && prev?.next === s.next && prev.colors.accent === s.colors.accent ? prev : s));
    });
  }, []);

  useFrame(() => {
    const s = stRef.current;
    const el = line.current;
    if (!s || !el) return;
    const t = s.position + (s.playing ? (Date.now() - s.sentAt) / 1000 : 0) + 0.04;
    const spans = el.children;
    for (let i = 0; i < spans.length; i++) {
      const w = s.words[i];
      if (!w) continue;
      const end = s.words[i + 1]?.time ?? s.lineEnd;
      const p = Math.max(0, Math.min(1, (t - w.time) / Math.max(0.12, end - w.time)));
      (spans[i] as HTMLElement).style.setProperty("--fill", p.toFixed(3));
    }
  });

  if (!st || !st.text) return null;
  const style = {
    ["--o-text" as string]: st.colors.text,
    ["--o-accent" as string]: st.colors.accent,
    ["--o-accent2" as string]: st.colors.accent2,
  };
  return (
    <div className="overlay" style={style}>
      <div key={st.text} ref={line} className="overlay-line">
        {st.words.length
          ? st.words.map((w, i) => (
              <span key={i} className="ow">
                {w.text}{" "}
              </span>
            ))
          : st.text}
      </div>
      {st.next && (
        <div key={`n-${st.next}`} className="overlay-next">
          {st.next}
        </div>
      )}
    </div>
  );
}
