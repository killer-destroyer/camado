// Фото и голос для ИИ: картинку уменьшаем (быстрее и дешевле), голос пишем и превращаем в WAV 16 кГц моно.

/** Картинка → JPEG не больше 1600 px по длинной стороне, base64 без префикса. */
export async function imageToBase64(blob: Blob): Promise<{ mime: string; data: string }> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.86);
  return { mime: "image/jpeg", data: url.slice(url.indexOf(",") + 1) };
}

function wav(samples: Float32Array, rate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i]!)) * 0x7fff, true);
  return new Uint8Array(buf);
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export interface Recording {
  stop(): Promise<{ mime: string; data: string; seconds: number }>;
  cancel(): void;
}

/** Начать запись с микрофона (до 2 минут). */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  const t0 = performance.now();
  const limit = window.setTimeout(() => rec.state === "recording" && rec.stop(), 120_000);
  const finish = () => {
    clearTimeout(limit);
    stream.getTracks().forEach((t) => t.stop());
  };
  return {
    cancel() {
      if (rec.state === "recording") rec.stop();
      finish();
    },
    stop: () =>
      new Promise((resolve, reject) => {
        rec.onstop = async () => {
          finish();
          try {
            const blob = new Blob(chunks, { type: rec.mimeType });
            const ctx = new OfflineAudioContext(1, 1, 16000);
            const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
            // в 16 кГц моно — так файл маленький, а речь распознаётся отлично
            const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
            const src = off.createBufferSource();
            src.buffer = decoded;
            src.connect(off.destination);
            src.start();
            const out = await off.startRendering();
            resolve({ mime: "audio/wav", data: toBase64(wav(out.getChannelData(0), 16000)), seconds: (performance.now() - t0) / 1000 });
          } catch (err) {
            reject(err);
          }
        };
        if (rec.state === "recording") rec.stop();
        else rec.onstop?.(new Event("stop"));
      }),
  };
}
