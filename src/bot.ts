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
import { GeminiProvider, geminiKeyProblem, looksLikeGeminiKey } from "./llm/gemini.js";
import { UnsupportedAttachmentError } from "./llm/types.js";
import { AI_CONFIG_KV, KEY_KV } from "./llm/providers.js";

export const API_KEY_KV = "anthropic_api_key";
const PAIR_TRIES = 5;

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

const KEY_HELP = `Как подключить ИИ (бесплатно):
1. Зайди на aistudio.google.com под Google-аккаунтом.
2. Get API key → Create API key → скопируй ключ (начинается с AQ. или AIza).
3. Отправь мне: /key и ключ через пробел
Карта не нужна: это бесплатный Gemini Flash с дневным лимитом.

Хочешь Claude — ключ с console.anthropic.com: /key sk-ant-...
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

/** Меню команд (кнопка «/» в Telegram) — ставит сам бот при запуске, без BotFather. */
export const BOT_COMMANDS = [
  { command: "dz", description: "что задано" },
  { command: "links", description: "ссылки по предметам" },
  { command: "add", description: "записать ДЗ" },
  { command: "kr", description: "записать контрольную" },
  { command: "exam", description: "записать экзамен" },
  { command: "lab", description: "записать лабу" },
  { command: "done", description: "отметить сделанным" },
  { command: "subjects", description: "мои предметы" },
  { command: "settings", description: "настройки" },
  { command: "spend", description: "траты на ИИ" },
];

export function createBot({ config, store, camado, llm, ai, checkKey, token, owner, pairing }: BotDeps): Bot {
  const botToken = token ?? config.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("Не задан токен бота от @BotFather");
  const bot = new Bot(botToken);
  const getOwner = owner ?? (() => config.OWNER_TELEGRAM_ID);
  const tz = config.CAMADO_TIMEZONE;

  bot.command("id", (ctx) => ctx.reply(`Твой Telegram ID: ${ctx.from?.id}`));

  // Камадо отвечает только хозяину. Остальных молча игнорирует.
  // Подбор кода привязки: 5 попыток, потом пауза 15 минут.
  const tries = new Map<number, { n: number; until: number }>();
  bot.use(async (ctx, next) => {
    const current = getOwner();
    if (!current) {
      const code = pairing?.code();
      const text = ctx.message?.text?.trim() ?? "";
      const digits = text.replace(/\D/g, "");
      const who = ctx.from?.id;
      const t = who !== undefined ? tries.get(who) : undefined;
      if (t && t.n >= PAIR_TRIES && Date.now() < t.until) return; // слишком много неверных кодов — молчим
      if (pairing && code && who !== undefined && digits === code) {
        tries.clear();
        pairing.done(who);
        await ctx.reply("Готово, я привязан к тебе! 🎉 Теперь я твой Камадо. Напиши /help, чтобы узнать, что я умею.");
        return;
      }
      if (pairing && who !== undefined && digits.length >= 4) {
        const next = t && Date.now() < t.until ? t.n + 1 : 1;
        tries.set(who, { n: next, until: Date.now() + 15 * 60e3 });
        if (next >= PAIR_TRIES) {
          await ctx.reply("Слишком много неверных кодов. Попробуй через 15 минут.");
          return;
        }
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
    const key = store.getSecret(API_KEY_KV) ?? config.ANTHROPIC_API_KEY;
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
    if (looksLikeGeminiKey(key)) {
      await ctx.replyWithChatAction("typing").catch(() => undefined);
      let problem: string | undefined;
      try {
        problem = await geminiKeyProblem(key);
      } catch {
        await ctx.reply("Не смог проверить ключ: нет связи с Google. Попробуй ещё раз чуть позже.");
        return;
      }
      if (problem) {
        await ctx.reply(problem);
        return;
      }
      store.setSecret(KEY_KV.gemini, key);
      store.setKv(AI_CONFIG_KV, JSON.stringify({ kind: "gemini", free: true }));
      ai.setProvider(new GeminiProvider(key));
      await ctx.reply(`Ключ Gemini принят, сообщение с ним удалил. ИИ включён (бесплатный Gemini Flash)! 🧠\n\n${AI_HELP}`);
      return;
    }
    if (!looksLikeAnthropicKey(key)) {
      await ctx.reply("Это не похоже на ключ: Gemini начинается с AQ. или AIza, Claude — с sk-ant-. Сообщение удалил на всякий случай.");
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
    store.setSecret(API_KEY_KV, key);
    store.setKv(AI_CONFIG_KV, JSON.stringify({ kind: "anthropic" }));
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
      store.deleteKv(KEY_KV.gemini);
      store.deleteKv(KEY_KV.openai);
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

  bot.command("links", (ctx) => {
    const links = store.listLinks();
    if (!links.length) return ctx.reply("Ссылок пока нет. Перешли мне сообщение препода со ссылками — разложу по предметам.");
    const bySubject = new Map<string, string[]>();
    for (const l of links) {
      const k = l.subject || "Без предмета";
      bySubject.set(k, [...(bySubject.get(k) ?? []), `• ${l.title} — ${l.url}`]);
    }
    return ctx.reply([...bySubject].map(([k, v]) => `${k}:\n${v.join("\n")}`).join("\n\n"), { link_preview_options: { is_disabled: true } });
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
    if (looksLikeAnthropicKey(text) || looksLikeGeminiKey(text)) {
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

  // Фото доски/страницы и голосовые «запиши…»: скачиваем файл у Telegram и отдаём модели как вложение.
  const handleMedia = async (ctx: Context, fileId: string, mime: string, prompt: string) => {
    if (!ai.enabled) {
      await ctx.reply("Чтобы я понимал фото и голосовые, подключи ИИ — /key (бесплатный Gemini умеет и то и другое).");
      return;
    }
    await ctx.replyWithChatAction("typing").catch(() => undefined);
    try {
      const file = await ctx.api.getFile(fileId);
      if (!file.file_path || (file.file_size ?? 0) > 18 * 1024 * 1024) {
        await ctx.reply("Файл слишком большой — пришли поменьше (до 18 МБ).");
        return;
      }
      const res = await fetch(`https://api.telegram.org/file/bot${bot.token}/${file.file_path}`, { signal: AbortSignal.timeout(60_000) });
      const data = Buffer.from(await res.arrayBuffer()).toString("base64");
      const caption = ctx.message?.caption?.trim();
      const answer = await camado.handle({
        text: caption ? `${prompt}\nПодпись: ${caption}` : prompt,
        forwardedFrom: describeOrigin(ctx.message?.forward_origin),
        attachments: [{ mime, data }],
      });
      await replyLong(ctx, answer);
    } catch (err) {
      if (err instanceof BudgetExceededError) return void (await ctx.reply(err.message));
      if (err instanceof UnsupportedAttachmentError) return void (await ctx.reply(err.message));
      console.error("Ошибка с файлом:", err);
      await ctx.reply("Не получилось разобрать файл 😵 Попробуй ещё раз или напиши текстом.");
    }
  };

  bot.on("message:photo", async (ctx) => {
    const best = ctx.message.photo.at(-1)!;
    await handleMedia(ctx, best.file_id, "image/jpeg", "[Фото от хозяина] Найди на фото учебные задания и сроки и запиши их. Если заданий нет — коротко скажи, что видишь.");
  });
  bot.on(["message:voice", "message:audio"], async (ctx) => {
    const v = ctx.message.voice ?? ctx.message.audio!;
    await handleMedia(ctx, v.file_id, v.mime_type ?? "audio/ogg", "[Голосовое от хозяина] Послушай и выполни просьбу: обычно это «запиши задание…» или вопрос.");
  });

  bot.on("message", (ctx) => ctx.reply("Я понимаю текст, фото и голосовые. Документы научусь читать позже."));

  bot.catch((err) => console.error("Ошибка бота:", err.error));
  return bot;
}

async function replyLong(ctx: Context, text: string): Promise<void> {
  for (const chunk of splitMessage(text)) await ctx.reply(chunk);
}
