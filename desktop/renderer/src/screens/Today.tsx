// «Сегодня»: часы, что горит, быстрая запись, фокус, музыка, неделя.
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Music2, NotebookPen, Sparkles, Timer, Zap } from "lucide-react";
import type { TaskKind } from "../../../shared/types";
import { api } from "../lib/api";
import { countdown, greeting, KIND_LABEL, plural, urgency } from "../lib/format";
import { useStore } from "../lib/store";
import { app, go, toast } from "../state/app";
import { data } from "../state/data";
import { focusToday } from "../state/focus";
import { nowMeta, player } from "../state/player";
import { MiniSpectrum } from "../components/Visualizer";
import { Segmented } from "../components/ui";

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="clock">
      <span>{hh}</span>
      <span className="clock-colon">:</span>
      <span>{mm}</span>
    </div>
  );
}

function QuickAdd() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<TaskKind>("homework");
  const [viaAi, setViaAi] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api.ai.status().then((s) => setAiOn(s.enabled));
  }, []);

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      if (viaAi && aiOn) {
        const r = await api.chat.send(t);
        toast(r.answer ?? r.error ?? "Готово", r.error ? "warn" : "ok");
      } else {
        const r = await api.tasks.quickAdd(t, kind);
        if (r.error) return toast(`Не записал: ${r.error}`, "warn");
        toast(`Записал: ${r.task!.title}`, "ok");
      }
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card glass quick">
      <div className="card-head">
        <Zap size={18} />
        <span>Быстрая запись</span>
        {aiOn && (
          <button className={`chip-btn ${viaAi ? "on" : ""}`} onClick={() => setViaAi(!viaAi)} title="Писать обычным текстом — Камадо разберёт">
            <Sparkles size={14} /> через Камадо
          </button>
        )}
      </div>
      <input
        className="input big"
        value={text}
        placeholder={viaAi ? "по матану №5–12 к пятнице, в среду контрольная по физике…" : "Матан | №5–12 | завтра 18:00"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
      />
      <div className="quick-foot">
        {!viaAi && (
          <Segmented
            size="sm"
            value={kind}
            onChange={setKind}
            options={(["homework", "test", "exam", "lab"] as const).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          />
        )}
        <span className="muted small">{viaAi ? "Enter — отправить Камадо" : "предмет | что | срок · Enter"}</span>
      </div>
    </div>
  );
}

function Week() {
  const tasks = useStore(data, (s) => s.tasks);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="card glass week">
      <div className="card-head">
        <span>Неделя</span>
      </div>
      <div className="week-days">
        {days.map((d, i) => {
          const end = new Date(d);
          end.setDate(end.getDate() + 1);
          const items = tasks.filter((t) => t.dueAt && new Date(t.dueAt) >= d && new Date(t.dueAt) < end);
          const big = items.some((t) => t.kind === "test" || t.kind === "exam");
          return (
            <div key={i} className={`wd ${i === 0 ? "today" : ""} ${big ? "big" : ""}`} title={items.map((t) => t.title).join("\n")}>
              <span className="wd-name">{new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d)}</span>
              <span className="wd-num">{d.getDate()}</span>
              <span className="wd-dots">
                {items.slice(0, 4).map((t) => (
                  <i key={t.id} className={`dot k-${t.kind}`} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Today() {
  const tasks = useStore(data, (s) => s.tasks);
  const notes = useStore(data, (s) => s.notes);
  const minutes = useStore(focusToday, (s) => s.minutes);
  useStore(player, (s) => s.index);
  useStore(player, (s) => s.online?.title);
  const playing = useStore(player, (s) => s.playing);
  const meta = nowMeta();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const hot = tasks.filter((t) => t.dueAt).slice(0, 5);
  const noDue = tasks.filter((t) => !t.dueAt).length;
  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="screen today">
      <header className="today-head">
        <div>
          <div className="eyebrow">{today}</div>
          <h1 className="display">{greeting()}!</h1>
          <p className="lead">
            {tasks.length === 0
              ? "Заданий нет — можно выдохнуть."
              : `Открыто ${tasks.length} ${plural(tasks.length, "задание", "задания", "заданий")}${hot[0] ? `, ближайшее ${countdown(hot[0].dueAt!)}` : ""}.`}
          </p>
        </div>
        <Clock />
      </header>

      <div className="today-grid">
        <div className="card glass hot">
          <div className="card-head">
            <Flame size={18} />
            <span>Горит</span>
            <button className="link-btn" onClick={() => go("tasks")}>
              все задания <ArrowRight size={14} />
            </button>
          </div>
          {hot.length === 0 ? (
            <div className="calm-state">
              <span className="calm-emoji">🌙</span>
              Сроков нет. {noDue > 0 ? `Ещё ${noDue} без срока.` : "Запиши первое задание справа."}
            </div>
          ) : (
            <ul className="hot-list">
              {hot.map((t, i) => (
                <li key={t.id} className={`hot-item u-${urgency(t.dueAt)}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="u-dot" />
                  <div className="hot-text">
                    <div className="hot-title">{t.title}</div>
                    <div className="hot-sub">
                      {KIND_LABEL[t.kind]}
                      {t.subject ? ` · ${t.subject}` : ""}
                    </div>
                  </div>
                  <div className="hot-due">{countdown(t.dueAt!)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <QuickAdd />

        <button className="card glass focus-card" onClick={() => go("focus")}>
          <div className="card-head">
            <Timer size={18} />
            <span>Фокус сегодня</span>
          </div>
          <div className="big-num">
            {Math.round(minutes)}
            <small>мин</small>
          </div>
          <div className="muted small">Нажми, чтобы начать сессию →</div>
        </button>

        <button className="card glass music-card" onClick={() => (meta ? app.set({ nowPlaying: true }) : go("music"))}>
          <div className="music-card-bg" style={meta?.cover ? { backgroundImage: `url("${meta.cover}")` } : undefined} />
          <div className="card-head">
            <Music2 size={18} />
            <span>{meta ? (playing ? "Сейчас играет" : "На паузе") : "Музыка"}</span>
          </div>
          {meta ? (
            <>
              <div className="mc-title">{meta.title}</div>
              <div className="mc-artist">{meta.artist}</div>
              <MiniSpectrum />
            </>
          ) : (
            <div className="muted">Включи что-нибудь для настроения →</div>
          )}
        </button>

        <Week />

        <div className="card glass notes-card">
          <div className="card-head">
            <NotebookPen size={18} />
            <span>Заметки</span>
            <button className="link-btn" onClick={() => go("notes")}>
              открыть <ArrowRight size={14} />
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="muted">Пока пусто.</div>
          ) : (
            notes.slice(0, 3).map((n) => (
              <div key={n.id} className="note-mini" onClick={() => go("notes")}>
                <div className="nm-title">{n.title || "Без названия"}</div>
                <div className="nm-body">{n.body.slice(0, 90)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
