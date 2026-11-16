import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { findAudioLinks, importFromUrl, setHostLookup } from "../desktop/main/download.js";

type Route = { status?: number; type: string; body: string | Uint8Array; headers?: Record<string, string> };

function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    const r = routes[url];
    if (!r) return new Response("нет", { status: 404 });
    const res = new Response(r.body as BodyInit, { status: r.status ?? 200, headers: { "content-type": r.type, ...(r.headers ?? {}) } });
    Object.defineProperty(res, "url", { value: url });
    return res;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const dir = () => mkdtempSync(join(tmpdir(), "camado-dl-"));
const audio = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3, 4, 5]);

describe("поиск аудио на странице", () => {
  it("находит <audio>, <source>, og:audio и ссылки на файлы, без повторов", () => {
    const html = `
      <meta property="og:audio" content="https://cdn.site.ru/a/og.mp3">
      <audio src="/files/Песня%201.mp3"></audio>
      <audio controls><source src="track2.ogg" type="audio/ogg"></audio>
      <a href="https://x.org/dl/album.flac?token=1&amp;x=2">скачать</a>
      <a href="/files/Песня%201.mp3">дубль</a>
      <a href="/about.html">не то</a>
      <img src="cover.jpg">`;
    const links = findAudioLinks(html, "https://site.ru/page/");
    expect(links.map((l) => l.url)).toEqual([
      "https://site.ru/files/%D0%9F%D0%B5%D1%81%D0%BD%D1%8F%201.mp3",
      "https://site.ru/page/track2.ogg",
      "https://cdn.site.ru/a/og.mp3",
      "https://x.org/dl/album.flac?token=1&x=2",
    ]);
    expect(links[0]!.name).toBe("Песня 1");
  });
});

describe("скачивание по ссылке", () => {
  // Адрес сайта по имени не спрашиваем у настоящего интернета: на сервере проверок это бывало дольше 5 с
  // и тест падал по времени. Все сайты в тестах — «публичные».
  beforeAll(() => setHostLookup(async () => ["93.184.216.34"]));
  it("прямая ссылка на mp3 — сохраняет файл, имя из Content-Disposition", async () => {
    const d = dir();
    const { impl } = fakeFetch({
      "https://f.ru/get?id=7": {
        type: "audio/mpeg",
        body: audio,
        headers: { "content-disposition": "attachment; filename*=UTF-8''%D0%9D%D0%BE%D1%87%D1%8C.mp3" },
      },
    });
    const progress: number[] = [];
    const r = await importFromUrl("https://f.ru/get?id=7", d, (p) => progress.push(p.received), impl);
    expect(r).toMatchObject({ kind: "saved", name: "Ночь" });
    expect(readdirSync(d)).toEqual(["Ночь.mp3"]);
    expect(readFileSync(join(d, "Ночь.mp3"))).toEqual(Buffer.from(audio));
    expect(progress.at(-1)).toBe(audio.length);

    // второй раз — не затирает, а кладёт рядом
    await importFromUrl("https://f.ru/get?id=7", d, () => {}, impl);
    expect(readdirSync(d).sort()).toEqual(["Ночь (2).mp3", "Ночь.mp3"]);
  });

  it("страница с одним треком — сразу скачивает его", async () => {
    const d = dir();
    const { impl, calls } = fakeFetch({
      "https://site.ru/song": { type: "text/html; charset=utf-8", body: '<audio src="/s.mp3"></audio>' },
      "https://site.ru/s.mp3": { type: "audio/mpeg", body: audio },
    });
    expect(await importFromUrl("https://site.ru/song", d, () => {}, impl)).toMatchObject({ kind: "saved", name: "s" });
    expect(calls).toEqual(["https://site.ru/song", "https://site.ru/s.mp3"]);
  });

  it("страница с несколькими треками — предлагает выбрать", async () => {
    const { impl } = fakeFetch({
      "https://site.ru/album": { type: "text/html", body: '<a href="1.mp3">1</a><a href="2.mp3">2</a>' },
    });
    const r = await importFromUrl("https://site.ru/album", dir(), () => {}, impl);
    expect(r.kind).toBe("choose");
    expect(r.kind === "choose" && r.links.map((l) => l.name)).toEqual(["1", "2"]);
  });

  it("YouTube, Яндекс и прочие стриминги — понятный отказ без запроса", async () => {
    const { impl, calls } = fakeFetch({});
    for (const u of ["https://www.youtube.com/watch?v=x", "https://music.yandex.ru/album/1", "https://soundcloud.com/a/b"]) {
      const r = await importFromUrl(u, dir(), () => {}, impl);
      expect(r.kind === "error" && r.error).toContain("скачать нельзя");
    }
    expect(calls).toHaveLength(0);
  });

  it("не музыка, мусор вместо ссылки, ошибка сайта", async () => {
    const { impl } = fakeFetch({
      "https://site.ru/pic.jpg": { type: "image/jpeg", body: "x" },
      "https://site.ru/empty": { type: "text/html", body: "<p>пусто</p>" },
      "https://site.ru/gone.mp3": { status: 410, type: "text/plain", body: "" },
    });
    const err = async (u: string) => {
      const r = await importFromUrl(u, dir(), () => {}, impl);
      return r.kind === "error" ? r.error : "";
    };
    expect(await err("https://site.ru/pic.jpg")).toContain("не музыка");
    expect(await err("https://site.ru/empty")).toContain("не нашлось музыки");
    expect(await err("https://site.ru/gone.mp3")).toContain("410");
    expect(await err("привет")).toContain("не похоже на ссылку");
    expect(await err("ftp://site.ru/a.mp3")).toContain("http");
  });
});
