// «Библиотека»: все свои книги по разделам — поиск, чтение PDF прямо в Камадо, скачать к себе, отметки и где остановился.
// Список книг хранится только у владельца; можно импортировать файл со списком или добавить свои PDF.
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { BookOpen, Download, ExternalLink, FileDown, FileUp, Globe, Library, Link2, Plus, Search, Trash2, X } from "lucide-react";
import type { Book, BookSource } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import { books, loadBooks, STATUS_LABEL } from "../state/books";
import { askAssistant, grow, markActive } from "../state/grow";
import { PdfReader } from "../components/PdfReader";
import { Empty } from "../components/ui";

export function LibraryView() {
  const s = useStore(books, (x) => x);
  const want = useStore(grow, (x) => x.libSection);
  const [q, setQ] = useState("");
  const [section, setSection] = useState<string>(want ?? "");
  const [adding, setAdding] = useState(false);
  const [editSources, setEditSources] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [over, setOver] = useState(false);
  useEffect(() => {
    void loadBooks();
  }, []);
  useEffect(() => {
    if (want !== undefined) {
      setSection(want);
      grow.set({ libSection: undefined });
    }
  }, [want]);

  const sections = useMemo(() => [...new Set(s.list.map((b) => b.section))].sort((a, b) => a.localeCompare(b, "ru")), [s.list]);
  const shown = s.list.filter(
    (b) =>
      (!section || b.section === section || b.section.toLocaleLowerCase("ru").includes(section.toLocaleLowerCase("ru"))) &&
      (!q.trim() || `${b.title} ${b.author ?? ""} ${b.section}`.toLocaleLowerCase("ru").includes(q.trim().toLocaleLowerCase("ru"))),
  );
  const reading = s.list.filter((b) => b.status === "reading" && b.file);
  const groups = new Map<string, Book[]>();
  for (const b of shown) groups.set(b.section, [...(groups.get(b.section) ?? []), b]);

  const open = (b: Book) => {
    books.set({ reading: b });
    void markActive();
  };
  const download = async (b: Book) => {
    setBusy(b.id);
    try {
      const r = await api.books.download(b.id);
      if ("error" in r) toast(r.error, "warn");
      else toast(`Скачано: ${(r.size / 1e6).toFixed(1)} МБ — теперь читается без интернета`, "ok");
    } finally {
      setBusy("");
    }
  };
  const importList = async () => {
    const r = await api.books.import();
    if ("cancelled" in r) return;
    if ("error" in r) toast(r.error, "warn");
    else toast(`Добавлено книг: ${r.books}${r.sources ? `, источников: ${r.sources}` : ""}`, "ok");
  };
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => api.pathForFile(f))
      .filter((p) => /\.pdf$/i.test(p));
    if (!paths.length) return toast("Перетащи PDF-файлы", "warn");
    const r = await api.books.addPaths(paths, section || undefined);
    toast(`Добавлено: ${r.added}`, "ok");
  };

  return (
    <div
      className={`lib ${over ? "drop" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="lib-tools">
        <div className="lib-search">
          <Search size={16} />
          <input className="input" placeholder="Найти книгу, автора, раздел" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn" onClick={() => void api.books.pickFiles(section || undefined)}>
          <FileUp size={16} /> PDF с компьютера
        </button>
        <button className="btn" onClick={() => setAdding((v) => !v)}>
          <Link2 size={16} /> По ссылке
        </button>
        <button className="btn" onClick={() => void importList()} title="Файл со списком книг (JSON)">
          <FileDown size={16} /> Импорт списка
        </button>
        <button className="btn ghost" onClick={() => void api.books.export()} title="Сохранить свой список в файл">
          Экспорт
        </button>
        <button className="btn ghost" onClick={() => setEditSources((v) => !v)} title="Где искать темы (поиск по сайту)">
          <Globe size={16} /> Источники
        </button>
      </div>

      {adding && <AddByLink defaultSection={section} onDone={() => setAdding(false)} />}
      {editSources && <SourcesEditor sources={s.sources} onClose={() => setEditSources(false)} />}

      {sections.length > 0 && (
        <div className="chips">
          <button className={`chip-btn ${!section ? "on" : ""}`} onClick={() => setSection("")}>
            Все · {s.list.length}
          </button>
          {sections.map((x) => (
            <button key={x} className={`chip-btn ${section === x ? "on" : ""}`} onClick={() => setSection(x)}>
              {x} · {s.list.filter((b) => b.section === x).length}
            </button>
          ))}
        </div>
      )}

      {reading.length > 0 && !q && !section && (
        <section className="card glass lib-continue">
          <h3 className="section-title">
            <BookOpen size={16} /> Продолжить чтение
          </h3>
          <div className="lib-cont-row">
            {reading.slice(0, 4).map((b) => (
              <button key={b.id} className="lib-cont" onClick={() => open(b)}>
                <b>{b.title}</b>
                <span className="muted small">
                  стр. {b.page ?? 1}
                  {b.pages ? ` из ${b.pages}` : ""}
                </span>
                {b.pages ? (
                  <div className="gd-bar">
                    <i style={{ width: `${((b.page ?? 1) / b.pages) * 100}%` }} />
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}

      {s.loaded && s.list.length === 0 ? (
        <Empty icon={<Library size={30} />} title="Библиотека пуста" text="Перетащи сюда PDF, добавь книгу по ссылке или импортируй свой список книг (файл .json).">
          <button className="btn primary" onClick={() => void importList()}>
            <FileDown size={16} /> Импорт списка
          </button>
        </Empty>
      ) : (
        [...groups].map(([sec, list]) => (
          <section key={sec} className="lib-group">
            <h3 className="section-title">{sec}</h3>
            <div className="lib-grid">
              {list.map((b) => (
                <BookCard key={b.id} book={b} busy={busy === b.id} onOpen={() => open(b)} onDownload={() => void download(b)} />
              ))}
            </div>
          </section>
        ))
      )}

      {s.reading && (
        <PdfReader
          book={s.reading}
          onClose={() => books.set({ reading: undefined })}
          onAsk={({ book, page, selection }) =>
            askAssistant(
              selection ? `Объясни этот фрагмент из книги «${book.title}» (стр. ${page}):\n«${selection}»` : `Я читаю «${book.title}», страница ${page}. Помоги разобраться с темой этой страницы.`,
            )
          }
        />
      )}
    </div>
  );
}

function BookCard({ book: b, busy, onOpen, onDownload }: { book: Book; busy: boolean; onOpen: () => void; onDownload: () => void }) {
  const cycle = () => void api.books.save({ ...b, status: b.status === "want" ? "reading" : b.status === "reading" ? "done" : "want" });
  return (
    <div className={`lib-card glass st-${b.status}`}>
      <div className="lib-cover" onClick={b.file ? onOpen : undefined}>
        <BookOpen size={22} />
      </div>
      <div className="lib-body">
        <b className="lib-title" title={b.title}>
          {b.title}
        </b>
        {b.author && <span className="muted small">{b.author}</span>}
        <div className="lib-meta">
          <button className={`lib-status st-${b.status}`} onClick={cycle} title="Нажми, чтобы сменить">
            {STATUS_LABEL[b.status]}
          </button>
          {b.pages ? (
            <span className="muted small">
              стр. {b.page ?? 1}/{b.pages}
            </span>
          ) : null}
        </div>
        <div className="lib-actions">
          {b.file ? (
            <button className="btn sm primary" onClick={onOpen}>
              <BookOpen size={14} /> Читать
            </button>
          ) : b.url ? (
            <button className="btn sm" disabled={busy} onClick={onDownload} title="Скачать PDF к себе — читать в Камадо и без интернета">
              <Download size={14} /> {busy ? "Качаю…" : "Скачать"}
            </button>
          ) : null}
          {b.url && (
            <a className="icon-btn sm" href={b.url} target="_blank" rel="noreferrer" title="Открыть страницу книги">
              <ExternalLink size={14} />
            </a>
          )}
          <button
            className="icon-btn sm danger"
            title="Убрать из библиотеки"
            onClick={() => {
              if (confirm(`Убрать «${b.title}» из библиотеки?${b.file ? " Скачанный файл тоже удалится." : ""}`)) void api.books.remove(b.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddByLink({ defaultSection, onDone }: { defaultSection: string; onDone: () => void }) {
  const [f, setF] = useState({ title: "", author: "", section: defaultSection, url: "" });
  const save = async () => {
    if (!f.title.trim()) return toast("Напиши название", "warn");
    if (f.url && !/^https?:\/\//i.test(f.url)) return toast("Ссылка должна начинаться с https://", "warn");
    await api.books.save({ title: f.title, author: f.author || undefined, section: f.section || "Разное", url: f.url || undefined, status: "want" });
    onDone();
  };
  return (
    <section className="card glass lib-add">
      <div className="lib-add-row">
        <input className="input" placeholder="Название" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className="input" placeholder="Автор" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} />
        <input className="input" placeholder="Раздел (например, Матанализ)" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} />
      </div>
      <input className="input" placeholder="Ссылка на PDF или страницу книги (необязательно)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
      <div className="row-actions">
        <button className="btn primary" onClick={() => void save()}>
          <Plus size={16} /> Добавить
        </button>
        <button className="btn ghost" onClick={onDone}>
          Отмена
        </button>
      </div>
    </section>
  );
}

function SourcesEditor({ sources, onClose }: { sources: BookSource[]; onClose: () => void }) {
  const [list, setList] = useState(sources.map((s) => ({ ...s })));
  const save = async () => {
    const r = await api.books.setSources(list.filter((s) => s.name.trim() && s.url.trim()));
    books.set({ sources: r });
    if (r.length < list.filter((s) => s.name.trim()).length) toast("Некоторые адреса не сохранились: нужен https:// и {q} на месте запроса", "warn");
    onClose();
  };
  return (
    <section className="card glass lib-add">
      <h3 className="section-title">
        <Globe size={16} /> Где искать темы
      </h3>
      <p className="muted small">Адрес поиска сайта, где вместо запроса стоит {"{q}"}. Кнопки появятся у каждой темы в «Программе курса».</p>
      {list.map((s, i) => (
        <div key={s.id} className="lib-add-row">
          <input className="input" placeholder="Название" value={s.name} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <input className="input wide" placeholder="https://сайт/search?q={q}" value={s.url} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <button className="icon-btn" title="Убрать" onClick={() => setList(list.filter((_, j) => j !== i))}>
            <X size={15} />
          </button>
        </div>
      ))}
      <div className="row-actions">
        <button className="btn" onClick={() => setList([...list, { id: `${Date.now()}`, name: "", url: "" }])}>
          <Plus size={15} /> Источник
        </button>
        <button className="btn primary" onClick={() => void save()}>
          Сохранить
        </button>
        <button className="btn ghost" onClick={onClose}>
          Отмена
        </button>
      </div>
    </section>
  );
}
