// Какая нейросеть подключена: Gemini (по умолчанию, бесплатно), Claude или любая OpenAI-совместимая.
// Настройки хранятся в базе (kv), ключи — отдельно и в зашифрованном виде.
import { AnthropicProvider } from "./anthropic.js";
import { GEMINI_MODELS, GeminiProvider } from "./gemini.js";
import { OpenAiCompatProvider } from "./openai.js";
import type { LLMProvider, Tier } from "./types.js";

export type AiKind = "gemini" | "anthropic" | "openai";

export interface AiConfig {
  kind: AiKind;
  /** Свои названия моделей (пусто — по умолчанию для провайдера). */
  models?: Partial<Record<Tier, string>>;
  /** Gemini: бесплатный тариф (запросы стоят $0). */
  free?: boolean;
  /** OpenAI-совместимый: адрес API. */
  baseUrl?: string;
  /** $ за 1 млн токенов (вход/выход) — для учёта трат, если сервис не сообщает цену сам. */
  price?: { input: number; output: number };
}

export const AI_CONFIG_KV = "ai_config";
/** Где лежит ключ каждого провайдера (ключ Claude — там же, где и раньше). */
export const KEY_KV: Record<AiKind, string> = {
  anthropic: "anthropic_api_key",
  gemini: "gemini_api_key",
  openai: "openai_api_key",
};

export const DEFAULT_AI: AiConfig = { kind: "gemini", free: true };

export function parseAiConfig(raw: string | undefined): AiConfig {
  if (!raw) return DEFAULT_AI;
  try {
    const c = JSON.parse(raw) as AiConfig;
    return ["gemini", "anthropic", "openai"].includes(c.kind) ? c : DEFAULT_AI;
  } catch {
    return DEFAULT_AI;
  }
}

/** Пресеты для OpenAI-совместимых сервисов (адрес и модели по умолчанию). */
export const OPENAI_PRESETS: { id: string; name: string; baseUrl: string; models: Record<Tier, string>; hint: string }[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: { fast: "openrouter/auto", brain: "openrouter/auto", smart: "openrouter/auto" },
    hint: "один ключ — сотни моделей (есть и бесплатные, с пометкой :free); цену считает сам",
  },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: { fast: "deepseek-chat", brain: "deepseek-chat", smart: "deepseek-reasoner" }, hint: "дёшево" },
  { id: "ollama", name: "Своя на компьютере (Ollama)", baseUrl: "http://localhost:11434/v1", models: { fast: "qwen3:4b", brain: "qwen3:8b", smart: "qwen3:8b" }, hint: "бесплатно и без интернета, нужен мощный компьютер" },
];

export function buildProvider(cfg: AiConfig, key: string | undefined, claudeModels: Record<Tier, string>): LLMProvider | undefined {
  if (cfg.kind === "anthropic") return key ? AnthropicProvider.create(key, { ...claudeModels, ...clean(cfg.models) }) : undefined;
  if (cfg.kind === "gemini") return key ? new GeminiProvider(key, { ...GEMINI_MODELS, ...clean(cfg.models) }, cfg.free ?? true, cfg.price) : undefined;
  if (!cfg.baseUrl) return undefined;
  const preset = OPENAI_PRESETS.find((p) => cfg.baseUrl!.startsWith(p.baseUrl));
  const models = { ...(preset?.models ?? { fast: "", brain: "", smart: "" }), ...clean(cfg.models) };
  if (!models.brain) return undefined;
  return new OpenAiCompatProvider({ baseUrl: cfg.baseUrl, apiKey: key, models: { fast: models.fast || models.brain, brain: models.brain, smart: models.smart || models.brain }, price: cfg.price ?? { input: 0, output: 0 } });
}

function clean(m: Partial<Record<Tier, string>> | undefined): Partial<Record<Tier, string>> {
  return Object.fromEntries(Object.entries(m ?? {}).filter(([, v]) => !!v?.trim())) as Partial<Record<Tier, string>>;
}
