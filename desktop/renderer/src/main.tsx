import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "./styles/global.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MiniWindow } from "./components/Mini";
import { LyricsOverlay } from "./components/Overlay";

// Одна страница — три окна: приложение, текст поверх всех окон (#overlay), мини-плеер в меню-баре (#mini).
const view = location.hash === "#overlay" ? <LyricsOverlay /> : location.hash === "#mini" ? <MiniWindow /> : <App />;
createRoot(document.getElementById("root")!).render(view);
