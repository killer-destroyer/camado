// Уровень, серия и значки ачивок.
import { ACHIEVEMENTS } from "../../../shared/achievements";
import { useStore } from "../lib/store";
import { achievements } from "../state/achievements";

export function LevelBadge() {
  const a = useStore(achievements, (s) => s);
  return (
    <div className="lvl" title={`Опыт ${a.xp} — минуты фокуса и сданные задания`}>
      <span className="lvl-n">ур. {a.level}</span>
      <span className="lvl-bar">
        <i style={{ transform: `scaleX(${a.pct / 100})` }} />
      </span>
      {a.streak > 0 && <span className="lvl-streak">🔥 {a.streak}</span>}
    </div>
  );
}

export function AchievementsGrid() {
  const got = useStore(achievements, (s) => s.got);
  return (
    <div className="ach-grid">
      {ACHIEVEMENTS.map((a) => {
        const has = got.includes(a.id);
        return (
          <div key={a.id} className={`ach ${has ? "got" : ""}`} title={a.hint}>
            <span className="ach-icon">{has ? a.icon : "🔒"}</span>
            <b>{a.name}</b>
            <span>{a.hint}</span>
          </div>
        );
      })}
    </div>
  );
}
