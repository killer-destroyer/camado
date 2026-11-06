// «Ссылки»: все ссылки преподов в одном месте — Zoom, Meet, Moodle, чаты, диски.
// Вставляешь хоть целое сообщение из чата — Камадо сам вытащит ссылки и подпишет их.
import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ClipboardList,
  Cloud,
  Code2,
  Copy,
  FileText,
  Globe,
  GraduationCap,
  Link2,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  PlayCircle,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { extractLinks, serviceOf, type FoundLink } from "../../../shared/links";
import type { LessonLink } from "../../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { toast } from "../state/app";
import { data, refreshData } from "../state/data";
import { Empty } from "../components/ui";

const ICONS: Record<string, typeof Video> = {
  zoom: Video,
  meet: Video,
  telemost: Video,
  teams: Users,
  telegram: Send,
  discord: MessagesSquare,
  google: FileText,
  yadisk: Cloud,
  dropbox: Cloud,
  youtube: PlayCircle,
  github: Code2,
  notion: ClipboardList,
  stepik: GraduationCap,
  course: GraduationCap,
  lms: BookOpen,
  web: Globe,
};

const NO_SUBJECT = "";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Вставка пачкой: текст → найденные ссылки → выбрать предмет → сохранить. */
function PasteBox({ subjects }: { subjects: string[] }) {
  const [text, setText] = useState("");
  const [found, setFound] = useState<(FoundLink & { on: boolean })[]>([]);
  const [subject, setSubject] = useState(NO_SUBJECT);
  const [newSubject, setNewSubject] = useState("");

  const onText = (v: string) => {
    setText(v);
    setFound(extractLinks(v).map((l) => ({ ...l, on: true })));
  };
  const save = async () => {
    const subj = (subject === "+" ? newSubject.trim() : subject) || null;
    if (subject === "+" && subj) await api.subjects.save({ name: subj });
    const chosen = found.filter((f) => f.on);
    for (const f of chosen) await api.links.save({ title: f.title, url: f.url, subject: subj });
    toast(`Сохранил ${chosen.length} ${chosen.length === 1 ? "ссылку" : chosen.length < 5 ? "ссылки" : "ссылок"}`, "ok");
    setText("");
    setFound([]);
    setNewSubject("");
    void refreshData();
  };

  return (
    <div className="card glass links-paste">
      <div className="card-head">
        <Plus size={18} />
        <span>Добавить ссылки</span>
      </div>
      <textarea
        className="input"
        rows={found.length ? 3 : 2}
        value={text}
        placeholder="Вставь ссылку или целое сообщение препода — Камадо сам найдёт все ссылки и подпишет их"
        onChange={(e) => onText(e.target.value)}
      />
      {found.length > 0 && (
        <>
          <div className="lp-found">
            {found.map((f, i) => {
              const Icon = ICONS[serviceOf(f.url).id] ?? Globe;
              return (
                <div key={f.url} className={`lp-item ${f.on ? "" : "off"}`}>
                  <button
                    className="lp-check"
                    onClick={() => setFound(found.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                    title={f.on ? "Не сохранять" : "Сохранить"}
                  >
                    {f.on ? <Check size={14} /> : null}
                  </button>
                  <Icon size={16} />
                  <input
                    className="lp-title"
                    value={f.title}
                    onChange={(e) => setFound(found.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  />
                  <span className="lp-host">{hostOf(f.url)}</span>
                </div>
              );
            })}
          </div>
          <div className="lp-foot">
            <span className="muted small">Предмет:</span>
            <div className="chips">
              {[NO_SUBJECT, ...subjects].map((s) => (
                <button key={s || "none"} className={`chip-btn ${subject === s ? "on" : ""}`} onClick={() => setSubject(s)}>
                  {s || "Без предмета"}
                </button>
              ))}
              <button className={`chip-btn ${subject === "+" ? "on" : ""}`} onClick={() => setSubject("+")}>
                + новый
              </button>
              {subject === "+" && (
                <input className="input sm" autoFocus placeholder="Название предмета" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              )}
            </div>
            <button className="btn primary" disabled={!found.some((f) => f.on)} onClick={() => void save()}>
              Сохранить {found.filter((f) => f.on).length}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LinkTile({ link, onEdit }: { link: LessonLink; onEdit: () => void }) {
  const svc = serviceOf(link.url);
  const Icon = ICONS[svc.id] ?? Globe;
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div
      className={`link-tile svc-${svc.id} ${link.pinned ? "pinned" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => void api.links.open(link.id)}
      onKeyDown={(e) => e.key === "Enter" && void api.links.open(link.id)}
      title={link.url}
    >
      <span className="lt-icon">
        <Icon size={20} />
      </span>
      <span className="lt-text">
        <span className="lt-title">{link.title}</span>
        <span className="lt-sub">
          {svc.id === "web" ? hostOf(link.url) : svc.name}
          {link.note ? ` · ${link.note}` : ""}
        </span>
      </span>
      <span className="lt-actions" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" title={link.pinned ? "Открепить" : "Закрепить наверху"} onClick={() => void api.links.save({ ...link, pinned: !link.pinned }).then(refreshData)}>
          {link.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
        <button className="icon-btn" title="Скопировать ссылку" onClick={(e) => void copy(e)}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button className="icon-btn" title="Изменить" onClick={onEdit}>
          <Pencil size={14} />
        </button>
      </span>
    </div>
  );
}

function LinkEditor({ link, subjects, onClose }: { link: LessonLink; subjects: string[]; onClose: () => void }) {
  const [v, setV] = useState({ title: link.title, url: link.url, subject: link.subject ?? "", note: link.note });
  const save = async () => {
    try {
      await api.links.save({ id: link.id, title: v.title, url: v.url, subject: v.subject || null, note: v.note });
      void refreshData();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не получилось сохранить", "warn");
    }
  };
  const remove = async () => {
    await api.links.remove(link.id);
    void refreshData();
    onClose();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal glass link-editor" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <div className="card-head">
          <Link2 size={18} />
          <span>Ссылка</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <label>
          Название
          <input className="input" autoFocus value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </label>
        <label>
          Адрес
          <input className="input mono" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} />
        </label>
        <label>
          Предмет
          <select className="input" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })}>
            <option value="">Без предмета</option>
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Пометка
          <input className="input" placeholder="пары по вт 10:00 · код 1234 · сдавать сюда" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        </label>
        <div className="le-foot">
          <button className="btn danger" onClick={() => void remove()}>
            <Trash2 size={15} /> Удалить
          </button>
          <button className="btn primary" onClick={() => void save()}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export function Links() {
  const links = useStore(data, (s) => s.links);
  const subjectList = useStore(data, (s) => s.subjects);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<LessonLink | null>(null);
  const subjects = subjectList.map((s) => s.name);
  const teacher = (name: string) => subjectList.find((s) => s.name === name)?.teacher;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? links.filter((l) => `${l.title} ${l.url} ${l.subject ?? ""} ${l.note} ${teacher(l.subject ?? "") ?? ""}`.toLowerCase().includes(needle))
      : links;
  }, [links, q, subjectList]);

  const pinned = shown.filter((l) => l.pinned);
  const recent = q
    ? []
    : [...shown]
        .filter((l) => l.openedAt && !l.pinned)
        .sort((a, b) => (b.openedAt ?? "").localeCompare(a.openedAt ?? ""))
        .slice(0, 4);
  const groups = new Map<string, LessonLink[]>();
  for (const l of shown) {
    const k = l.subject ?? NO_SUBJECT;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  const order = [...groups.keys()].sort((a, b) => (a === NO_SUBJECT ? 1 : b === NO_SUBJECT ? -1 : a.localeCompare(b, "ru")));

  return (
    <div className="screen links">
      <header className="screen-head">
        <h1 className="display">Ссылки</h1>
        {links.length > 0 && (
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Найти: препод, предмет, zoom…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </header>

      <PasteBox subjects={subjects} />

      {links.length === 0 ? (
        <Empty icon={<Link2 size={40} />} title="Здесь будут все ссылки на пары" text="Zoom, Meet, Moodle, чаты, диски преподов — вставь их выше, и они разложатся по предметам." />
      ) : (
        <>
          {(pinned.length > 0 || recent.length > 0) && (
            <section className="links-top">
              {pinned.length > 0 && (
                <div className="links-group">
                  <div className="lg-head">
                    <Pin size={14} /> Закреплённые
                  </div>
                  <div className="links-grid">
                    {pinned.map((l) => (
                      <LinkTile key={l.id} link={l} onEdit={() => setEditing(l)} />
                    ))}
                  </div>
                </div>
              )}
              {recent.length > 0 && (
                <div className="links-group">
                  <div className="lg-head">Недавно открывал</div>
                  <div className="links-grid">
                    {recent.map((l) => (
                      <LinkTile key={l.id} link={l} onEdit={() => setEditing(l)} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
          <div className="links-subjects">
            {order.map((k) => (
              <section key={k || "none"} className="card glass links-subject">
                <div className="ls-head">
                  <span className="ls-name">{k || "Без предмета"}</span>
                  {k && teacher(k) && <span className="ls-teacher">{teacher(k)}</span>}
                  <span className="ls-count">{groups.get(k)!.length}</span>
                </div>
                <div className="links-grid">
                  {groups.get(k)!.map((l) => (
                    <LinkTile key={l.id} link={l} onEdit={() => setEditing(l)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      {editing && <LinkEditor link={editing} subjects={subjects} onClose={() => setEditing(null)} />}
    </div>
  );
}
