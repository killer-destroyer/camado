// «Музыка»: моя библиотека (карусель + список) и онлайн-плееры.
import { useEffect, useMemo, useState } from "react";
import { Disc3, FolderPlus, Music2, RefreshCw, Search } from "lucide-react";
import type { Track } from "../../../shared/types";
import { api } from "../lib/api";
import { fmtTime } from "../lib/format";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import { player, playQueue } from "../state/player";
import { CoverFlow } from "../components/CoverFlow";
import { openOnline, SERVICES, type Service } from "../components/Online";
import { Empty } from "../components/ui";

type Tab = "local" | Service;

export function Music() {
  const library = useStore(player, (s) => s.library);
  const queue = useStore(player, (s) => s.queue);
  const index = useStore(player, (s) => s.index);
  const [tab, setTab] = useState<Tab>("local");
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(false);
  const playingId = queue[index]?.id;

  useEffect(() => {
    openOnline(tab === "local" ? null : tab);
  }, [tab]);
  useEffect(() => () => openOnline(null), []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? library.tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(s)) : library.tracks;
  }, [library.tracks, q]);

  const play = (tracks: Track[], i: number) => void playQueue(tracks, i);
  const focusIndex = playingId ? list.findIndex((t) => t.id === playingId) : undefined;

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const paths = [...e.dataTransfer.files].map((f) => api.pathForFile(f)).filter(Boolean);
    if (paths.length === 0) return;
    toast("Добавляю музыку…");
    const st = await api.library.addPaths(paths);
    toast(`В библиотеке ${st.tracks.length} треков`, "ok");
  };

  return (
    <div
      className={`screen music ${tab !== "local" ? "online" : ""} ${drag ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <header className="screen-head">
        <h1 className="display">Музыка</h1>
        <div className="tabs">
          {(
            [
              ["local", "Моя музыка"],
              ["yandex", SERVICES.yandex.name],
              ["soundcloud", SERVICES.soundcloud.name],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={`tab ${tab === id ? "active" : ""} t-${id}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {tab === "local" && (
          <div className="head-tools">
            <div className="search">
              <Search size={16} />
              <input placeholder="Поиск по трекам" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="icon-btn" title="Пересканировать" onClick={() => void api.library.rescan()}>
              <RefreshCw size={17} className={library.scanning ? "spin" : ""} />
            </button>
            <button className="btn" onClick={() => void api.library.pickFolder()}>
              <FolderPlus size={17} /> Папка
            </button>
          </div>
        )}
      </header>

      {tab === "local" &&
        (library.tracks.length === 0 ? (
          <Empty
            icon={<Disc3 size={34} />}
            title={library.scanning ? "Сканирую музыку…" : "Здесь будет твоя музыка"}
            text="Добавь папку с mp3/flac/m4a или просто перетащи файлы в окно. Тексты песен подтянутся сами."
          >
            <button className="btn primary" onClick={() => void api.library.pickFolder()}>
              <FolderPlus size={18} /> Добавить папку
            </button>
          </Empty>
        ) : (
          <>
            {list.length > 0 && <CoverFlow tracks={list} playingId={playingId} focusIndex={focusIndex} onPlay={(i) => play(list, i)} />}
            <div className="track-list glass">
              {list.slice(0, 400).map((t, i) => (
                <button key={t.id} className={`track-row ${t.id === playingId ? "playing" : ""}`} onDoubleClick={() => play(list, i)} onClick={() => play(list, i)}>
                  <span className="tr-num">{t.id === playingId ? <Music2 size={14} /> : i + 1}</span>
                  <span className="tr-cover" style={t.cover ? { backgroundImage: `url("${t.cover}")` } : undefined} />
                  <span className="tr-title">{t.title}</span>
                  <span className="tr-artist">{t.artist}</span>
                  <span className="tr-album">{t.album}</span>
                  <span className="tr-lyr">{t.hasLyrics ? "LRC" : ""}</span>
                  <span className="tr-dur">{t.duration ? fmtTime(t.duration) : ""}</span>
                </button>
              ))}
              {list.length === 0 && <div className="muted pad">Ничего не нашлось</div>}
            </div>
          </>
        ))}

      {tab !== "local" && (
        <div className="online-hint muted small">
          Войди в свой аккаунт прямо здесь. Камадо покажет текст песни и плеер на весь экран.
          {tab === "yandex" && " Яндекс Музыка работает не во всех странах."}
        </div>
      )}
      {drag && <div className="drop-hint">Отпусти — добавлю в библиотеку</div>}
    </div>
  );
}
