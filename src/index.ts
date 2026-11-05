import { createBot } from "./bot.js";
import { Camado } from "./camado/brain.js";
import { loadConfig, type Config } from "./config.js";
import { openDb } from "./db.js";
import { AnthropicProvider } from "./llm/anthropic.js";
import { MeteredProvider } from "./llm/metered.js";
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

const provider = AnthropicProvider.create(config.ANTHROPIC_API_KEY, {
  fast: config.CAMADO_MODEL_FAST,
  brain: config.CAMADO_MODEL_BRAIN,
  smart: config.CAMADO_MODEL_SMART,
});
const llm = new MeteredProvider(provider, store, config.CAMADO_MONTHLY_BUDGET_USD);
const camado = new Camado(store, llm, config.CAMADO_TIMEZONE);
const bot = createBot(config, store, camado, llm);

if (!config.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY не задан — Камадо не сможет думать, работают только команды.");
}

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
