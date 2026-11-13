// «Моя волна»: одна кнопка — бесконечный поток под тебя (свои треки + открытая база музыки).
import { Radio, Square } from "lucide-react";
import { useStore } from "../lib/store";
import { player, startWave, stopWave, WAVE_MOODS } from "../state/player";

export function WaveCard() {
  const wave = useStore(player, (s) => s.wave);
  return (
    <section className={`wave-card glass ${wave ? "on" : ""}`}>
      <button className="wave-play" onClick={() => (wave ? stopWave() : void startWave("mine"))} title={wave ? "Выйти из волны (музыка доиграет)" : "Включить «Мою волну»"}>
        {wave ? <Square size={18} fill="currentColor" /> : <Radio size={22} />}
      </button>
      <div className="wave-body">
        <b>Моя волна</b>
        <span className="muted small">
          {wave?.loading ? "Подбираю…" : wave ? "Играет без конца: ♡ — больше такого, «не то» — меньше" : "Твои треки и новая музыка из открытой базы — под твой вкус"}
        </span>
      </div>
      <div className="wave-moods">
        {WAVE_MOODS.map((m) => (
          <button key={m.id} className={`chip-btn ${wave?.mood === m.id ? "on" : ""}`} onClick={() => void startWave(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
    </section>
  );
}
