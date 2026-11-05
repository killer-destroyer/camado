// Время показываем в часовом поясе пользователя, храним — в UTC.

export function formatLocal(iso: string | Date, timeZone: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Смещение пояса в виде «-05:00» на конкретный момент (учитывает летнее время). */
export function utcOffset(date: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  // "GMT-05:00" → "-05:00"; "GMT" → "+00:00"
  const m = name?.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1]! : "+00:00";
}

/** Строка контекста, которую Камадо видит в каждом сообщении. */
export function nowLine(now: Date, timeZone: string): string {
  const full = new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return `[Сейчас: ${full}, пояс ${timeZone}, UTC${utcOffset(now, timeZone)}]`;
}

/** Компоненты даты в поясе пользователя (для «сегодня», «8 утра» и т. п.). */
export function localParts(date: Date, timeZone: string): { ymd: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}
