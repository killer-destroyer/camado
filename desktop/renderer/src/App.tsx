import { useEffect } from "react";
import { api } from "./lib/api";
import { engine } from "./lib/audio";
import { onFrame } from "./lib/frame";
import { applyPalette, paletteById } from "./lib/palettes";
import { useStore } from "./lib/store";
import { app, go, initApp, toast, toggleOverlay, type ScreenId } from "./state/app";
import { refreshData, watchData } from "./state/data";
import { initFocus, refreshFocusStats } from "./state/focus";
import { initAlarms, ring } from "./state/alarms";
import { AlarmModal } from "./components/Alarm";
import { RecapModal } from "./components/Recap";
import { initPlayer, loadLibrary, player, playQueue, seek, position, togglePlay, watchLibrary, next, prev } from "./state/player";
import { Background } from "./components/Background";
import { Guard } from "./components/Guard";
import { CommandPalette, FpsMeter, MiniPlayer, Sidebar, Toasts, UpdateBanner } from "./components/Chrome";
import { NowPlaying } from "./components/NowPlaying";
import { OverlayFeed } from "./components/Overlay";
import { NowPlayingFeed } from "./components/Mini";
import { Chat } from "./screens/Chat";
import { Focus } from "./screens/Focus";
import { Music } from "./screens/Music";
import { Notes } from "./screens/Notes";
import { Links } from "./screens/Links";
import { Settings } from "./screens/Settings";
import { Tasks } from "./screens/Tasks";
import { Today } from "./screens/Today";

const SCREENS: Record<ScreenId, () => React.JSX.Element> = {
  today: Today,
  tasks: Tasks,
  notes: Notes,
  links: Links,
  music: Music,
  focus: Focus,
  chat: Chat,
  settings: Settings,
};

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

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
      initPlayer(),
      initFocus(),
      api.on("data-changed", () => void refreshFocusStats()),
      initAlarms(),
      // Напоминания о сроках звенят, утренняя сводка — просто всплывает.
      api.on("reminder", (p) => (p.text.startsWith("⏰") ? ring(p.text) : toast(p.text, "warn"))),
      api.on("go", (screen) => go(screen as ScreenId)),
    ];

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        app.set((s) => ({ palette: !s.palette }));
        return;
      }
      if (isTyping(e)) return;
      if (e.key === "Escape") app.set({ nowPlaying: false, palette: false, recap: false });
      else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight" && e.shiftKey) next();
      else if (e.key === "ArrowLeft" && e.shiftKey) prev();
      else if (e.key === "ArrowRight" && app.get().nowPlaying) seek(position() + 5);
      else if (e.key === "ArrowLeft" && app.get().nowPlaying) seek(position() - 5);
      else if (/^[1-8]$/.test(e.key) && e.altKey) {
        const ids: ScreenId[] = ["today", "tasks", "notes", "links", "music", "focus", "chat", "settings"];
        go(ids[Number(e.key) - 1]!);
      }
    };
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
      else if (name === "burst" || name === "line" || name === "flow") {
        app.set((s) => ({ nowPlaying: true, settings: { ...s.settings, lyricsMode: name } }));
      } else if (name.startsWith("pal-")) {
        app.set((s) => ({ settings: { ...s.settings, palette: name.slice(4) } }));
      } else go(name as ScreenId);
    };

    return () => {
      offs.forEach((f) => f());
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const Screen = SCREENS[screen];
  return (
    <div className={`app ${hasTrack ? "has-player" : ""}`}>
      <Background palette={palette} mode={settings.background} />
      <div className="titlebar" />
      <Sidebar />
      <main className="main">
        <div key={screen} className="screen-wrap">
          <Guard name={screen}>
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
      <RecapModal />
      <AlarmModal />
      <Toasts />
      <UpdateBanner />
      <OverlayFeed />
      <NowPlayingFeed />
      {settings.showFps && <FpsMeter />}
    </div>
  );
}
