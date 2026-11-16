// 1.5.0: правка трека — название, исполнитель, альбом, обложка; файл не меняется.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAppTools } from "../desktop/main/appTools.js";
import { Library } from "../desktop/main/library.js";

async function lib() {
  const dir = await mkdtemp(join(tmpdir(), "camado-lib-"));
  const music = join(dir, "music");
  await writeFile(join(dir, "01_песня_один.mp3"), "не mp3");
  const l = new Library(join(dir, "data"), () => undefined);
  await l.load();
  await l.addPaths([join(dir, "01_песня_один.mp3")]);
  return { l, dir, music };
}

describe("правка трека", () => {
  it("накладывает правку, хранит её и возвращает как в файле", async () => {
    const { l, dir } = await lib();
    const t = l.view().tracks[0]!;
    expect(t.title).toBe("песня один");
    await l.edit(t.id, { title: "Песня Один", artist: "Группа" });
    expect(l.view().tracks[0]).toMatchObject({ title: "Песня Один", artist: "Группа", edited: true });
    // после перезапуска правка на месте
    const again = new Library(join(dir, "data"), () => undefined);
    await again.load();
    expect(again.view().tracks[0]?.title).toBe("Песня Один");
    // пересканирование правку не сбрасывает
    await again.rescan();
    expect(again.track(t.id)?.artist).toBe("Группа");
    // файл не тронут
    expect(await readFile(join(dir, "01_песня_один.mp3"), "utf8")).toBe("не mp3");
    await again.edit(t.id, { title: null });
    expect(again.track(t.id)).toMatchObject({ title: "песня один", artist: "Группа" });
    await again.resetEdit(t.id);
    expect(again.track(t.id)?.edited).toBeUndefined();
  });

  it("своя обложка ложится в covers и отдаётся по camado-media", async () => {
    const { l } = await lib();
    const t = l.view().tracks[0]!;
    const res = await l.setCover(t.id, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]), "image/png");
    expect(res?.cover).toMatch(/^camado-media:\/\/cover\/[a-f0-9]{40}\.png$/);
    const name = res!.cover!.split("/").pop()!;
    expect(l.coverPath(name)).toBeTruthy();
    expect(await l.setCover("нет-такого", new Uint8Array([1]), "image/png")).toBeUndefined();
  });

  it("ИИ правит играющую песню словами", async () => {
    const { l } = await lib();
    const t = l.view().tracks[0]!;
    const tools = buildAppTools({
      tracks: () => l.view().tracks,
      editTrack: (id, p) => l.edit(id, p),
      playlists: () => [],
      favorites: () => [],
      nowPlaying: () => ({ trackId: t.id, title: t.title, artist: t.artist, playing: true, position: 0, duration: 0, sentAt: 0 }),
      settings: () => ({}) as never,
      saveSettings: () => undefined,
      act: () => undefined,
      showWindow: () => undefined,
      window: () => undefined,
    });
    const edit = tools.find((x) => x.name === "app_track_edit")!;
    expect(await edit.run({ artist: "Кино", title: "Группа крови" })).toMatch(/стало «Группа крови» — Кино/);
    expect(await edit.run({ track: "группа крови", album: "Группа крови" })).toMatch(/альбом/);
    expect(l.track(t.id)?.album).toBe("Группа крови");
    expect(await edit.run({ reset: true })).toMatch(/как в файле/);
  });
});
