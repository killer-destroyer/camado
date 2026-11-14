// Перерыв с пользой: дыхание (круг растёт на вдохе, замирает, сдувается на выдохе),
// разминка (фигурка показывает движение) и гимнастика для глаз (следи за точкой).
import { useEffect, useRef, useState } from "react";
import { Eye, PersonStanding, Wind } from "lucide-react";
import { useFrame } from "../lib/frame";
import { Segmented } from "./ui";

const BREATH = [
  { id: "478", name: "4-7-8", hint: "успокаивает", phases: [["Вдох", 4], ["Задержка", 7], ["Выдох", 8]] as [string, number][] },
  { id: "box", name: "Квадрат", hint: "собирает", phases: [["Вдох", 4], ["Задержка", 4], ["Выдох", 4], ["Пауза", 4]] as [string, number][] },
  { id: "calm", name: "Спокойное", hint: "просто отдохнуть", phases: [["Вдох", 5], ["Выдох", 5]] as [string, number][] },
];

/** Мягкий звук смены фазы — чтобы дышать с закрытыми глазами. */
let ctx: AudioContext | undefined;
function bell(up: boolean): void {
  ctx ??= new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  o.frequency.value = up ? 528 : 396;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 1.3);
}

function Breathing() {
  const [pid, setPid] = useState("478");
  const p = BREATH.find((b) => b.id === pid)!;
  const circle = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLDivElement>(null);
  const t0 = useRef(performance.now());
  const lastPhase = useRef(-1);
  useEffect(() => {
    t0.current = performance.now();
    lastPhase.current = -1;
  }, [pid]);
  const cycle = p.phases.reduce((a, [, s]) => a + s, 0);
  useFrame(() => {
    const t = ((performance.now() - t0.current) / 1000) % cycle;
    let acc = 0;
    let i = 0;
    while (i < p.phases.length - 1 && t >= acc + p.phases[i]![1]) acc += p.phases[i++]![1];
    const [name, len] = p.phases[i]!;
    const k = (t - acc) / len;
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * k);
    // размер круга: вдох — растёт, выдох — сдувается, задержка — держит
    const prev = i > 0 ? p.phases[i - 1]![0] : p.phases.at(-1)![0];
    const size = name === "Вдох" ? 0.55 + 0.45 * ease : name === "Выдох" ? 1 - 0.45 * ease : prev === "Вдох" || name === "Задержка" ? 1 : 0.55;
    if (circle.current) circle.current.style.transform = `scale(${size.toFixed(4)})`;
    if (i !== lastPhase.current) {
      lastPhase.current = i;
      if (label.current) label.current.textContent = name;
      bell(name === "Вдох");
    }
    if (count.current) count.current.textContent = String(Math.ceil(len - (t - acc)));
  });
  return (
    <div className="coach-breath">
      <Segmented size="sm" value={pid} onChange={setPid} options={BREATH.map((b) => ({ value: b.id, label: b.name, title: b.hint }))} />
      <div className="breath-stage">
        <div ref={circle} className="breath-circle" />
        <div className="breath-text">
          <div ref={label} className="breath-label">
            Вдох
          </div>
          <div ref={count} className="breath-count" />
        </div>
      </div>
      <div className="muted small center">{p.hint} · дыши носом, плечи вниз</div>
    </div>
  );
}

const MOVES = [
  { id: "neck", name: "Шея", text: "Медленно наклони голову к одному плечу, потом к другому. Без рывков.", sec: 30 },
  { id: "shoulders", name: "Плечи", text: "Круги плечами назад: поднять к ушам — отвести — опустить.", sec: 30 },
  { id: "back", name: "Спина", text: "Встань, руки в замок над головой, потянись вверх и чуть в стороны.", sec: 30 },
  { id: "wrists", name: "Кисти", text: "Покрути кистями в обе стороны, потом сожми и разожми кулаки.", sec: 20 },
  { id: "legs", name: "Ноги", text: "Встань и сделай 10 приседаний или просто пройдись по комнате.", sec: 30 },
];

function Stretch() {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(MOVES[0]!.sec);
  const m = MOVES[i % MOVES.length]!;
  useEffect(() => {
    setLeft(m.sec);
    const id = setInterval(() => setLeft((x) => (x <= 1 ? (setI((j) => j + 1), 0) : x - 1)), 1000);
    return () => clearInterval(id);
  }, [i]);
  return (
    <div className="coach-stretch">
      <svg viewBox="0 0 120 160" className={`figure move-${m.id}`} aria-hidden>
        <g className="fig">
          <circle className="head" cx="60" cy="28" r="13" />
          <line className="torso" x1="60" y1="42" x2="60" y2="100" />
          <g className="arm-l">
            <line x1="60" y1="55" x2="32" y2="82" />
          </g>
          <g className="arm-r">
            <line x1="60" y1="55" x2="88" y2="82" />
          </g>
          <g className="legs">
            <line x1="60" y1="100" x2="42" y2="150" />
            <line x1="60" y1="100" x2="78" y2="150" />
          </g>
        </g>
      </svg>
      <div className="stretch-info">
        <div className="stretch-name">{m.name}</div>
        <div className="stretch-text">{m.text}</div>
        <div className="stretch-timer">
          <i style={{ transform: `scaleX(${left / m.sec})` }} />
        </div>
        <div className="stretch-dots">
          {MOVES.map((x, j) => (
            <button key={x.id} className={j === i % MOVES.length ? "on" : ""} onClick={() => setI(j)} title={x.name} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Eyes() {
  const dot = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const t = performance.now() / 1000;
    const w = (box.current?.clientWidth ?? 300) / 2 - 18;
    const h = (box.current?.clientHeight ?? 160) / 2 - 18;
    // восьмёрка, потом по кругу — глаза двигаются во все стороны
    const phase = Math.floor(t / 12) % 2;
    const x = phase ? Math.sin(t * 0.9) * w : Math.sin(t * 0.8) * w;
    const y = phase ? Math.cos(t * 0.9) * h : Math.sin(t * 1.6) * h;
    if (dot.current) dot.current.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  });
  return (
    <div className="coach-eyes">
      <div ref={box} className="eyes-box">
        <div ref={dot} className="eyes-dot" />
      </div>
      <div className="muted small center">Следи за точкой только глазами, голова на месте. А потом — 20 секунд посмотри вдаль, в окно (правило 20-20-20).</div>
    </div>
  );
}

export function BreakCoach() {
  const [tab, setTab] = useState<"breath" | "stretch" | "eyes">("breath");
  return (
    <div className="card glass coach">
      <div className="card-head">
        <span>Перерыв с пользой</span>
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "breath", label: (<><Wind size={14} /> Дыхание</>) },
          { value: "stretch", label: (<><PersonStanding size={14} /> Разминка</>) },
          { value: "eyes", label: (<><Eye size={14} /> Глаза</>) },
        ]}
      />
      {tab === "breath" ? <Breathing /> : tab === "stretch" ? <Stretch /> : <Eyes />}
    </div>
  );
}
