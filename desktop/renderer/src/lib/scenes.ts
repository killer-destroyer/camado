// Сцены заставки: каждая — фрагментный шейдер (рисует картинку целиком на видеокарте).
// Всё в цветах обложки (uC1–uC3, uBg) и в такт музыке (uBass, uMid, uHigh, uEnergy, uPulse, uBands).

export interface Scene {
  id: string;
  name: string;
  /** Тело шейдера: функция vec3 scene(vec2 uv, vec2 p), uv — 0…1, p — центр 0, высота экрана 1. */
  body: string;
  /** Рисовать в уменьшенном разрешении (тяжёлые сцены). */
  scale?: number;
  /** Тяжёлая для видеокарты: если она однажды упала, такие сцены больше не показываем. */
  heavy?: boolean;
}

export const SHADER_HEAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime, uBass, uMid, uHigh, uEnergy, uPulse, uSpin, uHasCover, uImgAspect, uFx, uOwn, uTravel, uWarp;
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
    scale: 0.42,
    heavy: true,
    body: `
// Настоящая трассировка лучей: свет летит от камеры и гнётся притяжением дыры (как в «Интерстелларе»).
// Единицы — радиус горизонта = 1. Диск лежит в плоскости y = 0, светится сам и крутится.
vec3 sky(vec3 d) {
  // звёзды на сфере неба + полоса Млечного Пути
  vec2 s = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 3.0; i++) {
    vec2 g = s * (90.0 + i * 70.0); vec2 id = floor(g); vec2 st = fract(g) - 0.5;
    vec2 o = hash2(id + i * 17.0) - 0.5;
    float h = hash(id + i * 3.7);
    float star = smoothstep(0.12 - i * 0.025, 0.0, length(st - o * 0.7)) * step(0.9 - i * 0.03, h) * (1.8 - i * 0.4);
    col += star * mix(vec3(1.0, 0.92, 0.85), vec3(0.8, 0.88, 1.0), hash(id + 9.0)) * (0.6 + 0.4 * sin(uTime * 1.5 + h * 40.0));
  }
  float band = exp(-pow((d.y - 0.35 * d.x + 0.1) * 3.2, 2.0));
  float dust = fbm(s * 5.0 + 3.0);
  col += mix(uBg * 1.2 + 0.05, vec3(0.42, 0.38, 0.36), 0.55) * band * dust * dust * 0.9;
  col -= vec3(0.06) * band * smoothstep(0.55, 0.75, fbm(s * 11.0));
  return max(col, 0.0);
}
vec3 diskColor(vec3 hit, vec3 dir, out float a) {
  float r = length(hit.xz);
  float inner = 2.6, outer = 13.0;
  a = smoothstep(inner, inner + 0.25, r) * smoothstep(outer, outer * 0.45, r);
  if (a <= 0.0) return vec3(0.0);
  float ang = atan(hit.z, hit.x);
  float spin = uTime * 0.9 * pow(inner / r, 1.5);          // внутри крутится быстрее (Кеплер)
  float lr = log(r);
  // струи газа: вытянутые по кругу волокна
  float fib = fbm(vec2(lr * 9.0, (ang + spin) * 2.0)) * 0.7 + fbm(vec2(lr * 20.0, (ang + spin * 1.3) * 5.0)) * 0.6;
  fib = pow(fib, 1.8) * 1.6;
  float dens = a * (0.35 + fib) * (0.8 + 0.6 * smoothstep(5.0, inner, r));
  // доплер: сторона, летящая к нам, ярче и «горячее»
  vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
  float dop = 1.0 + 0.6 * dot(vel, -dir) * sqrt(inner / r);
  dop = max(dop, 0.15);
  float heat = smoothstep(outer * 0.7, inner, r);             // внутри горячее — ближе к белому
  vec3 tint = mix(uC2, uC1, smoothstep(0.2, 0.8, heat));
  vec3 c = mix(tint * 0.9, vec3(1.0, 0.97, 0.92), pow(heat, 2.2) * 0.85);
  c *= dens * pow(dop, 3.0) * (0.75 + uBass * 0.35 + uPulse * 0.45);
  a = clamp(dens * 1.6, 0.0, 1.0);
  return c;
}
vec3 scene(vec2 uv, vec2 p) {
  // камера чуть выше плоскости диска, медленно покачивается
  float t = uTime * 0.03;
  vec3 ro = vec3(sin(t) * 3.0, 2.1 + sin(t * 1.7) * 0.35, -30.0);
  vec3 fw = normalize(-ro + vec3(0.0, 0.2, 0.0));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  // лёгкий наклон кадра, как на постере
  float roll = -0.12;
  vec2 pp = p - vec2(0.0, 0.05);
  vec2 q = vec2(pp.x * cos(roll) - pp.y * sin(roll), pp.x * sin(roll) + pp.y * cos(roll));
  vec3 dir = normalize(fw * 1.7 + rt * q.x + up * q.y);
  vec3 dir0 = dir;
  vec3 pos = ro + dir * hash(gl_FragCoord.xy) * 1.0;
  vec3 h = cross(pos, dir); float h2 = dot(h, h);
  vec3 col = vec3(0.0); float trans = 1.0; bool fell = false;
  for (int i = 0; i < 170; i++) {
    float r2 = dot(pos, pos);
    if (r2 < 1.0) { fell = true; break; }
    float r = sqrt(r2);
    float dt = clamp(0.11 * r, 0.04, 1.6);
    // шаг «через середину» — точнее, без колец на фоне
    vec3 mid = pos + dir * dt * 0.5;
    float m2 = dot(mid, mid);
    vec3 acc = -1.5 * h2 * mid / (m2 * m2 * sqrt(m2));
    vec3 nd = normalize(dir + acc * dt);
    vec3 np = pos + (dir + nd) * 0.5 * dt;
    dir = nd;
    if (pos.y * np.y < 0.0) {
      vec3 hit = mix(pos, np, pos.y / (pos.y - np.y));
      float a; vec3 dc = diskColor(hit, dir, a);
      col += dc * trans; trans *= 1.0 - a;
      if (trans < 0.02) break;
    }
    // лёгкая дымка у диска — даёт мягкое свечение, как на фото
    float dr = length(pos.xz);
    col += trans * mix(uC2, uC1, smoothstep(12.0, 3.0, dr)) * 0.012 * dt * exp(-abs(pos.y) * 1.2) * smoothstep(16.0, 3.0, dr) * smoothstep(1.5, 3.0, dr) * (0.8 + uEnergy);
    pos = np;
    if (r2 > 2500.0 && dot(pos, dir) > 0.0) break;
  }
  // звёзды гнём чуть слабее, чем по физике, — иначе далёкие звёзды вытягиваются в чёрточки
  if (!fell) col += sky(normalize(mix(dir0, dir, 0.45))) * trans;
  // мягкое свечение вокруг (как засветка объектива)
  float rr = length(p);
  col += uC1 * 0.05 * exp(-rr * 4.0) * (0.6 + uEnergy);
  col = col / (1.0 + col * 0.8);
  return pow(col, vec3(1.08));                         // мягко «сжимаем» пересветы
}`,
  },
  {
    id: "picture",
    name: "Своя картинка",
    body: `
// Своя картинка (или обложка песни) во весь экран: медленно «плывёт» и приближается, пульсирует на басах.
// Поверх — на выбор: ничего, светящиеся пылинки или капли дождя на стекле.
vec2 picFit(vec2 uv) {
  float S = uRes.x / uRes.y, A = max(uImgAspect, 0.05);
  float k = max(1.0, S / A);
  vec2 t = vec2((uv.x - 0.5) * S / (A * k), (uv.y - 0.5) / k);
  float z = 1.07 + 0.035 * sin(uTime * 0.045) + uPulse * 0.012;
  vec2 pan = vec2(sin(uTime * 0.031), cos(uTime * 0.026)) * 0.025;
  return t / z + 0.5 + pan;
}
vec3 drops(vec2 uv, float t, float size) {
  vec2 g = uv * size; vec2 id = floor(g); vec2 st = fract(g) - 0.5;
  vec2 rnd = hash2(id);
  vec2 c = (rnd - 0.5) * 0.7;
  float life = fract(t * (0.05 + rnd.x * 0.1) + rnd.y);
  float r = (0.12 + rnd.y * 0.18) * smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.7, life);
  vec2 d = st - c; float m = smoothstep(r, r * 0.55, length(d));
  return vec3(d / max(r, 1e-3), m);
}
vec3 scene(vec2 uv, vec2 p) {
  vec2 tuv = picFit(uv);
  vec3 col;
  if (uOwn < 0.5) {
    // своей картинки нет — обложка песни: размытая на фоне и чёткая «карточка» над текстом
    vec3 bg = cover(tuv, 7.5) * 0.6;
    float sz = 0.42 + uPulse * 0.006;
    vec2 cc = vec2(0.0, 0.17 + sin(uTime * 0.4) * 0.006);
    vec2 d = (p - cc) / sz;
    vec2 q = abs(d) - 0.5 + 0.04;
    float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.04;     // скруглённый квадрат
    float inside = smoothstep(0.004, -0.004, box);
    float shadow = smoothstep(0.12, -0.02, box) * 0.6;
    col = bg * (1.0 - shadow);
    col = mix(col, cover(d + 0.5, 0.0), inside);
    col += vec3(1.0) * 0.08 * inside * smoothstep(0.3, -0.5, d.x + d.y);  // лёгкий блик
    return col;
  }
  if (uFx > 1.5) {
    // капли: за стеклом картинка размыта, в каплях — чёткая
    vec2 au = uv * vec2(uRes.x / uRes.y, 1.0);
    vec3 a = drops(au, uTime, 12.0);
    vec3 b = drops(au + 3.7, uTime * 1.3, 24.0);
    float m = max(a.z, b.z * 0.8);
    vec2 n = a.xy * a.z + b.xy * b.z * 0.6;
    col = mix(cover(tuv, 4.0) * 0.7, cover(tuv - n * 0.05, 0.0), m);
    col += m * 0.06 * (1.0 - n.y);
  } else {
    col = cover(tuv, 0.0);
  }
  if (uFx > 0.5 && uFx < 1.5) {
    // пылинки: мягкие круги света медленно поднимаются, на ударах ярче
    for (float k = 0.0; k < 3.0; k++) {
      vec2 g = (uv + vec2(sin(uTime * 0.07 + k) * 0.03, -uTime * (0.01 + k * 0.006))) * vec2(uRes.x / uRes.y, 1.0) * (6.0 + k * 5.0);
      vec2 id = floor(g);
      vec2 o = hash2(id + k * 7.0) - 0.5;
      float d = length(fract(g) - 0.5 - o * 0.6);
      float on = step(0.55, hash(id + k * 3.0));
      float tw = 0.5 + 0.5 * sin(uTime * (0.6 + k * 0.3) + hash(id) * 20.0);
      col += mix(uC1, vec3(1.0, 0.95, 0.85), 0.5) * smoothstep(0.12 - k * 0.03, 0.0, d) * on * tw * (0.25 + 0.35 * uEnergy + uPulse * 0.3);
    }
  }
  // чуть затемняем там, где текст песни и название, — чтобы читалось на любой картинке
  col *= 1.0 - 0.35 * exp(-pow((uv.y - 0.42) * 3.5, 2.0));
  col *= 1.0 - 0.3 * smoothstep(0.8, 1.0, uv.y);
  return col;
}`,
  },
  {
    id: "warp",
    name: "Полёт сквозь звёзды",
    body: `
// Полёт сквозь звёзды: звёзды летят навстречу и вытягиваются в линии, сзади — туманность.
vec3 scene(vec2 uv, vec2 p) {
  float r = length(p); float ang = atan(p.y, p.x);
  // uTravel — пройденный путь (копится плавно по кадрам), uWarp — текущая скорость: музыка лишь слегка подгоняет
  float speed = uWarp;
  // туманность в цветах песни, медленно закручивается
  vec2 np = p * 1.6;
  float n1 = fbm(np * 1.2 + vec2(uTime * 0.02, 0.0) + fbm(np * 2.0 - uTime * 0.03));
  float n2 = fbm(np * 2.5 - vec2(0.0, uTime * 0.015) + 7.0);
  vec3 col = uBg * 0.12;
  col += uC2 * pow(n1, 2.5) * 0.55 + uC1 * pow(n2, 3.0) * 0.4;
  col *= 0.6 + 0.4 * smoothstep(0.9, 0.0, r);
  // звёзды-полоски: в полярных координатах каждая звезда — отрезок вдоль луча из центра
  for (float k = 0.0; k < 3.0; k++) {
    float rays = 140.0 + k * 90.0;
    float a = (ang / 6.2832 + 0.5) * rays;
    float id = floor(a);
    float h = hash(vec2(id, k * 13.0));
    float h2 = hash(vec2(id, k * 13.0 + 5.0));
    // звезда «летит» от центра: позиция растёт ускоряясь
    float z = fract(h2 + uTravel * (0.08 + h * 0.06) * (1.0 + k * 0.4));
    float pos = pow(z, 2.2) * 1.3;
    float len = (0.008 + speed * 0.05) * (0.2 + pos * 1.4);
    float along = smoothstep(pos - len, pos, r) * smoothstep(pos + 0.004, pos, r);
    float across = smoothstep(0.32, 0.0, abs(fract(a) - 0.5 - (h - 0.5) * 0.3));
    float on = step(0.45, h);
    vec3 sc = mix(vec3(1.0), palette(h + k * 0.2), 0.35 + 0.2 * k);
    col += sc * along * across * on * smoothstep(0.0, 0.3, z) * (1.6 - k * 0.3);
  }
  // яркое ядро впереди
  col += mix(uC1, vec3(1.0), 0.5) * 0.25 * exp(-r * 9.0) * (0.6 + uBass);
  return col;
}`,
  },
  {
    id: "aurora",
    name: "Северное сияние",
    scale: 0.75,
    body: `
// Северное сияние: высокие «занавеси» света над горами, отражение в озере, звёзды.
float curtainAt(vec2 uv, float i) {
  float x = uv.x * (1.1 + i * 0.35) + uTime * (0.012 + i * 0.006);
  float fold = fbm(vec2(x * 1.3, i * 3.1 + uTime * 0.04));       // где проходит нижний край
  float base = 0.3 + i * 0.06 + (fold - 0.5) * 0.3;
  float h = uv.y - base;
  float edge = smoothstep(-0.005, 0.02, h);                      // резкий нижний край
  float fall = exp(-max(h, 0.0) * (1.8 + i * 0.5 - uEnergy * 0.6)); // мягко гаснет вверх
  float rays = 0.45 + 0.55 * pow(noise(vec2(x * 40.0 + fold * 6.0, uTime * 0.4 + i)), 1.5);
  float edgeGlow = exp(-max(h, 0.0) * 35.0) * edge * 0.8;        // яркая кромка снизу
  float present = smoothstep(0.2, 0.6, noise(vec2(x * 0.9 + i * 5.0, uTime * 0.03 + i)));  // занавеси местами, с просветами
  return (edge * fall * rays + edgeGlow) * present;
}
vec3 aurora(vec2 uv) {
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 4.0; i++) {
    float c = curtainAt(uv, i);
    // низ занавеси — цвет песни, верх — второй цвет (как зелёный → фиолетовый у настоящего)
    vec3 lo = mix(uC1, vec3(0.3, 1.0, 0.65), 0.15);
    vec3 hi = mix(uC2, uC3, 0.5);
    col += mix(lo, hi, smoothstep(0.45, 0.95, uv.y)) * c * (0.75 - i * 0.12) * (0.8 + uMid * 0.6);
  }
  return col;
}
vec3 scene(vec2 uv, vec2 p) {
  float lake = 0.2;                                             // линия берега
  vec2 su = uv;
  bool refl = uv.y < lake;
  if (refl) su.y = 2.0 * lake - uv.y + sin(uv.x * 80.0 + uTime) * 0.002 * (lake - uv.y) * 20.0;
  vec3 sky = mix(uBg * 0.25 + vec3(0.0, 0.01, 0.02), vec3(0.003, 0.005, 0.015), smoothstep(lake, 1.0, su.y));
  vec2 g = su * vec2(uRes.x / uRes.y, 1.0) * 85.0;
  float st = smoothstep(0.14, 0.0, length(fract(g) - 0.5 - (hash2(floor(g)) - 0.5) * 0.6)) * step(0.97, hash(floor(g)));
  sky += vec3(st) * 0.8 * (0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(g)) * 30.0));
  vec3 col = sky + aurora(su);
  // горы: дальние светлее, ближние — силуэт
  float m1 = lake + 0.06 + fbm(vec2(su.x * 3.0, 1.0)) * 0.16;
  float m2 = lake + 0.01 + fbm(vec2(su.x * 7.0 + 4.0, 2.0)) * 0.09;
  col = mix(col, uBg * 0.1 + vec3(0.01, 0.012, 0.02), smoothstep(m1 + 0.002, m1, su.y));
  col = mix(col, vec3(0.004, 0.006, 0.01), smoothstep(m2 + 0.002, m2, su.y));
  if (refl) col *= 0.6 * (0.85 + 0.15 * noise(vec2(uv.x * 200.0, uv.y * 30.0 + uTime)));
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
// Огонь: цвета как у настоящего пламени (от тёмно-красного к белому), чуть тонированные под песню.
vec3 flameRamp(float f) {
  vec3 c = mix(vec3(0.0), vec3(0.55, 0.05, 0.02), smoothstep(0.0, 0.25, f));
  c = mix(c, vec3(1.0, 0.35, 0.05), smoothstep(0.2, 0.5, f));
  c = mix(c, vec3(1.0, 0.75, 0.25), smoothstep(0.45, 0.75, f));
  c = mix(c, vec3(1.0, 0.97, 0.85), smoothstep(0.75, 1.0, f));
  return c;
}
float flame(vec2 q, float t) {
  // языки пламени: шум «уносится» вверх и закручивается
  vec2 w = vec2(fbm(q * 3.0 + vec2(0.0, -t * 1.2)), fbm(q * 3.0 + vec2(5.2, -t * 1.4)));
  float n = fbm(q * vec2(5.0, 3.0) + w * 1.6 + vec2(0.0, -t * 2.6));
  float y = q.y + 0.42;                                   // 0 — у поленьев
  float width = mix(0.3, 0.02, smoothstep(0.0, 0.8, y));
  float body = 1.0 - abs(q.x + (w.x - 0.5) * 0.35 * y) / width;
  float v = body * 0.85 + (n - 0.5) * 1.9 - y * 0.55 + 0.05 + uBass * 0.2;
  return smoothstep(0.0, 1.0, clamp(v, 0.0, 1.0)) * smoothstep(-0.07, 0.06, y) * smoothstep(0.9, 0.55, y);
}
vec3 scene(vec2 uv, vec2 p) {
  float t = uTime;
  vec2 q = p * vec2(1.0, 1.0);
  float f = flame(q, t);
  float f2 = flame(q * vec2(1.6, 1.25) + vec2(0.2, -0.1), t * 1.2 + 4.0) * 0.75;
  float f3 = flame(q * vec2(1.7, 1.35) + vec2(-0.24, -0.12), t * 1.1 + 9.0) * 0.7;  // второй, меньший огонь
  float fire = max(f, max(f2, f3));
  vec3 tint = mix(vec3(1.0), uC1 * 1.4 + 0.3, 0.22);     // чуть-чуть цвета песни
  vec3 col = flameRamp(pow(fire, 0.9)) * tint * smoothstep(0.0, 0.08, fire) * 1.05;
  // тёплый отсвет на фоне и на земле
  float glowD = length((p - vec2(0.0, -0.32)) * vec2(0.8, 1.2));
  col += vec3(1.0, 0.35, 0.08) * tint * 0.22 * exp(-glowD * 3.5) * (0.85 + 0.3 * noise(vec2(t * 5.0, 0.0)) + uPulse * 0.5);
  // земля
  float ground = smoothstep(-0.4, -0.47, p.y);
  col = mix(col, vec3(0.02, 0.012, 0.01) + vec3(1.0, 0.3, 0.05) * 0.18 * exp(-abs(p.x) * 3.0), ground * (1.0 - fire));
  // поленья: два тёмных бревна крест-накрест, тлеют снизу
  for (float s = -1.0; s <= 1.0; s += 2.0) {
    vec2 lp = p - vec2(0.0, -0.43);
    float a = s * 0.22;
    vec2 rp = vec2(lp.x * cos(a) - lp.y * sin(a), lp.x * sin(a) + lp.y * cos(a));
    float log_ = smoothstep(0.03, 0.024, abs(rp.y)) * smoothstep(0.3, 0.27, abs(rp.x));
    float ember = smoothstep(0.6, 0.9, noise(rp * vec2(40.0, 12.0) + t * 0.5)) * (0.6 + 0.4 * sin(t * 3.0 + rp.x * 20.0));
    vec3 wood = vec3(0.05, 0.025, 0.015) + vec3(1.0, 0.3, 0.03) * ember * smoothstep(0.01, -0.03, rp.y) * 1.3;
    col = mix(col, wood, log_ * (1.0 - smoothstep(0.35, 0.7, fire)));
  }
  // искры: летят вверх и петляют, на ударах — ярче
  for (float i = 0.0; i < 28.0; i++) {
    float s = hash(vec2(i, 3.0));
    float life = fract(t * (0.12 + s * 0.18) + s);
    vec2 sp = vec2((s - 0.5) * 0.35 + sin(life * 7.0 + i) * 0.06 * life, -0.3 + life * 0.95);
    float d = length(p - sp);
    col += vec3(1.0, 0.55, 0.15) * smoothstep(0.005 + uPulse * 0.003, 0.0, d) * (1.0 - life) * 2.5;
  }
  // звёздное небо над костром
  vec2 g = uv * vec2(uRes.x / uRes.y, 1.0) * 70.0;
  float st = smoothstep(0.12, 0.0, length(fract(g) - 0.5 - (hash2(floor(g)) - 0.5) * 0.6)) * step(0.985, hash(floor(g)));
  col += vec3(st) * 0.6 * smoothstep(0.35, 0.9, uv.y) * (1.0 - fire) * (0.6 + 0.4 * sin(t * 2.0 + hash(floor(g)) * 30.0));
  // где текст песни — огонь чуть приглушён, чтобы строки читались
  col *= 1.0 - 0.4 * exp(-pow((uv.y - 0.33) * 5.0, 2.0));
  return col;
}`,
  },
  {
    id: "lava",
    name: "Лава-лампа",
    body: `
// Лава-лампа: объёмные блестящие капли с бликом и подсветкой снизу.
float field(vec2 p) {
  float f = 0.0;
  for (float i = 0.0; i < 8.0; i++) {
    float s = hash(vec2(i, 2.0));
    // капля медленно поднимается и опускается, чуть качаясь
    vec2 c = vec2((s - 0.5) * 0.9 + sin(uTime * 0.13 + i * 2.1) * 0.12, sin(uTime * (0.06 + s * 0.05) + i * 1.9) * 0.42);
    float r = 0.09 + 0.07 * s + uBass * 0.015;
    f += exp(-dot(p - c, p - c) / (r * r)) * 1.25;   // мягкое ядро: без «дырок» в центре капель
  }
  return f;
}
vec3 scene(vec2 uv, vec2 p) {
  // стекло лампы: тёплый градиент снизу вверх
  vec3 col = mix(uC3 * 0.18, uBg * 0.08, uv.y) + uC1 * 0.12 * exp(-length(p - vec2(0.0, -0.6)) * 2.5);
  float f = field(p);
  float e = 0.002;
  vec2 grad = vec2(field(p + vec2(e, 0.0)) - field(p - vec2(e, 0.0)), field(p + vec2(0.0, e)) - field(p - vec2(0.0, e))) / (2.0 * e);
  float m = smoothstep(0.42, 0.5, f);
  vec3 n = normalize(vec3(-grad * 0.035, 1.0));
  vec3 l = normalize(vec3(-0.4, 0.6, 0.8));
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
  float rim = pow(1.0 - n.z, 2.0);
  // цвет капли меняется по высоте: внизу — горячий, вверху — второй цвет
  vec3 wax = mix(uC1, uC2, smoothstep(-0.4, 0.4, p.y));
  vec3 blob = wax * (0.35 + 0.75 * diff) + vec3(1.0) * spec * 0.7 + mix(uC3, vec3(1.0), 0.3) * rim * 0.5;
  blob *= 1.0 + uPulse * 0.25;
  col = mix(col, blob, m);
  col += wax * smoothstep(0.1, 0.46, f) * (1.0 - m) * 0.22;   // свечение вокруг капель
  return col;
}`,
  },
  {
    id: "dots",
    name: "Обложка из точек",
    body: `
// Полутон: весь экран — сетка точек, размер каждой — яркость размытой обложки. По точкам бегут волны в такт.
vec3 scene(vec2 uv, vec2 p) {
  float cells = 64.0;
  vec2 g = p * cells; vec2 id = floor(g) + 0.5; vec2 st = fract(g) - 0.5;
  vec2 cp = id / cells;
  float dist = length(cp);
  float wave = sin(dist * 14.0 - uTime * 3.0) * 0.5 + 0.5;
  // обложка медленно «плывёт» и сильно размыта — чтобы буквы с неё не мешали тексту песни
  vec2 cuv = coverFit(cp / vec2(uRes.x / uRes.y, 1.0) + 0.5) + vec2(sin(uTime * 0.05), cos(uTime * 0.04)) * 0.05;
  vec3 c = cover(cuv, 5.0);
  c = mix(c, palette(dist * 0.6 + uTime * 0.02), 0.35);
  float lum = clamp(dot(c, vec3(0.3, 0.55, 0.15)) * 1.4, 0.0, 1.0);
  float r = 0.08 + 0.32 * lum * (0.8 + 0.35 * wave * (0.4 + uEnergy)) + uPulse * 0.05;
  float d = smoothstep(r, r - 0.07, length(st));
  vec3 col = uBg * 0.06 + c * 1.2 * d;
  // посередине, где текст песни, точки тише
  col *= 1.0 - 0.45 * exp(-pow((uv.y - 0.42) * 4.0, 2.0));
  return col;
}`,
  },
  {
    id: "jelly",
    name: "Светящиеся медузы",
    scale: 0.8,
    body: `
// Глубина океана: лучи света сверху, планктон и большие полупрозрачные медузы, которые «дышат» в такт.
vec3 jelly(vec2 p, vec2 c, float s, float seed, vec3 tint) {
  vec2 q = (p - c) / s;
  float pulse = 0.5 + 0.5 * sin(uTime * 1.3 + seed * 6.0);
  q.x *= 1.0 + 0.18 * pulse;                       // купол сжимается и раскрывается
  q.y *= 1.0 - 0.1 * pulse;
  vec2 bq = q * vec2(1.0, 1.35);
  float bd = length(bq);
  // нижний край купола — волнистый «подол»
  float hem = -0.06 - 0.05 * (q.x * q.x) * 4.0 + 0.015 * sin(q.x * 40.0 + uTime * 2.0);
  float under = smoothstep(hem - 0.02, hem + 0.02, q.y);
  float dome = under * smoothstep(0.5, 0.46, bd);
  float fres = dome * smoothstep(0.15, 0.5, bd);           // край купола светится сильнее (он «толще»)
  float rim = smoothstep(0.035, 0.0, abs(bd - 0.48)) * under;
  float inner = smoothstep(0.22, 0.0, length((q - vec2(0.0, 0.1)) * vec2(1.0, 1.6))) * under;
  float ribs = smoothstep(0.75, 1.0, sin(atan(q.x, q.y + 0.2) * 10.0)) * dome * 0.25;
  // бахрома и длинные щупальца
  float tent = 0.0;
  for (float i = -3.0; i <= 3.0; i++) {
    float x0 = i * 0.11;
    float sway = sin(q.y * 5.0 + uTime * 1.6 + i * 1.3 + seed) * 0.06 * (-q.y);
    float len = 1.3 + 0.4 * hash(vec2(i, seed));
    tent += smoothstep(0.018, 0.0, abs(q.x - x0 - sway)) * step(q.y, -0.05) * smoothstep(-len, -0.05, q.y) * (0.6 + 0.4 * sin(q.y * 30.0 + uTime * 3.0));
  }
  float glow = exp(-bd * 2.2);
  return tint * (dome * 0.18 + fres * 0.8 + rim * 0.9 + inner * 0.8 + ribs + tent * 0.6) * (0.75 + 0.5 * pulse) + tint * 0.18 * glow;
}
vec3 scene(vec2 uv, vec2 p) {
  // вода: светлее сверху, глубокая синева внизу
  vec3 col = mix(vec3(0.0, 0.01, 0.03), mix(uBg, uC2, 0.3) * 0.45 + vec3(0.0, 0.03, 0.06), pow(uv.y, 1.6));
  // лучи света сквозь поверхность
  float rays = 0.0;
  for (float i = 0.0; i < 3.0; i++) rays += smoothstep(0.55, 1.0, noise(vec2(p.x * (3.0 + i * 2.0) + p.y * 0.8 + uTime * 0.05 * (i + 1.0), i * 7.0)));
  col += mix(uC3, vec3(0.6, 0.8, 1.0), 0.5) * rays * 0.06 * smoothstep(0.0, 1.0, uv.y);
  // планктон
  for (float k = 0.0; k < 2.0; k++) {
    vec2 g = (uv + vec2(sin(uTime * 0.05 + k) * 0.02, -uTime * (0.006 + k * 0.004))) * vec2(uRes.x / uRes.y, 1.0) * (40.0 + k * 30.0);
    vec2 id = floor(g);
    float d = length(fract(g) - 0.5 - (hash2(id + k) - 0.5) * 0.6);
    col += mix(uC1, vec3(0.8, 0.95, 1.0), 0.5) * smoothstep(0.09, 0.0, d) * step(0.9, hash(id + k * 5.0)) * (0.25 + 0.5 * uHigh);
  }
  for (float i = 0.0; i < 6.0; i++) {
    float s = hash(vec2(i, 9.0));
    // медузы всплывают по очереди — на экране всегда несколько
    float y = fract(uTime * 0.012 + fract(i * 0.618 + 0.35)) * 1.9 - 0.85;
    float lane = (i + 0.5) / 6.0 - 0.5;
    vec2 c = vec2(lane * 1.75 + (s - 0.5) * 0.12 + sin(uTime * 0.15 + i) * 0.05, y);
    float size = 0.17 + s * 0.15 + uBass * 0.02;
    col += jelly(p, c, size, i, palette(i / 6.0 + 0.1) * 1.1);
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
