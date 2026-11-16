import { afterEach, expect, it, vi } from "vitest";
import type { Track } from "../desktop/shared/types.js";

const { play, getLyrics, toast } = vi.hoisted(() => ({ play: vi.fn(), getLyrics: vi.fn(), toast: vi.fn() }));

vi.mock("../desktop/renderer/src/lib/audio", () => ({ engine: { play, el: {} } }));
vi.mock("../desktop/renderer/src/lib/api", () => ({ api: { lyrics: { get: getLyrics } } }));
vi.mock("../desktop/renderer/src/state/app", async () => {
  const { DEFAULT_SETTINGS } = await import("../desktop/shared/settings.js");
  return { app: { get: () => ({ settings: { ...DEFAULT_SETTINGS, autoLevel: false, wordSync: false } }) }, toast };
});
vi.mock("../desktop/renderer/src/state/wordsync", () => ({ kick: vi.fn() }));

function track(id: string): Track {
  return { id, path: id, title: id, artist: "", album: "", duration: 60, hasLyrics: false };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

it("игнорирует ошибку запуска песни, если уже выбрана следующая", async () => {
  vi.stubGlobal("navigator", {});
  const { playQueue } = await vi.importActual<{ playQueue(tracks: Track[], index: number): Promise<void> }>(
    "../desktop/renderer/src/state/player",
  );
  let failFirst!: (error: Error) => void;
  play.mockReturnValueOnce(new Promise<void>((_resolve, reject) => { failFirst = reject; }));
  play.mockResolvedValueOnce(undefined);
  getLyrics.mockResolvedValue({ synced: false, lines: [], source: "none" });

  const first = playQueue([track("A"), track("B")], 0);
  await playQueue([track("A"), track("B")], 1);
  failFirst(new Error("переключили песню"));
  await first;

  expect(toast).not.toHaveBeenCalled();
  expect(getLyrics).toHaveBeenCalledTimes(1);
  expect(getLyrics).toHaveBeenCalledWith(expect.objectContaining({ trackId: "B" }));
});
