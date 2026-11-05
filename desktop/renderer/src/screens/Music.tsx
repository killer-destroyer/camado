// «Музыка»: своя библиотека (карусель + список), добавление из папки, перетаскиванием или по ссылке.
import { useEffect, useMemo, useState } from "react";
import { Check, Disc3, Download, FolderPlus, Link2, Music2, RefreshCw, Search, X } from "lucide-react";
import type { Track } from "../../../shared/types";
import { api } from "../lib/api";
import { fmtTime } from "../lib/format";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import { player, playQueue } from "../state/player";
import { CoverFlow } from "../components/CoverFlow";
import { Empty } from "../components/ui";

const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

interface Choice {
  url: string;
  name: string;
  on: boolean;
}

function useImport() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [choices, setChoices] = useState<Choice[] | null>(null);

  useEffect(
    () =>
      api.on("download-progress", (p) =>
        setProgress({ name: p.name, pct: p.total ? Math.min(100, (p.received / p.total) * 100) : -1 }),
      ),
    [],
  );

  const run = async (url: string): Promise<boolean> => {
    setBusy(true);
    setProgress(null);
    try {
      const r = await api.music.importUrl(url);
      if (r.kind === "saved") {
        toast(`Добавил «${r.name}» в библиотеку 🎵`, "ok");
        return true;
      }
      if (r.kind === "choose") {
        setChoices(r.links.map((l) => ({ ...l, on: true })));
        return false;
      }
      toast(r.error, "warn");
      return false;
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const downloadChosen = async () => {
    const list = (choices ?? []).filter((c) => c.on);
    setChoices(null);
    let ok = 0;
    for (const c of list) if (await run(c.url)) ok++;
    if (list.length > 1) toast(`Скачано ${ok} из ${list.length}`, ok === list.length ? "ok" : "warn");
  };

  return { busy, progress, choices, setChoices, run, downloadChosen };
}

export function Music() {
  const library = useStore(player, (s) => s.library);
  const queue = useStore(player, (s) => s.queue);
  const index = useStore(player, (s) => s.index);
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [drag, setDrag] = useState(false);
  const imp = useImport();
  const playingId = queue[index]?.id;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? library.tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(s)) : library.tracks;
  }, [library.tracks, q]);

  const play = (tracks: Track[], i: number) => void playQueue(tracks, i);
  const focusIndex = playingId ? list.findIndex((t) => t.id === playingId) : undefined;

  const addLink = async (url = link) => {
    if (!url.trim() || imp.busy) return;
    if (await imp.run(url)) setLink("");
  };

  // Ctrl+V со ссылкой в любом месте экрана — сразу добавить.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (looksLikeUrl(text)) {
        e.preventDefault();
        setLink(text.trim());
        void addLink(text.trim());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (looksLikeUrl(url)) return void addLink(url.trim());
    const paths = [...e.dataTransfer.files].map((f) => api.pathForFile(f)).filter(Boolean);
    if (paths.length === 0) return;
    toast("Добавляю музыку…");
    const st = await api.library.addPaths(paths);
    toast(`В библиотеке ${st.tracks.length} треков`, "ok");
  };

  const linkBar = (
    <div className={`link-bar ${imp.busy ? "busy" : ""}`}>
      <Link2 size={17} />
      <input
        placeholder="Ссылка на трек (mp3, flac…) или на страницу, где он лежит"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void addLink()}
      />
      <button className="btn primary" disabled={!link.trim() || imp.busy} onClick={() => void addLink()}>
        <Download size={16} /> {imp.busy ? "Скачиваю…" : "Добавить"}
      </button>
      {imp.busy && (
        <span className="link-progress" style={{ ["--p" as string]: imp.progress && imp.progress.pct >= 0 ? `${imp.progress.pct}%` : "30%" }}>
          <i className={imp.progress && imp.progress.pct >= 0 ? "" : "indeterminate"} />
        </span>
      )}
    </div>
  );

  return (
    <div
      className={`screen music ${drag ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <header className="screen-head">
        <h1 className="display">Музыка</h1>
        <div className="head-tools">
          {library.tracks.length > 0 && (
            <div className="search">
              <Search size={16} />
              <input placeholder="Поиск по трекам" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          <button className="icon-btn" title="Пересканировать папки" onClick={() => void api.library.rescan()}>
            <RefreshCw size={17} className={library.scanning ? "spin" : ""} />
          </button>
          <button className="btn" onClick={() => void api.library.pickFolder()}>
            <FolderPlus size={17} /> Папка
          </button>
        </div>
      </header>

      {library.tracks.length > 0 && linkBar}

      {library.tracks.length === 0 ? (
        <Empty
          icon={<Disc3 size={34} />}
          title={library.scanning ? "Сканирую музыку…" : "Здесь будет твоя музыка"}
          text="Выбери папку с песнями, перетащи файлы в окно или вставь ссылку на трек. Тексты песен подтянутся сами."
        >
          <button className="btn primary" onClick={() => void api.library.pickFolder()}>
            <FolderPlus size={18} /> Выбрать папку
          </button>
          <div className="empty-link">{linkBar}</div>
        </Empty>
      ) : (
        <>
          {list.length > 0 && <CoverFlow tracks={list} playingId={playingId} focusIndex={focusIndex} onPlay={(i) => play(list, i)} />}
          <div className="track-list glass">
            {list.slice(0, 400).map((t, i) => (
              <button key={t.id} className={`track-row ${t.id === playingId ? "playing" : ""}`} onClick={() => play(list, i)}>
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
      )}

      {imp.choices && (
        <div className="cmdk-backdrop" onMouseDown={() => imp.setChoices(null)}>
          <div className="cmdk glass chooser" onMouseDown={(e) => e.stopPropagation()}>
            <div className="chooser-head">
              <b>На странице нашлось {imp.choices.length} треков</b>
              <button className="icon-btn" onClick={() => imp.setChoices(null)}>
                <X size={17} />
              </button>
            </div>
            <div className="cmdk-list">
              {imp.choices.map((c, i) => (
                <button
                  key={c.url}
                  className={`cmdk-item ${c.on ? "sel" : ""}`}
                  onClick={() => imp.setChoices(imp.choices!.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                >
                  <span className={`check ${c.on ? "on" : ""}`}>{c.on && <Check size={13} strokeWidth={3} />}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <div className="chooser-foot">
              <button className="btn primary" disabled={!imp.choices.some((c) => c.on)} onClick={() => void imp.downloadChosen()}>
                <Download size={16} /> Скачать выбранные
              </button>
            </div>
          </div>
        </div>
      )}
      {drag && <div className="drop-hint">Отпусти — добавлю в библиотеку</div>}
    </div>
  );
}
