// «План»: неделя по часам. Перетаскивай задания на дни, двигай и растягивай блоки,
// «Разложить сам» — Камадо расставит задания по свободным вечерам до сроков. Блок → ▶ запускает фокус.
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Play, Sparkles, Trash2 } from "lucide-react";
import { classesOn, PEAK_HOURS, type ScheduleState } from "../../../shared/life";
import { ScheduleModal } from "../components/ScheduleModal";
import { autoPlan, weekStartOf } from "../../../shared/autoplan";
import type { PlanBlock } from "../../../shared/types";
import { api } from "../lib/api";
import { KIND_LABEL, countdown } from "../lib/format";
import { useStore } from "../lib/store";
import { go, toast } from "../state/app";
import { data } from "../state/data";
import { focus, setMode, start as startFocus } from "../state/focus";

const H0 = 8;
const H1 = 24;
const PX = 46; // пикселей на час
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const TASK_MIME = "application/x-camado-task";
const BLOCK_MIME = "application/x-camado-block";

export function Planner() {
  const tasks = useStore(data, (s) => s.tasks);
  const [week, setWeek] = useState(() => weekStartOf(new Date()));
  const [blocks, setBlocks] = useState<PlanBlock[]>([]);
  const [now, setNow] = useState(Date.now());
  const grid = useRef<HTMLDivElement>(null);
  const weekEnd = useMemo(() => new Date(week.getTime() + 7 * 86400e3), [week]);
  const load = () => void api.plan.list(week.toISOString(), weekEnd.toISOString()).then(setBlocks);
  useEffect(load, [week]);
  const [sched, setSched] = useState<ScheduleState | null>(null);
  const [schedOpen, setSchedOpen] = useState(false);
  useEffect(() => {
    void api.schedule.get().then(setSched);
    return api.on("life-changed", (w) => w === "schedule" && void api.schedule.get().then(setSched));
  }, []);
  const classesOf = (day: Date) => (sched ? classesOn(day, sched) : []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    // прокрутить к 15:00 — там обычно и учатся
    grid.current?.scrollTo({ top: (15 - H0) * PX - 20 });
  }, []);

  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const plannedMin = (id: number) => blocks.filter((b) => b.taskId === id).reduce((a, b) => a + b.minutes, 0);

  const dropAt = (e: React.DragEvent, dayIdx: number): Date => {
    const col = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - col.top;
    const mins = Math.max(0, Math.round(((y / PX) * 60) / 15) * 15);
    const d = new Date(week);
    d.setDate(d.getDate() + dayIdx);
    d.setHours(H0, 0, 0, 0);
    return new Date(d.getTime() + mins * 60e3);
  };
  const onDrop = async (e: React.DragEvent, dayIdx: number) => {
    e.preventDefault();
    const at = dropAt(e, dayIdx);
    const taskId = e.dataTransfer.getData(TASK_MIME);
    const blockId = e.dataTransfer.getData(BLOCK_MIME);
    if (taskId) {
      const t = open.find((x) => x.id === Number(taskId));
      if (t) await api.plan.save({ taskId: t.id, title: t.subject ? `${t.subject}: ${t.title}` : t.title, startAt: at.toISOString(), minutes: 60 });
    } else if (blockId) {
      const b = blocks.find((x) => x.id === Number(blockId));
      if (b) await api.plan.save({ ...b, startAt: at.toISOString() });
    }
    load();
  };
  const auto = async () => {
    // пары — заняты; тяжёлое — на часы, когда голова работает лучше
    const busy: [number, number][] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(week);
      day.setDate(day.getDate() + d);
      for (const c of classesOf(day)) busy.push([c.startAt.getTime() - 15 * 60e3, c.endAt.getTime() + 15 * 60e3]);
    }
    const peak = (await api.energy.get()).peak;
    const add = autoPlan(open, blocks, week, new Date(), 60, { busy, peak: PEAK_HOURS[peak] });
    for (const b of add) await api.plan.save(b);
    toast(add.length ? `Разложил ${add.length} ${add.length === 1 ? "блок" : add.length < 5 ? "блока" : "блоков"} по свободным окнам` : "Всё уже разложено — или свободных окон до сроков нет", add.length ? "ok" : "info");
    load();
  };
  const resize = (b: PlanBlock, e: React.PointerEvent) => {
    e.stopPropagation();
    const y0 = e.clientY;
    const m0 = b.minutes;
    const el = (e.currentTarget as HTMLElement).parentElement!;
    const move = (ev: PointerEvent) => {
      const m = Math.max(15, Math.round((m0 + ((ev.clientY - y0) / PX) * 60) / 15) * 15);
      el.style.height = `${(m / 60) * PX - 2}px`;
      el.dataset.m = String(m);
    };
    const up = async () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const m = Number(el.dataset.m ?? m0);
      if (m !== m0) {
        await api.plan.save({ ...b, minutes: m });
        load();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const focusOn = (b: PlanBlock) => {
    const t = tasks.find((x) => x.id === b.taskId);
    focus.set({ subject: t?.subject ?? "" });
    setMode("work");
    startFocus();
    go("focus");
  };

  const today = new Date();
  const nowY = ((today.getHours() + today.getMinutes() / 60 - H0) * PX).toFixed(0);
  const weekLabel = `${week.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — ${new Date(weekEnd.getTime() - 1).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;

  return (
    <div className="screen planner">
      <header className="screen-head">
        <h1 className="display">План</h1>
        <div className="head-tools">
          <button className="icon-btn" title="Прошлая неделя" onClick={() => setWeek(new Date(week.getTime() - 7 * 86400e3))}>
            <ChevronLeft size={18} />
          </button>
          <span className="pl-week">{weekLabel}</span>
          <button className="icon-btn" title="Следующая неделя" onClick={() => setWeek(new Date(week.getTime() + 7 * 86400e3))}>
            <ChevronRight size={18} />
          </button>
          <button className="btn" onClick={() => setSchedOpen(true)} title="Пары по дням — из фото, скриншота или текста">
            <CalendarClock size={16} /> Расписание пар
          </button>
          <button className="btn primary" onClick={() => void auto()}>
            <Sparkles size={16} /> Разложить сам
          </button>
        </div>
      </header>
      <div className="planner-layout">
        <aside className="pl-tasks glass">
          <div className="card-head">
            <CalendarDays size={16} />
            <span>Перетащи на неделю</span>
          </div>
          {open.length === 0 && <div className="muted small">Открытых заданий нет 🎉</div>}
          {open.map((t) => {
            const p = plannedMin(t.id);
            return (
              <div key={t.id} className="pl-task" draggable onDragStart={(e) => e.dataTransfer.setData(TASK_MIME, String(t.id))}>
                <b>{t.title}</b>
                <span>
                  {t.subject ? `${t.subject} · ` : ""}
                  {KIND_LABEL[t.kind]}
                  {t.dueAt ? ` · ${countdown(t.dueAt)}` : ""}
                </span>
                {p > 0 && <i>в плане {p} мин</i>}
              </div>
            );
          })}
        </aside>
        <div className="pl-grid glass">
          <div className="pl-head">
            <span />
            {DAYS.map((d, i) => {
              const day = new Date(week);
              day.setDate(day.getDate() + i);
              const isToday = day.toDateString() === today.toDateString();
              return (
                <span key={d} className={isToday ? "today" : ""}>
                  {d} <b>{day.getDate()}</b>
                </span>
              );
            })}
          </div>
          <div ref={grid} className="pl-body">
            <div className="pl-hours">
              {Array.from({ length: H1 - H0 }, (_, i) => (
                <span key={i} style={{ height: PX }}>
                  {String(H0 + i).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {DAYS.map((_, di) => {
              const day = new Date(week);
              day.setDate(day.getDate() + di);
              const isToday = day.toDateString() === today.toDateString();
              const dayBlocks = blocks.filter((b) => new Date(b.startAt).toDateString() === day.toDateString());
              const deadlines = open.filter((t) => t.dueAt && new Date(t.dueAt).toDateString() === day.toDateString());
              return (
                <div
                  key={di}
                  className={`pl-col ${isToday ? "today" : ""}`}
                  style={{ height: (H1 - H0) * PX }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => void onDrop(e, di)}
                >
                  {Array.from({ length: H1 - H0 }, (_, i) => (
                    <i key={i} className="pl-line" style={{ top: i * PX }} />
                  ))}
                  {isToday && now && <div className="pl-now" style={{ top: `${nowY}px` }} />}
                  {classesOf(day).map((c) => {
                    const top = Math.max(0, (c.startAt.getHours() + c.startAt.getMinutes() / 60 - H0) * PX);
                    const h = ((c.endAt.getTime() - c.startAt.getTime()) / 3600e3) * PX - 2;
                    return (
                      <div key={`c${c.start}${c.subject}`} className="pl-class" style={{ top, height: h }} title={`${c.subject}${c.room ? ` · ауд. ${c.room}` : ""}${c.teacher ? ` · ${c.teacher}` : ""}`}>
                        <b>{c.subject}</b>
                        <span>
                          {c.start}–{c.end}
                          {c.room ? ` · ${c.room}` : ""}
                        </span>
                      </div>
                    );
                  })}
                  {deadlines.map((t) => {
                    const d = new Date(t.dueAt!);
                    const top = Math.max(0, (d.getHours() + d.getMinutes() / 60 - H0) * PX);
                    return (
                      <div key={`d${t.id}`} className="pl-deadline" style={{ top }} title={`Срок: ${t.title}`}>
                        ⚑ {t.title}
                      </div>
                    );
                  })}
                  {dayBlocks.map((b) => {
                    const s = new Date(b.startAt);
                    const top = (s.getHours() + s.getMinutes() / 60 - H0) * PX;
                    return (
                      <div
                        key={b.id}
                        className="pl-block"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData(BLOCK_MIME, String(b.id))}
                        style={{ top, height: (b.minutes / 60) * PX - 2 }}
                      >
                        <b>{b.title}</b>
                        <span>
                          {s.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · {b.minutes} мин
                        </span>
                        <div className="plb-tools">
                          <button title="Начать фокус на этом" onClick={() => focusOn(b)}>
                            <Play size={12} fill="currentColor" />
                          </button>
                          <button title="Убрать из плана" onClick={() => void api.plan.remove(b.id).then(load)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <i className="plb-resize" onPointerDown={(e) => resize(b, e)} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {schedOpen && <ScheduleModal onClose={() => setSchedOpen(false)} />}
    </div>
  );
}
