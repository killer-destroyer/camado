// Каркас окна: боковая панель, мини-плеер, уведомления, счётчик FPS, командная строка (Ctrl+K).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Disc3,
  Link2,
  Rocket,
  Maximize2,
  MessageCircle,
  Music2,
  NotebookPen,
  Palette as PaletteIcon,
  Pause,
  Play,
  Search,
  Settings as SettingsIcon,
  SkipBack,
  SkipForward,
  Sparkles,
  Sun,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
import { fps, useFrame } from "../lib/frame";
import { PALETTES } from "../lib/palettes";
import { useStore } from "../lib/store";
import { api } from "../lib/api";
import { app, go, toggleOverlay, updateSettings, type ScreenId } from "../state/app";
import { next, nowMeta, player, prev, togglePlay } from "../state/player";
import { Progress } from "./NowPlaying";
import { Slider } from "./ui";
import { MiniSpectrum } from "./Visualizer";

export const NAV: { id: ScreenId; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Сегодня", icon: Sun },
  { id: "tasks", label: "Задания", icon: CalendarCheck },
  { id: "plan", label: "План", icon: CalendarDays },
  { id: "session", label: "Сессия", icon: GraduationCap },
  { id: "notes", label: "Заметки", icon: NotebookPen },
  { id: "links", label: "Ссылки", icon: Link2 },
  { id: "grow", label: "Прокачка", icon: Rocket },
  { id: "music", label: "Музыка", icon: Disc3 },
  { id: "focus", label: "Фокус", icon: Timer },
  { id: "chat", label: "Камадо", icon: MessageCircle },
];

export function Sidebar() {
  const screen = useStore(app, (s) => s.screen);
  const update = useStore(app, (s) => s.update.state);
  const items = [...NAV, { id: "settings" as const, label: "Настройки", icon: SettingsIcon }];
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const [pillTop, setPillTop] = useState(0);
  useLayoutEffect(() => {
    const el = refs.current.get(screen);
    if (el) setPillTop(el.offsetTop);
  }, [screen]);
  return (
    <nav className="sidebar glass">
      <div className="logo" title="Камадо">
        <span className="logo-orb" />
        <span className="logo-k">C</span>
      </div>
      <div className="nav-items">
        <span className="nav-pill" style={{ transform: `translateY(${pillTop}px)` }} />
        {items.map((n, i) => {
          const Icon = n.icon;
          const dot = n.id === "settings" && update === "available";
          return (
            <button
              key={n.id}
              ref={(el) => {
                if (el) refs.current.set(n.id, el);
              }}
              className={`nav-item ${screen === n.id ? "active" : ""} ${i === NAV.length ? "bottom" : ""}`}
              onClick={() => go(n.id)}
              data-tip={n.label}
            >
              <Icon size={21} strokeWidth={screen === n.id ? 2.3 : 1.8} />
              {dot && <span className="nav-dot" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MiniPlayer() {
  const playing = useStore(player, (s) => s.playing);
  useStore(player, (s) => s.index);
  const volume = useStore(app, (s) => s.settings.volume);
  const overlayOn = useStore(app, (s) => s.overlay);
  const meta = nowMeta();
  const [muted, setMuted] = useState<number | null>(null);
  if (!meta) return null;
  return (
    <div className="miniplayer glass">
      <button className="mp-cover" onClick={() => app.set({ nowPlaying: true })} title="Открыть плеер">
        {meta.cover ? <img src={meta.cover} alt="" /> : <Music2 size={22} />}
        <span className="mp-expand">
          <Maximize2 size={16} />
        </span>
      </button>
      <div className="mp-meta" onClick={() => app.set({ nowPlaying: true })}>
        <div className="mp-title">{meta.title}</div>
        <div className="mp-artist">{meta.artist}</div>
      </div>
      <div className="mp-center">
        <div className="mp-controls">
          <button className="icon-btn" onClick={prev} title="Назад">
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button className="play-btn sm" onClick={togglePlay} title="Пауза / играть">
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button className="icon-btn" onClick={() => next()} title="Дальше">
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
        <Progress />
      </div>
      <MiniSpectrum />
      <button className={`icon-btn ${overlayOn ? "active" : ""}`} title="Текст песни поверх всех окон" onClick={() => void toggleOverlay()}>
        <Sparkles size={18} />
      </button>
      <div className="mp-volume">
        <button
          className="icon-btn"
          onClick={() => {
            if (muted !== null) {
              updateSettings({ volume: muted });
              setMuted(null);
            } else {
              setMuted(volume);
              updateSettings({ volume: 0 });
            }
          }}
        >
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <Slider value={volume} onChange={(v) => updateSettings({ volume: v })} label="Громкость" />
      </div>
    </div>
  );
}

export function UpdateBanner() {
  const u = useStore(app, (s) => s.update);
  if (u.state !== "available" && u.state !== "downloading" && u.state !== "installing") return null;
  return (
    <div className="update-banner-wrap">
      <button className="update-banner" disabled={u.state !== "available"} onClick={() => void api.updates.install()}>
        <Sparkles size={15} />
        {u.state === "available"
          ? `Вышла версия ${u.version} — скачать обновление`
          : u.state === "downloading"
            ? `Качаю обновление… ${u.percent ?? 0}%`
            : "Ставлю обновление и перезапускаюсь…"}
      </button>
      {u.state === "available" && !!u.notes?.length && (
        <button className="update-banner what" onClick={() => app.set({ whatsNew: { title: `Что будет в ${u.version}`, entries: u.notes! } })}>
          Что в ней?
        </button>
      )}
    </div>
  );
}

export function Toasts() {
  const toasts = useStore(app, (s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast glass ${t.tone ?? "info"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function FpsMeter() {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(-1);
  useFrame(() => {
    if (ref.current && fps.value !== last.current) {
      last.current = fps.value;
      ref.current.textContent = `${fps.value} FPS`;
    }
  }, 99);
  return <div ref={ref} className="fps-meter" />;
}

// ---------- Командная строка ----------

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Sun;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore(app, (s) => s.palette);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...NAV.map((n) => ({ id: `go-${n.id}`, label: n.label, hint: "перейти", icon: n.icon, run: () => go(n.id) })),
      { id: "go-settings", label: "Настройки", hint: "перейти", icon: SettingsIcon, run: () => go("settings") },
      { id: "play", label: "Пауза / играть", hint: "пробел", icon: Play, run: togglePlay },
      { id: "next", label: "Следующий трек", icon: SkipForward, run: () => next() },
      { id: "np", label: "Открыть плеер на весь экран", icon: Maximize2, run: () => app.set({ nowPlaying: true }) },
      { id: "overlay", label: "Текст песни поверх всех окон", icon: Sparkles, run: () => void toggleOverlay() },
      { id: "burst", label: "Текст: режим «Взрыв»", icon: Sparkles, run: () => updateSettings({ lyricsMode: "burst" }) },
      { id: "flow", label: "Текст: режим «Лента»", icon: Sparkles, run: () => updateSettings({ lyricsMode: "flow" }) },
      { id: "line", label: "Текст: режим «Строка»", icon: Sparkles, run: () => updateSettings({ lyricsMode: "line" }) },
      ...PALETTES.map((p) => ({
        id: `pal-${p.id}`,
        label: `Палитра: ${p.name}`,
        hint: p.vibe,
        icon: PaletteIcon,
        run: () => updateSettings({ palette: p.id, coverColors: false }),
      })),
      { id: "pal-cover", label: "Палитра: из обложки трека", icon: PaletteIcon, run: () => updateSettings({ coverColors: true }) },
    ],
    [],
  );

  const list = commands.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;
  const run = (c?: Command) => {
    if (!c) return;
    app.set({ palette: false });
    c.run();
  };
  return (
    <div className="cmdk-backdrop" onMouseDown={() => app.set({ palette: false })}>
      <div className="cmdk glass" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <Search size={18} />
          <input
            ref={input}
            value={q}
            placeholder="Что сделать? Перейти, включить, сменить палитру…"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setSel((s) => Math.min(list.length - 1, s + 1));
              else if (e.key === "ArrowUp") setSel((s) => Math.max(0, s - 1));
              else if (e.key === "Enter") run(list[sel]);
              else if (e.key === "Escape") app.set({ palette: false });
              else return;
              e.preventDefault();
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list">
          {list.map((c, i) => {
            const Icon = c.icon;
            return (
              <button key={c.id} className={`cmdk-item ${i === sel ? "sel" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
                <Icon size={17} />
                <span>{c.label}</span>
                {c.hint && <em>{c.hint}</em>}
              </button>
            );
          })}
          {list.length === 0 && <div className="cmdk-empty">Ничего не нашлось</div>}
        </div>
      </div>
    </div>
  );
}
