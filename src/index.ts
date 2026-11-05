import { API_KEY_KV, createBot } from "./bot.js";
import { Camado } from "./camado/brain.js";
import { loadConfig, type Config } from "./config.js";
import { openDb } from "./db.js";
import { AnthropicProvider, checkAnthropicKey } from "./llm/anthropic.js";
import { MeteredProvider } from "./llm/metered.js";
import { SwitchableProvider } from "./llm/switchable.js";
import { startReminderLoop } from "./reminders.js";
import { Store } from "./store.js";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error("Подсказка: скопируй .env.example в .env и заполни его (см. README).");
  process.exit(1);
}
const store = new Store(openDb(config.CAMADO_DB_PATH));

const models = {
  fast: config.CAMADO_MODEL_FAST,
  brain: config.CAMADO_MODEL_BRAIN,
  smart: config.CAMADO_MODEL_SMART,
};
// Ключ из настроек бота (/key) важнее ключа из .env. Нет ни того ни другого — ручной режим.
const ai = new SwitchableProvider(
  (apiKey) => AnthropicProvider.create(apiKey, models),
  store.getKv(API_KEY_KV) ?? config.ANTHROPIC_API_KEY,
);
const llm = new MeteredProvider(ai, store, config.CAMADO_MONTHLY_BUDGET_USD);
const camado = new Camado(store, llm, config.CAMADO_TIMEZONE);
const bot = createBot({ config, store, camado, llm, ai, checkKey: checkAnthropicKey });

console.log(ai.enabled ? "ИИ включён." : "Ключа API нет — ручной режим. Подключить ИИ: команда /key в боте.");

let stopReminders = () => {};
const owner = config.OWNER_TELEGRAM_ID;
if (owner) {
  stopReminders = startReminderLoop(
    store,
    (text) => bot.api.sendMessage(owner, text),
    config.CAMADO_TIMEZONE,
  );
} else {
  console.warn("OWNER_TELEGRAM_ID не задан — напиши боту /id и впиши свой ID в .env.");
}

const shutdown = () => {
  stopReminders();
  void bot.stop();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await bot.start({
  onStart: (me) => console.log(`Камадо запущен как @${me.username}`),
});
