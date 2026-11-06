// «Сегодня»: часы, что горит, быстрая запись, фокус, музыка, неделя.
import { useEffect, useState } from "react";
import { AlarmClock, ArrowRight, Check, Flame, ListChecks, Music2, NotebookPen, Play, Sparkles, Timer, X, Zap } from "lucide-react";
import { addAlarm, removeAlarm } from "../state/alarms";
import { MediaButtons } from "../components/MediaButtons";
import { LevelBadge } from "../components/Achievements";
import { buildDayPlan } from "../../../shared/plan";
import type { TaskKind } from "../../../shared/types";
import { api } from "../lib/api";
import { countdown, greeting, KIND_LABEL, plural, urgency } from "../lib/format";
import { useStore } from "../lib/store";
import { app, go, toast } from "../state/app";
import { data } from "../state/data";
import { focus, focusToday, setMode, start as startFocus } from "../state/focus";
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
          <button
            className={`chip-btn ${viaAi ? "on" : ""}`}
            onClick={() => setViaAi(!viaAi)}
            title="Писать обычным текстом — Камадо разберёт"
          >
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
        <MediaButtons onResult={(t, ok) => toast(t, ok ? "ok" : "warn")} />
      </div>
    </div>
  );
}

/** Свои напоминания: «в 18:00 — позвонить маме». Звенят выбранным в Настройках звуком. */
function Reminders() {
  const list = useStore(app, (s) => s.settings.alarms);
  const [text, setText] = useState("");
  const [time, setTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60e3);
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  });
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const add = () => {
    const [h, m] = time.split(":").map(Number) as [number, number];
    if (!Number.isFinite(h)) return;
    const at = new Date();
    at.setHours(h, m || 0, 0, 0);
    if (day === "tomorrow") at.setDate(at.getDate() + 1);
    else if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1); // время уже прошло — значит, завтра
    addAlarm(text.trim() || "Напоминание", at);
    toast(`Напомню ${fmtWhen(at)}`, "ok");
    setText("");
  };
  return (
    <div className="card glass alarms-card">
      <div className="card-head">
        <AlarmClock size={18} />
        <span>Напоминания</span>
        <button className="link-btn" onClick={() => go("settings")}>
          звук <ArrowRight size={14} />
        </button>
      </div>
      <input
        className="input"
        value={text}
        placeholder="что напомнить"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
      />
      <div className="alarm-add">
        <input className="input time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <Segmented
          size="sm"
          value={day}
          onChange={setDay}
          options={[
            { value: "today", label: "сегодня" },
            { value: "tomorrow", label: "завтра" },
          ]}
        />
        <button className="btn primary" onClick={add}>
          Добавить
        </button>
      </div>
      {list.length > 0 && (
        <div className="alarm-list">
          {list.slice(0, 5).map((a) => (
            <div key={a.id} className="alarm-item">
              <b>{fmtWhen(new Date(a.at))}</b>
              <span>{a.text}</span>
              <button className="icon-btn" title="Удалить" onClick={() => removeAlarm(a.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtWhen(d: Date): string {
  const t = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `сегодня в ${t}`;
  if (d.toDateString() === tomorrow.toDateString()) return `завтра в ${t}`;
  return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} в ${t}`;
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

function Plan() {
  const tasks = useStore(data, (s) => s.tasks);
  const done = useStore(focusToday, (s) => s.minutes);
  const session = useStore(app, (s) => s.settings.focus.work);
  const steps = buildDayPlan(tasks, Date.now(), done, session);
  const total = steps.reduce((a, s) => a + s.minutes, 0);

  const begin = (taskId: number, subject: string | null) => {
    if (focus.get().running) return go("focus");
    setMode("work");
    focus.set({ subject: subject ?? "" });
    void api.tasks.update(taskId, { status: "in_progress" });
    startFocus();
    go("focus");
  };

  return (
    <div className="card glass plan">
      <div className="card-head">
        <ListChecks size={18} />
        <span>План на сегодня</span>
        {total > 0 && (
          <span className="plan-total">
            ≈ {total >= 60 ? `${Math.floor(total / 60)} ч ${total % 60 ? `${total % 60} мин` : ""}` : `${total} мин`}
          </span>
        )}
      </div>
      {steps.length === 0 ? (
        <div className="calm-state">
          <span className="calm-emoji">✨</span>
          {done > 0 ? `Сегодня уже ${Math.round(done)} мин в фокусе — и всё срочное позади.` : "Планировать нечего — свободный день."}
        </div>
      ) : (
        <ol className="plan-list">
          {steps.map((s, i) => (
            <li key={s.task.id} className="plan-step" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="plan-num">{i + 1}</span>
              <div className="plan-text">
                <div className="plan-title">{s.task.title}</div>
                <div className="plan-why">
                  {s.task.subject ? `${s.task.subject} · ` : ""}
                  {s.reason}
                </div>
              </div>
              <span className="plan-min">{s.minutes} мин</span>
              <button className="play-btn sm" title="Начать фокус по этому заданию" onClick={() => begin(s.task.id, s.task.subject)}>
                <Play size={16} fill="currentColor" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const SETUP_KEY = "camado-setup-hidden";

function FirstSteps() {
  const tracks = useStore(player, (s) => s.library.tracks.length);
  const tasks = useStore(data, (s) => s.tasks.length);
  const [ai, setAi] = useState<boolean | null>(null);
  const [bot, setBot] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(SETUP_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    void api.ai.status().then((s) => setAi(s.enabled));
    void api.bot.status().then((s) => setBot(s.configured && s.paired));
  }, []);
  const items = [
    {
      done: tracks > 0,
      label: "Добавь музыку",
      hint: "папка, файлы или ссылка",
      go: "music" as const,
    },
    {
      done: tasks > 0,
      label: "Запиши первое задание",
      hint: "в «Быстрой записи» ниже",
      go: "tasks" as const,
    },
    {
      done: !!bot,
      label: "Подключи Telegram-бота",
      hint: "писать Камадо с телефона",
      go: "settings" as const,
    },
    {
      done: !!ai,
      label: "Включи ИИ",
      hint: "понимать обычный текст",
      go: "settings" as const,
    },
  ];
  if (hidden || ai === null || bot === null || items.every((i) => i.done)) return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(SETUP_KEY, "1");
    } catch {
      // приватный режим — просто скроем до перезапуска
    }
  };
  return (
    <div className="card glass setup">
      <div className="card-head">
        <Sparkles size={18} />
        <span>Первые шаги</span>
        <button className="icon-btn setup-close" title="Скрыть" onClick={hide}>
          <X size={16} />
        </button>
      </div>
      <div className="setup-items">
        {items.map((i) => (
          <button key={i.label} className={`setup-item ${i.done ? "done" : ""}`} onClick={() => go(i.go)}>
            <span className={`check ${i.done ? "on" : ""}`}>{i.done && <Check size={13} strokeWidth={3} />}</span>
            <span>
              <b>{i.label}</b>
              <em>{i.hint}</em>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Today() {
  const tasks = useStore(data, (s) => s.tasks);
  const notes = useStore(data, (s) => s.notes);
  const minutes = useStore(focusToday, (s) => s.minutes);
  useStore(player, (s) => s.index);
  const playing = useStore(player, (s) => s.playing);
  const meta = nowMeta();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const hot = tasks.filter((t) => t.dueAt).slice(0, 5);
  const noDue = tasks.filter((t) => !t.dueAt).length;
  const today = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="screen today">
      <header className="today-head">
        <div>
          <div className="eyebrow">{today}</div>
          <h1 className="display">{greeting()}!</h1>
          <LevelBadge />
          <p className="lead">
            {tasks.length === 0
              ? "Заданий нет — можно выдохнуть."
              : `Открыто ${tasks.length} ${plural(tasks.length, "задание", "задания", "заданий")}${hot[0] ? `, ближайшее ${countdown(hot[0].dueAt!)}` : ""}.`}
          </p>
        </div>
        <div className="today-side">
          <Clock />
          <button className={`btn recap-btn ${new Date().getDay() === 1 || new Date().getDay() === 0 ? "fresh" : ""}`} onClick={() => app.set({ recap: true })}>
            <Sparkles size={16} /> Итоги недели
          </button>
        </div>
      </header>

      <div className="today-grid">
        <FirstSteps />
        <Plan />
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

        <Reminders />

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
