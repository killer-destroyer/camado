// Для трека из открытой базы: «не то», «сохранить к себе» и подпись автора с лицензией (её требует Creative Commons).
import { Download, ThumbsDown } from "lucide-react";
import type { Track } from "../../../shared/types";
import { useStore } from "../lib/store";
import { player, saveWebTrack, waveDislike } from "../state/player";

export function WebTrackButtons({ track, size = 17 }: { track?: Track; size?: number }) {
  const wave = useStore(player, (s) => !!s.wave);
  if (!track) return null;
  return (
    <>
      {wave && (
        <button className="icon-btn" title="Не то — больше такого не ставить" onClick={waveDislike}>
          <ThumbsDown size={size} />
        </button>
      )}
      {track.web && (
        <button className="icon-btn" title="Сохранить к себе (скачается в «Музыка/Камадо»)" onClick={() => void saveWebTrack(track)}>
          <Download size={size} />
        </button>
      )}
    </>
  );
}

/** «ccMixter · CC BY 3.0» — со ссылкой на страницу трека. */
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
