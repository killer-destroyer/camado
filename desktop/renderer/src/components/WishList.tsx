// «Хочу послушать»: песни, которым поставил ♡ в волне. Отрывок — здесь, целиком — на стриминге.
import { ExternalLink, Play, Trash2, X } from "lucide-react";
import type { Track } from "../../../shared/types";
import { api } from "../lib/api";
import { fullLinks } from "../../../shared/waveRank";
import { playQueue } from "../state/player";

export function WishModal({ list, onClose }: { list: Track[]; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass wish" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn wn-close" onClick={onClose} title="Закрыть">
          <X size={18} />
        </button>
        <h2>Хочу послушать</h2>
        {list.length === 0 ? (
          <p className="muted">Пока пусто. Поставь ♡ песне в «Моей волне» — она появится здесь со ссылками, где послушать целиком.</p>
        ) : (
          <div className="wish-list">
            {list.map((t, i) => (
              <div key={t.id} className="wish-row">
                <span className="tr-cover" style={t.cover ? { backgroundImage: `url("${t.cover}")` } : undefined} />
                <div className="wish-meta">
                  <b>{t.title}</b>
                  <span className="muted small">{t.artist}</span>
                </div>
                <button className="icon-btn" title="Отрывок" onClick={() => void playQueue(list, i)}>
                  <Play size={15} />
                </button>
                {fullLinks(t).map((l) => (
                  <a key={l.name} className="chip-btn" href={l.url} target="_blank" rel="noreferrer" title={`Найти в «${l.name}»`}>
                    {l.name.split(" ")[0]} <ExternalLink size={11} />
                  </a>
                ))}
                <button className="icon-btn" title="Убрать" onClick={() => void api.wave.wishRemove(t.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
