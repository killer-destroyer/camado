// Сборка Камадо из частей. Её используют и сервер (src/index.ts), и приложение на ПК.
import type { Bot } from "grammy";
import { API_KEY_KV, createBot, type BotDeps } from "./bot.js";
import { Camado } from "./camado/brain.js";
import type { Config } from "./config.js";
import { openDb } from "./db.js";
import { AnthropicProvider, checkAnthropicKey } from "./llm/anthropic.js";
import { MeteredProvider } from "./llm/metered.js";
import { SwitchableProvider } from "./llm/switchable.js";
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
  return { config, store, ai, llm, camado };
}

export function createCoreBot(core: CamadoCore, extra: Pick<BotDeps, "token" | "owner" | "pairing"> = {}): Bot {
  return createBot({ ...core, checkKey: checkAnthropicKey, ...extra });
}

/** Сохраняет ключ API и включает ИИ. Ключ уже должен быть проверен. */
export function setApiKey(core: CamadoCore, apiKey: string | undefined): void {
  if (apiKey) core.store.setSecret(API_KEY_KV, apiKey);
  else core.store.deleteKv(API_KEY_KV);
  core.ai.setKey(apiKey ?? core.config.ANTHROPIC_API_KEY);
}
