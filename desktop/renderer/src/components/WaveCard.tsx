// «Моя волна»: бесконечный поток похожей музыки — под стиль открытого плейлиста, под тебя или под настроение.
import { Radio, Square } from "lucide-react";
import type { Track } from "../../../shared/types";
import { useStore } from "../lib/store";
import { app, updateSettings } from "../state/app";
import { player } from "../state/player";
import { startWave, stopWave, WAVE_MOODS, waveStatus } from "../state/wave";

export function WaveCard({ list }: { list?: { name: string; tracks: Track[] } }) {
  const wave = useStore(player, (s) => s.wave);
  const status = useStore(waveStatus, (s) => s);
  const character = useStore(app, (s) => s.settings.waveCharacter);
  const busy = !!wave?.loading || !!status.stage;
  const hint = status.model
    ? `Скачиваю «слух» волны — один раз: ${Math.round((status.model.loaded / Math.max(1, status.model.total)) * 100)}%`
    : status.stage
      ? status.stage
      : wave
        ? `Играет без конца${wave.name ? ` · по «${wave.name}»` : ""}: ♡ — больше такого, «не то» — меньше`
        : "Новая похожая музыка из открытой базы — под стиль плейлиста или под настроение";
  return (
    <section className={`wave-card glass ${wave ? "on" : ""}`}>
      <button className={`wave-play ${busy ? "busy" : ""}`} onClick={() => (wave ? stopWave() : void startWave("mine"))} title={wave ? "Выйти из волны (музыка доиграет)" : "Включить «Мою волну»"}>
        {wave ? <Square size={18} fill="currentColor" /> : <Radio size={22} />}
      </button>
      <div className="wave-body">
        <b>Моя волна</b>
        <span className="muted small">{hint}</span>
      </div>
      <div className="wave-moods">
        {list && list.tracks.length >= 2 && (
          <button className={`chip-btn ${wave?.name === list.name ? "on" : ""}`} onClick={() => void startWave("mine", list.tracks, list.name)} title="Похожая на этот плейлист музыка — сами песни плейлиста в волну не попадут">
            По «{list.name}»
          </button>
        )}
        {WAVE_MOODS.map((m) => (
          <button key={m.id} className={`chip-btn ${wave?.mood === m.id && !wave.name ? "on" : ""}`} onClick={() => void startWave(m.id)}>
            {m.label}
          </button>
        ))}
        <button
          className="chip-btn ghost"
          title="Характер волны: незнакомое — похожее, но новое; популярное — похожее, которое чаще слушают"
          onClick={() => updateSettings({ waveCharacter: character === "popular" ? "new" : "popular" })}
        >
          {character === "popular" ? "★ Популярное" : "✦ Незнакомое"}
        </button>
      </div>
    </section>
  );
}
