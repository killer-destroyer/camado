// 1.5.0: темп и энергия своих треков — «бодро/спокойно» в «Моей волне» берёт и твои песни.
import { describe, expect, it } from "vitest";
import { fitsMood, tempoEnergy } from "../desktop/shared/energy.js";
import { Wave } from "../desktop/main/wave.js";
import type { Track } from "../desktop/shared/types.js";
import { memoryStore } from "./helpers.js";

const SR = 16000;
function beat(bpm: number, sec = 40, amp = 0.8): Float32Array {
  const out = new Float32Array(SR * sec);
  const period = (60 / bpm) * SR;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < out.length; i++) {
    const ph = i % period;
    const kick = ph < 1600 ? Math.exp(-ph / 300) * Math.sin((2 * Math.PI * 60 * ph) / SR) : 0;
    out[i] = amp * kick + 0.12 * Math.sin((2 * Math.PI * 220 * i) / SR) + 0.02 * rnd();
  }
  return out;
}
function pad(sec = 40): Float32Array {
  const out = new Float32Array(SR * sec);
  for (let i = 0; i < out.length; i++) out[i] = 0.03 * Math.sin((2 * Math.PI * 196 * i) / SR) * (0.8 + 0.2 * Math.sin((2 * Math.PI * 0.1 * i) / SR));
  return out;
}

describe("темп и энергия", () => {
  it("ловит темп и отличает бодрое от спокойного", () => {
    const fast = tempoEnergy(beat(128), SR)!;
    expect(Math.abs(fast.bpm - 128)).toBeLessThanOrEqual(3);
    const slow = tempoEnergy(beat(80, 40, 0.3), SR)!;
    expect(Math.abs(slow.bpm - 80) <= 3 || Math.abs(slow.bpm - 160) <= 5).toBe(true);
    const calm = tempoEnergy(pad(), SR)!;
    expect(fast.e).toBeGreaterThan(0.55);
    expect(calm.e).toBeLessThan(0.45);
    expect(tempoEnergy(new Float32Array(SR * 3), SR)).toBeUndefined();
  });

  it("волна по настроению берёт подходящие свои треки", async () => {
    expect(fitsMood("energy", { bpm: 128, e: 0.7 })).toBe(true);
    expect(fitsMood("calm", { bpm: 128, e: 0.7 })).toBe(false);
    expect(fitsMood("study", undefined)).toBe(false);
    expect(fitsMood("mine", undefined)).toBe(true);
    const t = (id: string): Track => ({ id, path: id, title: id, artist: id, album: "", duration: 200, hasLyrics: false });
    const library = [t("loud1"), t("loud2"), t("soft1"), t("soft2"), t("soft3")];
    const energy = { loud1: { bpm: 130, e: 0.8 }, loud2: { bpm: 125, e: 0.7 }, soft1: { bpm: 70, e: 0.2 }, soft2: { bpm: 80, e: 0.3 }, soft3: { bpm: 75, e: 0.25 } };
    const offline = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const w = new Wave(memoryStore(), offline);
    // без интернета: «спокойно» сначала — спокойные свои, потом уже любые
    const calm = await w.next({ mood: "calm", count: 3, library, favorites: [], energy });
    expect(calm.map((x) => x.id).sort()).toEqual(["soft1", "soft2", "soft3"]);
    const up = await w.next({ mood: "energy", count: 2, library, favorites: [], energy });
    expect(up.map((x) => x.id).sort()).toEqual(["loud1", "loud2"]);
  });
});
