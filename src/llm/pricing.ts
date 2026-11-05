import type { Usage } from "./types.js";

/** Цены в долларах за 1 млн токенов. */
interface Price {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

// Источник: прайс Anthropic (ноябрь 2026). Для Haiku цены кэша не
// опубликованы рядом с основными — взяты по обычной схеме (0.1x / 1.25x).
const PRICES: Record<string, Price> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
};

// Неизвестную модель считаем по самым дорогим ценам: лучше перебдеть с бюджетом.
const FALLBACK_PRICE: Price = PRICES["claude-fable-5-1"]!;

export function priceOf(model: string): Price {
  return PRICES[model] ?? FALLBACK_PRICE;
}

export function costOf(u: Usage): number {
  const p = priceOf(u.model);
  return (
    (u.inputTokens * p.input +
      u.outputTokens * p.output +
      u.cacheReadTokens * p.cacheRead +
      u.cacheWriteTokens * p.cacheWrite) /
    1_000_000
  );
}
