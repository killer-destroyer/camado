// Ошибки ИИ — человеческим языком: что случилось и что сделать. Общие для всех провайдеров.

/** Google не пускает к Gemini из этой страны (часто — VPN работает только для браузера). */
export const LOCATION_HINT =
  "Gemini не работает из твоей страны без VPN. Если VPN включён — переключи его в режим «на всю систему» (TUN/VPN, а не только «системный прокси»), " +
  "перезапусти Камадо и подключи ключ снова. Или выбери другую модель в Настройках → ИИ (например, бесплатную на OpenRouter).";

export function isLocationError(message: string): boolean {
  return /location is not supported|not available in your country|unsupported_country|region/i.test(message);
}

/** Понятная причина по коду ответа и тексту сервиса. */
export function humanAiError(service: string, status: number, message = ""): string {
  if (isLocationError(message)) return LOCATION_HINT;
  if (status === 402 || /insufficient.?(balance|credits|funds)|payment required|quota exceeded for this account/i.test(message))
    return `На счёте ${service} нет денег. Пополни счёт — или выбери бесплатную модель в Настройках → ИИ (Gemini, или модель с «:free» на OpenRouter).`;
  if (status === 401 || /invalid.?api.?key|incorrect api key|unauthorized/i.test(message)) return `${service} не принял ключ. Проверь, что скопировал его целиком (Настройки → ИИ).`;
  if (status === 403) return `У ключа ${service} нет доступа к этой модели. Создай новый ключ или выбери другую модель.`;
  if (status === 404 || /model.*(not found|does not exist)|no endpoints found/i.test(message)) return `У ${service} нет такой модели. Проверь название модели в Настройках → ИИ.`;
  if (status === 429) return `Лимит запросов у ${service} пока исчерпан. Подожди минуту (у бесплатных — до завтра) или выбери другую модель в Настройках → ИИ.`;
  if (status >= 500) return `У ${service} сейчас сбой на их стороне. Попробуй через пару минут.`;
  return `${service} ответил ошибкой ${status}${message ? `: ${message.slice(0, 200)}` : ""}`;
}

/** Ошибка сети (не дошли до сервиса вообще). */
export function networkHint(service: string): string {
  return `Не получилось достучаться до ${service}: нет интернета или адрес закрыт в твоей сети. Если сервис заблокирован — включи VPN на всю систему и перезапусти Камадо.`;
}
