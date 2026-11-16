// Память плеера «что играло до и после», как история в браузере: «назад» возвращает ровно предыдущую песню,
// «вперёд» после «назад» — ровно ту, с которой ушёл (а не новую случайную, когда включено «вперемешку»).

export interface Trail {
  /** id песен в порядке, как они играли. */
  ids: string[];
  /** Где мы сейчас в этом списке. */
  pos: number;
}

const MAX = 300;

export const startTrail = (id: string): Trail => ({ ids: [id], pos: 0 });

/** Песня впереди (если раньше уходили назад), иначе undefined — пора выбирать новую. */
export const ahead = (t: Trail): string | undefined => t.ids[t.pos + 1];

/** Песня позади, иначе undefined. */
export const behind = (t: Trail): string | undefined => (t.pos > 0 ? t.ids[t.pos - 1] : undefined);

/** Шаг вперёд по уже известной истории. */
export const stepForward = (t: Trail): Trail => (t.pos < t.ids.length - 1 ? { ids: t.ids, pos: t.pos + 1 } : t);

/** Шаг назад по истории. */
export const stepBack = (t: Trail): Trail => (t.pos > 0 ? { ids: t.ids, pos: t.pos - 1 } : t);

/** Новая песня после текущей: всё, что было «впереди», забывается (как переход по новой ссылке в браузере). */
export function pushNext(t: Trail, id: string): Trail {
  const ids = [...t.ids.slice(0, t.pos + 1), id];
  const cut = Math.max(0, ids.length - MAX);
  return { ids: ids.slice(cut), pos: ids.length - 1 - cut };
}

/** Песня перед самой первой в истории (в обычном порядке «назад» с начала): текущая становится «впереди». */
export function pushBefore(t: Trail, id: string): Trail {
  return { ids: [id, ...t.ids.slice(0, MAX - 1)], pos: 0 };
}
