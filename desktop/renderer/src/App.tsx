import { useEffect } from "react";
import { api } from "./lib/api";
import { engine } from "./lib/audio";
import { onFrame } from "./lib/frame";
import { applyPalette, paletteById } from "./lib/palettes";
import { useStore } from "./lib/store";
import { app, go, initApp, toast, toggleOverlay, type ScreenId } from "./state/app";
import { data, refreshData, watchData } from "./state/data";
import { initFocus, setMode as setFocusMode, pause as pauseFocus, refreshFocusStats, reset as resetFocus, start as startFocus, watchMenubar } from "./state/focus";
import { initAlarms, ring } from "./state/alarms";
import { watchAchievements } from "./state/achievements";
import { AlarmModal } from "./components/Alarm";
import { RecapModal } from "./components/Recap";
import { WhatsNewModal } from "./components/WhatsNew";
import { redoWords } from "./state/wordsync";
import { CHANGELOG } from "./lib/changelog";
import { Screensaver, startScreensaver, stopScreensaver, watchIdle } from "./components/Screensaver";
import { currentTrack, initPlayer, loadLibrary, player, playQueue, resetLyricsSync, seek, position, togglePlay, watchLibrary, startWordSync, next, prev } from "./state/player";
import { Background } from "./components/Background";
import { handleKey, handleKeyUp } from "./state/hotkeys";
import { Cheatsheet } from "./components/Cheatsheet";
import { VoiceBubble } from "./components/VoiceBubble";
import { initVoice } from "./state/voice";
import { TrackEditModal } from "./components/TrackEdit";
import { Guard } from "./components/Guard";
import { CommandPalette, FpsMeter, MiniPlayer, Sidebar, Toasts, UpdateBanner } from "./components/Chrome";
import { NowPlaying } from "./components/NowPlaying";
import { OverlayFeed } from "./components/Overlay";
import { NowPlayingFeed } from "./components/Mini";
import { Chat } from "./screens/Chat";
import { Focus } from "./screens/Focus";
import { Money } from "./screens/Money";
import { Grow } from "./screens/Grow";
import { grow, type GrowTab } from "./state/grow";
import { Music } from "./screens/Music";
import { Notes } from "./screens/Notes";
import { Links } from "./screens/Links";
import { Planner } from "./screens/Planner";
import { Session } from "./screens/Session";
import { Settings } from "./screens/Settings";
import { Tasks } from "./screens/Tasks";
import { Today } from "./screens/Today";

const SCREENS: Record<ScreenId, () => React.JSX.Element> = {
  today: Today,
  tasks: Tasks,
  plan: Planner,
  session: Session,
  notes: Notes,
  links: Links,
  grow: Grow,
  money: Money,
  music: Music,
  focus: Focus,
  chat: Chat,
  settings: Settings,
};

function TrackEditHost() {
  const id = useStore(app, (s) => s.trackEdit);
  const track = useStore(player, (s) => (id ? s.library.tracks.find((t) => t.id === id) : undefined));
  return track ? <TrackEditModal track={track} onClose={() => app.set({ trackEdit: undefined })} /> : null;
}

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** Что просил сделать ИИ (пульт приложения): экран, музыка, фокус, заставка. */
type AiAction =
  | { type: "screen"; screen: ScreenId; nowPlaying?: boolean }
  | { type: "play"; trackIds: string[]; index: number; shuffle?: boolean }
  | { type: "music"; action: "pause" | "resume" | "next" | "prev" }
  | { type: "focus"; action: "start" | "pause" | "reset" }
  | { type: "screensaver"; on: boolean }
  | { type: "grow"; tab: string; lesson?: string; modal?: string }
  | { type: "words-redo"; trackId?: string };

function aiAction(a: AiAction): void {
  if (a.type === "screen") {
    go(a.screen);
    app.set({ nowPlaying: !!a.nowPlaying });
  } else if (a.type === "play") {
    const byId = new Map(player.get().library.tracks.map((t) => [t.id, t]));
    const list = a.trackIds.map((id) => byId.get(id)).filter((t): t is NonNullable<typeof t> => !!t);
    if (!list.length) return;
    if (a.shuffle) player.set({ shuffle: true });
    void playQueue(list, Math.min(a.index, list.length - 1));
  } else if (a.type === "music") {
    if (a.action === "next") next();
    else if (a.action === "prev") prev();
    else if ((a.action === "pause") === !engine.el.paused) togglePlay();
  } else if (a.type === "focus") {
    go("focus");
    if (a.action === "start") startFocus();
    else if (a.action === "pause") pauseFocus();
    else resetFocus();
  } else if (a.type === "words-redo") {
    const id = a.trackId ?? currentTrack()?.id;
    if (id) {
      resetLyricsSync(id);
      void redoWords(id);
    }
  } else if (a.type === "grow") {
    go("grow");
    grow.set((g) => ({ tab: a.tab as GrowTab, open: a.lesson ? { ...g.open, [a.tab]: a.lesson } : g.open, task: a.lesson ? 0 : g.task, modal: a.modal }));
  } else if (a.on) startScreensaver();
  else stopScreensaver();
}

export function App() {
  const screen = useStore(app, (s) => s.screen);
  const nowPlaying = useStore(app, (s) => s.nowPlaying);
  const settings = useStore(app, (s) => s.settings);
  const coverPalette = useStore(player, (s) => s.coverPalette);
  const hasTrack = useStore(player, (s) => s.index >= 0);

  const palette = settings.coverColors && coverPalette ? coverPalette : paletteById(settings.palette);

  useEffect(() => {
    applyPalette(palette);
    void api.window.setTitleBarColors(palette.text);
  }, [palette]);

  useEffect(() => {
    void initApp();
    void refreshData();
    void loadLibrary();
    const offs = [
      onFrame((dt, t) => engine.update(dt, t), -10),
      watchData(),
      watchLibrary(),
      startWordSync(),
      initPlayer(),
      initFocus(),
      api.on("data-changed", () => void refreshFocusStats()),
      api.on("before-class", (c) => {
        const bits = [c.room ? `ауд. ${c.room}` : "", c.info.topic ? `тема: ${c.info.topic.title}` : "", c.info.cards ? `повторить ${c.info.cards} карточек` : ""].filter(Boolean);
        toast(`Скоро пара: ${c.subject}${bits.length ? ` · ${bits.join(" · ")}` : ""}`, "info");
      }),
      initAlarms(),
      initVoice(),
      watchIdle(),
      watchMenubar(() => data.get().tasks),
      watchAchievements(),
      // Напоминания о сроках звенят, утренняя сводка — просто всплывает.
      api.on("reminder", (p) => (p.text.startsWith("⏰") ? ring(p.text) : toast(p.text, "warn"))),
      api.on("go", (screen) => go(screen as ScreenId)),
      api.on("ai-action", (a) => aiAction(a as AiAction)),
    ];

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isTyping(e)) {
        app.set({ nowPlaying: false, palette: false, recap: false, cheatsheet: false });
        return;
      }
      handleKey(e);
    };
    const onKeyUp = () => handleKeyUp();
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", onKey);

    // Для проверки дизайна (снимки экранов).
    window.__camadoShot = (raw: string) => {
      // «burst@20:2» — экран, перемотать на 20 с, трек №2 (для проверки дизайна)
      const [full, at] = raw.split("@") as [string, string | undefined];
      const [name, anchor] = full.split("#") as [string, string | undefined];
      if (anchor === "bottom") setTimeout(() => document.querySelector(".screen-wrap")?.scrollTo({ top: 1e6 }), 900);
      else if (anchor) setTimeout(() => document.querySelector(`.${anchor}`)?.scrollIntoView({ block: "center" }), 900);
      if (at !== undefined) {
        const [sec, idx] = at.split(":").map(Number) as [number, number | undefined];
        const tracks = player.get().library.tracks;
        const i = idx ?? 0;
        const jump = () => setTimeout(() => seek(sec), 400);
        if (tracks[i] && player.get().queue[player.get().index]?.id !== tracks[i]!.id) void playQueue(tracks, i).then(jump);
        else jump();
      }
      if (name === "overlay") void toggleOverlay();
      else if (name === "nowplaying") app.set({ nowPlaying: true });
      else if (name === "palette") app.set({ palette: true });
      else if (name === "recap") app.set({ recap: true });
      else if (name === "whatsnew") app.set({ whatsNew: { title: "Что нового", entries: CHANGELOG.slice(0, 1) } });
      else if (name.startsWith("grow-")) {
        go("grow");
        grow.set({ tab: name.slice(5) as GrowTab });
      } else if (name === "focus-break") {
        go("focus");
        setFocusMode("short");
      }
      else if (name.startsWith("ss-")) app.set({ screensaver: true, screensaverScene: name.slice(3) });
      else if (name === "burst" || name === "line" || name === "flow") {
        app.set((s) => ({ nowPlaying: true, settings: { ...s.settings, lyricsMode: name } }));
      } else if (name.startsWith("pal-")) {
        app.set((s) => ({ settings: { ...s.settings, palette: name.slice(4) } }));
      } else go(name as ScreenId);
    };

    return () => {
      offs.forEach((f) => f());
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const Screen = SCREENS[screen];
  return (
    <div className={`app ${hasTrack ? "has-player" : ""} ${nowPlaying ? "np-open" : ""}`}>
      <Background palette={palette} mode={settings.background} />
      <div className="titlebar" />
      <Sidebar />
      <main className="main">
        <div key={screen} className="screen-wrap">
          <Guard name={screen} back={screen === "today" ? undefined : { label: "На главную", onClick: () => go("today") }}>
            <Screen />
          </Guard>
        </div>
      </main>
      <MiniPlayer />
      {nowPlaying && (
        <Guard name="плеер">
          <NowPlaying />
        </Guard>
      )}
      <CommandPalette />
      <Cheatsheet />
      <VoiceBubble />
      <TrackEditHost />
      <RecapModal />
      <WhatsNewModal />
      <Screensaver />
      <AlarmModal />
      <Toasts />
      <UpdateBanner />
      <OverlayFeed />
      <NowPlayingFeed />
      {settings.showFps && <FpsMeter />}
    </div>
  );
}
