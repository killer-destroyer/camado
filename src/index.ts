// Серверный режим: Telegram-бот + напоминания, без окна. Для приложения на ПК см. desktop/.
import { loadConfig, type Config } from "./config.js";
import { createCore, createCoreBot } from "./core.js";
import { startReminderLoop } from "./reminders.js";
import { BOT_COMMANDS } from "./bot.js";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error("Подсказка: скопируй .env.example в .env и заполни его (см. README).");
  process.exit(1);
}
if (!config.TELEGRAM_BOT_TOKEN) {
  console.error("Не задан TELEGRAM_BOT_TOKEN: нужен токен бота от @BotFather (см. README).");
  process.exit(1);
}

const core = createCore(config);
const bot = createCoreBot(core);

console.log(core.ai.enabled ? "ИИ включён." : "Ключа API нет — ручной режим. Подключить ИИ: команда /key в боте.");

let stopReminders = () => {};
const owner = config.OWNER_TELEGRAM_ID;
if (owner) {
  stopReminders = startReminderLoop(
    core.store,
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
  onStart: (me) => {
    console.log(`Камадо запущен как @${me.username}`);
    void bot.api.setMyCommands(BOT_COMMANDS).catch(() => undefined);
  },
});
