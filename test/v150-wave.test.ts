// 1.5.0: «Моя волна» и открытая база — разбор источников, вкус, только разрешённые сайты.
import { describe, expect, it } from "vitest";
import { fromArchive, fromCcMixter, STREAM_HOSTS, Wave, webId } from "../desktop/main/wave.js";
import { serveRemote } from "../desktop/main/media.js";
import type { Track } from "../desktop/shared/types.js";
import { memoryStore } from "./helpers.js";

const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { "content-type": "application/json" } });

const cc = [
  {
    upload_name: "Night Drive",
    user_name: "dj",
    user_real_name: "DJ Night",
    upload_tags: ",media,remix,chill,downtempo,instrumental,mp3,",
    file_page_url: "https://ccmixter.org/files/dj/1",
    license_name: "Attribution (3.0)",
    license_url: "http://creativecommons.org/licenses/by/3.0/",
    files: [{ download_url: "http://ccmixter.org/content/dj/night.mp3", file_format_info: { "default-ext": "mp3", ps: "3:12" } }],
  },
  { upload_name: "Short", user_name: "x", files: [{ download_url: "https://ccmixter.org/content/x/s.mp3", file_format_info: { "default-ext": "mp3", ps: "0:41" } }] },
];

const fakeNet = (async (input: RequestInfo | URL) => {
  const u = String(input);
  if (u.includes("ccmixter.org/api")) return json(cc);
  if (u.includes("advancedsearch")) return json({ response: { docs: [{ identifier: "netlabel01", title: "Calm EP", creator: "Lumen", subject: ["Ambient", "Chill"], licenseurl: "https://creativecommons.org/licenses/by-nc/3.0/" }] } });
  if (u.includes("/metadata/netlabel01/files"))
    return json({ result: [{ name: "01_dawn.mp3", format: "VBR MP3", title: "Dawn", length: "245.3" }, { name: "01_dawn_64kb.mp3", format: "64Kbps MP3", length: "245" }, { name: "cover.jpg", format: "JPEG" }] });
  return new Response("nope", { status: 404 });
}) as unknown as typeof fetch;

const lib = (id: string, artist = "Свой"): Track => ({ id, path: `/m/${id}.mp3`, title: id, artist, album: "", duration: 200, hasLyrics: false });

describe("открытая база", () => {
  it("ccMixter: только mp3 длиннее полутора минут, https, лицензия и теги", async () => {
    const t = await fromCcMixter("chill", fakeNet);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ title: "Night Drive", artist: "DJ Night", duration: 192, web: { url: "https://ccmixter.org/content/dj/night.mp3", license: "Attribution (3.0)", source: "ccMixter" } });
    expect(t[0]!.web!.tags).toEqual(["chill", "downtempo", "instrumental"]);
    expect(t[0]!.id).toBe(webId("https://ccmixter.org/content/dj/night.mp3"));
  });

  it("Internet Archive: один файл на трек, обложка, лицензия", async () => {
    const t = await fromArchive("chill", fakeNet);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ title: "Dawn", artist: "Lumen", album: "Calm EP", web: { source: "Internet Archive", license: "CC BY-NC" } });
    expect(t[0]!.web!.url).toBe("https://archive.org/download/netlabel01/01_dawn.mp3");
    expect(t[0]!.cover).toBe("https://archive.org/services/img/netlabel01");
  });

  it("поток — только с разрешённых сайтов и только звук/картинки", async () => {
    expect(STREAM_HOSTS.test("ia800102.us.archive.org")).toBe(true);
    expect(STREAM_HOSTS.test("ccmixter.org")).toBe(true);
    expect(STREAM_HOSTS.test("archive.org.evil.com")).toBe(false);
    const ok = (async () => new Response("ID3", { status: 206, headers: { "content-type": "audio/mpeg", "content-range": "bytes 0-2/100" } })) as unknown as typeof fetch;
    const r = await serveRemote("https://archive.org/download/x/a.mp3", "bytes=0-2", STREAM_HOSTS, ok);
    expect(r.status).toBe(206);
    expect(r.headers.get("content-range")).toBe("bytes 0-2/100");
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
    expect((await serveRemote("https://evil.com/a.mp3", null, STREAM_HOSTS, ok)).status).toBe(403);
    expect((await serveRemote("http://archive.org/a.mp3", null, STREAM_HOSTS, ok)).status).toBe(403);
    const html = (async () => new Response("<html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    expect((await serveRemote("https://archive.org/x", null, STREAM_HOSTS, html)).status).toBe(415);
  });
});

describe("волна", () => {
  it("свои и новые вперемешку; «не то» больше не ставит; без интернета — своё", async () => {
    const w = new Wave(memoryStore(), fakeNet);
    const library = [lib("a"), lib("b"), lib("c"), lib("d")];
    const out = await w.next({ mood: "mine", count: 6, library, favorites: ["a"] });
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out.some((t) => t.web)).toBe(true);
    expect(out.some((t) => !t.web)).toBe(true);
    w.feedback(lib("b"), "dislike");
    for (let i = 0; i < 5; i++) {
      const again = await w.next({ mood: "mine", count: 4, library, favorites: [] });
      expect(again.some((t) => t.id === "b")).toBe(false);
    }
    const offline = new Wave(memoryStore(), (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch);
    const own = await offline.next({ mood: "study", count: 3, library, favorites: [] });
    expect(own).toHaveLength(3);
    expect(own.every((t) => !t.web)).toBe(true);
  });

  it("учится: лайк и дослушивание поднимают исполнителя и теги, пропуски опускают", () => {
    const w = new Wave(memoryStore(), fakeNet);
    const t = { ...lib("x", "Lumen"), web: { url: "https://ccmixter.org/x.mp3", source: "ccMixter" as const, tags: ["chill"] } };
    w.feedback(t, "like");
    w.feedback(t, "done");
    const taste = w.taste();
    expect(taste.artists["lumen"]).toBeGreaterThan(3);
    expect(taste.tags["chill"]).toBeGreaterThan(1);
    const before = w.score(lib("y", "Lumen"), taste, new Set());
    w.feedback(lib("y", "Lumen"), "skip");
    w.feedback(lib("y", "Lumen"), "skip");
    expect(w.score(lib("y", "Lumen"), w.taste(), new Set())).toBeLessThan(before);
  });
});
