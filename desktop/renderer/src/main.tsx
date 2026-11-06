import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "./styles/global.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MiniWindow } from "./components/Mini";
import { LyricsOverlay } from "./components/Overlay";
import { QuickWindow } from "./components/Quick";

// Одна страница — четыре окна: приложение, текст поверх всех окон (#overlay), мини-плеер в меню-баре (#mini),
// быстрая запись из любой программы (#quick).
const VIEWS: Record<string, () => React.JSX.Element | null> = { "#overlay": LyricsOverlay, "#mini": MiniWindow, "#quick": QuickWindow };
const View = VIEWS[location.hash] ?? App;
const view = <View />;
createRoot(document.getElementById("root")!).render(view);
