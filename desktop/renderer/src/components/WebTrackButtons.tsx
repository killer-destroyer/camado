// Для трека из сети: «не то», «сохранить к себе» (полные песни) или «Целиком ↗» (отрывок хита), подпись источника.
import { useState } from "react";
import { Download, ExternalLink, ThumbsDown } from "lucide-react";
import type { Track } from "../../../shared/types";
import { useStore } from "../lib/store";
import { player, saveWebTrack } from "../state/player";
import { waveDislike } from "../state/wave";
import { fullLinks } from "../../../shared/waveRank";

export function WebTrackButtons({ track, size = 17 }: { track?: Track; size?: number }) {
  const wave = useStore(player, (s) => !!s.wave);
  const [open, setOpen] = useState(false);
  if (!track) return null;
  return (
    <>
      {wave && (
        <button className="icon-btn" title="Не то — больше такого не ставить" onClick={waveDislike}>
          <ThumbsDown size={size} />
        </button>
      )}
      {track.web?.preview && (
        <span className="full-wrap">
          <button className="chip-btn full-btn" title="Это отрывок 30 секунд. Послушать песню целиком — на стриминге" onClick={() => setOpen(!open)}>
            Целиком <ExternalLink size={12} />
          </button>
          {open && (
            <span className="full-menu glass" onClick={() => setOpen(false)}>
              {fullLinks(track).map((l) => (
                <a key={l.name} href={l.url} target="_blank" rel="noreferrer">
                  {l.name}
                </a>
              ))}
            </span>
          )}
        </span>
      )}
      {track.web && !track.web.preview && (
        <button className="icon-btn" title="Сохранить к себе (скачается в «Музыка/Камадо»)" onClick={() => void saveWebTrack(track)}>
          <Download size={size} />
        </button>
      )}
    </>
  );
}

/** «Deezer · отрывок 30 с» / «ccMixter · CC BY 3.0» — со ссылкой на страницу трека. */
export function WebTrackCredit({ track }: { track?: Track }) {
  if (!track?.web) return null;
  const w = track.web;
  return (
    <div className="web-meta">
      {w.page ? (
        <a href={w.page} target="_blank" rel="noreferrer">
          {w.source}
        </a>
      ) : (
        w.source
      )}
      {w.preview && " · отрывок 30 с"}
      {w.license && (
        <>
          {" · "}
          {w.licenseUrl ? (
            <a href={w.licenseUrl} target="_blank" rel="noreferrer">
              {w.license}
            </a>
          ) : (
            w.license
          )}
        </>
      )}
    </div>
  );
}
