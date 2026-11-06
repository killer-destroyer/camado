import { describe, expect, it } from "vitest";
import { API_KEY_KV, createBot } from "../src/bot.js";
import { Camado } from "../src/camado/brain.js";
import { loadConfig } from "../src/config.js";
import { MeteredProvider } from "../src/llm/metered.js";
import { SwitchableProvider } from "../src/llm/switchable.js";
import type { LLMProvider } from "../src/llm/types.js";
import { memoryStore } from "./helpers.js";

const OWNER = 111;
const GOOD_KEY = "sk-ant-api03-" + "a".repeat(40);

/** Поднимает бота с поддельным Telegram: все вызовы API записываются. */
function setup(opts: { envKey?: string; owner?: () => number | undefined; pairing?: { code: () => string | undefined; done: (id: number) => void } } = {}) {
  const config = loadConfig({
    TELEGRAM_BOT_TOKEN: "123:test",
    OWNER_TELEGRAM_ID: String(OWNER),
    ANTHROPIC_API_KEY: opts.envKey ?? "",
    CAMADO_TIMEZONE: "America/New_York",
  });
  const store = memoryStore();
  const fakeModel: LLMProvider = { runAgent: async () => ({ text: "ответ модели" }) };
  const ai = new SwitchableProvider(() => fakeModel, config.ANTHROPIC_API_KEY);
  const llm = new MeteredProvider(ai, store, 25);
  const camado = new Camado(store, llm, config.CAMADO_TIMEZONE);
  const checked: string[] = [];
  const bot = createBot({
    config,
    store,
    camado,
    llm,
    ai,
    checkKey: async (k) => {
      checked.push(k);
      return k === GOOD_KEY;
    },
    owner: opts.owner,
    pairing: opts.pairing,
  });

  bot.botInfo = {
    id: 999,
    is_bot: true,
    first_name: "Камадо",
    username: "camado_bot",
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
  } as typeof bot.botInfo;

  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });

  let messageId = 1;
  const send = async (text: string, fromId = OWNER) => {
    calls.length = 0;
    const entities = text.startsWith("/")
      ? [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0]!.length }]
      : undefined;
    await bot.handleUpdate({
      update_id: messageId,
      message: {
        message_id: messageId++,
        date: Math.floor(Date.now() / 1000),
        chat: { id: fromId, type: "private", first_name: "Я" },
        from: { id: fromId, is_bot: false, first_name: "Я" },
        text,
        entities,
      },
    });
    const replies = calls.filter((c) => c.method === "sendMessage").map((c) => String(c.payload.text));
    return { replies, methods: calls.map((c) => c.method) };
  };

  return { store, ai, send, checked };
}

describe("бот без ключа (ручной режим)", () => {
  it("/add записывает задание, /dz показывает, /done закрывает", async () => {
    const { store, send } = setup();

    const added = await send("/add Матан | №5–12 | 07.11");
    expect(added.replies[0]).toMatch(/^Записал: #1 ДЗ: \[Матан\] №5–12 — до /);
    expect(store.getTask(1)).toMatchObject({ kind: "homework", subject: "Матан" });

    await send("/kr Физика | контрольная по теме 3 | завтра 10:00");
    expect(store.getTask(2)).toMatchObject({ kind: "test" });

    expect((await send("/dz")).replies[0]).toContain("#2 Контрольная: [Физика]");

    expect((await send("/done 1")).replies[0]).toContain("отметил");
    expect(store.getTask(1)!.status).toBe("done");
    expect((await send("/del 99")).replies[0]).toContain("Задания #99 нет");
  });

  it("обычный текст — подсказка про команды и /key, модель не зовётся", async () => {
    const { send, store } = setup();
    const { replies } = await send("по матану №5 к пятнице");
    expect(replies[0]).toContain("ручном режиме");
    expect(store.recentChat(5)).toHaveLength(0);
  });

  it("/add с непонятным сроком объясняет формат", async () => {
    const { send, store } = setup();
    expect((await send("/add Матан | №5 | в пятницу")).replies[0]).toContain("не понял срок");
    expect(store.listTasks()).toHaveLength(0);
  });

  it("чужим не отвечает", async () => {
    const { send } = setup();
    expect((await send("/dz", 222)).replies).toHaveLength(0);
  });
});

describe("подключение ключа", () => {
  it("/key: удаляет сообщение, проверяет, сохраняет и включает ИИ", async () => {
    const { send, store, ai, checked } = setup();
    expect(ai.enabled).toBe(false);

    const res = await send(`/key ${GOOD_KEY}`);
    expect(res.methods[0]).toBe("deleteMessage");
    expect(checked).toEqual([GOOD_KEY]);
    expect(store.getKv(API_KEY_KV)).toBe(GOOD_KEY);
    expect(ai.enabled).toBe(true);
    expect(res.replies.at(-1)).toContain("ИИ включён");

    // Теперь обычный текст идёт в модель.
    expect((await send("что у меня завтра?")).replies[0]).toBe("ответ модели");
  });

  it("ключ, присланный без команды, тоже удаляется и не уходит в модель", async () => {
    const { send, ai } = setup();
    const res = await send(GOOD_KEY);
    expect(res.methods[0]).toBe("deleteMessage");
    expect(ai.enabled).toBe(true);
  });

  it("неверный ключ не сохраняется", async () => {
    const { send, store, ai } = setup();
    const res = await send("/key sk-ant-api03-" + "b".repeat(40));
    expect(res.methods[0]).toBe("deleteMessage");
    expect(res.replies.at(-1)).toContain("не принял");
    expect(store.getKv(API_KEY_KV)).toBeUndefined();
    expect(ai.enabled).toBe(false);
  });

  it("/key off выключает ИИ", async () => {
    const { send, ai } = setup();
    await send(`/key ${GOOD_KEY}`);
    expect((await send("/key off")).replies[0]).toContain("ручном режиме");
    expect(ai.enabled).toBe(false);
  });

  it("ключ из .env тоже включает ИИ", async () => {
    const { ai, send } = setup({ envKey: GOOD_KEY });
    expect(ai.enabled).toBe(true);
    expect((await send("/settings")).replies[0]).toContain("ИИ включён (ключ …aaaa)");
  });
});

describe("привязка бота кодом из приложения", () => {
  it("чужой без кода получает подсказку, с правильным кодом — становится хозяином", async () => {
    let owner: number | undefined;
    const { send } = setup({
      owner: () => owner,
      pairing: { code: () => "482913", done: (id) => (owner = id) },
    });
    expect((await send("/dz", 555)).replies[0]).toContain("пришли мне код");
    expect(owner).toBeUndefined();
    expect((await send("482 913", 555)).replies[0]).toContain("привязан");
    expect(owner).toBe(555);
    // теперь только хозяин
    expect((await send("/dz", 555)).replies[0]).toContain("Заданий нет");
    expect((await send("/dz", 777)).replies).toHaveLength(0);
  });

  it("подбирать код нельзя: после 5 неверных — молчание, даже с верным кодом", async () => {
    let owner: number | undefined;
    const { send } = setup({
      owner: () => owner,
      pairing: { code: () => "482913", done: (id) => (owner = id) },
    });
    for (const guess of ["111111", "222222", "333333", "444444"]) await send(guess, 666);
    expect((await send("555555", 666)).replies[0]).toContain("Слишком много");
    expect((await send("482913", 666)).replies).toHaveLength(0);
    expect(owner).toBeUndefined();
    // другой человек (настоящий хозяин) всё ещё может привязаться
    expect((await send("482913", 555)).replies[0]).toContain("привязан");
    expect(owner).toBe(555);
  });
});
