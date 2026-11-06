// «Камадо»: разговор с ассистентом (тот же, что отвечает в Telegram).
import { useEffect, useRef, useState } from "react";
import { KeyRound, MessageSquarePlus, SendHorizontal, Sparkles } from "lucide-react";
import type { ChatEntry } from "../../../shared/types";
import { api } from "../lib/api";
import { insertAtCursor, pastedWithLinks } from "../lib/paste";
import { app, go } from "../state/app";
import { Empty } from "../components/ui";

const SUGGEST = ["Что у меня на этой неделе?", "Составь план на сегодня", "По матану задали №5–12 к пятнице", "Что горит?"];

const strip = (s: string) => s.replace(/^\[Сейчас:[^\]]*\]\n?/, "").replace(/^\[Пересланное сообщение от:[^\]]*\]\n?/, "");

export function Chat() {
  const [items, setItems] = useState<ChatEntry[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  /** Первая прокрутка после загрузки истории — сразу вниз, без анимации. */
  const first = useRef(true);
  // поле растёт под текст (до 8 строк)
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    void api.ai.status().then((s) => setAiOn(s.enabled));
    void api.chat.history().then((h) => {
      setItems(h);
      // Пришли из быстрого чата на главной — сразу отправляем написанное.
      const pending = app.get().chatPending;
      if (pending) {
        app.set({ chatPending: undefined });
        void send(pending);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // У сообщений своя прокрутка — листаем её к последнему сообщению (фигурные скобки важны, см. CLAUDE.md).
    const el = log.current;
    if (!el) return;
    // при открытии чата — сразу внизу; плавно — только для новых сообщений
    el.scrollTo({ top: el.scrollHeight, behavior: first.current ? "auto" : "smooth" });
    if (items.length) first.current = false;
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
        <Empty icon={<KeyRound size={30} />} title="ИИ пока выключен" text="Вставь бесплатный ключ Gemini в Настройках → ИИ — и Камадо будет понимать обычный текст, фото и голос, разбирать задания и строить планы.">
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
        {items.length > 0 && (
          <button
            className="btn chat-new"
            title="Стереть переписку и начать заново (задания, ссылки и заметки останутся)"
            onClick={async () => {
              if (!confirm("Начать новый разговор? Переписка сотрётся, а задания, ссылки, заметки и то, что Камадо запомнил, останутся.")) return;
              await api.chat.clear();
              setItems([]);
            }}
          >
            <MessageSquarePlus size={16} /> Новый разговор
          </button>
        )}
      </header>
      <div ref={log} className="chat-log">
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
      </div>
      <div className="chat-input glass">
        <textarea
          ref={field}
          rows={1}
          value={text}
          placeholder="Напиши Камадо… (Shift+Enter — новая строка)"
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const t = pastedWithLinks(e.clipboardData);
            if (t === null) return;
            e.preventDefault();
            setText(insertAtCursor(e.currentTarget, t, text));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          autoFocus
        />
        <button className="play-btn sm" onClick={() => void send()} disabled={busy}>
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
