import { z } from "zod";

// Пустая строка в .env считается «не задано».
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "нужен токен бота от @BotFather"),
  OWNER_TELEGRAM_ID: optional(z.coerce.number().int().positive()),
  ANTHROPIC_API_KEY: optional(z.string()),
  CAMADO_MODEL_FAST: z.string().default("claude-haiku-5-5"),
  CAMADO_MODEL_BRAIN: z.string().default("claude-sonnet-5-5"),
  CAMADO_MODEL_SMART: z.string().default("claude-opus-5-5"),
  CAMADO_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(25),
  CAMADO_TIMEZONE: z.string().default("America/New_York"),
  CAMADO_DB_PATH: z.string().default("data/camado.db"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Проблема с настройками в .env:\n${problems}`);
  }
  // Проверяем часовой пояс сразу, чтобы не упасть посреди напоминания.
  new Intl.DateTimeFormat("ru-RU", { timeZone: parsed.data.CAMADO_TIMEZONE });
  return parsed.data;
}
