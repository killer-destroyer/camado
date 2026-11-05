// «Сейчас играет»: на весь экран — пластинка, визуализатор, текст песни и тряска в такт.
import { useRef } from "react";
import { ChevronDown, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Vibrate } from "lucide-react";
import type { LyricsMode, VisualizerStyle } from "../../../shared/settings";
import { engine } from "../lib/audio";
import { fmtTime } from "../lib/format";
import { useFrame } from "../lib/frame";
import { useStore } from "../lib/store";
import { app, updateSettings } from "../state/app";
import { cycleRepeat, duration, next, nowMeta, player, position, prev, seek, togglePlay } from "../state/player";
import { Lyrics } from "./Lyrics";
import { Segmented } from "./ui";
import { Vinyl } from "./Vinyl";
import { Visualizer } from "./Visualizer";

const LYRIC_MODES: { value: LyricsMode; label: string }[] = [
  { value: "flow", label: "Лента" },
  { value: "burst", label: "Взрыв" },
  { value: "line", label: "Строка" },
  { value: "off", label: "Без текста" },
];

const VIS_MODES: { value: VisualizerStyle; label: string }[] = [
  { value: "ring", label: "Кольцо" },
  { value: "wave", label: "Волна" },
  { value: "bars", label: "Столбики" },
  { value: "off", label: "Выкл" },
];

export function Progress({ big = false }: { big?: boolean }) {
  const fill = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLSpanElement>(null);
  const tot = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const d = duration();
    const p = position();
    if (fill.current) fill.current.style.transform = `scaleX(${d > 0 ? Math.min(1, p / d) : 0})`;
    if (cur.current) cur.current.textContent = fmtTime(p);
    if (tot.current) tot.current.textContent = fmtTime(d);
  }, 30);
  const seekTo = (e: React.PointerEvent) => {
    const r = bar.current!.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * duration());
  };
  return (
    <div className={`progress ${big ? "big" : ""}`}>
      <span ref={cur} className="t">0:00</span>
      <div
        ref={bar}
        className="bar"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          seekTo(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && seekTo(e)}
      >
        <div ref={fill} className="fill" />
      </div>
      <span ref={tot} className="t">0:00</span>
    </div>
  );
}

export function NowPlaying() {
  const settings = useStore(app, (s) => s.settings);
  const playing = useStore(player, (s) => s.playing);
  const lyrics = useStore(player, (s) => s.lyrics);
  const loading = useStore(player, (s) => s.lyricsLoading);
  const shuffle = useStore(player, (s) => s.shuffle);
  const repeat = useStore(player, (s) => s.repeat);
  const source = useStore(player, (s) => s.source);
  useStore(player, (s) => s.index);
  useStore(player, (s) => s.online?.title);
  const meta = nowMeta();

  const scene = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const lyr = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const sh = settings.shake;
    const o = engine.shake;
    const transform = `translate3d(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px, 0) rotate(${o.rotate.toFixed(3)}deg) scale(${o.scale.toFixed(4)})`;
    const tgt = sh.enabled ? sh.target : null;
    if (scene.current) scene.current.style.transform = tgt === "scene" ? transform : "";
    if (cover.current) cover.current.style.transform = tgt === "cover" ? transform : "";
    if (lyr.current) lyr.current.style.transform = tgt === "lyrics" ? transform : "";
    scene.current?.style.setProperty("--pulse", engine.pulse.toFixed(3));
    scene.current?.style.setProperty("--energy", engine.energy.toFixed(3));
  }, 40);

  const mode = settings.lyricsMode;
  const layout = mode === "flow" ? "split" : "center";

  return (
    <div className="nowplaying" onKeyDown={(e) => e.key === "Escape" && app.set({ nowPlaying: false })}>
      <div className="np-backdrop" style={meta?.cover ? { backgroundImage: `url("${meta.cover}")` } : undefined} />
      {settings.visualizer !== "ring" && settings.visualizer !== "off" && (
        <Visualizer kind={settings.visualizer} className={`np-vis ${settings.visualizer}`} />
      )}

      <div ref={scene} className={`np-scene ${layout}`}>
        <div className="np-stage">
          <div ref={cover} className="np-cover-wrap">
            {settings.visualizer === "ring" && <Visualizer kind="ring" className="np-ring" ringRadius={0.3} />}
            <Vinyl cover={meta?.cover} showVinyl={settings.vinyl} />
          </div>
          <div className="np-meta">
            <div className="np-title">{meta?.title ?? "Ничего не играет"}</div>
            <div className="np-artist">{meta?.artist ?? "Выбери трек в «Музыке»"}</div>
          </div>
        </div>
        <div ref={lyr} className={`np-lyrics mode-${mode}`}>
          <Lyrics lyrics={lyrics} loading={loading} mode={mode} />
        </div>
      </div>

      <div className="np-top">
        <button className="icon-btn" title="Свернуть (Esc)" onClick={() => app.set({ nowPlaying: false })}>
          <ChevronDown size={22} />
        </button>
        <div className="np-source">{source === "online" ? "Онлайн-плеер" : "Моя музыка"}</div>
        <div className="np-switches">
          <Segmented size="sm" value={mode} options={LYRIC_MODES} onChange={(v) => updateSettings({ lyricsMode: v })} />
          <Segmented size="sm" value={settings.visualizer} options={VIS_MODES} onChange={(v) => updateSettings({ visualizer: v })} />
          <button
            className={`icon-btn ${settings.shake.enabled ? "active" : ""}`}
            title="Тряска в такт"
            onClick={() => updateSettings({ shake: { ...settings.shake, enabled: !settings.shake.enabled } })}
          >
            <Vibrate size={18} />
          </button>
        </div>
      </div>

      <div className="np-bottom">
        <Progress big />
        <div className="np-controls">
          <button className={`icon-btn ${shuffle ? "active" : ""}`} title="Перемешать" onClick={() => player.set({ shuffle: !shuffle })} disabled={source === "online"}>
            <Shuffle size={18} />
          </button>
          <button className="icon-btn lg" title="Назад" onClick={prev}>
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button className="play-btn" title="Пауза / играть (пробел)" onClick={togglePlay}>
            {playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
          </button>
          <button className="icon-btn lg" title="Дальше" onClick={() => next()}>
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button className={`icon-btn ${repeat !== "off" ? "active" : ""}`} title="Повтор" onClick={cycleRepeat} disabled={source === "online"}>
            {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
