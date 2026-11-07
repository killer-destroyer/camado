// «Деньги»: траты и приходы, сколько можно в день до стипендии, подписки. Пишется и быстрой записью: «кофе 250».
import { useEffect, useMemo, useState } from "react";
import { Plus, Repeat, Trash2, Wallet } from "lucide-react";
import { moneySummary, nextMonthDay, parseMoney, type MoneyState } from "../../../shared/life";
import { api } from "../lib/api";
import { toast } from "../state/app";
import { rub } from "../components/LifeCards";
import { Empty } from "../components/ui";

export function Money() {
  const [m, setM] = useState<MoneyState | null>(null);
  const [line, setLine] = useState("");
  const [income, setIncome] = useState({ amount: "", day: "25", name: "Стипендия" });
  const [balance, setBalance] = useState("");
  const [sub, setSub] = useState({ name: "", amount: "", day: "1" });
  useEffect(() => {
    void api.money.get().then((x) => {
      setM(x);
      if (x.income) setIncome({ amount: String(x.income.amount), day: String(x.income.day), name: x.income.name });
    });
    return api.on("life-changed", (w) => w === "money" && void api.money.get().then(setM));
  }, []);
  const s = useMemo(() => (m ? moneySummary(m, new Date()) : null), [m]);
  const byDay = useMemo(() => {
    const groups = new Map<string, MoneyState["entries"]>();
    for (const e of [...(m?.entries ?? [])].reverse().slice(0, 200)) {
      const k = new Date(e.at).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
      groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    return [...groups.entries()];
  }, [m]);
  if (!m || !s) return <div className="screen money" />;

  const add = async () => {
    const p = parseMoney(line) ?? (/^\d/.test(line.trim()) ? undefined : undefined);
    if (!p) return toast("Напиши так: «кофе 250» или «+5000 стипендия»", "warn");
    setM(await api.money.add(p.amount, p.title));
    setLine("");
  };

  return (
    <div className="screen money">
      <header className="screen-head">
        <h1 className="display">Деньги</h1>
      </header>
      <div className="money-top">
        <div className="card glass money-big">
          <div className="muted small">можно тратить в день</div>
          <div className="big-num">{s.perDay !== undefined ? rub(s.perDay) : "—"}</div>
          <div className="muted small">
            {s.balance !== undefined ? `на карте ≈ ${rub(s.balance)}` : "укажи, сколько сейчас на карте"}
            {s.nextIncome ? ` · ${m.income?.name.toLowerCase()} через ${s.daysLeft} дн. (${s.nextIncome.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })})` : ""}
            {s.subsBefore ? ` · подписки до неё ${rub(s.subsBefore)}` : ""}
          </div>
        </div>
        <div className="card glass">
          <div className="muted small">потрачено</div>
          <div className="money-row">
            <b>{rub(s.spentToday)}</b> сегодня · <b>{rub(s.spentMonth)}</b> за месяц
          </div>
          <div className="money-add">
            <input className="input" placeholder="кофе 250 · такси 340 · +5000 стипендия" value={line} onChange={(e) => setLine(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} />
            <button className="btn primary" onClick={() => void add()}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="money-grid">
        <section className="card glass">
          <div className="card-head">
            <Wallet size={18} />
            <span>Стипендия и остаток</span>
          </div>
          <div className="money-form">
            <input className="input sm" placeholder="название" value={income.name} onChange={(e) => setIncome({ ...income, name: e.target.value })} />
            <input className="input sm" type="number" placeholder="сумма" value={income.amount} onChange={(e) => setIncome({ ...income, amount: e.target.value })} />
            <label className="muted small">
              числа <input className="input sm num" type="number" min={1} max={31} value={income.day} onChange={(e) => setIncome({ ...income, day: e.target.value })} />
            </label>
            <button className="btn sm" onClick={() => void api.money.setIncome(Number(income.amount) > 0 ? { amount: Number(income.amount), day: Number(income.day), name: income.name } : null).then(setM)}>
              Сохранить
            </button>
          </div>
          <div className="money-form">
            <input className="input sm" type="number" placeholder="сколько сейчас на карте" value={balance} onChange={(e) => setBalance(e.target.value)} />
            <button
              className="btn sm"
              disabled={!balance}
              onClick={() =>
                void api.money.setBalance(Number(balance)).then((x) => {
                  setM(x);
                  setBalance("");
                  toast("Запомнил остаток — дальше считаю сам по тратам", "ok");
                })
              }
            >
              Запомнить
            </button>
          </div>
        </section>

        <section className="card glass">
          <div className="card-head">
            <Repeat size={18} />
            <span>Подписки</span>
          </div>
          {m.subs.map((x) => (
            <div key={x.id} className="money-sub">
              <span>{x.name}</span>
              <span className="muted small">
                {rub(x.amount)} · {x.day} числа · следующая {nextMonthDay(x.day, new Date()).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
              <button className="icon-btn danger" onClick={() => void api.money.removeSub(x.id).then(setM)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="money-form">
            <input className="input sm" placeholder="Spotify, связь…" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} />
            <input className="input sm" type="number" placeholder="₽ в месяц" value={sub.amount} onChange={(e) => setSub({ ...sub, amount: e.target.value })} />
            <label className="muted small">
              числа <input className="input sm num" type="number" min={1} max={31} value={sub.day} onChange={(e) => setSub({ ...sub, day: e.target.value })} />
            </label>
            <button
              className="btn sm"
              disabled={!sub.name || !Number(sub.amount)}
              onClick={() =>
                void api.money.saveSub({ name: sub.name, amount: Number(sub.amount), day: Number(sub.day) }).then((x) => {
                  setM(x);
                  setSub({ name: "", amount: "", day: "1" });
                })
              }
            >
              Добавить
            </button>
          </div>
        </section>
      </div>

      <section className="card glass money-list">
        {byDay.length === 0 ? (
          <Empty icon={<Wallet size={28} />} title="Трат пока нет" text="Пиши прямо в быструю запись на главной: «кофе 250», «обед 420», «+5000 стипендия»." />
        ) : (
          byDay.map(([day, list]) => (
            <div key={day} className="money-day">
              <div className="md-head">
                <span>{day}</span>
                <span className="muted small">{rub(-list.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0))}</span>
              </div>
              {list.map((e) => (
                <div key={e.id} className={`money-entry ${e.amount > 0 ? "in" : ""}`}>
                  <span>{e.title}</span>
                  <b>
                    {e.amount > 0 ? "+" : "−"}
                    {rub(Math.abs(e.amount))}
                  </b>
                  <button className="icon-btn danger" onClick={() => void api.money.remove(e.id).then(setM)} title="Удалить">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
