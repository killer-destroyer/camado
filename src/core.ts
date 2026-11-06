// Сборка Камадо из частей. Её используют и сервер (src/index.ts), и приложение на ПК.
import type { Bot } from "grammy";
import { API_KEY_KV, createBot, type BotDeps } from "./bot.js";
import { Camado } from "./camado/brain.js";
import type { Config } from "./config.js";
import { openDb } from "./db.js";
import { AnthropicProvider, checkAnthropicKey } from "./llm/anthropic.js";
import { MeteredProvider } from "./llm/metered.js";
import { SwitchableProvider } from "./llm/switchable.js";
import { AI_CONFIG_KV, buildProvider, DEFAULT_AI, KEY_KV, parseAiConfig, type AiConfig, type AiKind } from "./llm/providers.js";
import { Store } from "./store.js";

export interface CamadoCore {
  config: Config;
  store: Store;
  ai: SwitchableProvider;
  llm: MeteredProvider;
  camado: Camado;
}

export function createCore(config: Config): CamadoCore {
  const store = new Store(openDb(config.CAMADO_DB_PATH));
  const models = {
    fast: config.CAMADO_MODEL_FAST,
    brain: config.CAMADO_MODEL_BRAIN,
    smart: config.CAMADO_MODEL_SMART,
  };
  // Ключ из настроек (/key в боте или поле в приложении) важнее ключа из .env.
  // Нет ни того ни другого — ручной режим.
  const ai = new SwitchableProvider(
    (apiKey) => AnthropicProvider.create(apiKey, models),
    store.getSecret(API_KEY_KV) ?? config.ANTHROPIC_API_KEY,
  );
  const llm = new MeteredProvider(ai, store, config.CAMADO_MONTHLY_BUDGET_USD);
  const camado = new Camado(store, llm, config.CAMADO_TIMEZONE);
  const core = { config, store, ai, llm, camado };
  applyAi(core);
  return core;
}

/** Какая нейросеть выбрана. Старые настройки (только ключ Claude) — значит, Claude. */
export function currentAiConfig(core: Pick<CamadoCore, "store" | "config">): AiConfig {
  const raw = core.store.getKv(AI_CONFIG_KV);
  if (raw) return parseAiConfig(raw);
  if (core.store.getKv(KEY_KV.anthropic) || (core.config.ANTHROPIC_API_KEY && !core.config.GEMINI_API_KEY)) return { kind: "anthropic" };
  return DEFAULT_AI;
}

/** Ключ выбранного провайдера: из настроек (зашифрованный) или из .env. */
export function aiKey(core: Pick<CamadoCore, "store" | "config">, kind: AiKind): string | undefined {
  const env = kind === "anthropic" ? core.config.ANTHROPIC_API_KEY : kind === "gemini" ? core.config.GEMINI_API_KEY : undefined;
  return core.store.getSecret(KEY_KV[kind]) ?? env;
}

/**
 * Gemini, когда-то подключённый как «другая модель» (адрес Google), переводим на родной режим Gemini:
 * там работают ключи нового вида AQ. и бесплатный тариф. Ключ переносим, если в Gemini его ещё нет.
 */
export function migrateGoogleAsOpenAi(core: Pick<CamadoCore, "store" | "config">): void {
  const raw = core.store.getKv(AI_CONFIG_KV);
  if (!raw) return;
  const cfg = parseAiConfig(raw);
  if (cfg.kind !== "openai" || !/generativelanguage\.googleapis\.com/i.test(cfg.baseUrl ?? "")) return;
  const key = core.store.getSecret(KEY_KV.openai);
  if (key && !core.store.getSecret(KEY_KV.gemini)) core.store.setSecret(KEY_KV.gemini, key);
  core.store.setKv(AI_CONFIG_KV, JSON.stringify({ kind: "gemini", free: true }));
}

/** Собрать и подключить модель по текущим настройкам. */
export function applyAi(core: CamadoCore): void {
  migrateGoogleAsOpenAi(core);
  const cfg = currentAiConfig(core);
  const models = { fast: core.config.CAMADO_MODEL_FAST, brain: core.config.CAMADO_MODEL_BRAIN, smart: core.config.CAMADO_MODEL_SMART };
  core.ai.setProvider(buildProvider(cfg, aiKey(core, cfg.kind), models));
}

/** Сохранить выбор нейросети (и ключ, если дали) и сразу переключиться. Ключ уже должен быть проверен. */
export function setAiConfig(core: CamadoCore, cfg: AiConfig, key?: string): void {
  core.store.setKv(AI_CONFIG_KV, JSON.stringify(cfg));
  if (key) core.store.setSecret(KEY_KV[cfg.kind], key);
  applyAi(core);
}

export function createCoreBot(core: CamadoCore, extra: Pick<BotDeps, "token" | "owner" | "pairing"> = {}): Bot {
  return createBot({ ...core, checkKey: checkAnthropicKey, ...extra });
}

/** Сохраняет ключ API и включает ИИ. Ключ уже должен быть проверен. */
export function setApiKey(core: CamadoCore, apiKey: string | undefined): void {
  if (apiKey) {
    core.store.setSecret(API_KEY_KV, apiKey);
    core.store.setKv(AI_CONFIG_KV, JSON.stringify({ kind: "anthropic" }));
  } else core.store.deleteKv(API_KEY_KV);
  applyAi(core);
}
