// Голосовой Камадо: что читать вслух и как узнать слово «Камадо» в распознанном.

/** Текст для чтения вслух: без разметки, ссылок и эмодзи. */
export function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "ссылка")
    .replace(/[*_`#>|~]+/g, "")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

/** Похоже на «Камадо» (распознавание иногда пишет «комода», «камада», «kamado»). */
export function isWakeWord(text: string): boolean {
  // \b не понимает кириллицу — границы слова через «не буква»
  return /(?:^|[^\p{L}])(к[ао]м[ао]д[оаы]|kamado|camado|komodo)(?:$|[^\p{L}])/iu.test(text.toLowerCase().replace(/ё/g, "е"));
}
