// Живой фон: «северное сияние» из цветов палитры, дышит в такт музыке.
// Цвета при смене палитры перетекают плавно. Рисуется в половинном разрешении — дёшево даже на 144 Гц.
import { useEffect, useRef } from "react";
import { engine } from "../lib/audio";
import { damp } from "../lib/dsp";
import { useFrame } from "../lib/frame";
import { hexToRgb, type Palette } from "../lib/palettes";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uEnergy, uPulse, uLight;
uniform vec3 uBg, uBg2, uC1, uC2, uC3;

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float blob(vec2 p, vec2 c, float r){ float d = length(p - c); return exp(-d * d / (r * r)); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  vec3 col = mix(uBg, uBg2, smoothstep(0.0, 1.2, uv.y + 0.15 * sin(uv.x * 2.0 + t * 0.1)));

  float r = 0.42 + 0.18 * uEnergy + 0.08 * uPulse;
  vec2 a = vec2(aspect * (0.22 + 0.10 * sin(t * 0.13)), 0.78 + 0.10 * cos(t * 0.11));
  vec2 b = vec2(aspect * (0.80 + 0.08 * cos(t * 0.09)), 0.28 + 0.12 * sin(t * 0.15));
  vec2 c = vec2(aspect * (0.55 + 0.20 * sin(t * 0.07 + 1.3)), 0.62 + 0.18 * sin(t * 0.12 + 2.1));

  float strength = mix(0.55, 0.32, uLight);
  col = mix(col, uC1, blob(p, a, r) * strength);
  col = mix(col, uC2, blob(p, b, r * 0.9) * strength * 0.85);
  col = mix(col, uC3, blob(p, c, r * 0.75) * strength * 0.6);

  // ленты сияния
  float wave = sin(uv.x * 4.0 + t * 0.35 + sin(uv.y * 3.0 - t * 0.25) * 1.6);
  float ribbon = smoothstep(0.82, 1.0, wave) * smoothstep(0.15, 0.6, uv.y) * (0.35 + uEnergy * 0.9);
  col = mix(col, uC2, ribbon * 0.18);

  // виньетка и зерно плёнки
  col *= mix(1.0 - 0.32 * length(uv - 0.5), 1.0, uLight * 0.7);
  // неподвижный дизеринг против полос в градиенте (раньше тут было мерцающее «зерно»)
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

const rgb = (hex: string) => hexToRgb(hex).map((v) => v / 255) as [number, number, number];

export function Background({ palette, mode }: { palette: Palette; mode: "aurora" | "calm" | "static" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gl = useRef<{ ctx: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> }>(undefined);
  const colors = useRef<Record<string, [number, number, number]>>(undefined);
  const target = useRef(palette);
  target.current = palette;
  const clock = useRef(Math.random() * 100);
  const drawnStatic = useRef(false);
  const since = useRef(1);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!ctx) return;
    const prog = ctx.createProgram()!;
    ctx.attachShader(prog, compile(ctx, ctx.VERTEX_SHADER, VERT));
    ctx.attachShader(prog, compile(ctx, ctx.FRAGMENT_SHADER, FRAG));
    ctx.linkProgram(prog);
    ctx.useProgram(prog);
    const buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const loc = ctx.getAttribLocation(prog, "p");
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const n of ["uRes", "uTime", "uEnergy", "uPulse", "uLight", "uBg", "uBg2", "uC1", "uC2", "uC3"]) {
      u[n] = ctx.getUniformLocation(prog, n);
    }
    gl.current = { ctx, u };

    const resize = () => {
      const scale = 0.5;
      c.width = Math.max(1, Math.floor(window.innerWidth * scale));
      c.height = Math.max(1, Math.floor(window.innerHeight * scale));
      ctx.viewport(0, 0, c.width, c.height);
      drawnStatic.current = false;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    drawnStatic.current = false;
  }, [palette, mode]);

  useFrame((frameDt) => {
    const g = gl.current;
    if (!g) return;
    // Фон медленный: 60 кадров в секунду ему хватает даже на 144-герцовом мониторе.
    since.current += frameDt;
    if (since.current < 1 / 60 - 0.002) return;
    const dt = Math.min(since.current, 0.1);
    since.current = 0;
    const p = target.current;
    const goal: Record<string, [number, number, number]> = {
      uBg: rgb(p.bg),
      uBg2: rgb(p.bg2),
      uC1: rgb(p.accent),
      uC2: rgb(p.accent2),
      uC3: rgb(p.accent3),
    };
    if (!colors.current) colors.current = structuredClone(goal);
    let moving = false;
    for (const k of Object.keys(goal)) {
      const cur = colors.current[k]!;
      for (let i = 0; i < 3; i++) {
        const next = damp(cur[i]!, goal[k]![i]!, 4, dt);
        if (Math.abs(next - cur[i]!) > 0.001) moving = true;
        cur[i] = next;
      }
    }

    if (mode === "static" && drawnStatic.current && !moving) return;
    const reactive = mode === "aurora";
    clock.current += dt * (mode === "static" ? 0 : reactive ? 1 + engine.energy * 2.2 : 0.6);

    const { ctx, u } = g;
    ctx.uniform2f(u.uRes!, ctx.canvas.width, ctx.canvas.height);
    ctx.uniform1f(u.uTime!, clock.current);
    ctx.uniform1f(u.uEnergy!, reactive ? engine.energy : 0);
    ctx.uniform1f(u.uPulse!, reactive ? engine.pulse : 0);
    ctx.uniform1f(u.uLight!, p.light ? 1 : 0);
    for (const k of Object.keys(goal)) ctx.uniform3fv(u[k]!, colors.current[k]!);
    ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    drawnStatic.current = true;
  }, 5);

  return <canvas ref={canvas} className="bg-canvas" aria-hidden />;
}
