import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "./styles/global.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LyricsOverlay } from "./components/Overlay";

// Одно и то же окно-страница: основное приложение или текст песни поверх всех окон (#overlay).
const isOverlay = location.hash === "#overlay";
createRoot(document.getElementById("root")!).render(isOverlay ? <LyricsOverlay /> : <App />);
