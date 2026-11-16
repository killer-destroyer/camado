// 1.2.0: «Что нового» и пословный текст песен.
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changesBetween, parseChangelog, releaseNotes } from "../desktop/shared/changelog.js";
import { alignLyrics, cleanHeard, languageOf, linesFromHeard, mergeWindows, similarity, textKey, tokens, wordStart, type HeardWord } from "../desktop/shared/wordsync.js";
import { cleanWordSync, ensureModelFile, modelFile } from "../desktop/main/wordsync.js";

const CHANGELOG = readFileSync(new URL("../desktop/shared/changelog.md", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

describe("что нового", () => {
  const entries = parseChangelog(CHANGELOG);
  it("в файле изменений есть текущая версия — она сверху", () => {
    expect(entries[0]!.version).toBe(pkg.version);
    expect(entries[0]!.items.length).toBeGreaterThan(0);
    expect(releaseNotes(entries, pkg.version)).toMatch(/^- /);
  });
  it("после обновления показывает всё новое с прошлой версии", () => {
    const list = changesBetween(entries, "1.0.9", "1.1.1");
    expect(list.map((e) => e.version)).toEqual(["1.1.1", "1.1.0"]);
    expect(changesBetween(entries, undefined, "1.1.0").map((e) => e.version)).toEqual(["1.1.0"]);
    expect(changesBetween(entries, "1.1.1", "1.1.1")).toEqual([]);
  });
  it("разбирает многострочные пункты и даты", () => {
    const e = parseChangelog("## 2.0.0 · 2026-01-02\n- первый\n  продолжение\n- второй\n\n## 1.9.0\n- старый");
    expect(e).toEqual([
      { version: "2.0.0", date: "2026-01-02", items: ["первый продолжение", "второй"] },
      { version: "1.9.0", date: undefined, items: ["старый"] },
    ]);
  });
  it("в публичном файле изменений нет личного", () => {
    expect(CHANGELOG).not.toMatch(/итмо|itmo|ifmo/i);
  });
});

const hw = (t0: number, t1: number, text: string): HeardWord => ({ t0, t1, text });

describe("текст песни по словам", () => {
  it("слова и похожесть прощают ошибки распознавания", () => {
    expect(tokens("Я включаю рок-н-ролл!")).toEqual(["я", "включаю", "рок", "н", "ролл"]);
    expect(similarity("предрешено", "притришено")).toBeGreaterThan(0.6);
    expect(similarity(tokens("Ёлка")[0]!, tokens("елка")[0]!)).toBe(1);
    expect(languageOf("Когда все ложатся спать, my love")).toBe("russian");
    expect(languageOf("I can see it in your eyes")).toBe("english");
    expect(languageOf("")).toBeUndefined();
  });

  it("начало слова не «прилипает» к паузе перед ним", () => {
    // модель отдала «Вот» с 144 по 153.6 — на самом деле его спели в конце
    expect(wordStart(hw(144, 153.64, "Вот"))).toBeCloseTo(153.3, 1);
    expect(wordStart(hw(10, 10.2, "да"))).toBe(10);
  });

  it("склейка перекрывающихся окон не задваивает слова", () => {
    const words = mergeWindows([
      { start: 0, words: [hw(1, 1.5, "раз"), hw(25, 25.4, "два"), hw(27.5, 27.9, "три")] },
      { start: 24, words: [hw(25, 25.4, "два"), hw(27.5, 27.9, "три"), hw(30, 30.5, "четыре")] },
    ]);
    expect(words.map((w) => w.text)).toEqual(["раз", "два", "три", "четыре"]);
  });

  it("ставит время каждому слову, даже нерасслышанному, и строки идут по порядку", () => {
    const lines = [{ text: "Когда все ложатся спать" }, { text: "Я включаю рок-н-ролл" }, { text: "" }, { text: "Дело не в тебе, my love" }];
    const heard = [
      hw(0, 0.46, "Когда"),
      hw(0.46, 0.82, "все"),
      hw(0.82, 1.88, "ложатся"),
      hw(1.88, 3.66, "спать"),
      hw(3.66, 4.56, "Я"),
      hw(4.56, 5.32, "включаю"),
      hw(5.32, 5.86, "рок"),
      hw(5.86, 6.24, "-н"),
      hw(6.24, 7.0, "-рол"),
      hw(7.0, 9.0, "Дело"),
      hw(9.0, 9.34, "не"),
      hw(9.34, 9.48, "в"),
      hw(9.48, 9.86, "тебе,"),
      hw(10.28, 12.04, "молос"),
    ];
    const r = alignLyrics(lines, heard, 60);
    expect(r.quality).toBeGreaterThan(0.75);
    expect(r.lines.map((l) => l.text)).toEqual(["Когда все ложатся спать", "Я включаю рок-н-ролл", "Дело не в тебе, my love"]);
    const [a, b, c] = r.lines;
    expect(a!.words!.map((w) => w.text)).toEqual(["Когда", "все", "ложатся", "спать"]);
    expect(b!.time).toBeGreaterThan(4.2);
    expect(b!.time).toBeLessThan(4.6);
    expect(b!.words![2]!.text).toBe("рок-н-ролл");
    expect(c!.time).toBeGreaterThan(8.3);
    // «my love» модель расслышала как «молос» — слова всё равно получили время после «тебе»
    expect(c!.words!.at(-1)!.time).toBeGreaterThan(c!.words![3]!.time);
    const all = r.lines.flatMap((l) => l.words!.map((w) => w.time));
    expect([...all].sort((x, y) => x - y)).toEqual(all);
  });

  it("нерасслышанная строка не растягивается на весь проигрыш", () => {
    const lines = [{ text: "раз два три" }, { text: "четыре пять шесть" }];
    // после «три» — 20 с музыки, потом поют «пять шесть» (а «четыре» не расслышали)
    const heard = [hw(1, 1.3, "раз"), hw(1.3, 1.6, "два"), hw(1.6, 2, "три"), hw(2, 22.4, "пять"), hw(22.4, 22.8, "шесть")];
    const r = alignLyrics(lines, heard, 40);
    expect(r.lines[1]!.time).toBeGreaterThan(21);
  });

  it("текст не тот (ничего не совпало) — низкое качество, разметке не верим", () => {
    const r = alignLyrics([{ text: "совсем другая песня тут" }, { text: "и слова не те" }], [hw(1, 2, "hello"), hw(2, 3, "world")], 30);
    expect(r.quality).toBeLessThan(0.3);
  });

  it("без текста — строки из услышанного, без мусора распознавания", () => {
    const lines = linesFromHeard([hw(0, 1, "Продолжение следует..."), hw(5, 5.3, "привет"), hw(5.3, 5.6, "мир"), hw(8, 8.4, "снова"), hw(8.4, 8.8, "я")]);
    expect(lines.map((l) => l.text)).toEqual(["привет мир", "снова я"]);
    expect(cleanHeard([hw(0, 1, "Субтитры")])).toEqual([]);
  });

  it("отпечаток текста меняется только при смене слов", () => {
    expect(textKey([{ text: "Раз, два!" }])).toBe(textKey([{ text: "раз два" }]));
    expect(textKey([{ text: "раз два" }])).not.toBe(textKey([{ text: "раз три" }]));
  });
});

describe("модель распознавания и хранение разметки", () => {
  const dir = mkdtempSync(join(tmpdir(), "camado-ws-"));
  const REL = "onnx-community/whisper-small_timestamped/resolve/main/onnx/encoder_model_q4.onnx";
  it("качать можно только файлы нашей модели", () => {
    expect(modelFile(dir, REL)).toContain(join("models", "onnx-community", "whisper-small_timestamped", "onnx", "encoder_model_q4.onnx"));
    expect(modelFile(dir, "evil/model/resolve/main/x.onnx")).toBeUndefined();
    expect(modelFile(dir, "onnx-community/whisper-small_timestamped/resolve/main/../../../etc/passwd")).toBeUndefined();
    expect(modelFile(dir, "onnx-community/whisper-small_timestamped/resolve/main/a/b/c.json")).toBeUndefined();
  });
  it("скачивает один раз, а отсутствующий файл запоминает", async () => {
    let calls = 0;
    const fake = (async (url: string) => {
      calls++;
      if (String(url).endsWith("missing.json")) return new Response("no", { status: 404 });
      return new Response(new Uint8Array(3_000_000), { status: 200, headers: { "content-length": "3000000" } });
    }) as typeof fetch;
    const seen: number[] = [];
    expect(await ensureModelFile(dir, REL, (p) => seen.push(p.loaded), fake)).toBe(true);
    expect(existsSync(modelFile(dir, REL)!)).toBe(true);
    expect(seen.at(-1)).toBe(3_000_000);
    expect(await ensureModelFile(dir, REL, () => undefined, fake)).toBe(true);
    const MISS = "onnx-community/whisper-small_timestamped/resolve/main/missing.json";
    expect(await ensureModelFile(dir, MISS, () => undefined, fake)).toBe(false);
    expect(await ensureModelFile(dir, MISS, () => undefined, fake)).toBe(false);
    expect(calls).toBe(2);
  });
  it("разметку из окна проверяет и обрезает", () => {
    expect(cleanWordSync({ v: 2 })).toBeUndefined();
    expect(cleanWordSync({ v: 1, source: "evil", lines: [] })).toBeUndefined();
    const w = cleanWordSync({ v: 1, model: "m", textKey: "k", source: "aligned", quality: 7, duration: 100, lines: [{ time: -5, text: "x", words: [{ time: Infinity, text: "x" }] }] });
    expect(w!.quality).toBe(1);
    expect(w!.lines[0]!.time).toBe(0);
    expect(w!.lines[0]!.words![0]!.time).toBe(0);
  });
});

describe("текст песни: два слова разом", () => {
  it("слова с одним временем раскладываются до следующего слова", async () => {
    const { spreadWords, respaceLines, MIN_WORD_STEP } = await import("../desktop/shared/wordsync.js");
    const T = spreadWords(
      [
        { t: 10, w: 3 },
        { t: 11.5, w: 3 },
        { t: 11.5, w: 5 },
        { t: 11.52, w: 2 },
        { t: 13, w: 4 },
      ],
      60,
    );
    for (let i = 1; i < T.length; i++) expect(T[i]! - T[i - 1]!).toBeGreaterThanOrEqual(MIN_WORD_STEP - 1e-9);
    expect(T[1]).toBe(11.5);
    expect(T[4]).toBe(13);
    const lines = respaceLines([{ time: 5, text: "my love", words: [{ time: 5, text: "my" }, { time: 5, text: "love" }] }, { time: 6, text: "x", words: [{ time: 6, text: "x" }] }], 30);
    expect(lines[0]!.words![1]!.time).toBeGreaterThan(5.1);
    expect(lines[1]!.time).toBe(6);
  });

  it("на настоящей сверке нет слов с одинаковым временем", () => {
    const r = alignLyrics(
      [{ text: "Дело не в тебе, my love" }, { text: "Всё уже предрешено" }],
      [hw(7, 9, "Дело"), hw(9, 9.34, "не"), hw(9.34, 9.48, "в"), hw(9.48, 9.86, "тебе,"), hw(10.28, 12.04, "молос"), hw(12.04, 13.16, "Все"), hw(13.16, 13.62, "уже"), hw(13.62, 14.9, "притришено")],
      30,
    );
    const all = r.lines.flatMap((l) => l.words!.map((w) => w.time));
    for (let i = 1; i < all.length; i++) expect(all[i]! - all[i - 1]!).toBeGreaterThan(0.05);
  });
});
