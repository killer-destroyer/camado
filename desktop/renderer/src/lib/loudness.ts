// Насколько громко записан трек. Скачанные песни сведены по-разному: одна шепчет, другая орёт.
// Меряем среднюю громкость всей песни (тишину не считаем) и подтягиваем к одному уровню.
import { engine } from "./audio";
import { offerScratchBuffer } from "./scratch";

/** К какому уровню подтягиваем (дБ от максимума). Современные треки обычно −8…−12, старые и тихие −16…−20. */
export const TARGET_DB = -13;
/** Дальше этого не подтягиваем: тихий трек на +20 дБ превратится в шум. */
export const MAX_TRIM = 10;

/** Средняя громкость (RMS, дБ) по кусочкам по 0.4 с, без тишины. */
export function loudnessOf(buffer: AudioBuffer): number {
  const ch = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const block = Math.floor(buffer.sampleRate * 0.4);
  let sum = 0;
  let blocks = 0;
  for (let start = 0; start + block <= buffer.length; start += block) {
    let e = 0;
    // каждый 4-й сэмпл — для средней громкости этого хватает с запасом, а в 4 раза быстрее
    for (let i = start; i < start + block; i += 4) {
      let v = 0;
      for (const c of ch) v += c[i]!;
      v /= ch.length;
      e += v * v;
    }
    const ms = e / (block / 4);
    if (ms < 1e-5) continue; // тишина (≈ −50 дБ) — не в счёт
    sum += ms;
    blocks++;
  }
  if (!blocks) return TARGET_DB;
  return 10 * Math.log10(sum / blocks);
}

export const autoTrim = (loudnessDb: number) => Math.max(-MAX_TRIM, Math.min(MAX_TRIM, TARGET_DB - loudnessDb));

const pending = new Map<string, Promise<number | undefined>>();

/** Измерить трек по адресу (в фоне). Заодно отдаём раскодированный звук скретчу — второй раз не раскодируем. */
export function measure(url: string): Promise<number | undefined> {
  const was = pending.get(url);
  if (was) return was;
  const p = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => engine.context().decodeAudioData(data))
    .then((buf) => {
      offerScratchBuffer(url, buf);
      return Math.round(loudnessOf(buf) * 10) / 10;
    })
    .catch(() => undefined)
    .finally(() => pending.delete(url));
  pending.set(url, p);
  return p;
}
