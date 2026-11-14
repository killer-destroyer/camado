// «Отпечаток звука» для «Моей волны»: нейросеть CLAP слушает 10 секунд песни и выдаёт вектор —
// похожие по стилю песни получают близкие векторы. Отдельный поток, только процессор (видеокарта — окну).
import { AutoProcessor, ClapAudioModelWithProjection, env, type PreTrainedModel, type Processor } from "@huggingface/transformers";
import ortMjs from "../../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasm from "../../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url";

export const CLAP_MODEL = "Xenova/larger_clap_music_and_speech";

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

export type ClapIn = { type: "embed"; id: number; pcm: Float32Array } | { type: "warm" };
export type ClapOut = { type: "ready" } | { type: "vec"; id: number; vec: Float32Array } | { type: "error"; id?: number; message: string };

const post = (m: ClapOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

let loading: Promise<{ proc: Processor; model: PreTrainedModel }> | undefined;
function load() {
  loading ??= (async () => {
    const proc = await AutoProcessor.from_pretrained(CLAP_MODEL);
    const model = await (ClapAudioModelWithProjection as unknown as { from_pretrained(m: string, o: object): Promise<PreTrainedModel> }).from_pretrained(CLAP_MODEL, {
      device: "wasm",
      dtype: "q8",
    });
    post({ type: "ready" });
    return { proc, model };
  })();
  loading.catch(() => (loading = undefined));
  return loading;
}

// по одной песне за раз
let chain: Promise<void> = Promise.resolve();
self.onmessage = (e: MessageEvent<ClapIn>) => {
  chain = chain.then(() => handle(e.data)).catch(() => undefined);
};

async function handle(m: ClapIn): Promise<void> {
  try {
    const { proc, model } = await load();
    if (m.type === "warm") return;
    const inputs = await (proc as unknown as (a: Float32Array) => Promise<object>)(m.pcm);
    const out = (await (model as unknown as (i: object) => Promise<{ audio_embeds: { data: Float32Array } }>)(inputs)).audio_embeds.data;
    const v = Float32Array.from(out);
    let n = 0;
    for (const x of v) n += x * x;
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < v.length; i++) v[i]! /= n;
    post({ type: "vec", id: m.type === "embed" ? m.id : -1, vec: v }, [v.buffer]);
  } catch (err) {
    post({ type: "error", id: m.type === "embed" ? m.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
}
