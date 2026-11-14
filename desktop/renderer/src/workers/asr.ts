// Распознавание слов песни прямо на компьютере (Whisper). Работает в отдельном потоке, чтобы окно не тормозило.
// Модель Камадо скачивает один раз (через свой протокол camado-media://model/ — файлы ложатся в папку программы).
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { alignLyrics, linesFromHeard, mergeWindows } from "../../../shared/wordsync";
import type { LyricsLine } from "../../../shared/types";
import ortMjs from "../../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasm from "../../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url";

export const ASR_MODEL = "onnx-community/whisper-small_timestamped";

env.allowLocalModels = false;
env.useBrowserCache = false;
env.remoteHost = "camado-media://model/";
env.remotePathTemplate = "{model}/resolve/{revision}/";
const onnx = env.backends.onnx as { wasm?: { wasmPaths?: unknown; numThreads?: number; proxy?: boolean } };
if (onnx.wasm) {
  onnx.wasm.wasmPaths = { mjs: ortMjs, wasm: ortWasm };
  onnx.wasm.proxy = false;
  onnx.wasm.numThreads = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
}

export type AsrIn =
  | {
      type: "run";
      id: number;
      pcm: Float32Array;
      starts: number[];
      window: number;
      language?: string;
      sr: number;
      /** Текст песни — сверить с услышанным здесь же, чтобы не нагружать окно. */
      lines?: { text: string }[];
      duration?: number;
    }
  | { type: "warm" };
export type AsrOut =
  | { type: "progress"; file: string; loaded: number; total: number }
  | { type: "ready"; device: string }
  | { type: "window"; id: number; done: number; total: number }
  | {
      type: "result";
      id: number;
      windows: { start: number; words: { t0: number; t1: number; text: string }[] }[];
      aligned?: { lines: LyricsLine[]; quality: number };
      heardLines?: LyricsLine[];
    }
  | { type: "error"; id?: number; message: string };

const post = (m: AsrOut) => (self as unknown as Worker).postMessage(m);

const makePipeline = pipeline as unknown as (task: string, model: string, opts: object) => Promise<AutomaticSpeechRecognitionPipeline>;
let asr: Promise<AutomaticSpeechRecognitionPipeline> | undefined;
let device = "wasm";

async function hasWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

function load(): Promise<AutomaticSpeechRecognitionPipeline> {
  asr ??= (async () => {
    // Только процессор: видеокарта нужна окну (пластинка, волны, фон) — на ней распознавание
    // отнимало кадры у анимации, и всё подтормаживало, пока играла музыка.
    device = "wasm";
    void hasWebGpu;
    const make = (dev: string) =>
      makePipeline("automatic-speech-recognition", ASR_MODEL, {
        device: dev as "webgpu" | "wasm",
        dtype: { encoder_model: "q4", decoder_model_merged: "q4" },
        progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === "progress" && p.file) post({ type: "progress", file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 });
        },
      });
    let p: AutomaticSpeechRecognitionPipeline;
    try {
      p = await make(device);
    } catch (e) {
      if (device === "wasm") throw e;
      // видеокарта не подошла — считаем на процессоре
      device = "wasm";
      p = await make("wasm");
    }
    post({ type: "ready", device });
    return p;
  })();
  asr.catch(() => (asr = undefined));
  return asr;
}

// По одному запросу за раз: песня в фоне и голос («Камадо, …») не должны считать одновременно.
let chain: Promise<void> = Promise.resolve();
self.onmessage = (e: MessageEvent<AsrIn>) => {
  chain = chain.then(() => handle(e.data)).catch(() => undefined);
};

async function handle(m: AsrIn): Promise<void> {
  if (m.type === "warm") {
    try {
      await load();
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  try {
    const p = await load();
    const out: { start: number; words: { t0: number; t1: number; text: string }[] }[] = [];
    for (let i = 0; i < m.starts.length; i++) {
      const s = m.starts[i]!;
      const clip = m.pcm.subarray(Math.floor(s * m.sr), Math.floor((s + m.window) * m.sr));
      if (clip.length < m.sr) break;
      const r = (await p(clip, { return_timestamps: "word", language: m.language, task: "transcribe" } as never)) as {
        chunks?: { text: string; timestamp: [number, number | null] }[];
      };
      out.push({
        start: s,
        words: (r.chunks ?? []).map((c) => ({ t0: s + c.timestamp[0], t1: s + (c.timestamp[1] ?? c.timestamp[0]), text: c.text.trim() })),
      });
      post({ type: "window", id: m.id, done: i + 1, total: m.starts.length });
    }
    // сверка с текстом — тоже здесь (это сотни тысяч сравнений: в окне дало бы рывок)
    const heard = mergeWindows(out);
    const aligned = m.lines && m.lines.filter((l) => l.text.trim()).length >= 2 ? alignLyrics(m.lines, heard, m.duration ?? 0) : undefined;
    const heardLines = aligned ? undefined : linesFromHeard(heard);
    post({ type: "result", id: m.id, windows: out, aligned, heardLines });
  } catch (err) {
    post({ type: "error", id: m.id, message: err instanceof Error ? err.message : String(err) });
  }
}
