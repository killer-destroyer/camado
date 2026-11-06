// «Итоги недели»: сколько занимался, что сделал, что слушал — красиво, как годовые итоги в стримингах.
import { useEffect, useState } from "react";
import { CheckCircle2, Flame, Headphones, Music2, Timer, Trophy, X } from "lucide-react";
import type { PlayStat, Task } from "../../../shared/types";
import { api } from "../lib/api";
import { plural } from "../lib/format";
import { useStore } from "../lib/store";
import { app } from "../state/app";
import { player } from "../state/player";
import { AchievementsGrid } from "./Achievements";

interface RecapData {
  focusMin: number;
  focusDays: number;
  best?: { day: string; minutes: number };
  streak: number;
  done: Task[];
  listenMin: number;
  plays: number;
  top: PlayStat[];
  artist?: { name: string; minutes: number };
}

const WEEK = 7 * 86400e3;
const dayName = (d: Date) => new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(d);

export async function loadRecap(now = new Date()): Promise<RecapData> {
  const since = new Date(now.getTime() - WEEK);
  const [sessions, tasks, top] = await Promise.all([api.focus.list(since.toISOString()), api.tasks.list(true), api.plays.stats(since.toISOString(), 200)]);
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const k = new Date(s.startedAt).toDateString();
    byDay.set(k, (byDay.get(k) ?? 0) + s.minutes);
  }
  let best: RecapData["best"];
  for (const [k, m] of byDay) if (!best || m > best.minutes) best = { day: dayName(new Date(k)), minutes: m };
  // Сколько дней подряд (до сегодня включительно) был хоть один фокус.
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (byDay.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  const artists = new Map<string, number>();
  for (const t of top) artists.set(t.artist, (artists.get(t.artist) ?? 0) + t.seconds);
  const topArtist = [...artists.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    focusMin: Math.round(sessions.reduce((a, s) => a + s.minutes, 0)),
    focusDays: byDay.size,
    best,
    streak,
    done: tasks.filter((t) => t.status === "done" && new Date(t.updatedAt).getTime() >= since.getTime()),
    listenMin: Math.round(top.reduce((a, t) => a + t.seconds, 0) / 60),
    plays: top.reduce((a, t) => a + t.plays, 0),
    top: top.slice(0, 5),
    artist: topArtist && topArtist[0] !== "Неизвестный исполнитель" ? { name: topArtist[0], minutes: Math.round(topArtist[1] / 60) } : undefined,
  };
}

function hours(min: number): string {
  if (min < 60) return `${min} ${plural(min, "минута", "минуты", "минут")}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ${plural(h, "час", "часа", "часов")}`;
}

/** Одна фраза-вывод по неделе — чтобы итоги звучали по-человечески. */
function verdict(d: RecapData): string {
  if (d.focusMin >= 600) return "Неделя монстра. Так держать — но не забывай спать.";
  if (d.focusMin >= 240) return "Крепкая неделя. Видно, что ты в ритме.";
  if (d.done.length >= 5) return "Много закрыл — фокус-таймер поможет делать это спокойнее.";
  if (d.focusMin > 0) return "Начало есть. На следующей неделе — на пару сессий больше?";
  return "Неделя без фокуса. Попробуй «Разгон 15/3» — начать проще, чем кажется.";
}

export function RecapModal() {
  const open = useStore(app, (s) => s.recap);
  const tracks = useStore(player, (s) => s.library.tracks);
  const [d, setD] = useState<RecapData | null>(null);
  useEffect(() => {
    if (!open) return;
    setD(null);
    void loadRecap().then(setD);
  }, [open]);
  if (!open) return null;
  const close = () => app.set({ recap: false });
  const cover = (id: string) => tracks.find((t) => t.id === id)?.cover;
  return (
    <div className="recap-back" onClick={close} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div className="recap" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn recap-close" onClick={close} title="Закрыть (Esc)">
          <X size={18} />
        </button>
        <div className="recap-eyebrow">последние 7 дней</div>
        <h1 className="display recap-title">Итоги недели</h1>
        {!d ? (
          <div className="muted">Считаю…</div>
        ) : (
          <>
            <p className="recap-verdict">{verdict(d)}</p>
            <div className="recap-grid">
              <div className="rc big" style={{ animationDelay: "0.05s" }}>
                <Timer size={20} />
                <div className="rc-num">{hours(d.focusMin)}</div>
                <div className="rc-label">в фокусе · {d.focusDays} {plural(d.focusDays, "день", "дня", "дней")} из 7</div>
              </div>
              <div className="rc" style={{ animationDelay: "0.12s" }}>
                <CheckCircle2 size={20} />
                <div className="rc-num">{d.done.length}</div>
                <div className="rc-label">{plural(d.done.length, "задание сделано", "задания сделано", "заданий сделано")}</div>
              </div>
              <div className="rc" style={{ animationDelay: "0.19s" }}>
                <Flame size={20} />
                <div className="rc-num">{d.streak}</div>
                <div className="rc-label">{plural(d.streak, "день", "дня", "дней")} подряд с фокусом</div>
              </div>
              {d.best && (
                <div className="rc" style={{ animationDelay: "0.26s" }}>
                  <Trophy size={20} />
                  <div className="rc-num small">{d.best.day}</div>
                  <div className="rc-label">лучший день · {hours(Math.round(d.best.minutes))}</div>
                </div>
              )}
              <div className="rc" style={{ animationDelay: "0.33s" }}>
                <Headphones size={20} />
                <div className="rc-num">{hours(d.listenMin)}</div>
                <div className="rc-label">музыки · {d.plays} {plural(d.plays, "прослушивание", "прослушивания", "прослушиваний")}</div>
              </div>
              {d.artist && (
                <div className="rc" style={{ animationDelay: "0.4s" }}>
                  <Music2 size={20} />
                  <div className="rc-num small">{d.artist.name}</div>
                  <div className="rc-label">исполнитель недели · {hours(d.artist.minutes)}</div>
                </div>
              )}
            </div>
            {d.top.length > 0 && (
              <div className="recap-top" style={{ animationDelay: "0.48s" }}>
                <div className="rt-head">Треки недели</div>
                {d.top.map((t, i) => (
                  <div key={t.trackId} className="rt-row">
                    <span className="rt-n">{i + 1}</span>
                    <span className="rt-cover" style={cover(t.trackId) ? { backgroundImage: `url("${cover(t.trackId)}")` } : undefined} />
                    <span className="rt-title">{t.title}</span>
                    <span className="rt-artist">{t.artist}</span>
                    <span className="rt-plays">
                      {t.plays}×
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="recap-done" style={{ animationDelay: "0.6s" }}>
              <div className="rt-head">Ачивки</div>
              <AchievementsGrid />
            </div>
            {d.done.length > 0 && (
              <div className="recap-done" style={{ animationDelay: "0.55s" }}>
                <div className="rt-head">Закрыл на неделе</div>
                <div className="chips">
                  {d.done.slice(0, 10).map((t) => (
                    <span key={t.id} className="chip">
                      ✓ {t.subject ? `${t.subject}: ` : ""}
                      {t.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
