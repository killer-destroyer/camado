// «Кастом»: что стоит на боковой панели и как устроен главный экран. Только данные и правила —
// без окна, чтобы проверять тестами и чтобы ИИ менял то же самое, что и кнопки.

/** Разделы, которые можно поставить на боковую панель (настройки всегда внизу). */
export const SECTIONS = ["today", "tasks", "plan", "session", "notes", "links", "grow", "money", "music", "focus", "chat"] as const;
export type SectionId = (typeof SECTIONS)[number];

export const SECTION_LABEL: Record<SectionId, string> = {
  today: "Сегодня",
  tasks: "Задания",
  plan: "План",
  session: "Сессия",
  notes: "Заметки",
  links: "Ссылки",
  grow: "Прокачка",
  money: "Деньги",
  music: "Музыка",
  focus: "Фокус",
  chat: "Камадо",
};

/** Карточки главного экрана. */
export const CARDS = ["sections", "setup", "class", "plan", "hot", "quick", "focus", "music", "week", "energy", "money", "grow", "notes", "alarms"] as const;
export type CardId = (typeof CARDS)[number];

export const CARD_LABEL: Record<CardId, string> = {
  sections: "Разделы (иконки)",
  setup: "Первые шаги",
  class: "Пары",
  plan: "План на сегодня",
  hot: "Горит",
  quick: "Быстрая запись",
  focus: "Фокус сегодня",
  music: "Музыка",
  week: "Неделя",
  energy: "Как ты сегодня",
  money: "Деньги",
  grow: "Прокачка",
  notes: "Заметки",
  alarms: "Напоминания",
};

/** s — треть ширины, m — половина, w — две трети, l — во всю ширину. */
export type CardSize = "s" | "m" | "w" | "l";
export const SIZES: CardSize[] = ["s", "m", "w", "l"];
export const SIZE_LABEL: Record<CardSize, string> = { s: "маленькая", m: "половина", w: "широкая", l: "во всю ширину" };

export interface HomeCard {
  id: CardId;
  size: CardSize;
  hidden?: boolean;
}

export interface CustomLayout {
  /** Разделы на боковой панели — по порядку. Остальные — иконками на главном экране. */
  sidebar: SectionId[];
  home: HomeCard[];
}

export const DEFAULT_CUSTOM: CustomLayout = {
  sidebar: ["today", "tasks", "plan", "session", "notes", "grow", "music", "focus", "chat"],
  home: [
    { id: "setup", size: "l" },
    { id: "sections", size: "l" },
    { id: "plan", size: "w" },
    { id: "hot", size: "s" },
    { id: "quick", size: "w" },
    { id: "class", size: "s" },
    { id: "week", size: "w" },
    { id: "focus", size: "s" },
    { id: "energy", size: "s" },
    { id: "money", size: "s" },
    { id: "music", size: "s" },
    { id: "grow", size: "l" },
    { id: "notes", size: "s" },
    { id: "alarms", size: "s" },
  ],
};

const isSection = (x: unknown): x is SectionId => SECTIONS.includes(x as SectionId);
const isCard = (x: unknown): x is CardId => CARDS.includes(x as CardId);

/** Почистить сохранённое: без дублей и чужих значений; новые карточки — в конец, видимыми. */
export function normalizeCustom(raw: unknown): CustomLayout {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<CustomLayout>;
  const sidebar = Array.isArray(r.sidebar) ? [...new Set(r.sidebar.filter(isSection))] : [...DEFAULT_CUSTOM.sidebar];
  const seen = new Set<CardId>();
  const home: HomeCard[] = [];
  for (const c of Array.isArray(r.home) ? r.home : []) {
    if (!c || !isCard(c.id) || seen.has(c.id)) continue;
    seen.add(c.id);
    home.push({ id: c.id, size: SIZES.includes(c.size) ? c.size : "s", ...(c.hidden ? { hidden: true } : {}) });
  }
  for (const d of DEFAULT_CUSTOM.home) if (!seen.has(d.id)) home.push({ ...d });
  return { sidebar: sidebar.length ? sidebar : [...DEFAULT_CUSTOM.sidebar], home };
}

/** Разделы, которых нет на боковой панели, — для иконок на главном экране. */
export function offSidebar(c: CustomLayout): SectionId[] {
  return SECTIONS.filter((s) => !c.sidebar.includes(s));
}

export function moveCard(c: CustomLayout, id: CardId, to: number): CustomLayout {
  const home = c.home.filter((x) => x.id !== id);
  const card = c.home.find((x) => x.id === id);
  if (!card) return c;
  home.splice(Math.max(0, Math.min(home.length, to)), 0, card);
  return { ...c, home };
}

export function setCard(c: CustomLayout, id: CardId, patch: Partial<Omit<HomeCard, "id">>): CustomLayout {
  return { ...c, home: c.home.map((x) => (x.id === id ? { ...x, ...patch, ...(patch.hidden === false ? { hidden: undefined } : {}) } : x)) };
}

export function setSidebar(c: CustomLayout, sidebar: SectionId[]): CustomLayout {
  const clean = [...new Set(sidebar.filter(isSection))];
  return { ...c, sidebar: clean.length ? clean : ["today"] };
}

/** «Музыка», «деньги», «главная» — к id раздела или карточки. */
export function findSection(word: string): SectionId | undefined {
  const w = word.toLowerCase().replace(/ё/g, "е").trim();
  const alias: Record<string, SectionId> = {
    главная: "today", сегодня: "today", задания: "tasks", дз: "tasks", план: "plan", неделя: "plan", сессия: "session", экзамены: "session",
    заметки: "notes", конспекты: "notes", ссылки: "links", прокачка: "grow", курсы: "grow", деньги: "money", траты: "money",
    музыка: "music", фокус: "focus", помодоро: "focus", чат: "chat", камадо: "chat",
  };
  if (isSection(w)) return w;
  return alias[w] ?? (Object.entries(alias).find(([k]) => w.startsWith(k.slice(0, 4)))?.[1] as SectionId | undefined);
}
