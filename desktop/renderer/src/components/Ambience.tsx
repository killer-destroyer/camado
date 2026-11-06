// Пульт фоновых звуков: плитки (нажал — включил), ползунок у каждой, общая громкость, «вместе с фокусом».
import { CloudLightning, CloudRain, Coffee, Flame, Power, Trees, TrainFront, Waves, Wind, Cat, AudioLines } from "lucide-react";
import { AMBIENCE } from "../lib/ambience";
import { useStore } from "../lib/store";
import { app, updateSettings } from "../state/app";
import { Slider, Toggle } from "./ui";

const ICON: Record<string, typeof CloudRain> = {
  rain: CloudRain,
  storm: CloudLightning,
  cafe: Coffee,
  fire: Flame,
  forest: Trees,
  wind: Wind,
  ocean: Waves,
  train: TrainFront,
  purr: Cat,
  white: AudioLines,
  pink: AudioLines,
  brown: AudioLines,
};

export function AmbienceMixer({ compact = false }: { compact?: boolean }) {
  const a = useStore(app, (s) => s.settings.ambience);
  const set = (patch: Partial<typeof a>) => updateSettings({ ambience: { ...a, ...patch } });
  const level = (id: string) => a.levels[id] ?? 0;
  const setLevel = (id: string, v: number) => set({ levels: { ...a.levels, [id]: v }, on: v > 0 ? true : a.on });
  const anyOn = Object.values(a.levels).some((v) => v > 0);
  return (
    <div className={`amb ${compact ? "compact" : ""} ${a.on ? "on" : ""}`}>
      <div className="amb-head">
        <button className={`amb-power ${a.on && anyOn ? "on" : ""}`} onClick={() => set({ on: !a.on })} title={a.on ? "Выключить фон" : "Включить фон"}>
          <Power size={16} />
          {a.on && anyOn ? "Играет" : "Выключено"}
        </button>
        <div className="amb-vol">
          <span>громкость</span>
          <Slider value={a.volume} onChange={(v) => set({ volume: v })} label="Громкость фона" />
        </div>
      </div>
      <div className="amb-grid">
        {AMBIENCE.map((s) => {
          const Icon = ICON[s.id] ?? AudioLines;
          const v = level(s.id);
          return (
            <div key={s.id} className={`amb-tile ${v > 0 ? "active" : ""} amb-${s.id}`}>
              <button className="amb-btn" onClick={() => setLevel(s.id, v > 0 ? 0 : 0.6)}>
                <Icon size={22} />
                <span>{s.name}</span>
              </button>
              <Slider value={v} onChange={(x) => setLevel(s.id, x)} label={s.name} />
            </div>
          );
        })}
      </div>
      {!compact && (
        <label className="inline-toggle">
          <Toggle value={a.withFocus} onChange={(v) => set({ withFocus: v })} />
          включать вместе с фокусом и выключать на перерыв
        </label>
      )}
    </div>
  );
}
