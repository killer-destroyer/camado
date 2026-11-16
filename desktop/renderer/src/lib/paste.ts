// Вставка текста, скопированного из Telegram/браузера: ссылки там часто спрятаны в слова («🔗Общий чат»).
// В буфере обмена они лежат как HTML — достаём адреса и превращаем в «слово (адрес)», чтобы их было видно.

/** Текст из буфера с развёрнутыми ссылками, или null — если в буфере нет спрятанных ссылок (вставится как обычно). */
export function pastedWithLinks(data: DataTransfer | null): string | null {
  const html = data?.getData("text/html");
  if (!html || !/<a\s[^>]*href=/i.test(html)) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const a of [...doc.querySelectorAll("a[href]")]) {
    const href = a.getAttribute("href") ?? "";
    const text = (a.textContent ?? "").trim();
    if (!/^https?:|^tg:|^mailto:/i.test(href)) continue;
    // ссылка и так видна в тексте — не дублируем
    a.replaceWith(doc.createTextNode(text && !text.includes(href.replace(/^https?:\/\//, "")) ? `${text} (${href})` : href));
  }
  for (const br of [...doc.querySelectorAll("br")]) br.replaceWith(doc.createTextNode("\n"));
  for (const p of [...doc.querySelectorAll("p, div, li")]) p.append(doc.createTextNode("\n"));
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Вставить текст в поле на место курсора. */
export function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, value: string, current: string): string {
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  return current.slice(0, start) + value + current.slice(end);
}
