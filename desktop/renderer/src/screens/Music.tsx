// «Музыка»: своя библиотека (карусель + список), добавление из папки, перетаскиванием или по ссылке.
import { useEffect, useMemo, useState } from "react";
import { Check, Disc3, Download, Flame, Folder, FolderPlus, Globe, Heart, Link2, ListMusic, Music2, Plus, RefreshCw, Search, Shuffle, Trash2, X } from "lucide-react";
import type { FreeAlbum, Track } from "../../../shared/types";
import { api } from "../lib/api";
import { fmtTime } from "../lib/format";
import { useStore } from "../lib/store";
import { app, toast } from "../state/app";
import { loadPlaylists, player, playQueue, shuffleAll, toggleFavorite } from "../state/player";
import { CoverFlow } from "../components/CoverFlow";
import { Empty } from "../components/ui";

const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
/** Вставили код страницы, а не ссылку. */
const looksLikeHtml = (s: string) => /<(?:html|body|audio|source|a|div|meta)\b/i.test(s);
const TRACK_MIME = "application/x-camado-track";

/** Вкладка «Музыки»: все треки, любимое, частое, папка или свой плейлист. */
type Tab = { kind: "all" } | { kind: "fav" } | { kind: "top" } | { kind: "folder"; path: string } | { kind: "list"; id: number };
const tabKey = (t: Tab) => (t.kind === "folder" ? `f:${t.path}` : t.kind === "list" ? `p:${t.id}` : t.kind);
const folderName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

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
      const r = looksLikeHtml(url) && !looksLikeUrl(url) ? await api.music.importHtml(url) : await api.music.importUrl(url);
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

/** Поиск бесплатной музыки (Internet Archive): записи, которые авторы выложили для свободного скачивания. */
function FreeSearch({ onClose, onPick }: { onClose: () => void; onPick: (links: { url: string; name: string }[]) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<FreeAlbum[] | null>(null);
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      setFound(await api.music.searchFree(q));
    } catch {
      toast("Поиск не ответил — проверь интернет", "warn");
    } finally {
      setBusy(false);
    }
  };
  const open = async (a: FreeAlbum) => {
    setBusy(true);
    try {
      const tracks = await api.music.freeTracks(a.id);
      if (!tracks.length) toast("В этой записи нет треков для скачивания", "warn");
      else onPick(tracks);
    } catch {
      toast("Не получилось открыть запись", "warn");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div className="cmdk glass free-search" onMouseDown={(e) => e.stopPropagation()}>
        <div className="chooser-head">
          <b>Бесплатная музыка</b>
          <span className="muted small">Internet Archive: то, что авторы выложили для свободного скачивания</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <div className="link-bar">
          <Search size={17} />
          <input autoFocus placeholder="lofi, jazz, исполнитель или альбом…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void search()} />
          <button className="btn primary" disabled={busy || !q.trim()} onClick={() => void search()}>
            {busy ? "Ищу…" : "Найти"}
          </button>
        </div>
        {found && found.length === 0 && <div className="muted pad">Ничего не нашлось. Попробуй по-английски или жанром: lofi, ambient, jazz.</div>}
        {found && found.length > 0 && (
          <div className="free-grid">
            {found.map((a) => (
              <button key={a.id} className="free-item" onClick={() => void open(a)} disabled={busy}>
                <span className="fi-cover" style={{ backgroundImage: `url("${a.cover}")` }} />
                <span className="fi-title">{a.title}</span>
                <span className="fi-artist">{a.artist}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Маленькое меню «добавить в плейлист» у трека. */
function AddToPlaylist({ trackId, onDone }: { trackId: string; onDone: () => void }) {
  const playlists = useStore(player, (s) => s.playlists);
  const [name, setName] = useState("");
  const add = async (id: number, title: string) => {
    await api.playlists.add(id, [trackId]);
    toast(`Добавил в «${title}»`, "ok");
    await loadPlaylists();
    onDone();
  };
  const create = async () => {
    const p = await api.playlists.create(name || "Новый плейлист", [trackId]);
    toast(`Создал плейлист «${p.name}»`, "ok");
    await loadPlaylists();
    onDone();
  };
  return (
    <div className="pl-menu glass" onClick={(e) => e.stopPropagation()}>
      {playlists.map((p) => (
        <button key={p.id} onClick={() => void add(p.id, p.name)}>
          <ListMusic size={14} /> {p.name}
        </button>
      ))}
      <div className="pl-new">
        <input className="input sm" placeholder="Новый плейлист" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void create()} />
        <button className="icon-btn" title="Создать" onClick={() => void create()}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

export function Music() {
  const library = useStore(player, (s) => s.library);
  const queue = useStore(player, (s) => s.queue);
  const index = useStore(player, (s) => s.index);
  const playlists = useStore(player, (s) => s.playlists);
  const favorites = useStore(player, (s) => s.favorites);
  const [q, setQ] = useState("");
  const [link, setLink] = useState("");
  const [drag, setDrag] = useState(false);
  const [tab, setTab] = useState<Tab>({ kind: "all" });
  const [top, setTop] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);
  const [dropTab, setDropTab] = useState<string | null>(null);
  const imp = useImport();
  const playingId = queue[index]?.id;

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    void api.plays.stats(since, 100).then((st) => setTop(st.map((x) => x.trackId)));
  }, [playingId]);

  // Удалили плейлист, на котором стояли, — возвращаемся ко «Всем».
  useEffect(() => {
    if (tab.kind === "list" && !playlists.some((p) => p.id === tab.id)) setTab({ kind: "all" });
  }, [playlists, tab]);

  const byId = useMemo(() => new Map(library.tracks.map((t) => [t.id, t])), [library.tracks]);
  const ofIds = (ids: string[]) => ids.map((id) => byId.get(id)).filter((t): t is Track => !!t);
  const current = playlists.find((p) => tab.kind === "list" && p.id === tab.id);

  const tabTracks = useMemo(() => {
    if (tab.kind === "fav") return ofIds(favorites);
    if (tab.kind === "top") return ofIds(top);
    if (tab.kind === "folder") return library.tracks.filter((t) => t.path.startsWith(tab.path));
    if (tab.kind === "list") return current ? ofIds(current.trackIds) : [];
    return library.tracks;
  }, [tab, library.tracks, favorites, top, current, byId]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? tabTracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(s)) : tabTracks;
  }, [tabTracks, q]);

  const dropOnTab = async (e: React.DragEvent, t: Tab) => {
    const id = e.dataTransfer.getData(TRACK_MIME);
    setDropTab(null);
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    if (t.kind === "list") {
      await api.playlists.add(t.id, [id]);
      toast(`Добавил в «${playlists.find((p) => p.id === t.id)?.name}»`, "ok");
    } else if (t.kind === "fav" && !favorites.includes(id)) await toggleFavorite(id);
    await loadPlaylists();
  };
  const newPlaylist = async () => {
    const p = await api.playlists.create(`Плейлист ${playlists.length + 1}`);
    await loadPlaylists();
    setTab({ kind: "list", id: p.id });
  };
  const [renaming, setRenaming] = useState<string | null>(null);
  const renameCurrent = () => current && setRenaming(current.name);
  const saveRename = async () => {
    if (current && renaming?.trim()) {
      await api.playlists.rename(current.id, renaming);
      await loadPlaylists();
    }
    setRenaming(null);
  };
  const removeCurrent = async () => {
    if (!current || !window.confirm(`Удалить плейлист «${current.name}»? Сами песни останутся.`)) return;
    await api.playlists.remove(current.id);
    await loadPlaylists();
  };

  const tabs: { t: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { t: { kind: "all" }, label: "Все", icon: <Music2 size={14} />, count: library.tracks.length },
    { t: { kind: "fav" }, label: "Любимое", icon: <Heart size={14} />, count: ofIds(favorites).length },
    ...(top.length ? [{ t: { kind: "top" } as Tab, label: "Часто слушаю", icon: <Flame size={14} />, count: ofIds(top).length }] : []),
    ...(library.folders.length > 1
      ? library.folders.map((f) => ({ t: { kind: "folder", path: f } as Tab, label: folderName(f), icon: <Folder size={14} />, count: library.tracks.filter((t) => t.path.startsWith(f)).length }))
      : []),
    ...playlists.map((p) => ({ t: { kind: "list", id: p.id } as Tab, label: p.name, icon: <ListMusic size={14} />, count: ofIds(p.trackIds).length })),
  ];

  const play = (tracks: Track[], i: number) => void playQueue(tracks, i);
  const playingIndex = playingId ? list.findIndex((t) => t.id === playingId) : -1;

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
      if (looksLikeUrl(text) || looksLikeHtml(text)) {
        e.preventDefault();
        if (looksLikeUrl(text)) setLink(text.trim());
        void addLink(text.trim());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.types.includes(TRACK_MIME)) return; // перетаскивали трек внутри списка
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
        placeholder="Ссылка на трек, на страницу с ним, на Google Диск / Dropbox / Яндекс Диск — или код страницы"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void addLink()}
      />
      <button className="btn primary" disabled={!link.trim() || imp.busy} onClick={() => void addLink()}>
        <Download size={16} /> {imp.busy ? "Скачиваю…" : "Добавить"}
      </button>
      <button className="btn" title="Найти бесплатную музыку и скачать в один клик" onClick={() => setFreeOpen(true)}>
        <Globe size={16} /> Найти
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
        if (!e.dataTransfer.types.includes(TRACK_MIME)) setDrag(true);
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
          {library.tracks.length > 1 && (
            <button className="btn primary" title="Умный рандом: без повторов и без одного исполнителя подряд" onClick={() => void shuffleAll(list)}>
              <Shuffle size={16} /> Перемешать всё
            </button>
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

      {library.tracks.length > 0 && (
        <div className="pl-tabs">
          {tabs.map(({ t, label, icon, count }) => (
            <button
              key={tabKey(t)}
              className={`pl-tab ${tabKey(t) === tabKey(tab) ? "on" : ""} ${dropTab === tabKey(t) ? "drop" : ""}`}
              onClick={() => setTab(t)}
              onDoubleClick={() => t.kind === "list" && renameCurrent()}
              onDragOver={(e) => {
                if ((t.kind === "list" || t.kind === "fav") && e.dataTransfer.types.includes(TRACK_MIME)) {
                  e.preventDefault();
                  setDropTab(tabKey(t));
                }
              }}
              onDragLeave={() => setDropTab(null)}
              onDrop={(e) => void dropOnTab(e, t)}
            >
              {icon}
              <span>{label}</span>
              <i>{count}</i>
            </button>
          ))}
          <button className="pl-tab add" title="Новый плейлист" onClick={() => void newPlaylist()}>
            <Plus size={14} /> Плейлист
          </button>
          {current && (
            <span className="pl-tools">
              {renaming !== null ? (
                <input
                  className="input sm"
                  autoFocus
                  value={renaming}
                  onChange={(e) => setRenaming(e.target.value)}
                  onBlur={() => void saveRename()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
              ) : (
                <button className="link-btn" onClick={renameCurrent}>
                  переименовать
                </button>
              )}
              <button className="icon-btn danger" title="Удалить плейлист" onClick={() => void removeCurrent()}>
                <Trash2 size={15} />
              </button>
            </span>
          )}
        </div>
      )}

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
          {list.length > 0 && <CoverFlow key={tabKey(tab)} tracks={list} playingIndex={playingIndex} onPlay={(i) => play(list, i)} onOpen={() => app.set({ nowPlaying: true })} />}
          <div className="track-list glass">
            {list.slice(0, 400).map((t, i) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(TRACK_MIME, t.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className={`track-row ${t.id === playingId ? "playing" : ""}`}
                onClick={() => play(list, i)}
                onKeyDown={(e) => e.key === "Enter" && play(list, i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuFor(t.id);
                }}
              >
                <span className="tr-num">{t.id === playingId ? <Music2 size={14} /> : i + 1}</span>
                <span className="tr-cover" style={t.cover ? { backgroundImage: `url("${t.cover}")` } : undefined} />
                <span className="tr-title">{t.title}</span>
                <span className="tr-artist">{t.artist}</span>
                <span className="tr-album">{t.album}</span>
                <span className="tr-acts" onClick={(e) => e.stopPropagation()}>
                  <button className={`icon-btn fav ${favorites.includes(t.id) ? "on" : ""}`} title="Любимое" onClick={() => void toggleFavorite(t.id)}>
                    <Heart size={15} fill={favorites.includes(t.id) ? "currentColor" : "none"} />
                  </button>
                  {current ? (
                    <button
                      className="icon-btn"
                      title="Убрать из плейлиста"
                      onClick={() => void api.playlists.removeTrack(current.id, t.id).then(loadPlaylists)}
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <button className="icon-btn" title="В плейлист" onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}>
                      <Plus size={15} />
                    </button>
                  )}
                  {menuFor === t.id && <AddToPlaylist trackId={t.id} onDone={() => setMenuFor(null)} />}
                </span>
                <span className="tr-dur">{t.duration ? fmtTime(t.duration) : ""}</span>
              </div>
            ))}
            {list.length === 0 && tab.kind !== "all" && !q && (
              <div className="muted pad">
                {tab.kind === "fav"
                  ? "Нажми ♡ у трека — он появится здесь."
                  : tab.kind === "list"
                    ? "Пусто. Перетащи сюда треки из «Всех» или нажми + у трека."
                    : "Пока пусто."}
              </div>
            )}
            {list.length === 0 && (tab.kind === "all" || q) && <div className="muted pad">Ничего не нашлось</div>}
          </div>
        </>
      )}

      {freeOpen && (
        <FreeSearch
          onClose={() => setFreeOpen(false)}
          onPick={(links) => {
            setFreeOpen(false);
            imp.setChoices(links.map((l) => ({ ...l, on: true })));
          }}
        />
      )}
      {imp.choices && (
        <div className="cmdk-backdrop" onMouseDown={() => imp.setChoices(null)}>
          <div className="cmdk glass chooser" onMouseDown={(e) => e.stopPropagation()}>
            <div className="chooser-head">
              <b>Нашлось треков: {imp.choices.length}</b>
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
