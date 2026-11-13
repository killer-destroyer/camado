// Мини-плеер в меню-баре Mac: клик по иконке-пластинке у часов — обложка, трек и управление.
import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { NowPlayingState } from "../../../shared/types";
import { api } from "../lib/api";
import { useFrame } from "../lib/frame";
import { applyPalette, paletteById } from "../lib/palettes";
import { useStore } from "../lib/store";
import { currentTrack, duration, nowMeta, player, position } from "../state/player";

/** В главном окне: сообщает «что играет» мини-плееру, трею и Discord. */
export function NowPlayingFeed() {
  const index = useStore(player, (s) => s.index);
  const playing = useStore(player, (s) => s.playing);
  const last = useRef("");
  useEffect(() => {
    const push = () => {
      const m = nowMeta();
      const state: NowPlayingState | null = m
        ? { trackId: currentTrack()?.id, title: m.title, artist: m.artist, cover: m.cover, playing: player.get().playing, position: position(), duration: duration(), sentAt: Date.now() }
        : null;
      const key = state ? `${state.title}|${state.playing}|${Math.round(state.position)}` : "";
      if (key === last.current) return;
      last.current = key;
      void api.nowPlaying.push(state);
    };
    push();
    const t = setInterval(push, 1000);
    return () => clearInterval(t);
  }, [index, playing]);
  return null;
}

export function MiniWindow() {
  const [np, setNp] = useState<NowPlayingState | null>(null);
  const npRef = useRef<NowPlayingState | null>(null);
  const fill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.classList.add("mini-mode");
    // Отдельное окно — свои цвета палитры и платформа.
    void api.settings.get().then((st) => applyPalette(paletteById(st.palette)));
    void api.info().then((i) => (document.documentElement.dataset.platform = i.platform));
    return api.on("np-state", (s) => {
      npRef.current = s;
      setNp(s);
    });
  }, []);
  useFrame(() => {
    const s = npRef.current;
    if (!s || !fill.current) return;
    const p = s.position + (s.playing ? (Date.now() - s.sentAt) / 1000 : 0);
    fill.current.style.transform = `scaleX(${s.duration > 0 ? Math.min(1, p / s.duration) : 0})`;
  });
  const act = (a: "playpause" | "next" | "prev" | "open") => void api.nowPlaying.action(a);
  if (!np) {
    return (
      <div className="mini-win empty" onClick={() => act("open")}>
        Ничего не играет — открыть Камадо
      </div>
    );
  }
  return (
    <div className="mini-win">
      <div className="mini-cover" style={np.cover ? { backgroundImage: `url("${np.cover}")` } : undefined} onClick={() => act("open")} />
      <div className="mini-body">
        <div className="mini-title">{np.title}</div>
        <div className="mini-artist">{np.artist}</div>
        <div className="mini-bar">
          <div ref={fill} />
        </div>
        <div className="mini-controls">
          <button onClick={() => act("prev")} title="Назад">
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button className="mini-play" onClick={() => act("playpause")} title="Пауза / играть">
            {np.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button onClick={() => act("next")} title="Дальше">
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button className="mini-open" onClick={() => act("open")} title="Открыть Камадо">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
