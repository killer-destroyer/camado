// 1.0.7: ссылки из Telegram, интернет для ИИ, честность, новый разговор.
import { describe, expect, it } from "vitest";
import { withLinks } from "../src/bot.js";
import { buildTools } from "../src/camado/tools.js";
import { htmlToText, readPage, setWebLookup } from "../src/web.js";
import { memoryStore } from "./helpers.js";

describe("1.0.7", () => {
  it("гиперссылки Telegram разворачиваются в «слово (адрес)», даже с эмодзи перед ними", () => {
    const text = "🔗Общий чат\n🔗Форма для сдачи дз";
    const at = (s: string) => text.indexOf(s); // эмодзи — две единицы UTF-16, как и считает Telegram
    const out = withLinks(text, [
      { type: "text_link", offset: at("Общий чат"), length: "Общий чат".length, url: "https://t.me/+chat" },
      { type: "text_link", offset: at("Форма для сдачи дз"), length: "Форма для сдачи дз".length, url: "https://forms.gle/abc" },
      { type: "bold", offset: 0, length: 2 },
    ]);
    expect(out).toBe("🔗Общий чат (https://t.me/+chat)\n🔗Форма для сдачи дз (https://forms.gle/abc)");
  });

  it("выдуманные ссылки — явная ошибка, а не «сохранено»", async () => {
    const tools = buildTools(memoryStore(), "Europe/Moscow", () => "🔗Общий чат 🔗YouTube");
    await expect(tools.find((t) => t.name === "save_links")!.run({ links: [{ url: "https://t.me/placeholder", title: "Общий чат" }] })).rejects.toThrow(/НИЧЕГО НЕ СОХРАНЕНО/);
  });

  it("страница → текст без скриптов, ссылки видны", () => {
    expect(htmlToText('<html><head><title>x</title><script>evil()</script></head><body><p>ДЗ <a href="https://a.b/c">тут</a></p></body></html>')).toBe("ДЗ тут (https://a.b/c)");
  });

  it("не открывает адреса домашней сети и компьютера", async () => {
    setWebLookup(async (h) => (h === "evil.example" ? ["192.168.1.1"] : ["93.184.216.34"]));
    await expect(readPage("http://localhost:3000")).rejects.toThrow(/домашней сети/);
    await expect(readPage("https://evil.example/x")).rejects.toThrow(/домашней сети/);
    const ok = (async () => new Response("<title>Курс</title><p>Привет</p>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    expect((await readPage("https://site.example", ok)).text).toContain("Привет");
  });

  it("новый разговор стирает только переписку", () => {
    const s = memoryStore();
    s.appendChat("user", "привет");
    s.addTask({ title: "Решить №5" });
    s.clearChat();
    expect(s.recentChat(10)).toEqual([]);
    expect(s.listTasks()).toHaveLength(1);
  });
});
