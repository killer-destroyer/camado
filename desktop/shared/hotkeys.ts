// Горячие клавиши: что можно сделать с клавиатуры, сочетания по умолчанию и свои.
// Сочетание — строка вида «Mod+Shift+K»: Mod — Ctrl на Windows и ⌘ на Mac.

export type HotkeyGroup = "Главное" | "Музыка" | "Разделы";

export interface HotkeyAction {
  id: string;
  label: string;
  group: HotkeyGroup;
  combo: string;
  /** Работает только в плеере на весь экран. */
  inPlayer?: boolean;
}

export const HOTKEYS: HotkeyAction[] = [
  { id: "palette", label: "Поиск и команды", group: "Главное", combo: "Mod+K" },
  { id: "cheatsheet", label: "Шпаргалка по клавишам", group: "Главное", combo: "Mod+/" },
  { id: "chat", label: "Спросить Камадо (чат)", group: "Главное", combo: "Mod+J" },
  { id: "voice", label: "Сказать Камадо голосом", group: "Главное", combo: "Mod+Shift+M" },
  { id: "focus", label: "Фокус: старт / пауза", group: "Главное", combo: "F" },
  { id: "screensaver", label: "Заставка", group: "Главное", combo: "Z" },
  { id: "settings", label: "Настройки", group: "Главное", combo: "Mod+," },
  { id: "playpause", label: "Пауза / играть", group: "Музыка", combo: "Space" },
  { id: "next", label: "Следующая песня", group: "Музыка", combo: "Shift+ArrowRight" },
  { id: "prev", label: "Предыдущая песня", group: "Музыка", combo: "Shift+ArrowLeft" },
  { id: "seekFwd", label: "Вперёд на 5 секунд", group: "Музыка", combo: "ArrowRight", inPlayer: true },
  { id: "seekBack", label: "Назад на 5 секунд", group: "Музыка", combo: "ArrowLeft", inPlayer: true },
  { id: "volUp", label: "Громче", group: "Музыка", combo: "Shift+ArrowUp" },
  { id: "volDown", label: "Тише", group: "Музыка", combo: "Shift+ArrowDown" },
  { id: "mute", label: "Без звука", group: "Музыка", combo: "M" },
  { id: "like", label: "В «Любимое»", group: "Музыка", combo: "L" },
  { id: "shuffle", label: "Вперемешку вкл/выкл", group: "Музыка", combo: "S" },
  { id: "repeat", label: "Повтор: нет → всё → одна", group: "Музыка", combo: "R" },
  { id: "player", label: "Плеер на весь экран", group: "Музыка", combo: "P" },
  { id: "editTrack", label: "Поправить песню", group: "Музыка", combo: "E" },
  { id: "translate", label: "Перевод текста песни", group: "Музыка", combo: "T" },
  { id: "go:today", label: "Сегодня", group: "Разделы", combo: "Alt+1" },
  { id: "go:tasks", label: "Задания", group: "Разделы", combo: "Alt+2" },
  { id: "go:plan", label: "План", group: "Разделы", combo: "Alt+3" },
  { id: "go:session", label: "Сессия", group: "Разделы", combo: "Alt+4" },
  { id: "go:notes", label: "Заметки", group: "Разделы", combo: "Alt+5" },
  { id: "go:links", label: "Ссылки", group: "Разделы", combo: "Alt+6" },
  { id: "go:grow", label: "Прокачка", group: "Разделы", combo: "Alt+7" },
  { id: "go:music", label: "Музыка", group: "Разделы", combo: "Alt+8" },
  { id: "go:focus", label: "Фокус", group: "Разделы", combo: "Alt+9" },
  { id: "go:money", label: "Деньги", group: "Разделы", combo: "Alt+0" },
];



/** Клавиша из события → «Mod+Shift+K». Одни модификаторы (нажат только Shift) → "". */
export function comboOf(e: { key: string; code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }, mac: boolean): string {
  if (["Control", "Meta", "Alt", "Shift", "AltGraph", "CapsLock"].includes(e.key)) return "";
  // По коду клавиши, а не по букве: на русской раскладке «K» — это «Л», а Alt на Mac меняет символ.
  let key: string;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else if (e.code === "Space") key = "Space";
  else if (e.code === "Slash") key = "/";
  else if (e.code === "Comma") key = ",";
  else if (e.code === "Period") key = ".";
  else if (e.code === "Backquote") key = "`";
  else if (e.code === "BracketLeft") key = "[";
  else if (e.code === "BracketRight") key = "]";
  else if (e.code === "Minus") key = "-";
  else if (e.code === "Equal") key = "=";
  else key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const parts: string[] = [];
  if (mac ? e.metaKey : e.ctrlKey) parts.push("Mod");
  if (mac && e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  parts.push(key);
  return parts.join("+");
}

/** Своё сочетание поверх стандартного; "" — действие выключено. */
export function bindings(custom: Record<string, string> | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of HOTKEYS) {
    const c = custom?.[a.id] ?? a.combo;
    if (c) out.set(a.id, c);
  }
  return out;
}

/** Какое действие на это сочетание (или undefined). */
export function actionFor(combo: string, custom: Record<string, string> | undefined, inPlayer: boolean): string | undefined {
  if (!combo) return undefined;
  for (const [id, c] of bindings(custom)) {
    if (c !== combo) continue;
    const a = HOTKEYS.find((x) => x.id === id);
    if (a?.inPlayer && !inPlayer) continue;
    return id;
  }
  return undefined;
}

/** Поставить сочетание действию; если оно было у другого — у того снимается (чтобы не было двух на одно). */
export function rebind(custom: Record<string, string> | undefined, id: string, combo: string): Record<string, string> {
  const next = { ...(custom ?? {}) };
  for (const [other, c] of bindings(custom)) {
    if (other !== id && c === combo && combo) next[other] = "";
  }
  const def = HOTKEYS.find((a) => a.id === id)?.combo;
  if (combo === def) delete next[id];
  else next[id] = combo;
  return next;
}

/** Только известные действия и строки — из сохранённых настроек. */
export function normalizeHotkeys(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const a of HOTKEYS) {
    const v = (raw as Record<string, unknown>)[a.id];
    if (typeof v === "string" && v.length <= 40) out[a.id] = v;
  }
  return out;
}

/** Без модификаторов — одиночные буквы: не срабатывают, пока печатаешь. */
export const isBare = (combo: string) => !/^(Mod|Ctrl|Alt)\+/.test(combo) && !/^F\d+$/.test(combo);

/** «Mod+Shift+ArrowRight» → «Ctrl + Shift + →» (или ⌘ ⇧ → на Mac). */
export function prettyCombo(combo: string, mac: boolean): string {
  if (!combo) return "—";
  const map: Record<string, string> = mac
    ? { Mod: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧", ArrowRight: "→", ArrowLeft: "←", ArrowUp: "↑", ArrowDown: "↓", Space: "Пробел", Escape: "Esc", Enter: "↵" }
    : { Mod: "Ctrl", Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", ArrowRight: "→", ArrowLeft: "←", ArrowUp: "↑", ArrowDown: "↓", Space: "Пробел", Escape: "Esc", Enter: "Enter" };
  return combo
    .split("+")
    .map((p) => map[p] ?? p)
    .join(mac ? " " : " + ");
}


