// Похожие названия предметов: «прога» = «Введение в программирование», «Алгоритмы и структура данных» =
// «Алгоритмы и структуры данных». Нужно, чтобы ИИ не заводил один предмет дважды.

/** Сокращения студентов → полное название (сравниваются уже нормализованные слова). */
const ALIASES: Record<string, string> = {
  матан: "математический анализ",
  матанализ: "математический анализ",
  линал: "линейная алгебра",
  линейка: "линейная алгебра",
  дискра: "дискретная математика",
  дискретка: "дискретная математика",
  дискрет: "дискретная математика",
  тервер: "теория вероятностей",
  матстат: "математическая статистика",
  дифуры: "дифференциальные уравнения",
  диффуры: "дифференциальные уравнения",
  прога: "программирование",
  програ: "программирование",
  программинг: "программирование",
  алгосы: "алгоритмы и структуры данных",
  асд: "алгоритмы и структуры данных",
  алгоритмы: "алгоритмы и структуры данных",
  физра: "физическая культура",
  физкультура: "физическая культура",
  англ: "английский язык",
  английский: "английский язык",
  инглиш: "английский язык",
  бд: "базы данных",
  ос: "операционные системы",
  оси: "операционные системы",
  ооп: "объектно ориентированное программирование",
  архитектура: "архитектура эвм",
};

/** Слова, которые не отличают один предмет от другого. */
const FILLER = new Set(["и", "в", "на", "по", "для", "с", "к", "основы", "введение", "курс", "дисциплина", "предмет", "пары", "пара"]);

export function normalizeSubject(name: string): string {
  return name
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[ \s]+/g, " ")
    .replace(/[^\p{L}\p{N} +#]/gu, " ")
    .replace(/ +/g, " ")
    .trim();
}

function expand(name: string): string {
  const n = normalizeSubject(name);
  return ALIASES[n] ?? n.split(" ").map((w) => ALIASES[w] ?? w).join(" ");
}

/** Основа слова: первые 5 букв хватает, чтобы «структура/структуры», «анализ/анализа» совпали. */
const stem = (w: string) => (/^\d+$/.test(w) ? w : w.slice(0, 5));

function stems(name: string): { words: Set<string>; nums: string } {
  const words = expand(name).split(" ").filter((w) => w && !FILLER.has(w));
  return { words: new Set(words.filter((w) => !/^\d+$/.test(w)).map(stem)), nums: words.filter((w) => /^\d+$/.test(w)).join(",") };
}

/** Одно ли это и то же: совпадает после сокращений, или почти все основы слов общие (номера частей — строго). */
export function sameSubject(a: string, b: string): boolean {
  if (normalizeSubject(a) === normalizeSubject(b)) return true;
  const A = stems(a);
  const B = stems(b);
  if (A.nums !== B.nums) return false; // «Матанализ 1» и «Матанализ 2» — разные
  if (!A.words.size || !B.words.size) return false;
  let common = 0;
  for (const w of A.words) if (B.words.has(w)) common++;
  const small = Math.min(A.words.size, B.words.size);
  const big = Math.max(A.words.size, B.words.size);
  // все слова короткого названия есть в длинном, и длинное не намного длиннее («Программирование» ≈ «Введение в программирование»)
  if (common === small && big - small <= 1) return true;
  return common / big >= 0.75;
}

/** Найти уже заведённый предмет, похожий на это название. */
export function findSimilarSubject(name: string, existing: string[]): string | undefined {
  const n = normalizeSubject(name);
  return existing.find((e) => normalizeSubject(e) === n) ?? existing.find((e) => sameSubject(name, e));
}
