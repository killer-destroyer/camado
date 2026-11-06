// «Фокус»: большое кольцо-таймер, предмет, статистика недели.
import { useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { engine } from "../lib/audio";
import { useFrame } from "../lib/frame";
import { useStore } from "../lib/store";
import { app, updateSettings } from "../state/app";
import { data } from "../state/data";
import { focus, focusToday, pause, remainingMs, reset, setMode, start, type FocusMode } from "../state/focus";
import { Segmented, Slider, Toggle } from "../components/ui";
import { FOCUS_PRESETS, presetById } from "../../../shared/focusPresets";
import { AmbienceMixer } from "../components/Ambience";

const R = 150;
const C = 2 * Math.PI * R;

export function Focus() {
  const s = useStore(focus, (x) => x);
  const week = useStore(focusToday, (x) => x.week);
  const subjects = useStore(data, (x) => x.subjects);
  const cfg = useStore(app, (x) => x.settings.focus);
  const ring = useRef<SVGCircleElement>(null);
  const time = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const left = remainingMs();
    const p = s.total > 0 ? 1 - left / s.total : 0;
    if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - p));
    if (time.current) {
      const m = Math.floor(left / 60e3);
      const sec = Math.floor((left % 60e3) / 1000);
      time.current.textContent = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    if (glow.current) glow.current.style.transform = `scale(${(1 + engine.pulse * 0.08).toFixed(4)})`;
  });

  const max = Math.max(30, ...week.map((d) => d.minutes));
  const preset = presetById(cfg.preset);
  const label: Record<FocusMode, string> = {
    work: "Работа",
    short: "Перерыв",
    long: "Длинный перерыв",
  };

  return (
    <div className="screen focus">
      <header className="screen-head">
        <h1 className="display">Фокус</h1>
        <Segmented
          value={s.mode}
          onChange={(m) => !s.running && setMode(m)}
          options={(["work", "short", "long"] as const).map((m) => ({
            value: m,
            label: label[m],
          }))}
        />
      </header>

      <div className="focus-layout">
        <div className={`focus-timer mode-${s.mode} ${s.running ? "running" : ""}`}>
          <div ref={glow} className="focus-glow" />
          <svg viewBox="0 0 340 340" className="focus-ring">
            <defs>
              <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent-2)" />
              </linearGradient>
            </defs>
            <circle cx="170" cy="170" r={R} className="track" />
            <circle ref={ring} cx="170" cy="170" r={R} className="value" strokeDasharray={C} strokeDashoffset={C} />
          </svg>
          <div className="focus-center">
            <div className="focus-label">{label[s.mode]}</div>
            <div ref={time} className="focus-time">
              25:00
            </div>
            <div className="focus-sub">
              {s.subject || "без предмета"} · раунд {s.rounds + 1}
            </div>
          </div>
        </div>

        <div className="focus-side">
          <div className="focus-buttons">
            <button className="play-btn xl" onClick={s.running ? pause : start}>
              {s.running ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
            </button>
            <button className="icon-btn lg" onClick={reset} title="Сбросить">
              <RotateCcw size={22} />
            </button>
          </div>

          <div className="card glass">
            <div className="card-head">
              <span>Над чем работаем</span>
            </div>
            <div className="chips">
              {["", ...subjects.map((x) => x.name)].map((n) => (
                <button key={n || "none"} className={`chip-btn ${s.subject === n ? "on" : ""}`} onClick={() => focus.set({ subject: n })}>
                  {n || "Без предмета"}
                </button>
              ))}
            </div>
          </div>

          <div className="card glass">
            <div className="card-head">
              <span>Стратегия</span>
            </div>
            <div className="chips">
              {FOCUS_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`chip-btn ${cfg.preset === p.id ? "on" : ""}`}
                  disabled={s.running}
                  onClick={() => {
                    updateSettings({
                      focus: {
                        ...cfg,
                        preset: p.id,
                        work: p.work,
                        short: p.short,
                        long: p.long,
                        longEvery: p.longEvery,
                      },
                    });
                    setTimeout(() => setMode(s.mode), 0);
                  }}
                >
                  {p.name}
                </button>
              ))}
              <button
                className={`chip-btn ${cfg.preset === "custom" ? "on" : ""}`}
                disabled={s.running}
                onClick={() => updateSettings({ focus: { ...cfg, preset: "custom" } })}
              >
                Свой
              </button>
            </div>
            {preset && <div className="preset-about">{preset.about}</div>}
          </div>

          {preset && (
            <div className="card glass focus-guide">
              <div className="card-head">
                <span>{s.mode === "work" ? "Как работать" : "Что делать на перерыве"}</span>
              </div>
              <ul>
                {(s.mode === "work" ? preset.during : preset.rest).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {cfg.preset === "custom" && (
            <div className="card glass">
              <div className="card-head">
                <span>Длительность</span>
              </div>
              {(["work", "short", "long"] as const).map((m) => (
                <div className="dur-row" key={m}>
                  <span>{label[m]}</span>
                  <Slider
                    value={cfg[m]}
                    min={m === "work" ? 10 : 1}
                    max={m === "work" ? 90 : 30}
                    step={1}
                    onChange={(v) => {
                      updateSettings({
                        focus: { ...cfg, [m]: v, preset: "custom" },
                      });
                      if (!s.running && s.mode === m) setTimeout(() => setMode(m), 0);
                    }}
                  />
                  <b>{cfg[m]} мин</b>
                </div>
              ))}
              <div className="dur-row">
                <span>Длинный после</span>
                <Slider
                  value={cfg.longEvery}
                  min={0}
                  max={6}
                  step={1}
                  onChange={(v) => updateSettings({ focus: { ...cfg, longEvery: v } })}
                />
                <b>{cfg.longEvery ? `${cfg.longEvery} сесс.` : "никогда"}</b>
              </div>
            </div>
          )}

          <div className="card glass">
            <div className="card-head">
              <span>Фон для учёбы</span>
            </div>
            <AmbienceMixer />
          </div>

          <label className="inline-toggle focus-music">
            <Toggle value={cfg.autoMusic} onChange={(v) => updateSettings({ focus: { ...cfg, autoMusic: v } })} />
            включать музыку на старте
          </label>

          <div className="card glass">
            <div className="card-head">
              <span>Неделя</span>
              <span className="muted small">{Math.round(week.reduce((a, d) => a + d.minutes, 0))} мин</span>
            </div>
            <div className="week-bars">
              {week.map((d, i) => (
                <div key={i} className={`wb ${i === week.length - 1 ? "today" : ""}`} title={`${Math.round(d.minutes)} мин`}>
                  <div className="wb-bar" style={{ height: `${(d.minutes / max) * 100}%` }} />
                  <span>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
