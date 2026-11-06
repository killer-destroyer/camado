// Сцены заставки: каждая — фрагментный шейдер (рисует картинку целиком на видеокарте).
// Всё в цветах обложки (uC1–uC3, uBg) и в такт музыке (uBass, uMid, uHigh, uEnergy, uPulse, uBands).

export interface Scene {
  id: string;
  name: string;
  /** Тело шейдера: функция vec3 scene(vec2 uv, vec2 p), uv — 0…1, p — центр 0, высота экрана 1. */
  body: string;
  /** Рисовать в уменьшенном разрешении (тяжёлые сцены). */
  scale?: number;
}

export const SHADER_HEAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime, uBass, uMid, uHigh, uEnergy, uPulse, uSpin, uHasCover;
uniform vec3 uC1, uC2, uC3, uBg;
uniform sampler2D uCover;
uniform float uBands[32];
out vec4 outColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { float n = hash(p); return vec2(n, hash(p + n)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
float band(float x) { int i = int(clamp(x, 0.0, 0.999) * 32.0); return uBands[i]; }
vec3 cover(vec2 uv, float lod) {
  vec3 c = textureLod(uCover, vec2(uv.x, 1.0 - uv.y), lod).rgb;
  return mix(mix(uBg, uC1, 0.5), c, uHasCover);
}
/** Обложка «во весь экран» с сохранением пропорций (обрезка по краям). */
vec2 coverFit(vec2 uv) { vec2 r = uRes / min(uRes.x, uRes.y); return (uv - 0.5) * r / max(r.x, r.y) + 0.5; }
vec3 palette(float t) { t = fract(t); return t < 0.33 ? mix(uC1, uC2, t * 3.0) : t < 0.66 ? mix(uC2, uC3, (t - 0.33) * 3.0) : mix(uC3, uC1, (t - 0.66) * 3.0); }
`;

export const SHADER_TAIL = `
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 col = scene(uv, p);
  // лёгкая виньетка и зерно — картинка выглядит «дороже»
  col *= 1.0 - 0.35 * dot(uv - 0.5, uv - 0.5) * 2.0;
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.015;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export const SCENES: Scene[] = [
  {
    id: "rain",
    name: "Дождь по стеклу",
    body: `
// Капли на стекле: за ним — размытая обложка, капли преломляют её чётче.
vec3 dropLayer(vec2 uv, float t, float size) {
  vec2 g = uv * size; vec2 id = floor(g); vec2 st = fract(g) - 0.5;
  vec2 rnd = hash2(id);
  vec2 c = (rnd - 0.5) * 0.7;
  float life = fract(t * (0.05 + rnd.x * 0.1) + rnd.y);
  float r = (0.12 + rnd.y * 0.18) * smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.7, life);
  vec2 d = st - c; float m = smoothstep(r, r * 0.55, length(d));
  return vec3(d / max(r, 1e-3), m);
}
vec3 runner(vec2 uv, float t) {
  float cols = 9.0; float cx = floor(uv.x * cols); float seed = hash(vec2(cx, 7.0));
  float speed = 0.06 + seed * 0.12;
  float y = 1.15 - fract(t * speed + seed) * 1.4;
  float x = (cx + 0.5 + sin(uv.y * 18.0 + seed * 9.0) * 0.08) / cols;
  vec2 d = (uv - vec2(x, y)) * vec2(cols * 0.55, 6.0);
  float drop = smoothstep(0.35, 0.18, length(d));
  float trail = smoothstep(0.06, 0.0, abs(uv.x - x)) * step(y, uv.y) * smoothstep(y + 0.35, y, uv.y);
  float beads = trail * smoothstep(0.5, 0.9, sin(uv.y * 140.0 + seed * 20.0)) * 0.8;
  return vec3(d * 0.7, max(drop, beads));
}
vec3 scene(vec2 uv, vec2 p) {
  float t = uTime;
  vec2 cu = coverFit(uv);
  vec3 a = dropLayer(uv * vec2(uRes.x / uRes.y, 1.0), t, 14.0);
  vec3 b = dropLayer(uv * vec2(uRes.x / uRes.y, 1.0) + 3.7, t * 1.3, 28.0);
  vec3 r = runner(uv, t);
  float m = max(max(a.z, b.z * 0.8), r.z);
  vec2 n = a.xy * a.z + b.xy * b.z * 0.6 + r.xy * r.z;
  vec3 bg = cover(cu, 6.5) * 0.55;
  vec3 seen = cover(cu - n * 0.06, 2.0) * 0.95;
  vec3 col = mix(bg, seen, m);
  col += m * 0.08 * (1.0 - n.y);           // блик в капле
  col += uPulse * 0.06 * vec3(0.8, 0.85, 1.0); // басовый «всполох»
  return col;
}`,
  },
  {
    id: "blackhole",
    name: "Чёрная дыра",
    body: `
vec3 stars(vec2 p) {
  vec2 g = p * 60.0; vec2 id = floor(g); vec2 st = fract(g) - 0.5; vec2 o = hash2(id) - 0.5;
  float s = smoothstep(0.08, 0.0, length(st - o * 0.7)) * step(0.85, hash(id + 3.1));
  return vec3(s) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(id) * 30.0));
}
vec3 scene(vec2 uv, vec2 p) {
  float r = length(p);
  float rs = 0.13 + uBass * 0.012;                    // горизонт событий
  // гравитационная линза: свет звёзд гнётся вокруг дыры
  vec2 lp = p - normalize(p) * (rs * rs * 1.2) / max(r, 1e-3);
  vec3 col = stars(lp) * 0.8 + uBg * 0.25;
  // аккреционный диск: наклонённое кольцо
  float tilt = 0.28;
  vec2 dp = vec2(p.x, p.y / tilt);
  float dr = length(dp); float ang = atan(dp.y, dp.x);
  float ring = smoothstep(rs * 1.4, rs * 2.0, dr) * smoothstep(rs * 4.6, rs * 2.4, dr);
  float swirl = fbm(vec2(ang * 3.0 - uTime * 1.2, dr * 9.0 - uTime * 0.4));
  vec3 disk = palette(dr * 1.5 - uTime * 0.05) * (0.6 + 1.4 * swirl) * ring;
  // доплер: сторона, летящая к нам, ярче
  disk *= 0.6 + 0.8 * (0.5 + 0.5 * cos(ang));
  float front = step(0.0, p.y) * 0.0 + step(p.y, 0.0);
  // задняя часть диска видна над дырой (её свет огибает дыру)
  vec2 bp = vec2(p.x, (p.y - rs * 0.9) / 0.55);
  float br = length(bp);
  float back = smoothstep(rs * 1.05, rs * 1.25, br) * smoothstep(rs * 2.4, rs * 1.4, br) * step(0.0, p.y);
  vec3 backc = palette(br * 2.0 + uTime * 0.03) * back * (0.6 + 0.8 * fbm(vec2(atan(bp.y, bp.x) * 4.0 + uTime, br * 8.0)));
  col += backc * 1.1;
  float hole = smoothstep(rs, rs * 0.96, r);
  col = mix(col, vec3(0.0), hole);
  col += disk * (front + (1.0 - front) * (1.0 - hole)) * 1.2;
  // фотонное кольцо
  col += uC1 * smoothstep(0.012, 0.0, abs(r - rs * 1.02)) * (1.2 + uPulse * 2.0);
  col += uC2 * 0.25 * smoothstep(0.6, 0.0, r) * uEnergy;
  return col;
}`,
  },
  {
    id: "warp",
    name: "Полёт сквозь звёзды",
    body: `
vec3 layer(vec2 p, float depth, float seed) {
  vec2 g = p; vec2 id = floor(g); vec2 st = fract(g) - 0.5; vec2 o = hash2(id + seed) - 0.5;
  float d = length(st - o * 0.8);
  float b = smoothstep(0.06 + 0.05 * depth, 0.0, d) * step(0.3, hash(id + seed * 1.7));
  return mix(vec3(1.0), palette(hash(id) * 0.6 + seed), 0.6) * b;
}
vec3 scene(vec2 uv, vec2 p) {
  vec3 col = uBg * 0.15;
  float speed = 0.05 + uEnergy * 0.35 + uPulse * 0.15;
  for (float i = 0.0; i < 1.0; i += 1.0 / 7.0) {
    float depth = fract(i + uTime * speed);
    float scale = mix(18.0, 0.6, depth);
    float fade = depth * smoothstep(1.0, 0.85, depth);
    // растяжение звёзд по радиусу — «варп»
    vec2 q = p * scale;
    float r = length(q); vec2 dir = q / max(r, 1e-3);
    q -= dir * min(r, 1.0) * (0.25 + uEnergy) * 0.7;
    col += layer(q + i * 453.2, depth, i) * fade * 3.2;
  }
  col += uC1 * 0.12 * smoothstep(0.7, 0.0, length(p)) * (0.5 + uBass);
  return col;
}`,
  },
  {
    id: "aurora",
    name: "Северное сияние",
    scale: 0.75,
    body: `
vec3 scene(vec2 uv, vec2 p) {
  vec3 sky = mix(uBg * 0.2, vec3(0.01, 0.015, 0.04), uv.y);
  vec2 g = uv * vec2(uRes.x / uRes.y, 1.0) * 80.0;
  sky += vec3(step(0.995, hash(floor(g)))) * 0.7 * uv.y;
  vec3 col = sky;
  for (float i = 0.0; i < 4.0; i++) {
    float x = uv.x * (1.5 + i * 0.4) + uTime * (0.02 + i * 0.01);
    float wave = fbm(vec2(x * 1.5, i * 3.1 + uTime * 0.05)) * 0.35;
    float base = 0.32 + i * 0.06 + wave;
    float h = uv.y - base;
    float curtain = smoothstep(0.0, 0.03, h) * exp(-h * (3.2 - uEnergy * 1.5));
    float rays = 0.55 + 0.45 * noise(vec2(x * 30.0, uTime * 0.6 + i));
    col += palette(i * 0.25 + uv.x * 0.3) * curtain * rays * (0.55 + uMid * 0.8);
  }
  // горы: два слоя силуэтов
  float m1 = 0.18 + fbm(vec2(uv.x * 3.0, 1.0)) * 0.18;
  float m2 = 0.1 + fbm(vec2(uv.x * 6.0 + 4.0, 2.0)) * 0.12;
  col = mix(col, uBg * 0.15 + vec3(0.01), smoothstep(m1 + 0.003, m1, uv.y));
  col = mix(col, vec3(0.005), smoothstep(m2 + 0.003, m2, uv.y));
  return col;
}`,
  },
  {
    id: "ocean",
    name: "Ночной океан",
    scale: 0.8,
    body: `
vec3 scene(vec2 uv, vec2 p) {
  float hz = 0.52;
  vec2 moonP = vec2(0.25, 0.28);
  vec3 sky = mix(uBg * 0.35, vec3(0.0, 0.01, 0.03), smoothstep(hz, 1.0, uv.y));
  float md = length(p - moonP);
  sky += uC1 * smoothstep(0.075, 0.07, md) * 1.2 + uC1 * 0.25 * exp(-md * 6.0);
  vec2 g = uv * vec2(uRes.x / uRes.y, 1.0) * 90.0;
  sky += vec3(step(0.996, hash(floor(g)))) * smoothstep(hz, 1.0, uv.y);
  if (uv.y > hz) return sky;
  // вода: перспектива — чем ниже, тем ближе
  float z = 0.06 / max(hz - uv.y, 1e-3);
  vec2 w = vec2(p.x * z * 2.0, z);
  float amp = 0.4 + uBass * 1.4;
  float h = 0.0;
  h += sin(w.x * 3.0 + w.y * 2.0 - uTime * 1.2) * 0.5;
  h += sin(w.x * 7.0 - w.y * 3.0 + uTime * 1.7) * 0.25;
  h += noise(w * 4.0 + uTime * 0.6) * 0.5;
  h *= amp;
  vec3 water = mix(uBg * 0.25, uC2 * 0.25, 0.5 + 0.5 * h) * (0.4 + 0.6 * (uv.y / hz));
  // лунная дорожка
  float path = exp(-abs(p.x - moonP.x) * (14.0 - uv.y * 10.0)) * smoothstep(0.3, 1.0, 0.5 + 0.5 * h);
  water += uC1 * path * 0.9;
  water += vec3(smoothstep(0.85, 1.0, h / amp)) * 0.1;
  return water;
}`,
  },
  {
    id: "synthwave",
    name: "Синтвейв",
    body: `
vec3 scene(vec2 uv, vec2 p) {
  float hz = 0.42;
  vec3 col = mix(uC3 * 0.35, uBg * 0.1, smoothstep(hz, 1.0, uv.y));
  // солнце с полосками
  vec2 sp = p - vec2(0.0, 0.18);
  float sr = 0.26 + uPulse * 0.01;
  float sun = smoothstep(sr, sr - 0.005, length(sp));
  float stripes = step(0.0, sin((sp.y) * 120.0 - uTime * 2.0)) + step(0.06, sp.y);
  col = mix(col, mix(uC1, uC2, smoothstep(-0.25, 0.25, sp.y)) * 1.3, sun * clamp(stripes, 0.0, 1.0));
  col += uC1 * 0.25 * exp(-length(sp) * 3.0);
  // горы = спектр
  float x = uv.x;
  float mh = hz + 0.04 + band(abs(x - 0.5) * 1.6) * 0.18 * (0.6 + 0.4 * noise(vec2(x * 10.0, 1.0))) + fbm(vec2(x * 5.0, 3.0)) * 0.05;
  if (uv.y < mh && uv.y > hz) col = mix(uBg * 0.08, uC2 * 0.35, smoothstep(hz, mh, uv.y)) + uC1 * smoothstep(mh - 0.004, mh, uv.y) * 0.8;
  // сетка пола
  if (uv.y < hz) {
    float z = 0.12 / max(hz - uv.y, 1e-3);
    vec2 gp = vec2(p.x * z * 2.0, z + uTime * (0.8 + uEnergy * 2.5));
    vec2 gl = abs(fract(gp) - 0.5);
    float line = smoothstep(0.03 * z, 0.0, min(gl.x, gl.y) - 0.0);
    float fade = smoothstep(0.0, hz, uv.y) * 0.2 + 0.8 * (1.0 - smoothstep(0.0, hz, hz - uv.y));
    col = uBg * 0.05 + mix(uC1, uC3, 0.5) * line * (1.0 - uv.y / hz * 0.2) * (0.8 + uPulse) * fade;
  }
  return col;
}`,
  },
  {
    id: "fire",
    name: "Костёр",
    scale: 0.75,
    body: `
vec3 scene(vec2 uv, vec2 p) {
  vec2 q = vec2(p.x * 1.4, uv.y);
  float t = uTime * 1.6;
  float n = fbm(vec2(q.x * 3.0, q.y * 3.5 - t)) + 0.5 * fbm(vec2(q.x * 7.0, q.y * 6.0 - t * 1.5));
  float tongues = (noise(vec2(q.x * 9.0, q.y * 2.0 - t * 1.4)) - 0.5) * 0.35 * q.y;
  float shape = (1.0 - q.y * 1.45) - abs(q.x + tongues) * (2.4 - q.y * 1.2);
  float f = clamp(shape * 1.8 + n * 1.1 - 0.95 + uBass * 0.3, 0.0, 1.0);
  vec3 hot = mix(uC1, vec3(1.0, 0.95, 0.8), 0.45);
  vec3 col = mix(uBg * 0.05, mix(uC3, uC1, f), smoothstep(0.0, 0.35, f)) * smoothstep(0.0, 0.2, f);
  col = mix(col, hot, smoothstep(0.65, 1.0, f));
  // искры летят вверх, на ударах — больше
  for (float i = 0.0; i < 18.0; i++) {
    float s = hash(vec2(i, 3.0));
    float life = fract(uTime * (0.15 + s * 0.2) + s);
    vec2 sp = vec2((s - 0.5) * 0.5 + sin(life * 6.0 + i) * 0.05, life * 1.1 - 0.05);
    float d = length(vec2(p.x, uv.y) - sp);
    col += uC1 * smoothstep(0.006 + uPulse * 0.004, 0.0, d) * (1.0 - life) * 2.0;
  }
  // угли и отблеск
  col += uC1 * 0.15 * exp(-length(vec2(p.x, uv.y + 0.1)) * 3.0);
  return col;
}`,
  },
  {
    id: "lava",
    name: "Лава-лампа",
    body: `
vec3 scene(vec2 uv, vec2 p) {
  float field = 0.0; vec3 tint = vec3(0.0);
  for (float i = 0.0; i < 7.0; i++) {
    vec2 c = vec2(sin(uTime * (0.11 + i * 0.03) + i * 1.7) * 0.55, sin(uTime * (0.07 + i * 0.02) + i * 2.3) * 0.38);
    float r = 0.11 + 0.05 * sin(i * 3.1) + uBass * 0.03;
    float v = r * r / max(dot(p - c, p - c), 1e-4);
    field += v; tint += palette(i / 7.0) * v;
  }
  tint /= max(field, 1e-3);
  float blob = smoothstep(0.95, 1.05, field);
  float glow = smoothstep(0.2, 1.0, field) * 0.35;
  vec3 col = uBg * 0.12 + tint * glow;
  col = mix(col, tint * (1.0 + 0.4 * uPulse), blob);
  col += vec3(1.0) * smoothstep(1.6, 3.0, field) * 0.12;
  return col;
}`,
  },
  {
    id: "dots",
    name: "Обложка из точек",
    body: `
vec3 scene(vec2 uv, vec2 p) {
  float cells = 46.0;
  vec2 g = p * cells; vec2 id = floor(g) + 0.5; vec2 st = fract(g) - 0.5;
  vec2 cp = id / cells;
  float dist = length(cp);
  // волна от центра на каждом ударе
  float wave = sin(dist * 18.0 - uTime * 4.0) * 0.5 + 0.5;
  vec2 cuv = cp * 0.92 + 0.5;
  vec3 c = cover(cuv, 1.5);
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  float r = 0.12 + 0.36 * lum * (0.85 + 0.3 * wave * (0.3 + uEnergy)) + uPulse * 0.06;
  float inside = step(abs(cp.x), 0.55) * step(abs(cp.y), 0.55);
  float dot_ = smoothstep(r, r - 0.08, length(st));
  vec3 col = uBg * 0.08 + c * 1.15 * dot_ * inside;
  // точки за пределами обложки — рассыпаются и гаснут
  float outer = (1.0 - inside) * smoothstep(1.0, 0.55, max(abs(cp.x), abs(cp.y)));
  col += palette(dist + uTime * 0.03) * dot_ * outer * 0.25 * wave;
  return col;
}`,
  },
  {
    id: "jelly",
    name: "Светящиеся медузы",
    scale: 0.8,
    body: `
vec3 jelly(vec2 p, vec2 c, float s, float seed, vec3 tint) {
  vec2 q = (p - c) / s;
  float pulse = 0.5 + 0.5 * sin(uTime * 1.6 + seed * 6.0);
  q.x *= 1.0 + 0.15 * pulse;
  float bell = smoothstep(0.03, 0.0, abs(length(q * vec2(1.0, 1.4)) - 0.5)) * step(0.0, q.y);
  float fill = smoothstep(0.5, 0.0, length(q * vec2(1.0, 1.4))) * step(0.0, q.y) * 0.35;
  float tent = 0.0;
  for (float i = -2.0; i <= 2.0; i++) {
    float x = i * 0.16 + sin(q.y * 6.0 + uTime * 2.0 + i + seed) * 0.05 * (-q.y);
    tent += smoothstep(0.02, 0.0, abs(q.x - x)) * step(q.y, 0.0) * smoothstep(-1.4, 0.0, q.y);
  }
  return tint * (bell * 2.2 + fill * 1.6 + tent * 0.9) * (0.7 + 0.6 * pulse) + tint * 0.12 * smoothstep(1.2, 0.0, length(q));
}
vec3 scene(vec2 uv, vec2 p) {
  vec3 col = mix(vec3(0.0, 0.01, 0.03), uBg * 0.3, uv.y);
  // пылинки в воде
  vec2 g = (uv + vec2(0.0, -uTime * 0.01)) * vec2(uRes.x / uRes.y, 1.0) * 50.0;
  col += vec3(smoothstep(0.08, 0.0, length(fract(g) - 0.5)) * step(0.93, hash(floor(g)))) * 0.25;
  for (float i = 0.0; i < 7.0; i++) {
    float s = hash(vec2(i, 9.0));
    float y = fract(uTime * (0.012 + s * 0.01) + s) * 1.8 - 0.9;
    vec2 c = vec2((s - 0.5) * 1.6 + sin(uTime * 0.2 + i) * 0.08, y);
    col += jelly(p, c, 0.16 + s * 0.14 + uBass * 0.03, i, palette(i / 7.0 + 0.1));
  }
  return col;
}`,
  },
  {
    id: "turntable",
    name: "Проигрыватель",
    body: `
vec3 scene(vec2 uv, vec2 p) {
  vec3 col = mix(uBg * 0.25, uBg * 0.1, length(p));
  float R = 0.42;
  float r = length(p);
  float a = atan(p.y, p.x) - uSpin;
  // пластинка
  if (r < R) {
    float grooves = 0.5 + 0.5 * sin(r * 700.0);
    vec3 vinyl = vec3(0.04) + grooves * 0.025 + palette(a / 6.283 + r) * 0.06;
    float sheen = pow(abs(cos(atan(p.y, p.x) * 1.0 + 0.8)), 24.0) * 0.12;
    vinyl += sheen;
    // наклейка — обложка, крутится вместе с пластинкой
    if (r < R * 0.36) {
      vec2 lp = vec2(cos(a), sin(a)) * r / (R * 0.72) + 0.5;
      vinyl = cover(lp, 0.5);
    }
    col = vinyl;
    col = mix(col, vec3(0.0), smoothstep(R - 0.003, R, r));
  }
  // кольцо спектра вокруг
  float ang = atan(p.y, p.x) / 6.283 + 0.5;
  float b = band(abs(ang - 0.5) * 2.0);
  float bar = smoothstep(0.004, 0.0, abs(fract(ang * 96.0) - 0.5) / 96.0 - 0.002);
  col += mix(uC1, uC2, ang) * bar * step(R + 0.01, r) * step(r, R + 0.02 + b * 0.18);
  // тонарм
  vec2 pivot = vec2(0.6, 0.38);
  float arm = mix(-2.35, -2.2, uTime * 0.0 + 0.5);
  vec2 dir = vec2(cos(arm), sin(arm));
  vec2 rel = p - pivot;
  float along = dot(rel, dir);
  float across = abs(dot(rel, vec2(-dir.y, dir.x)));
  col = mix(col, vec3(0.75), smoothstep(0.008, 0.004, across) * step(0.0, along) * step(along, 0.5));
  col = mix(col, vec3(0.5), smoothstep(0.03, 0.025, length(rel)));
  return col;
}`,
  },
];

export const sceneById = (id: string) => SCENES.find((s) => s.id === id) ?? SCENES[0]!;
