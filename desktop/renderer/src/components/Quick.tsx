// Быстрая запись из любой программы: Ctrl/Cmd+Shift+Пробел → пишешь задание → Enter → окно исчезает.
import { useEffect, useRef, useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import { api } from "../lib/api";
import { applyPalette, paletteById } from "../lib/palettes";

export function QuickWindow() {
  const [text, setText] = useState("");
  const [aiOn, setAiOn] = useState(false);
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg?: string }>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("quick-root");
    void api.settings.get().then((s) => applyPalette(paletteById(s.palette)));
    void api.ai.status().then((s) => setAiOn(s.enabled));
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void api.quick.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async () => {
    const t = text.trim();
    if (!t || state.kind === "busy") return;
    setState({ kind: "busy" });
    // Сначала пробуем понять сами (бесплатно): «Предмет | что | срок». Не вышло и есть ИИ — отдаём Камадо.
    const r = await api.tasks.quickAdd(t);
    if (!r.error) {
      setState({ kind: "ok", msg: `Записал: ${r.task!.title}` });
    } else if (aiOn) {
      const a = await api.chat.send(t);
      setState(a.error ? { kind: "err", msg: a.error } : { kind: "ok", msg: a.answer ?? "Готово" });
    } else {
      setState({ kind: "err", msg: r.error });
      return;
    }
    setTimeout(() => void api.quick.close(), 1100);
  };

  return (
    <div className="qw">
      <div className="qw-bar">
        <Zap size={20} />
        <input
          ref={input}
          value={text}
          placeholder={aiOn ? "Что записать? Можно обычными словами" : "Матан | №5–12 | завтра 18:00"}
          onChange={(e) => {
            setText(e.target.value);
            if (state.kind === "err") setState({ kind: "idle" });
          }}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
        />
        {aiOn && <Sparkles size={16} className="qw-ai" />}
      </div>
      <div className={`qw-hint ${state.kind}`}>
        {state.kind === "busy"
          ? "Записываю…"
          : state.msg ?? (aiOn ? "Enter — записать · Esc — закрыть" : "предмет | что | срок · Enter — записать · Esc — закрыть")}
      </div>
    </div>
  );
}
