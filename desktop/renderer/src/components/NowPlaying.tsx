// «Сейчас играет»: слева огромная пластинка, справа название и текст песни,
// внизу светящиеся волны и управление. Всё в цветах обложки, трясётся в такт.
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Crosshair,
  Moon,
  PictureInPicture2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Vibrate,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LyricsMode, VisualizerStyle } from "../../../shared/settings";
import { fmtTime } from "../lib/format";
import { useFrame } from "../lib/frame";
import { paletteById } from "../lib/palettes";
import { useStore } from "../lib/store";
import { engine } from "../lib/audio";
import { app, toggleOverlay, updateSettings } from "../state/app";
import {
  currentTrack,
  cycleRepeat,
  duration,
  next,
  nowMeta,
  player,
  position,
  prev,
  seek,
  setAutoLevel,
  setLyricsOffset,
  setSleep,
  setTrackGain,
  togglePlay,
} from "../state/player";
import { Lyrics } from "./Lyrics";
import { Segmented, Slider, Toggle } from "./ui";
import { autoTrim } from "../lib/loudness";
import { discGeometry, Vinyl } from "./Vinyl";
import { Visualizer } from "./Visualizer";

const LYRIC_MODES: { value: LyricsMode; label: string }[] = [
  { value: "flow", label: "Лента" },
  { value: "burst", label: "Взрыв" },
  { value: "line", label: "Строка" },
  { value: "off", label: "Без текста" },
];

const VIS_MODES: { value: VisualizerStyle; label: string; title: string }[] = [
  { value: "wave", label: "Волны", title: "Светящиеся волны внизу" },
  { value: "bars", label: "Столбики", title: "Столбики внизу" },
  { value: "ring", label: "Кольцо", title: "Кольцо вокруг пластинки" },
  { value: "off", label: "Выкл", title: "Без визуализатора" },
];

export function Progress({ big = false }: { big?: boolean }) {
  const fill = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLSpanElement>(null);
  const tot = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const last = useRef({ cur: "", tot: "" });
  useFrame(() => {
    const d = duration();
    const p = position();
    if (fill.current) fill.current.style.transform = `scaleX(${d > 0 ? Math.min(1, p / d) : 0})`;
    // Текст меняем раз в секунду, а не каждый кадр: смена текста — это пересчёт раскладки.
    const c = fmtTime(p);
    const t = fmtTime(d);
    if (cur.current && c !== last.current.cur) cur.current.textContent = last.current.cur = c;
    if (tot.current && t !== last.current.tot) tot.current.textContent = last.current.tot = t;
  }, 30);
  const seekTo = (e: React.PointerEvent) => {
    const r = bar.current!.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * duration());
  };
  return (
    <div className={`progress ${big ? "big" : ""}`}>
      <span ref={cur} className="t">
        0:00
      </span>
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
      <span ref={tot} className="t">
        0:00
      </span>
    </div>
  );
}

/** Сдвиг текста для трека, где тайминг в базе кривой: «−» раньше, «+» позже, ⌖ — «поймать» строку. */
function LyricsShift({ trackId }: { trackId: string }) {
  const offsets = useStore(app, (s) => s.settings.lyricsOffsets);
  const syncing = useStore(player, (s) => !!s.syncLyrics);
  const v = offsets[trackId] ?? 0;
  return (
    <div className={`lyr-shift ${syncing ? "syncing" : ""}`} title="Если текст спешит или опаздывает — подвинь его">
      <button onClick={() => setLyricsOffset(trackId, v - 0.25)}>−</button>
      <span onClick={() => setLyricsOffset(trackId, 0)}>
        {syncing ? "нажми строку, которую поют" : v === 0 ? "текст" : `${v > 0 ? "+" : ""}${v.toFixed(2)} с`}
      </span>
      <button onClick={() => setLyricsOffset(trackId, v + 0.25)}>+</button>
      <button
        className="catch"
        title="Поймать: нажми, потом нажми строку, которую поют прямо сейчас — весь текст встанет в такт"
        onClick={() => player.set({ syncLyrics: !syncing })}
      >
        <Crosshair size={14} />
      </button>
    </div>
  );
}

const SOUND = [
  { value: "normal" as const, label: "1×", title: "Обычный звук" },
  {
    value: "slowed" as const,
    label: "slowed",
    title: "Slowed + reverb: медленнее, ниже и с эхом",
  },
  {
    value: "nightcore" as const,
    label: "nightcore",
    title: "Nightcore: быстрее и выше",
  },
];

/** Режим звука и его скорость: ползунок, чтобы nightcore не был бешеным, а slowed — слишком тягучим. */
function SoundMenu() {
  const mode = useStore(app, (s) => s.settings.soundMode);
  const slowed = useStore(app, (s) => s.settings.slowedRate);
  const nightcore = useStore(app, (s) => s.settings.nightcoreRate);
  const [open, setOpen] = useState(false);
  const cur = SOUND.find((m) => m.value === mode) ?? SOUND[0]!;
  return (
    <div className="sleep">
      <button
        className={`sound-btn ${mode !== "normal" ? "active" : ""}`}
        title={`${cur.title}. Нажми, чтобы выбрать`}
        onClick={() => setOpen(!open)}
      >
        {cur.label}
      </button>
      {open && (
        <div className="sleep-menu sound-menu glass">
          {SOUND.map((m) => (
            <button
              key={m.value}
              className={m.value === mode ? "on" : ""}
              title={m.title}
              onClick={() => updateSettings({ soundMode: m.value })}
            >
              {m.value === "normal" ? "обычный" : m.label}
            </button>
          ))}
          {mode === "slowed" && (
            <label className="rate-row">
              <span>скорость</span>
              <Slider
                value={slowed}
                min={0.7}
                max={0.95}
                step={0.01}
                label="Скорость slowed"
                onChange={(v) => updateSettings({ slowedRate: v })}
              />
              <b>{slowed.toFixed(2)}×</b>
            </label>
          )}
          {mode === "nightcore" && (
            <label className="rate-row">
              <span>скорость</span>
              <Slider
                value={nightcore}
                min={1.05}
                max={1.4}
                step={0.01}
                label="Скорость nightcore"
                onChange={(v) => updateSettings({ nightcoreRate: v })}
              />
              <b>{nightcore.toFixed(2)}×</b>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/** Громкость прямо в плеере. Колёсико/два пальца над ней — тонкая подстройка. */
export function VolumeControl() {
  const volume = useStore(app, (s) => s.settings.volume);
  const [before, setBefore] = useState(0.8);
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div
      className="np-volume"
      onWheel={(e) => {
        const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? -e.deltaY : e.deltaX) * 0.0015;
        updateSettings({
          volume: Math.max(0, Math.min(1, Math.round((volume + d) * 200) / 200)),
        });
      }}
    >
      <button
        className="icon-btn"
        title={volume === 0 ? "Включить звук" : "Выключить звук"}
        onClick={() => {
          if (volume === 0) updateSettings({ volume: before || 0.6 });
          else {
            setBefore(volume);
            updateSettings({ volume: 0 });
          }
        }}
      >
        <Icon size={18} />
      </button>
      <Slider value={volume} step={0.005} onChange={(v) => updateSettings({ volume: v })} label="Громкость" />
    </div>
  );
}

/** Громкость этой песни: скачанные треки сведены по-разному, одни тише, другие громче. */
function TrackLevel({ trackId }: { trackId: string }) {
  const gain = useStore(app, (s) => s.settings.trackGain[trackId] ?? 0);
  const auto = useStore(app, (s) => s.settings.autoLevel);
  const loud = useStore(app, (s) => s.settings.trackLoudness[trackId]);
  const [open, setOpen] = useState(false);
  const autoDb = auto && loud !== undefined ? autoTrim(loud) : 0;
  const fmt = (db: number) => `${db > 0 ? "+" : db < 0 ? "−" : "±"}${Math.abs(db).toFixed(1)} дБ`;
  return (
    <div className="sleep">
      <button
        className={`icon-btn ${gain !== 0 ? "active" : ""}`}
        title="Громкость этой песни"
        onClick={() => setOpen(!open)}
        onWheel={(e) => setTrackGain(trackId, gain + (e.deltaY < 0 ? 0.5 : -0.5))}
      >
        <SlidersHorizontal size={17} />
      </button>
      {open && (
        <div className="sleep-menu level-menu glass">
          <div className="level-title">Громкость этой песни</div>
          <label className="rate-row">
            <span>тише</span>
            <Slider value={gain} min={-12} max={12} step={0.5} label="Громкость этой песни" onChange={(v) => setTrackGain(trackId, v)} />
            <span>громче</span>
          </label>
          <div className="level-info">
            <b>{fmt(gain)}</b>
            {gain !== 0 && <button onClick={() => setTrackGain(trackId, 0)}>сбросить</button>}
          </div>
          <label className="level-auto">
            <Toggle value={auto} onChange={setAutoLevel} />
            <span>
              Выравнивать все песни
              <small>{auto ? (loud === undefined ? "измеряю эту песню…" : `для этой: ${fmt(autoDb)}`) : "тихие подтянуть, громкие приглушить"}</small>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function SleepButton() {
  const sleep = useStore(player, (s) => s.sleep);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!sleep?.at) return;
    const t = setInterval(() => tick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, [sleep?.at]);
  const left = sleep?.at ? Math.max(1, Math.round((sleep.at - Date.now()) / 60e3)) : 0;
  const choose = (v: number | "track" | null) => {
    setSleep(v);
    setOpen(false);
  };
  return (
    <div className="sleep">
      <button className={`icon-btn ${sleep ? "active" : ""}`} title="Таймер сна" onClick={() => setOpen(!open)}>
        <Moon size={18} />
        {sleep && <span className="sleep-badge">{sleep.endOfTrack ? "трек" : `${left}м`}</span>}
      </button>
      {open && (
        <div className="sleep-menu glass">
          {[15, 30, 60].map((m) => (
            <button key={m} onClick={() => choose(m)}>
              через {m} мин
            </button>
          ))}
          <button onClick={() => choose("track")}>после этого трека</button>
          {sleep && (
            <button className="off" onClick={() => choose(null)}>
              выключить таймер
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function NowPlaying() {
  const settings = useStore(app, (s) => s.settings);
  const overlayOn = useStore(app, (s) => s.overlay);
  const platform = useStore(app, (s) => s.info.platform);
  const playing = useStore(player, (s) => s.playing);
  const lyrics = useStore(player, (s) => s.lyrics);
  const shuffle = useStore(player, (s) => s.shuffle);
  const repeat = useStore(player, (s) => s.repeat);
  const coverPalette = useStore(player, (s) => s.coverPalette);
  useStore(player, (s) => s.index);
  const meta = nowMeta();
  const track = currentTrack();
  const palette = settings.coverColors && coverPalette ? coverPalette : paletteById(settings.palette);
  const hasLyrics = !!lyrics && lyrics.lines.length > 0 && settings.lyricsMode !== "off";

  const shakeAll = useRef<HTMLDivElement>(null);
  const shakeDisc = useRef<HTMLDivElement>(null);
  const shakeLyrics = useRef<HTMLDivElement>(null);
  const [, setSize] = useState(0);
  useEffect(() => {
    const on = () => setSize((x) => x + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useFrame(() => {
    const sh = settings.shake;
    const o = engine.shake;
    const transform = `translate3d(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px, 0) rotate(${o.rotate.toFixed(3)}deg) scale(${o.scale.toFixed(4)})`;
    const tgt = sh.enabled ? sh.target : null;
    if (shakeAll.current) shakeAll.current.style.transform = tgt === "scene" ? transform : "";
    if (shakeDisc.current) shakeDisc.current.style.transform = tgt === "cover" ? transform : "";
    if (shakeLyrics.current) shakeLyrics.current.style.transform = tgt === "lyrics" ? transform : "";
  }, 40);

  const mode = settings.lyricsMode;
  const vis = settings.visualizer;
  const ring = (w: number, h: number) => discGeometry(w, h);

  return (
    <div
      className={`nowplaying ${platform === "darwin" ? "mac" : ""}`}
      onKeyDown={(e) => e.key === "Escape" && app.set({ nowPlaying: false })}
    >
      <div className="np-backdrop" style={meta?.cover ? { backgroundImage: `url("${meta.cover}")` } : undefined} />
      <div className="np-tint" />
      {(vis === "wave" || vis === "bars") && <Visualizer kind={vis} className={`np-vis ${vis}`} />}

      <div ref={shakeAll} className="np-shake">
        {vis === "ring" && <Visualizer kind="ring-only" className="np-ring-full" ring={ring} />}
        <div ref={shakeDisc} className="np-disc-layer">
          <Vinyl
            trackKey={track?.id ?? meta?.title ?? "camado"}
            cover={meta?.cover}
            colors={{
              bg: palette.bg2,
              accent: palette.accent,
              accent2: palette.accent2,
              accent3: palette.accent3,
            }}
          />
        </div>

        <div className={`np-right ${hasLyrics ? "" : "no-lyrics"} mode-${mode}`}>
          <div key={meta?.title} className="np-meta">
            <div className="np-title">{meta?.title ?? "Ничего не играет"}</div>
            <div className="np-artist">{meta?.artist ?? "Выбери трек в «Музыке»"}</div>
          </div>
          <div ref={shakeLyrics} className={`np-lyrics mode-${mode}`}>
            <Lyrics lyrics={lyrics} mode={mode} />
          </div>
        </div>
      </div>

      <div className="np-top">
        <button className="icon-btn" title="Свернуть (Esc)" onClick={() => app.set({ nowPlaying: false })}>
          <ChevronDown size={22} />
        </button>
        <div className="np-switches">
          {hasLyrics && lyrics?.synced && track && <LyricsShift trackId={track.id} />}
          <Segmented size="sm" value={mode} options={LYRIC_MODES} onChange={(v) => updateSettings({ lyricsMode: v })} />
          <Segmented size="sm" value={vis} options={VIS_MODES} onChange={(v) => updateSettings({ visualizer: v })} />
          <button
            className={`icon-btn ${overlayOn ? "active" : ""}`}
            title="Текст песни поверх всех окон"
            onClick={() => void toggleOverlay()}
          >
            <PictureInPicture2 size={18} />
          </button>
          <button
            className={`icon-btn ${settings.shake.enabled ? "active" : ""}`}
            title="Тряска в такт"
            onClick={() =>
              updateSettings({
                shake: { ...settings.shake, enabled: !settings.shake.enabled },
              })
            }
          >
            <Vibrate size={18} />
          </button>
        </div>
      </div>

      <div className="np-bottom">
        <Progress big />
        <div className="np-controls-row">
          <div className="np-side left">
            <SleepButton />
            <SoundMenu />
          </div>
          <div className="np-controls">
            <button className={`icon-btn ${shuffle ? "active" : ""}`} title="Умный рандом" onClick={() => player.set({ shuffle: !shuffle })}>
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
            <button className={`icon-btn ${repeat !== "off" ? "active" : ""}`} title="Повтор" onClick={cycleRepeat}>
              {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>
          <div className="np-side right">
            {track && <TrackLevel trackId={track.id} />}
            <VolumeControl />
          </div>
        </div>
      </div>
    </div>
  );
}
