// Правка трека: название, исполнитель, альбом, обложка. Файл не трогаем — правка хранится в Камадо.
import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import type { Track } from "../../../shared/types";
import { api } from "../lib/api";
import { toast } from "../state/app";

const toB64 = (buf: ArrayBuffer) => {
  let s = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};

export function TrackEditModal({ track, onClose }: { track: Track; onClose: () => void }) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album);
  const [cover, setCover] = useState(track.cover);
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.select();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const imageFile = async (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setBusy(true);
    const t = await api.library.setCover(track.id, { data: toB64(await f.arrayBuffer()), mime: f.type });
    setBusy(false);
    if (t) setCover(t.cover);
  };

  const save = async () => {
    setBusy(true);
    await api.library.edit(track.id, { title, artist, album });
    setBusy(false);
    toast("Сохранил", "ok");
    onClose();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal glass track-edit"
        onClick={(e) => e.stopPropagation()}
        onPaste={(e) => {
          const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
          if (f) {
            e.preventDefault();
            void imageFile(f);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
          if (f) {
            e.preventDefault();
            void imageFile(f);
          }
        }}
      >
        <button className="icon-btn wn-close" onClick={onClose} title="Закрыть (Esc)">
          <X size={18} />
        </button>
        <h2>Правка песни</h2>
        <div className="te-body">
          <button
            className="te-cover"
            style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
            disabled={busy}
            title="Выбрать картинку (или вставь её Ctrl+V / перетащи сюда)"
            onClick={async () => {
              const t = await api.library.setCover(track.id);
              if (t) setCover(t.cover);
            }}
          >
            <span>
              <ImagePlus size={18} /> Обложка
            </span>
          </button>
          <div className="te-fields">
            <label>
              Название
              <input ref={first} className="input" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void save()} />
            </label>
            <label>
              Исполнитель
              <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void save()} />
            </label>
            <label>
              Альбом
              <input className="input" value={album} onChange={(e) => setAlbum(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void save()} />
            </label>
          </div>
        </div>
        <p className="muted small">Файл песни не меняется — правка хранится в Камадо. По новому названию заново ищется текст песни.</p>
        <div className="te-btns">
          {track.edited && (
            <button
              className="link-btn"
              disabled={busy}
              onClick={async () => {
                await api.library.resetEdit(track.id);
                toast("Вернул как в файле", "ok");
                onClose();
              }}
            >
              <RotateCcw size={13} /> как в файле
            </button>
          )}
          <span className="te-sp" />
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void save()}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
