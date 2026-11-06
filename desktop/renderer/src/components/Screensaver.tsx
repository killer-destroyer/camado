// Заставка-визуализатор: пока играет музыка и ничего не трогаешь — экран превращается в живую сцену
// в цветах обложки и в такт музыке, с крупным текстом песни. Любое движение — выход.
import { useEffect, useRef, useState } from "react";
import { engine } from "../lib/audio";
import { useFrame } from "../lib/frame";
import { hexToRgb, paletteById } from "../lib/palettes";
import { SCENES, SHADER_HEAD, SHADER_TAIL, sceneById } from "../lib/scenes";
import { useStore } from "../lib/store";
import { api } from "../lib/api";
import { app, toast } from "../state/app";
import { currentTrack, nowMeta, player } from "../state/player";
import { Lyrics } from "./Lyrics";

const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

interface Gl {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
  tex: WebGLTexture;
}

function compile(gl: WebGL2RenderingContext, fragBody: string): WebGLProgram | null {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Сцена не собралась:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const v = sh(gl.VERTEX_SHADER, VERT);
  const f = sh(gl.FRAGMENT_SHADER, SHADER_HEAD + fragBody + SHADER_TAIL);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "a");
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

const UNIFORMS = ["uRes", "uTime", "uBass", "uMid", "uHigh", "uEnergy", "uPulse", "uSpin", "uHasCover", "uImgAspect", "uFx", "uOwn", "uTravel", "uWarp", "uC1", "uC2", "uC3", "uBg", "uCover", "uBands"];

function rgb(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/** Выбор сцены: заданная или случайная (не та же, что была). */
let lastScene = "";
export function pickScene(setting: string): string {
  if (setting !== "random") return app.get().settings.screensaver.light && sceneById(setting).heavy ? "rain" : setting;
  // «Своя картинка» попадает в случайные, только если картинка выбрана
  const hasImage = !!app.get().settings.screensaver.image;
  const light = !!app.get().settings.screensaver.light;
  const pool = SCENES.filter((s) => s.id !== lastScene && (s.id !== "picture" || hasImage) && !(light && s.heavy));
  lastScene = pool[Math.floor(Math.random() * pool.length)]!.id;
  return lastScene;
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);
  return <div className="ss-clock">{now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>;
}

export function Screensaver() {
  const active = useStore(app, (s) => s.screensaver);
  const cfg = useStore(app, (s) => s.settings.screensaver);
  const settings = useStore(app, (s) => s.settings);
  const coverPalette = useStore(player, (s) => s.coverPalette);
  const lyrics = useStore(player, (s) => s.lyrics);
  const index = useStore(player, (s) => s.index);
  const canvas = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<Gl | null>(null);
  const spin = useRef(0);
  const travel = useRef(0);
  const warp = useRef(0.25);
  const t0 = useRef(performance.now());
  const preview = useStore(app, (s) => s.screensaverScene);
  const [sceneId, setSceneId] = useState(() => preview ?? pickScene(cfg.scene));
  const meta = nowMeta();
  const palette = settings.coverColors && coverPalette ? coverPalette : paletteById(settings.palette);

  // новая песня — новая сцена (если «случайная»)
  useEffect(() => {
    if (active) setSceneId(app.get().screensaverScene ?? pickScene(app.get().settings.screensaver.scene));
  }, [index, active, preview, cfg.scene]);

  // WebGL: собираем сцену заново, когда она меняется
  useEffect(() => {
    const c = canvas.current;
    if (!active || !c) return;
    const gl = c.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return;
    const prog = compile(gl, sceneById(sceneId).body) ?? compile(gl, SCENES[0]!.body);
    if (!prog) return;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const loc: Gl["loc"] = {};
    for (const u of UNIFORMS) loc[u] = gl.getUniformLocation(prog, u);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 40, 60, 255]));
    glRef.current = { gl, prog, loc, tex };
    return () => {
      gl.deleteProgram(prog);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      glRef.current = null;
    };
  }, [active, sceneId]);

  // обложка (или своя картинка) → текстура (с мипмапами: размытие «за стеклом» бесплатно)
  const hasCover = useRef(0);
  const aspect = useRef(1);
  const picture = sceneId === "picture" ? cfg.image : undefined;
  const src = picture ?? meta?.cover;
  useEffect(() => {
    const g = glRef.current;
    hasCover.current = 0;
    aspect.current = 1;
    if (!active || !g || !src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { gl, tex } = g;
      if (glRef.current !== g) return;
      // большие фото уменьшаем — видеокарте хватит 2048 точек по большей стороне
      const big = Math.max(img.naturalWidth, img.naturalHeight);
      let source: TexImageSource = img;
      if (big > 2048) {
        const k = 2048 / big;
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * k);
        cv.height = Math.round(img.naturalHeight * k);
        cv.getContext("2d")?.drawImage(img, 0, 0, cv.width, cv.height);
        source = cv;
      }
      aspect.current = img.naturalWidth / Math.max(1, img.naturalHeight);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      hasCover.current = 1;
    };
    img.src = src;
  }, [active, src, sceneId]);

  const bands = useRef(new Float32Array(32));
  useFrame((dt) => {
    const g = glRef.current;
    const c = canvas.current;
    if (!active || !g || !c) return;
    const scale = (sceneById(sceneId).scale ?? 1) * Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(c.clientWidth * scale);
    const h = Math.round(c.clientHeight * scale);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const { gl, prog, loc } = g;
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog);
    const src = engine.smooth;
    for (let i = 0; i < 32; i++) bands.current[i] = Math.min(1, (src[Math.floor((i / 32) * src.length)] ?? 0) * 1.2);
    spin.current += dt * (player.get().playing ? 0.9 : 0) * (1 + engine.bass * 0.4);
    // «Полёт сквозь звёзды»: спокойная скорость, музыка подгоняет мягко, путь копится — без рывков
    const want = 0.22 + Math.min(1, engine.energy) * 0.3 + engine.pulse * 0.08;
    warp.current += (want - warp.current) * Math.min(1, dt * 1.5);
    travel.current += dt * warp.current;
    gl.uniform2f(loc.uRes!, w, h);
    gl.uniform1f(loc.uTime!, (performance.now() - t0.current) / 1000);
    gl.uniform1f(loc.uBass!, engine.bass);
    gl.uniform1f(loc.uMid!, engine.mid);
    gl.uniform1f(loc.uHigh!, engine.high);
    gl.uniform1f(loc.uEnergy!, engine.energy);
    gl.uniform1f(loc.uPulse!, engine.pulse);
    gl.uniform1f(loc.uSpin!, spin.current);
    gl.uniform1f(loc.uHasCover!, hasCover.current);
    gl.uniform1f(loc.uImgAspect!, aspect.current);
    gl.uniform1f(loc.uOwn!, picture ? 1 : 0);
    gl.uniform1f(loc.uTravel!, travel.current);
    gl.uniform1f(loc.uWarp!, warp.current);
    gl.uniform1f(loc.uFx!, cfg.imageFx === "rain" ? 2 : cfg.imageFx === "none" ? 0 : 1);
    gl.uniform3f(loc.uC1!, ...rgb(palette.accent));
    gl.uniform3f(loc.uC2!, ...rgb(palette.accent2));
    gl.uniform3f(loc.uC3!, ...rgb(palette.accent3));
    gl.uniform3f(loc.uBg!, ...rgb(palette.bg2));
    gl.uniform1i(loc.uCover!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g.tex);
    gl.uniform1fv(loc.uBands!, bands.current);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }, -5);

  if (!active) return null;
  const track = currentTrack();
  const showLyrics = cfg.lyrics && !!lyrics?.synced && lyrics.lines.length > 0;
  return (
    <div className="screensaver" onPointerDown={stopScreensaver}>
      <canvas ref={canvas} className="ss-canvas" />
      <div className="ss-ui">
        <div className="ss-top">
          <div className="ss-track">
            <b>{meta?.title ?? ""}</b>
            <span>{meta?.artist ?? ""}</span>
          </div>
          {cfg.clock && <Clock />}
        </div>
        {showLyrics && (
          <div className="ss-lyrics">
            <Lyrics lyrics={lyrics} mode="line" />
          </div>
        )}
        <div className="ss-scene">
          {sceneById(sceneId).name}
          {track ? " · любое движение — выйти" : ""}
        </div>
      </div>
    </div>
  );
}

// ---------- Включение и выход ----------

/** Включить заставку. scene — показать конкретную сцену (кнопка «посмотреть» в Настройках). */
/** Был ли окно на весь экран ещё до заставки — тогда после неё так и оставляем. */
let wasFullScreen = false;
export function startScreensaver(scene?: string): void {
  if (app.get().screensaver) return;
  app.set({ screensaver: true, screensaverScene: scene });
  if (!app.get().settings.screensaver.fullscreen) return;
  void api.window.isFullScreen().then((on) => {
    wasFullScreen = on;
    if (!on && app.get().screensaver) void api.window.setFullScreen(true);
  });
}

export function stopScreensaver(): void {
  if (!app.get().screensaver) return;
  app.set({ screensaver: false, screensaverScene: undefined });
  if (app.get().settings.screensaver.fullscreen && !wasFullScreen) void api.window.setFullScreen(false);
}

/**
 * Следим за бездействием: играет музыка, окно Камадо в фокусе и ничего не трогали N минут — включаем.
 * Если ты работаешь в другой программе, заставка не вылезет поверх неё.
 */
export function watchIdle(): () => void {
  // видеокарта упала — сразу выходим из заставки (дальше тяжёлые сцены не показываем)
  const offGpu = api.on("gpu-crashed", () => {
    stopScreensaver();
    toast("Видеокарта не потянула сцену заставки — выключил тяжёлые сцены, чтобы такого больше не было.", "warn");
  });
  let moved = 0;
  const wake = (e: Event) => {
    if (!app.get().screensaver) return;
    // мелкое дрожание мыши не считается
    if (e instanceof PointerEvent && e.type === "pointermove") {
      moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      if (moved < 12) return;
    }
    moved = 0;
    stopScreensaver();
  };
  const events = ["pointermove", "keydown", "wheel", "pointerdown"] as const;
  for (const ev of events) window.addEventListener(ev, wake, { capture: true });
  const timer = window.setInterval(async () => {
    const st = app.get();
    const cfg = st.settings.screensaver;
    if (!cfg.enabled || st.screensaver || !player.get().playing || !document.hasFocus()) return;
    const idle = await api.system.idleSeconds();
    if (idle >= cfg.delay * 60) startScreensaver();
  }, 4000);
  return () => {
    for (const ev of events) window.removeEventListener(ev, wake, { capture: true });
    clearInterval(timer);
    offGpu();
  };
}
