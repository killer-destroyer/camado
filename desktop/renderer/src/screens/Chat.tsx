// «Камадо»: разговор с ассистентом (тот же, что отвечает в Telegram).
import { useEffect, useRef, useState } from "react";
import { KeyRound, SendHorizontal, Sparkles } from "lucide-react";
import type { ChatEntry } from "../../../shared/types";
import { api } from "../lib/api";
import { go } from "../state/app";
import { Empty } from "../components/ui";

const SUGGEST = ["Что у меня на этой неделе?", "Составь план на сегодня", "По матану задали №5–12 к пятнице", "Что горит?"];

const strip = (s: string) => s.replace(/^\[Сейчас:[^\]]*\]\n?/, "").replace(/^\[Пересланное сообщение от:[^\]]*\]\n?/, "");

export function Chat() {
  const [items, setItems] = useState<ChatEntry[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.ai.status().then((s) => setAiOn(s.enabled));
    void api.chat.history().then(setItems);
  }, []);
  useEffect(() => {
    // Фигурные скобки важны: scrollIntoView в новом Chromium возвращает промис,
    // а React принял бы его за функцию очистки и упал.
    void end.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, busy]);

  const send = async (msg = text) => {
    const t = msg.trim();
    if (!t || busy) return;
    setText("");
    setItems((x) => [...x, { role: "user", content: t }]);
    setBusy(true);
    const r = await api.chat.send(t);
    setBusy(false);
    setItems((x) => [...x, { role: "assistant", content: r.answer ?? `⚠️ ${r.error}` }]);
  };

  if (aiOn === false) {
    return (
      <div className="screen chat">
        <header className="screen-head">
          <h1 className="display">Камадо</h1>
        </header>
        <Empty icon={<KeyRound size={30} />} title="ИИ пока выключен" text="Вставь ключ Anthropic в настройках — и Камадо будет понимать обычный текст, разбирать задания и строить планы.">
          <button className="btn primary" onClick={() => go("settings")}>
            Открыть настройки
          </button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="screen chat">
      <header className="screen-head">
        <h1 className="display">Камадо</h1>
      </header>
      <div className="chat-log">
        {items.length === 0 && (
          <div className="chat-hello">
            <Sparkles size={26} />
            <p>Привет! Скажи, что задали, или спроси, что горит.</p>
            <div className="chips">
              {SUGGEST.map((s) => (
                <button key={s} className="chip-btn" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {items.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {strip(m.content)}
          </div>
        ))}
        {busy && (
          <div className="bubble assistant typing">
            <i />
            <i />
            <i />
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="chat-input glass">
        <input
          value={text}
          placeholder="Напиши Камадо…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          autoFocus
        />
        <button className="play-btn sm" onClick={() => void send()} disabled={busy}>
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
