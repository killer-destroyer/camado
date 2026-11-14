// «Моя волна»: бесконечный поток похожей музыки — под стиль открытого плейлиста, под тебя или под настроение.
// «Хиты» — актуальные популярные песни (звучит отрывок 30 с, целиком — на стриминге), «Полные» — независимые музыканты.
import { useEffect, useState } from "react";
import { Heart, Radio, Square } from "lucide-react";
import type { Track } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { app, updateSettings } from "../state/app";
import { player } from "../state/player";
import { startWave, stopWave, WAVE_MOODS, waveStatus } from "../state/wave";
import { WishModal } from "./WishList";

export function WaveCard({ list }: { list?: { name: string; tracks: Track[] } }) {
  const wave = useStore(player, (s) => s.wave);
  const status = useStore(waveStatus, (s) => s);
  const character = useStore(app, (s) => s.settings.waveCharacter);
  const source = useStore(app, (s) => s.settings.waveSource);
  const [wish, setWish] = useState<Track[]>([]);
  const [wishOpen, setWishOpen] = useState(false);
  useEffect(() => {
    const load = () => void api.wave.wish().then(setWish);
    load();
    return api.on("wish-changed", load);
  }, []);
  const hits = source !== "indie";
  const busy = !!wave?.loading || !!status.stage;
  const hint = status.model
    ? `Скачиваю «слух» волны — один раз: ${Math.round((status.model.loaded / Math.max(1, status.model.total)) * 100)}%`
    : status.stage
      ? status.stage
      : wave
        ? `Играет без конца${wave.name ? ` · по «${wave.name}»` : ""}: ♡ — больше такого, «не то» — меньше`
        : hits
          ? "Актуальные популярные песни, похожие на твои. Звучит отрывок 30 секунд — ♡ сохранит песню в «Хочу послушать», «Целиком» откроет её в Яндекс Музыке, VK или YouTube"
          : "Полные песни независимых музыкантов из открытой базы — похожие по звучанию на твои";
  // сменили источник или характер, пока волна играет, — сразу перезапускаем её по-новому
  const restart = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    if (wave) void startWave(wave.mood, wave.name && list?.name === wave.name ? list.tracks : undefined, wave.name && list?.name === wave.name ? wave.name : undefined);
  };
  return (
    <section className={`wave-card glass ${wave ? "on" : ""}`}>
      <button className={`wave-play ${busy ? "busy" : ""}`} onClick={() => (wave ? stopWave() : void startWave("mine"))} title={wave ? "Выйти из волны (музыка доиграет)" : "Включить «Мою волну» (W)"}>
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
      </div>
      <div className="wave-opts">
        <div className="seg mini" title="Хиты — известные актуальные песни, но только отрывки по 30 секунд (целиком их отдают лишь стриминги). Полные — песни независимых музыкантов целиком.">
          <button className={hits ? "on" : ""} onClick={() => restart({ waveSource: "hits" })}>
            Хиты · отрывки
          </button>
          <button className={!hits ? "on" : ""} onClick={() => restart({ waveSource: "indie" })}>
            Полные · независимые
          </button>
        </div>
        <div className="seg mini" title="Популярное — больше известного; Незнакомое — больше исполнителей, которых у тебя нет">
          <button className={character === "popular" ? "on" : ""} onClick={() => restart({ waveCharacter: "popular" })}>
            Популярное
          </button>
          <button className={character === "new" ? "on" : ""} onClick={() => restart({ waveCharacter: "new" })}>
            Незнакомое
          </button>
        </div>
        <button className="chip-btn ghost" onClick={() => setWishOpen(true)} title="Песни, которым ты поставил ♡ в волне">
          <Heart size={13} /> Хочу послушать{wish.length ? ` · ${wish.length}` : ""}
        </button>
      </div>
      {wishOpen && <WishModal list={wish} onClose={() => setWishOpen(false)} />}
    </section>
  );
}
