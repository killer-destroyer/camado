import { Bot, type Context } from "grammy";
import type { MessageOrigin } from "grammy/types";
import type { Camado } from "./camado/brain.js";
import { formatTaskList } from "./camado/format.js";
import type { Config } from "./config.js";
import { BudgetExceededError, type MeteredProvider } from "./llm/metered.js";
import type { Store } from "./store.js";

const TELEGRAM_LIMIT = 4000;

const HELP = `Я Камадо — слежу за твоей учёбой.

Просто пиши мне обычным текстом:
• «по матану задали №5–12 к пятнице»
• «в среду контрольная по физике»
• перешли сообщение препода — я сам вытащу задания и сроки
• «что у меня на завтра?»
• «сдал лабу по химии»

Команды:
/dz — открытые задания
/spend — сколько потрачено на модель в этом месяце
/id — твой Telegram ID`;

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

export function createBot(
  config: Config,
  store: Store,
  camado: Camado,
  llm: MeteredProvider,
): Bot {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  const owner = config.OWNER_TELEGRAM_ID;

  bot.command("id", (ctx) => ctx.reply(`Твой Telegram ID: ${ctx.from?.id}`));

  // Камадо отвечает только хозяину. Остальных молча игнорирует.
  bot.use(async (ctx, next) => {
    if (!owner) {
      await ctx.reply(
        `Камадо ещё не привязан к хозяину.\nТвой ID: ${ctx.from?.id}\n` +
          "Впиши его в OWNER_TELEGRAM_ID в файле .env и перезапусти бота.",
      );
      return;
    }
    if (ctx.from?.id !== owner) return;
    await next();
  });

  bot.command(["start", "help"], (ctx) => ctx.reply(HELP));

  bot.command("dz", (ctx) => ctx.reply(formatTaskList(store.listTasks(), config.CAMADO_TIMEZONE)));

  bot.command("spend", (ctx) =>
    ctx.reply(
      `В этом месяце потрачено ~$${llm.spentThisMonth().toFixed(2)} из лимита $${config.CAMADO_MONTHLY_BUDGET_USD}.`,
    ),
  );

  bot.on("message:text", async (ctx) => {
    await ctx.replyWithChatAction("typing").catch(() => undefined);
    try {
      const answer = await camado.handle({
        text: ctx.message.text,
        forwardedFrom: describeOrigin(ctx.message.forward_origin),
      });
      await replyLong(ctx, answer);
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        await ctx.reply(
          `${err.message}. Подними CAMADO_MONTHLY_BUDGET_USD в .env или подожди следующего месяца. /dz работает и без модели.`,
        );
        return;
      }
      console.error("Ошибка при обработке сообщения:", err);
      await ctx.reply("Что-то сломалось при ответе 😵 Подробности — в логах сервера. Попробуй ещё раз.");
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
