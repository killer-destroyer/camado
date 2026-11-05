import { Bot, type Context } from "grammy";
import type { MessageOrigin } from "grammy/types";
import type { Camado } from "./camado/brain.js";
import { formatTask, formatTaskList } from "./camado/format.js";
import type { Config } from "./config.js";
import { parseTaskArgs } from "./manual.js";
import { BudgetExceededError, type MeteredProvider } from "./llm/metered.js";
import { NoApiKeyError, type SwitchableProvider } from "./llm/switchable.js";
import type { Store, TaskKind } from "./store.js";

const TELEGRAM_LIMIT = 4000;
export const API_KEY_KV = "anthropic_api_key";

const MANUAL_HELP = `Записать задание:
/add предмет | что сделать | срок
   /add Матан | №5–12 | 07.11
   /add Физика | лаба 3 | завтра 18:00
   /add прочитать главу 2
Срок: 07.11 · 07.11 18:00 · сегодня · завтра. Без времени — 23:59.
/kr — то же для контрольной · /exam — экзамен · /lab — лаба

/done 3 — сдал задание #3
/del 3 — убрать задание #3
/dz — открытые задания
/subject Физика | Иванов И.И. | сдавать в Moodle, только PDF
/subjects — карточки предметов
/settings — настройки · /id — твой Telegram ID`;

const AI_HELP = `Просто пиши мне обычным текстом:
• «по матану задали №5–12 к пятнице»
• «в среду контрольная по физике»
• перешли сообщение препода — я сам вытащу задания и сроки
• «что у меня на завтра?»
• «сдал лабу по химии»`;

const KEY_HELP = `Как подключить ИИ:
1. Зайди на console.anthropic.com, пополни баланс (Billing).
2. API Keys → Create Key → скопируй ключ.
3. Отправь мне: /key sk-ant-...
Я сразу удалю сообщение с ключом из чата, проверю его и включу полный режим.
Выключить: /key off`;

export function describeOrigin(origin: MessageOrigin | undefined): string | undefined {
  if (!origin) return undefined;
  switch (origin.type) {
    case "user":
      return [origin.sender_user.first_name, origin.sender_user.last_name].filter(Boolean).join(" ");
    case "hidden_user":
      return origin.sender_user_name;
    case "chat":
      return origin.sender_chat.title ?? "чат";
    case "channel":
      return origin.chat.title ?? "канал";
  }
}

export function splitMessage(text: string, limit = TELEGRAM_LIMIT): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < limit / 2) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, "");
  }
  if (rest) chunks.push(rest);
  return chunks;
}

const looksLikeAnthropicKey = (s: string) => /^sk-ant-[\w-]{20,}$/.test(s.trim());

export interface BotDeps {
  config: Config;
  store: Store;
  camado: Camado;
  llm: MeteredProvider;
  ai: SwitchableProvider;
  checkKey: (apiKey: string) => Promise<boolean>;
  /** Токен бота, если он задан не в .env (например, в приложении). */
  token?: string;
  /** Кто хозяин. По умолчанию — OWNER_TELEGRAM_ID из .env. */
  owner?: () => number | undefined;
  /** Привязка по коду из приложения: хозяин присылает боту код — и бот запоминает его. */
  pairing?: { code: () => string | undefined; done: (userId: number) => void };
}

export function createBot({ config, store, camado, llm, ai, checkKey, token, owner, pairing }: BotDeps): Bot {
  const botToken = token ?? config.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("Не задан токен бота от @BotFather");
  const bot = new Bot(botToken);
  const getOwner = owner ?? (() => config.OWNER_TELEGRAM_ID);
  const tz = config.CAMADO_TIMEZONE;

  bot.command("id", (ctx) => ctx.reply(`Твой Telegram ID: ${ctx.from?.id}`));

  // Камадо отвечает только хозяину. Остальных молча игнорирует.
  bot.use(async (ctx, next) => {
    const current = getOwner();
    if (!current) {
      const code = pairing?.code();
      const text = ctx.message?.text?.trim() ?? "";
      if (pairing && code && ctx.from && text.replace(/\D/g, "") === code) {
        pairing.done(ctx.from.id);
        await ctx.reply("Готово, я привязан к тебе! 🎉 Теперь я твой Камадо. Напиши /help, чтобы узнать, что я умею.");
        return;
      }
      await ctx.reply(
        pairing
          ? "Привет! Чтобы я стал твоим, открой приложение Камадо → Настройки → Telegram и пришли мне код оттуда."
          : `Камадо ещё не привязан к хозяину.\nТвой ID: ${ctx.from?.id}\n` +
              "Впиши его в OWNER_TELEGRAM_ID в файле .env и перезапусти бота.",
      );
      return;
    }
    if (ctx.from?.id !== current) return;
    await next();
  });

  bot.command(["start", "help"], (ctx) =>
    ctx.reply(
      ai.enabled
        ? `Я Камадо — слежу за твоей учёбой. ИИ включён.\n\n${AI_HELP}\n\nКоманды тоже работают:\n${MANUAL_HELP}`
        : `Я Камадо — слежу за твоей учёбой. Сейчас ручной режим: задания вписываешь командами, напоминания и утренняя сводка работают.\n\n${MANUAL_HELP}\n\nХочешь, чтобы я понимал обычный текст и пересланные сообщения? /key`,
    ),
  );

  // ---------- Ручной режим: работает всегда, без модели ----------

  const addCommand = (kind: TaskKind) => async (ctx: Context) => {
    const args = typeof ctx.match === "string" ? ctx.match : "";
    if (!args.trim()) {
      await ctx.reply(MANUAL_HELP);
      return;
    }
    const parsed = parseTaskArgs(args, new Date(), tz);
    if ("error" in parsed) {
      await ctx.reply(`Не записал: ${parsed.error}.\n\nФормат: /add предмет | что сделать | срок`);
      return;
    }
    const task = store.addTask({ ...parsed, kind });
    await ctx.reply(`Записал: ${formatTask(task, tz)}`);
  };
  bot.command("add", addCommand("homework"));
  bot.command("kr", addCommand("test"));
  bot.command("exam", addCommand("exam"));
  bot.command("lab", addCommand("lab"));

  const statusCommand = (status: "done" | "cancelled", verb: string) => async (ctx: Context) => {
    const id = Number(String(ctx.match ?? "").replace("#", "").trim());
    if (!Number.isInteger(id) || id <= 0) {
      await ctx.reply(`Укажи номер задания, например: /${status === "done" ? "done" : "del"} 3`);
      return;
    }
    const task = store.updateTask(id, { status });
    await ctx.reply(task ? `${verb}: ${formatTask(task, tz)}` : `Задания #${id} нет. Список — /dz`);
  };
  bot.command("done", statusCommand("done", "Отлично, отметил"));
  bot.command("del", statusCommand("cancelled", "Убрал"));

  bot.command("dz", (ctx) => ctx.reply(formatTaskList(store.listTasks(), tz)));

  bot.command("subject", async (ctx) => {
    const [name, teacher, info] = ctx.match.split("|").map((p) => p.trim());
    if (!name) {
      await ctx.reply("Формат: /subject Предмет | преподаватель | что важно знать");
      return;
    }
    const s = store.saveSubject({ name, teacher: teacher || undefined, info: info || undefined });
    await ctx.reply(`Карточка «${s.name}» сохранена.`);
  });

  bot.command("subjects", async (ctx) => {
    const subjects = store.listSubjects();
    await ctx.reply(
      subjects.length
        ? subjects
            .map((s) => `${s.name}${s.teacher ? ` (${s.teacher})` : ""}${s.info ? `\n   ${s.info}` : ""}`)
            .join("\n")
        : "Карточек предметов пока нет. Добавить: /subject Физика | Иванов И.И. | сдавать в Moodle",
    );
  });

  // ---------- Настройки и ключ ----------

  bot.command("settings", (ctx) => {
    const key = store.getKv(API_KEY_KV) ?? config.ANTHROPIC_API_KEY;
    const mode = ai.enabled
      ? `ИИ включён (ключ …${key?.slice(-4) ?? "?"})`
      : "ручной режим (ИИ выключен — /key, чтобы включить)";
    return ctx.reply(
      [
        `Режим: ${mode}`,
        `Модели: ${config.CAMADO_MODEL_BRAIN} (мозг), ${config.CAMADO_MODEL_FAST} (быстрые), ${config.CAMADO_MODEL_SMART} (сложное)`,
        `Потрачено в этом месяце: ~$${llm.spentThisMonth().toFixed(2)} из $${config.CAMADO_MONTHLY_BUDGET_USD}`,
        `Часовой пояс: ${tz}`,
        "",
        "Модели, лимит и пояс меняются в файле .env.",
      ].join("\n"),
    );
  });

  const setKey = async (ctx: Context, rawKey: string) => {
    // Ключ не должен висеть в переписке.
    await ctx.deleteMessage().catch(() => undefined);
    const key = rawKey.trim();
    if (!looksLikeAnthropicKey(key)) {
      await ctx.reply("Это не похоже на ключ Anthropic (он начинается с sk-ant-). Сообщение удалил на всякий случай.");
      return;
    }
    await ctx.replyWithChatAction("typing").catch(() => undefined);
    let valid: boolean;
    try {
      valid = await checkKey(key);
    } catch (err) {
      console.error("Не удалось проверить ключ:", err);
      await ctx.reply("Не смог проверить ключ: нет связи с Anthropic. Попробуй ещё раз чуть позже.");
      return;
    }
    if (!valid) {
      await ctx.reply("Anthropic не принял этот ключ. Проверь, что скопировал его целиком и что он не отозван.");
      return;
    }
    store.setKv(API_KEY_KV, key);
    ai.setKey(key);
    await ctx.reply(`Ключ принят, сообщение с ним удалил. ИИ включён! 🧠\n\n${AI_HELP}`);
  };

  bot.command("key", async (ctx) => {
    const arg = ctx.match.trim();
    if (!arg) {
      await ctx.reply(KEY_HELP);
      return;
    }
    if (arg.toLowerCase() === "off") {
      store.deleteKv(API_KEY_KV);
      ai.setKey(config.ANTHROPIC_API_KEY);
      await ctx.reply(
        ai.enabled
          ? "Удалил ключ из настроек, но в файле .env есть ещё один — работаю на нём."
          : "Ключ удалён. Я в ручном режиме: /help",
      );
      return;
    }
    await setKey(ctx, arg);
  });

  bot.command("spend", (ctx) =>
    ctx.reply(
      `В этом месяце потрачено ~$${llm.spentThisMonth().toFixed(2)} из лимита $${config.CAMADO_MONTHLY_BUDGET_USD}.`,
    ),
  );

  // ---------- Обычный текст ----------

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;

    // Прислали ключ без команды — не отдаём его модели, а ставим как ключ.
    if (looksLikeAnthropicKey(text)) {
      await setKey(ctx, text);
      return;
    }

    if (!ai.enabled) {
      await ctx.reply(
        "Я в ручном режиме и понимаю только команды. Например:\n/add Матан | №5–12 | 07.11\n\n" +
          "Все команды — /help. Чтобы я понимал обычный текст, подключи ИИ — /key",
      );
      return;
    }

    await ctx.replyWithChatAction("typing").catch(() => undefined);
    try {
      const answer = await camado.handle({ text, forwardedFrom: describeOrigin(ctx.message.forward_origin) });
      await replyLong(ctx, answer);
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        await ctx.reply(
          `${err.message}. Подними CAMADO_MONTHLY_BUDGET_USD в .env или подожди следующего месяца. Команды (/add, /dz) работают и без модели.`,
        );
        return;
      }
      if (err instanceof NoApiKeyError) {
        await ctx.reply("ИИ выключен. Подключить — /key");
        return;
      }
      console.error("Ошибка при обработке сообщения:", err);
      await ctx.reply("Что-то сломалось при ответе 😵 Подробности — в логах. Команды (/add, /dz) работают и без модели.");
    }
  });

  bot.on("message", (ctx) =>
    ctx.reply("Пока я понимаю только текст. Файлы, фото и голосовые научусь читать в следующих версиях."),
  );

  bot.catch((err) => console.error("Ошибка бота:", err.error));
  return bot;
}

async function replyLong(ctx: Context, text: string): Promise<void> {
  for (const chunk of splitMessage(text)) await ctx.reply(chunk);
}
