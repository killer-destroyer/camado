// Пословный текст песен: модель распознавания (качается один раз) и готовая разметка каждой песни.
// Всё хранится у пользователя: папки models/ и wordsync/ рядом с базой.
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline as pump } from "node:stream/promises";
import type { WordSync } from "../shared/wordsync.js";

/** Единственная модель, которую разрешено скачивать. */
export const MODEL_REPO = "onnx-community/whisper-small_timestamped";
const HF = "https://huggingface.co";

/** «onnx-community/whisper-small_timestamped/resolve/main/onnx/encoder_model_q4.onnx» → путь в папке models. */
export function modelFile(dataDir: string, rel: string): string | undefined {
  const prefix = `${MODEL_REPO}/resolve/main/`;
  if (!rel.startsWith(prefix)) return undefined;
  const rest = rel.slice(prefix.length);
  if (!/^[\w.-]+(\/[\w.-]+)?$/.test(rest) || rest.includes("..")) return undefined;
  return join(dataDir, "models", MODEL_REPO, rest);
}

type Progress = (p: { file: string; loaded: number; total: number }) => void;
const inflight = new Map<string, Promise<boolean>>();

/** Файл модели есть у нас — отдаём; нет — качаем с Hugging Face (один раз). false — такого файла у модели нет. */
export function ensureModelFile(dataDir: string, rel: string, onProgress: Progress, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const path = modelFile(dataDir, rel);
  if (!path) return Promise.resolve(false);
  if (existsSync(path)) return Promise.resolve(true);
  const missing = `${path}.missing`;
  if (existsSync(missing)) return Promise.resolve(false);
  let p = inflight.get(path);
  if (!p) {
    p = (async () => {
      await mkdir(dirname(path), { recursive: true });
      const res = await fetchImpl(`${HF}/${rel}`, { redirect: "follow", signal: AbortSignal.timeout(30 * 60e3) });
      if (res.status === 404) {
        await writeFile(missing, "");
        return false;
      }
      if (!res.ok || !res.body) throw new Error(`Не скачалась модель (${res.status})`);
      const total = Number(res.headers.get("content-length")) || 0;
      let loaded = 0;
      let last = 0;
      const file = rel.split("/").pop()!;
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctl) {
          loaded += chunk.byteLength;
          if (loaded - last > 2_000_000 || loaded === total) {
            last = loaded;
            onProgress({ file, loaded, total });
          }
          ctl.enqueue(chunk);
        },
      });
      const part = `${path}.part`;
      await pump(Readable.fromWeb(res.body.pipeThrough(counter) as never), createWriteStream(part));
      await rename(part, path);
      onProgress({ file, loaded, total: total || loaded });
      return true;
    })().finally(() => inflight.delete(path));
    inflight.set(path, p);
  }
  return p;
}

export async function modelSize(dataDir: string): Promise<number> {
  const dir = join(dataDir, "models", MODEL_REPO);
  let sum = 0;
  const walk = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (!e.name.endsWith(".part")) sum += (await stat(p)).size;
    }
  };
  await walk(dir);
  return sum;
}

const ID = /^[a-f0-9]{40}$/;

/** Проверить и почистить разметку, пришедшую из окна. */
export function cleanWordSync(x: unknown): WordSync | undefined {
  const w = x as Partial<WordSync>;
  if (!w || w.v !== 1 || !Array.isArray(w.lines) || w.lines.length > 2000) return undefined;
  if (w.source !== "aligned" && w.source !== "heard") return undefined;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(36_000, n)) : 0);
  const lines = w.lines.map((l) => ({
    time: num(l.time),
    text: String(l.text ?? "").slice(0, 500),
    ...(Array.isArray(l.words) ? { words: l.words.slice(0, 200).map((x) => ({ time: num(x.time), text: String(x.text ?? "").slice(0, 100) })) } : {}),
  }));
  return {
    v: 1,
    model: String(w.model ?? "").slice(0, 60),
    textKey: String(w.textKey ?? "").slice(0, 100),
    source: w.source,
    quality: Math.max(0, Math.min(1, Number(w.quality) || 0)),
    duration: num(w.duration),
    lines,
    createdAt: typeof w.createdAt === "string" ? w.createdAt.slice(0, 40) : new Date().toISOString(),
  };
}

type Handler = (...args: never[]) => unknown;

export function wordsyncHandlers(dataDir: string, onChange: (id: string) => void): Record<string, Handler> {
  const dir = join(dataDir, "wordsync");
  const file = (id: string) => (ID.test(id) ? join(dir, `${id}.json`) : undefined);
  return {
    "wordsync.get": async (id: string) => {
      const f = file(id);
      if (!f || !existsSync(f)) return null;
      try {
        return cleanWordSync(JSON.parse(await readFile(f, "utf8"))) ?? null;
      } catch {
        return null;
      }
    },
    "wordsync.save": async (id: string, data: unknown) => {
      const f = file(id);
      const clean = cleanWordSync(data);
      if (!f || !clean) return false;
      await mkdir(dir, { recursive: true });
      await writeFile(f, JSON.stringify(clean));
      onChange(id);
      return true;
    },
    /** Какие песни уже размечены (и какой моделью). */
    "wordsync.done": async () => {
      const out: Record<string, string> = {};
      for (const n of await readdir(dir).catch(() => [] as string[])) {
        const id = n.replace(/\.json$/, "");
        if (!ID.test(id)) continue;
        try {
          out[id] = String((JSON.parse(await readFile(join(dir, n), "utf8")) as { model?: string }).model ?? "");
        } catch {
          /* битый файл — посчитаем заново */
        }
      }
      return out;
    },
    "wordsync.drop": async (id: string) => {
      const f = file(id);
      if (f) await rm(f, { force: true });
      onChange(id);
    },
    "wordsync.model": async () => ({ bytes: await modelSize(dataDir) }),
    "wordsync.dropModel": async () => {
      await rm(join(dataDir, "models", MODEL_REPO), { recursive: true, force: true });
    },
  };
}
