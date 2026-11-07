// Карточки «Сегодня»: как я (сон и энергия), ближайшая пара и «перед парой», деньги до стипендии.
import { useEffect, useState } from "react";
import { ArrowRight, BatteryMedium, CalendarClock, Moon, Wallet } from "lucide-react";
import { energyAdvice, isoDate, moneySummary, type EnergyEntry, type MoneyState, type Peak } from "../../../shared/life";
import type { Exam, UpcomingClass } from "../../../shared/types";
import { api } from "../lib/api";
import { go, toast } from "../state/app";

export const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

function useLife<T>(load: () => Promise<T>, what: string): [T | null, () => void] {
  const [v, setV] = useState<T | null>(null);
  const reload = () => void load().then(setV);
  useEffect(() => {
    reload();
    return api.on("life-changed", (w) => w === what && reload());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [v, reload];
}

const ENERGY = ["", "😵 никак", "😪 вяло", "🙂 норм", "😃 бодро", "⚡ огонь"];

export function EnergyCard() {
  const [st] = useLife(() => api.energy.get(), "energy");
  const [exams, setExams] = useState<Exam[]>([]);
  const [sleep, setSleep] = useState(7.5);
  const [energy, setEnergy] = useState(3);
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    void api.exams.list().then(setExams);
  }, []);
  if (!st) return null;
  const today = isoDate(new Date());
  const mine = st.log.find((e: EnergyEntry) => e.date === today);
  const soon = exams.map((e) => ({ title: e.title, days: Math.floor((new Date(e.at).getTime() - new Date(today).getTime()) / 86400e3) }));
  const advice = energyAdvice(st.log, today, soon);
  const save = async () => {
    await api.energy.check({ date: today, sleep, energy });
    setEdit(false);
    toast("Записал. Тяжёлое поставлю на твои бодрые часы.", "ok");
  };
  return (
    <div className={`card glass energy-card ${advice?.tone ?? ""}`}>
      <div className="card-head">
        <BatteryMedium size={18} />
        <span>Как ты сегодня</span>
        {mine && !edit && (
          <button className="link-btn" onClick={() => (setSleep(mine.sleep), setEnergy(mine.energy), setEdit(true))}>
            изменить
          </button>
        )}
      </div>
      {!mine || edit ? (
        <div className="energy-form">
          <label>
            <Moon size={15} /> Спал
            <input className="input sm" type="number" min={0} max={16} step={0.5} value={sleep} onChange={(e) => setSleep(Number(e.target.value))} /> ч
          </label>
          <div className="energy-pick">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`chip-btn ${energy === n ? "on" : ""}`} onClick={() => setEnergy(n)}>
                {ENERGY[n]}
              </button>
            ))}
          </div>
          <button className="btn primary sm" onClick={() => void save()}>
            Записать
          </button>
        </div>
      ) : (
        <div className="energy-now">
          <b>
            {ENERGY[mine.energy]} · сон {mine.sleep} ч
          </b>
        </div>
      )}
      {advice && <p className={`energy-advice ${advice.tone}`}>{advice.text}</p>}
      <PeakPick peak={st.peak} />
    </div>
  );
}

function PeakPick({ peak }: { peak: Peak }) {
  const opts: { v: Peak; l: string }[] = [
    { v: "morning", l: "утром" },
    { v: "day", l: "днём" },
    { v: "evening", l: "вечером" },
  ];
  return (
    <div className="muted small peak-pick">
      Голова лучше работает:{" "}
      {opts.map((o) => (
        <button key={o.v} className={`link-btn ${peak === o.v ? "on" : ""}`} onClick={() => void api.energy.setPeak(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

const hm = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export function ClassCard() {
  const [c, reload] = useLife(() => api.schedule.next(), "schedule");
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      tick((x) => x + 1);
      reload();
    }, 60_000);
    const off = api.on("before-class", () => reload());
    return () => {
      clearInterval(t);
      off();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (c === null) {
    return (
      <button className="card glass class-card empty" onClick={() => go("plan")}>
        <div className="card-head">
          <CalendarClock size={18} />
          <span>Пары</span>
        </div>
        <div className="muted small">Загрузи расписание — фото, скриншот или текст. Камадо напомнит о паре и скажет, что повторить. →</div>
      </button>
    );
  }
  const u = c as UpcomingClass;
  const start = new Date(u.startAt).getTime();
  const mins = Math.round((start - Date.now()) / 60e3);
  const now = mins <= 0;
  const soon = mins > 0 && mins <= 60;
  const when = now
    ? `идёт до ${hm(u.endAt)}`
    : soon
      ? `через ${mins} мин`
      : new Date(u.startAt).toDateString() === new Date().toDateString()
        ? `сегодня в ${hm(u.startAt)}`
        : new Date(u.startAt).toLocaleString("ru-RU", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`card glass class-card ${soon ? "soon" : ""} ${now ? "now" : ""}`}>
      <div className="card-head">
        <CalendarClock size={18} />
        <span>{soon ? "Перед парой" : now ? "Сейчас пара" : "Следующая пара"}</span>
        <button className="link-btn" onClick={() => go("plan")}>
          расписание <ArrowRight size={14} />
        </button>
      </div>
      <div className="cc-title">{u.subject}</div>
      <div className="muted small">
        {when}
        {u.room ? ` · ауд. ${u.room}` : ""}
        {u.kind ? ` · ${u.kind}` : ""}
        {u.teacher ? ` · ${u.teacher}` : ""}
      </div>
      {(u.info.topic || u.info.tasks.length > 0 || u.info.cards > 0) && (
        <ul className="cc-info">
          {u.info.topic && (
            <li>
              Тема: <b>{u.info.topic.title}</b>
              {u.info.topic.reading ? ` · ${u.info.topic.reading}` : ""}
            </li>
          )}
          {u.info.tasks.map((t) => (
            <li key={t.title}>
              Срок: {t.title} — {new Date(t.dueAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </li>
          ))}
          {u.info.cards > 0 && (
            <li>
              Повторить карточек: <b>{u.info.cards}</b>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function MoneyCard() {
  const [m] = useLife(() => api.money.get(), "money");
  if (!m) return null;
  const s = moneySummary(m as MoneyState, new Date());
  return (
    <button className="card glass money-card" onClick={() => go("money")}>
      <div className="card-head">
        <Wallet size={18} />
        <span>Деньги</span>
      </div>
      {s.perDay !== undefined ? (
        <>
          <div className="big-num">
            {rub(s.perDay)}
            <small>в день</small>
          </div>
          <div className="muted small">
            до {m.income?.name.toLowerCase() || "стипендии"} {s.daysLeft} {s.daysLeft === 1 ? "день" : (s.daysLeft ?? 0) < 5 ? "дня" : "дней"} · сегодня потрачено {rub(s.spentToday)}
          </div>
        </>
      ) : (
        <>
          <div className="big-num">
            {rub(s.spentMonth)}
            <small>за месяц</small>
          </div>
          <div className="muted small">Пиши траты в быструю запись: «кофе 250». Укажи стипендию — посчитаю, сколько можно в день →</div>
        </>
      )}
    </button>
  );
}
