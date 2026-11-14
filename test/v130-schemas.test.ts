// Gemini принимает в инструментах только строковые списки вариантов (enum) — числовой список ломал ВСЕ ответы ИИ.
import { describe, expect, it } from "vitest";
import { buildAppTools } from "../desktop/main/appTools.js";
import { lifeHandlers } from "../desktop/main/life.js";
import { lifeTools } from "../desktop/main/lifeTools.js";
import { DEFAULT_SETTINGS } from "../desktop/shared/settings.js";
import { buildTools } from "../src/camado/tools.js";
import type { CamadoCore } from "../src/core.js";
import { memoryStore } from "./helpers.js";

function badEnums(schema: unknown, path = ""): string[] {
  if (!schema || typeof schema !== "object") return [];
  const out: string[] = [];
  const o = schema as Record<string, unknown>;
  if (Array.isArray(o.enum) && o.enum.some((v) => typeof v !== "string")) out.push(`${path}: enum ${JSON.stringify(o.enum)}`);
  if ("const" in o && typeof o.const !== "string") out.push(`${path}: const ${JSON.stringify(o.const)}`);
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) v.forEach((x, i) => out.push(...badEnums(x, `${path}.${k}[${i}]`)));
    else if (v && typeof v === "object") out.push(...badEnums(v, `${path}.${k}`));
  }
  return out;
}

describe("схемы инструментов ИИ годятся для Gemini", () => {
  it("нет числовых enum/const ни в одном инструменте", () => {
    const store = memoryStore();
    const core = { store, llm: {} } as unknown as CamadoCore;
    const life = lifeHandlers({ core, withAi: async (fn) => fn(), dataDir: "/tmp", dbPath: () => "/tmp/x.db", dialog: {} as never, win: () => undefined, notify: () => undefined, send: () => undefined });
    const tools = [
      ...buildTools(store, "Europe/Moscow", () => ""),
      ...buildAppTools({ tracks: () => [], playlists: () => [], favorites: () => [], nowPlaying: () => null, settings: () => DEFAULT_SETTINGS, saveSettings: () => undefined, act: () => undefined, showWindow: () => undefined, window: () => undefined }),
      ...lifeTools({ handlers: life.handlers, core, timeZone: "Europe/Moscow", act: () => undefined }),
    ];
    const bad = tools.flatMap((t) => badEnums(t.inputSchema, t.name));
    expect(bad).toEqual([]);
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
  });
});
