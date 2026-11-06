import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importFromHtml, resolveCloud } from "../desktop/main/download.js";
import { freeTracks, searchFree } from "../desktop/main/freeMusic.js";
import { extractLinks, serviceOf } from "../desktop/shared/links.js";
import { cleanLinkUrl } from "../src/store.js";
import { memoryStore } from "./helpers.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("ссылки на уроки", () => {
  it("вытаскивает все ссылки из сообщения препода и подписывает их", () => {
    const msg = `Добрый день! Пара по матану сегодня здесь: https://us02web.zoom.us/j/8123456789?pwd=abc.
Методичка — docs.google.com/document/d/1AbC/edit
Сдавать ДЗ: https://moodle.uni.ru/course/view.php?id=42 (до пятницы)
повтор: https://us02web.zoom.us/j/8123456789?pwd=abc`;
    const found = extractLinks(msg);
    expect(found.map((f) => f.url)).toEqual([
      "https://us02web.zoom.us/j/8123456789?pwd=abc",
      "https://docs.google.com/document/d/1AbC/edit",
      "https://moodle.uni.ru/course/view.php?id=42",
    ]);
    expect(found[0]!.title).toContain("Пара по матану");
    expect(found[1]!.title).toBe("Методичка");
    expect(serviceOf(found[0]!.url).name).toBe("Zoom");
    expect(serviceOf(found[1]!.url).name).toBe("Google Документ");
    expect(serviceOf(found[2]!.url).id).toBe("lms");
  });

  it("сохраняет только http(s) и не плодит копии одной ссылки", () => {
    expect(() => cleanLinkUrl("javascript:alert(1)")).toThrow();
    expect(cleanLinkUrl("meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
    const s = memoryStore();
    const a = s.saveLink({ title: "Лекции", url: "https://meet.google.com/abc", subject: "Физика" });
    const b = s.saveLink({ title: "Лекции по физике", url: "https://meet.google.com/abc" });
    expect(b.id).toBe(a.id);
    expect(s.listLinks()).toHaveLength(1);
    expect(s.listLinks()[0]).toMatchObject({ title: "Лекции по физике", subject: "Физика" });
    s.markLinkOpened(a.id);
    expect(s.getLink(a.id)?.openedAt).toBeTruthy();
    expect(s.deleteLink(a.id)).toBe(true);
  });
});

describe("плейлисты, любимое, история", () => {
  it("плейлист хранит порядок и не дублирует треки", () => {
    const s = memoryStore();
    const p = s.createPlaylist("Для учёбы");
    s.addToPlaylist(p.id, ["a", "b"]);
    s.addToPlaylist(p.id, ["b", "c"]);
    expect(s.listPlaylists()[0]!.trackIds).toEqual(["a", "b", "c"]);
    s.reorderPlaylist(p.id, ["c", "a", "b"]);
    s.removeFromPlaylist(p.id, "a");
    expect(s.listPlaylists()[0]!.trackIds).toEqual(["c", "b"]);
    s.deletePlaylist(p.id);
    expect(s.listPlaylists()).toEqual([]);
  });

  it("сердечко ставится и снимается", () => {
    const s = memoryStore();
    expect(s.toggleFavorite("x")).toBe(true);
    expect(s.listFavorites()).toEqual(["x"]);
    expect(s.toggleFavorite("x")).toBe(false);
    expect(s.listFavorites()).toEqual([]);
  });

  it("считает, что слушал за неделю", () => {
    const s = memoryStore();
    const old = new Date(Date.now() - 20 * 86400e3).toISOString();
    s.addPlay({ trackId: "a", title: "A", artist: "X", seconds: 100 });
    s.addPlay({ trackId: "a", title: "A", artist: "X", seconds: 120 });
    s.addPlay({ trackId: "b", title: "B", artist: "Y", seconds: 200 });
    s.addPlay({ trackId: "c", title: "C", artist: "Z", seconds: 50, playedAt: old });
    const st = s.playStats(new Date(Date.now() - 7 * 86400e3));
    expect(st.map((x) => [x.trackId, x.plays, x.seconds])).toEqual([
      ["a", 2, 220],
      ["b", 1, 200],
    ]);
  });
});

describe("облака и код страницы", () => {
  it("Dropbox и Google Диск превращаются в прямые ссылки", async () => {
    const d = await resolveCloud(new URL("https://www.dropbox.com/scl/fi/abc/song.mp3?rlkey=x&dl=0"));
    expect(String(d)).toContain("dl=1");
    const g = await resolveCloud(new URL("https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing"));
    expect(String(g)).toBe("https://drive.usercontent.google.com/download?id=1AbCdEfGhIjK&export=download&confirm=t");
    const folder = await resolveCloud(new URL("https://drive.google.com/drive/folders/xyz"));
    expect(folder).toHaveProperty("error");
  });

  it("Яндекс Диск: файл — через официальный API, папка — список треков", async () => {
    const file = await resolveCloud(new URL("https://disk.yandex.ru/d/AAA"), (async () => json({ href: "https://downloader.disk.yandex.ru/x.mp3" })) as unknown as typeof fetch);
    expect(String(file)).toBe("https://downloader.disk.yandex.ru/x.mp3");
    const folderFetch = (async (url: string) =>
      url.includes("/download")
        ? json({ error: "x" }, 404)
        : json({ _embedded: { items: [{ type: "file", name: "1.mp3", path: "/1.mp3" }, { type: "file", name: "cover.jpg", path: "/cover.jpg" }, { type: "dir", name: "x", path: "/x" }] } })) as unknown as typeof fetch;
    const folder = await resolveCloud(new URL("https://disk.yandex.ru/d/BBB"), folderFetch);
    expect(folder).toHaveProperty("links");
    expect((folder as { links: { name: string }[] }).links.map((l) => l.name)).toEqual(["1"]);
  });

  it("код страницы с несколькими треками — выбор", async () => {
    const html = `<html><head><link rel="canonical" href="https://band.example/album"></head>
      <body><a href="/files/01.mp3">1</a><audio src="https://cdn.example/02.ogg"></audio></body></html>`;
    const dir = mkdtempSync(join(tmpdir(), "camado-html-"));
    const r = await importFromHtml(html, undefined, dir);
    expect(r.kind).toBe("choose");
    expect((r as { links: { url: string }[] }).links.map((l) => l.url)).toEqual(["https://cdn.example/02.ogg", "https://band.example/files/01.mp3"]);
  });

  it("код без полных ссылок — понятная подсказка", async () => {
    const r = await importFromHtml(`<a href="/01.mp3">1</a>`, undefined, mkdtempSync(join(tmpdir(), "camado-html-")));
    expect(r).toMatchObject({ kind: "error" });
  });
});

describe("бесплатная музыка (Internet Archive)", () => {
  it("ищет записи и выбирает по одному mp3 на трек", async () => {
    const impl = (async (url: string) => {
      if (url.includes("advancedsearch")) {
        expect(decodeURIComponent(url)).toContain("mediatype:(audio)");
        return json({ response: { docs: [{ identifier: "lofi-album", title: "Lofi Album", creator: ["Some Artist"], downloads: 10 }] } });
      }
      return json({
        files: [
          { name: "01 Rain.mp3", format: "VBR MP3", title: "Rain", track: "1" },
          { name: "01 Rain.ogg", format: "Ogg Vorbis" },
          { name: "02 Snow.flac", format: "Flac", track: "2" },
          { name: "02 Snow.mp3", format: "VBR MP3", title: "Snow", track: "2" },
          { name: "cover.jpg", format: "JPEG" },
        ],
      });
    }) as unknown as typeof fetch;
    const found = await searchFree("lofi (beats)", impl);
    expect(found[0]).toMatchObject({ id: "lofi-album", title: "Lofi Album", artist: "Some Artist" });
    const tracks = await freeTracks("lofi-album", impl);
    expect(tracks).toEqual([
      { url: "https://archive.org/download/lofi-album/01%20Rain.mp3", name: "Rain" },
      { url: "https://archive.org/download/lofi-album/02%20Snow.mp3", name: "Snow" },
    ]);
    expect(await freeTracks("../evil", impl)).toEqual([]);
  });
});

describe("безопасность", () => {
  it("адреса домашней сети и самого компьютера распознаются", async () => {
    const { isPrivateIp } = await import("../desktop/main/download.js");
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:192.168.1.5", "0.0.0.0"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2a00:1450::1"]) expect(isPrivateIp(ip), ip).toBe(false);
  });

  it("не скачивает из домашней сети — ни напрямую, ни через перенаправление", async () => {
    const { importFromUrl, setHostLookup } = await import("../desktop/main/download.js");
    setHostLookup(async (h) => (h === "router.example" ? ["192.168.1.1"] : ["93.184.216.34"]));
    const dir = mkdtempSync(join(tmpdir(), "camado-ssrf-"));
    const calls: string[] = [];
    const impl = (async (url: string) => {
      calls.push(url);
      return new Response("", { status: 302, headers: { location: "http://127.0.0.1:8080/admin.mp3" } });
    }) as unknown as typeof fetch;
    expect(await importFromUrl("http://192.168.1.1/song.mp3", dir, () => {}, impl)).toMatchObject({ kind: "error" });
    expect(await importFromUrl("http://localhost/song.mp3", dir, () => {}, impl)).toMatchObject({ kind: "error" });
    expect(await importFromUrl("https://router.example/song.mp3", dir, () => {}, impl)).toMatchObject({ kind: "error" });
    expect(calls).toEqual([]); // в домашнюю сеть даже не постучались
    const r = await importFromUrl("https://music.example/song.mp3", dir, () => {}, impl);
    expect(r).toMatchObject({ kind: "error" });
    expect(calls).toEqual(["https://music.example/song.mp3"]); // перенаправление на 127.0.0.1 не пошло
  });

  it("секреты шифруются, старые незашифрованные — перешифровываются при чтении", () => {
    const s = memoryStore();
    s.setKv("anthropic_api_key", "sk-ant-old");
    const codec = { encrypt: (p: string) => Buffer.from(p).toString("base64"), decrypt: (c: string) => Buffer.from(c, "base64").toString() };
    s.secretCodec = codec;
    expect(s.getSecret("anthropic_api_key")).toBe("sk-ant-old");
    expect(s.getKv("anthropic_api_key")).toMatch(/^enc1:/);
    expect(s.getKv("anthropic_api_key")).not.toContain("sk-ant");
    s.setSecret("telegram_token", "123:ABC");
    expect(s.getKv("telegram_token")).not.toContain("ABC");
    expect(s.getSecret("telegram_token")).toBe("123:ABC");
    // ключ шифрования сменился — секрет просто не читается, программа не падает
    s.secretCodec = { encrypt: codec.encrypt, decrypt: () => undefined };
    expect(s.getSecret("telegram_token")).toBeUndefined();
  });
});
