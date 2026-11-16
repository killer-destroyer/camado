// Эквалайзер: пресеты и 10 ползунков. Один и тот же — в плеере и в Настройках.
import { EQ_BANDS, EQ_PRESETS } from "../lib/audio";
import { useStore } from "../lib/store";
import { app, updateSettings } from "../state/app";

const label = (f: number) => (f >= 1000 ? `${f / 1000}к` : String(f));

export function EqPanel() {
  const eq = useStore(app, (s) => s.settings.eq);
  const setBand = (i: number, v: number) => {
    const bands = [...eq.bands];
    bands[i] = v;
    updateSettings({ eq: { preset: "custom", bands } });
  };
  return (
    <div className="eq">
      <div className="eq-presets">
        {EQ_PRESETS.map((p) => (
          <button key={p.id} className={`chip-btn ${eq.preset === p.id ? "on" : ""}`} onClick={() => updateSettings({ eq: { preset: p.id, bands: [...p.bands] } })}>
            {p.name}
          </button>
        ))}
        {eq.preset === "custom" && <span className="chip-btn on">Свой</span>}
      </div>
      <div className="eq-bands">
        {EQ_BANDS.map((f, i) => (
          <label key={f} className="eq-band" title={`${label(f)} Гц: ${eq.bands[i]! > 0 ? "+" : ""}${eq.bands[i]} дБ`}>
            <span className="eq-db">{eq.bands[i]! > 0 ? `+${eq.bands[i]}` : eq.bands[i]}</span>
            <input
              type="range"
              className="eq-slider"
              min={-12}
              max={12}
              step={1}
              value={eq.bands[i]}
              onChange={(e) => setBand(i, Number(e.target.value))}
              onDoubleClick={() => setBand(i, 0)}
            />
            <span className="eq-f">{label(f)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
