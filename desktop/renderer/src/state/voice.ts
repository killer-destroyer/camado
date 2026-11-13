// Голосовой Камадо: говоришь — он отвечает голосом. Кнопка микрофона, горячая клавиша
// (нажал — говори, замолчал — отправилось; или зажми и держи) и по желанию — слово «Камадо».
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { startRecording, wavToPcm, type Recording } from "../lib/media";
import { createStore } from "../lib/store";
import { app, toast } from "./app";
import { onHotkey } from "./hotkeys";
import { transcribeLocal } from "./wordsync";
import { isWakeWord, speakable } from "../../../shared/voicetext";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

export const voice = createStore<{ phase: VoicePhase; heard?: string; answer?: string; error?: string }>({ phase: "idle" });

/** Громкость голоса 0..1 — для анимации микрофона (меняется 20 раз в секунду, без перерисовки React). */
export const voiceLevel = { value: 0 };

const SPEAK_LEVEL = 0.025;
const SILENCE_MS = 1300;
const MAX_MS = 30_000;

let rec: Recording | undefined;
let startedAt = 0;
let spoke = false;
let quietSince = 0;
let maxTimer = 0;

export async function startListening(): Promise<void> {
  if (voice.get().phase === "listening") return;
  stopSpeaking();
  try {
    spoke = false;
    quietSince = 0;
    startedAt = Date.now();
    voice.set({ phase: "listening", heard: undefined, answer: undefined, error: undefined });
    rec = await startRecording({
      onLevel: (rms) => {
        voiceLevel.value = Math.min(1, rms * 12);
        const now = Date.now();
        if (rms > SPEAK_LEVEL) {
          spoke = true;
          quietSince = 0;
        } else if (spoke) {
          quietSince ||= now;
          if (now - quietSince > SILENCE_MS) void finishListening();
        } else if (now - startedAt > 8000) cancelListening("Ничего не услышал");
      },
    });
    maxTimer = window.setTimeout(() => void finishListening(), MAX_MS);
  } catch {
    voice.set({ phase: "idle" });
    toast("Нет доступа к микрофону — разреши его Камадо в настройках системы", "warn");
  }
}

export function cancelListening(why?: string): void {
  clearTimeout(maxTimer);
  rec?.cancel();
  rec = undefined;
  voiceLevel.value = 0;
  voice.set({ phase: "idle", error: why });
}

export async function finishListening(): Promise<void> {
  const r = rec;
  if (!r) return;
  rec = undefined;
  clearTimeout(maxTimer);
  voiceLevel.value = 0;
  voice.set({ phase: "thinking" });
  try {
    const audio = await r.stop();
    if (audio.seconds < 0.6) return void voice.set({ phase: "idle" });
    await ask(audio.data);
  } catch (err) {
    voice.set({ phase: "idle", error: err instanceof Error ? err.message : "Не получилось записать" });
  }
}

/** Gemini слышит звук сам; другие модели — сначала распознаём речь на компьютере. */
async function ask(wav: string): Promise<void> {
  const st = await api.ai.status();
  if (!st.enabled) return void voice.set({ phase: "idle", error: "ИИ выключен — подключи его в Настройках → ИИ" });
  let r: Awaited<ReturnType<typeof api.voice.ask>>;
  if (st.kind === "gemini") r = await api.voice.ask({ wav });
  else {
    const text = await transcribeLocal(wavToPcm(wav)).catch(() => "");
    if (!text) return void voice.set({ phase: "idle", error: "Не расслышал — попробуй ещё раз" });
    voice.set({ heard: text });
    r = await api.voice.ask({ text });
  }
  if ("error" in r) return void voice.set({ phase: "idle", error: r.error });
  voice.set({ answer: r.answer, heard: r.heard ?? voice.get().heard });
  if (app.get().settings.voice.speak) speak(r.answer);
  else voice.set({ phase: "idle" });
  window.dispatchEvent(new Event("camado-chat-changed"));
}

let ducked: number | undefined;
function duck(on: boolean): void {
  if (on && ducked === undefined) {
    ducked = engine.volume;
    engine.volume = ducked * 0.25;
  } else if (!on && ducked !== undefined) {
    engine.volume = app.get().settings.volume;
    ducked = undefined;
  }
}

export function speak(text: string): void {
  const say = speakable(text);
  if (!say || typeof speechSynthesis === "undefined") return void voice.set({ phase: "idle" });
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(say);
  u.lang = "ru-RU";
  const ru = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ru"));
  // голоса получше (Milena, Google, «Enhanced») — если есть
  u.voice = ru.find((v) => /enhanced|premium|milena|google|natural/i.test(v.name)) ?? ru[0] ?? null;
  u.rate = app.get().settings.voice.rate || 1;
  u.onstart = () => {
    duck(true);
    voice.set({ phase: "speaking" });
  };
  u.onend = u.onerror = () => {
    duck(false);
    if (voice.get().phase === "speaking") voice.set({ phase: "idle" });
  };
  speechSynthesis.speak(u);
  // озвучка не стартовала (нет голосов в системе) — не зависаем
  setTimeout(() => {
    if (!speechSynthesis.speaking && voice.get().phase !== "speaking") voice.set({ phase: "idle" });
  }, 1500);
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  duck(false);
  if (voice.get().phase === "speaking") voice.set({ phase: "idle" });
}

/** Кнопка / клавиша: слушаю → отправить; говорю → замолчать; иначе — начать слушать. */
export function toggleVoice(): void {
  const p = voice.get().phase;
  if (p === "listening") void finishListening();
  else if (p === "speaking") stopSpeaking();
  else if (p === "idle") void startListening();
}

// ---------- «Камадо, …» — отзываемся на слово ----------

let wake: { stream: MediaStream; ctx: AudioContext; timer: number } | undefined;

/** Слушаем микрофон: короткая фраза громче фона → распознаём на компьютере → есть «Камадо» — слушаем просьбу. */
export async function setWake(on: boolean): Promise<void> {
  if (!on) {
    if (wake) {
      clearInterval(wake.timer);
      wake.stream.getTracks().forEach((t) => t.stop());
      void wake.ctx.close();
      wake = undefined;
    }
    return;
  }
  if (wake) return;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    toast("Нет доступа к микрофону — слово «Камадо» не слушаю", "warn");
    return;
  }
  const ctx = new AudioContext({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  src.connect(an);
  // кольцевой буфер последних 3 секунд
  const RING = 16000 * 3;
  const ring = new Float32Array(RING);
  let pos = 0;
  const frame = new Float32Array(an.fftSize);
  let loudFrom = 0;
  let checking = false;
  let lastCheck = 0;
  const timer = window.setInterval(() => {
    an.getFloatTimeDomainData(frame);
    // кусок, которого ещё нет в кольце (интервал ~100 мс = 1600 отсчётов; берём хвост кадра)
    const take = Math.min(frame.length, 1600);
    let sum = 0;
    for (let i = frame.length - take; i < frame.length; i++) {
      ring[pos] = frame[i]!;
      pos = (pos + 1) % RING;
      sum += frame[i]! * frame[i]!;
    }
    const rms = Math.sqrt(sum / take);
    const now = Date.now();
    const busy = voice.get().phase !== "idle" || checking || engine.el.paused === false;
    if (rms > SPEAK_LEVEL * 1.4) {
      loudFrom ||= now;
      return;
    }
    // фраза закончилась: была речь 0.3–2.5 с — проверяем, не «Камадо» ли это
    const len = loudFrom ? now - loudFrom : 0;
    loudFrom = 0;
    if (busy || len < 300 || len > 2500 || now - lastCheck < 1500) return;
    lastCheck = now;
    checking = true;
    const clip = new Float32Array(RING);
    clip.set(ring.subarray(pos));
    clip.set(ring.subarray(0, pos), RING - pos);
    void transcribeLocal(clip)
      .then((t) => {
        if (isWakeWord(t)) {
          toast("Слушаю", "info");
          void startListening();
        }
      })
      .catch(() => undefined)
      .finally(() => (checking = false));
  }, 100);
  wake = { stream, ctx, timer };
}

export function initVoice(): () => void {
  let downAt = 0;
  const off = onHotkey("voice", (down) => {
    if (down) {
      downAt = Date.now();
      toggleVoice();
    } else if (Date.now() - downAt > 700 && voice.get().phase === "listening") {
      // держали клавишу — отпустил, значит договорил
      void finishListening();
    }
  });
  const applyWake = () => void setWake(app.get().settings.voice.wake);
  applyWake();
  let was = app.get().settings.voice.wake;
  const offApp = app.subscribe(() => {
    const w = app.get().settings.voice.wake;
    if (w !== was) {
      was = w;
      applyWake();
    }
  });
  // голоса системы подгружаются не сразу
  if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
  return () => {
    off();
    offApp();
    void setWake(false);
  };
}
