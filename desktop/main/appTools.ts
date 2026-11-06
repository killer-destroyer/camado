// Пульт для ИИ: Камадо по просьбе сам открывает экраны, включает музыку, меняет настройки,
// разворачивает окно, ставит фокус. Работает и из Telegram («включи музыку на компе»).
// Ключи, бот, лимит трат и прочее важное ИИ менять не может — только список ниже.
import { z } from "zod";
import { defineTool } from "../../src/llm/tool.js";
import type { ToolDef } from "../../src/llm/types.js";
import type { AppSettings } from "../shared/settings.js";
import type { Playlist } from "../../src/store.js";
import type { NowPlayingState, Track } from "../shared/types.js";

const SCREENS = ["today", "tasks", "plan", "session", "notes", "links", "music", "focus", "chat", "settings"] as const;
const PALETTE_IDS = ["midnight", "sakura", "tokyo", "sunset", "matcha", "ocean", "cherry", "nord", "dracula", "y2k", "mono", "vanilla"] as const;
const SCENES = ["random", "rain", "blackhole", "picture", "warp", "aurora", "ocean", "synthwave", "fire", "lava", "dots", "jelly", "turntable"] as const;
const EQ = ["flat", "bass", "vocal", "calm", "headphones", "night", "bright", "club"] as const;

export interface AppToolDeps {
  tracks(): Track[];
  playlists(): Playlist[];
  favorites(): string[];
  nowPlaying(): NowPlayingState | null;
  settings(): AppSettings;
  saveSettings(patch: Partial<AppSettings>): void;
  /** Действие в окне: экран, музыка, фокус, заставка. */
  act(action: AppAction): void;
  showWindow(): void;
  window(action: "hide" | "minimize" | "fullscreen" | "windowed" | "quit" | "restart"): void;
}

export type AppAction =
  | { type: "screen"; screen: (typeof SCREENS)[number]; nowPlaying?: boolean }
  | { type: "play"; trackIds: string[]; index: number; shuffle?: boolean }
  | { type: "music"; action: "pause" | "resume" | "next" | "prev" }
  | { type: "focus"; action: "start" | "pause" | "reset" }
  | { type: "screensaver"; on: boolean };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Найти, что включить: плейлист, «любимое», исполнителя или песню по словам из просьбы. */
export function findMusic(query: string, tracks: Track[], playlists: Playlist[], favorites: string[] = []): { ids: string[]; what: string } | undefined {
  const q = norm(query);
  if (!q) return undefined;
  if (/(любим|лайк|избран|favorite)/.test(q) && favorites.length) {
    const have = new Set(tracks.map((t) => t.id));
    const ids = favorites.filter((id) => have.has(id));
    if (ids.length) return { ids, what: `«Любимое» (${ids.length})` };
  }
  const pl = playlists.find((p) => norm(p.name) === q) ?? playlists.find((p) => norm(p.name).includes(q) || q.includes(norm(p.name)));
  if (pl && pl.trackIds?.length) return { ids: pl.trackIds, what: `плейлист «${pl.name}»` };
  const words = q.split(" ").filter((w) => w.length >= 2);
  const score = (t: Track) => {
    const hay = norm(`${t.title} ${t.artist} ${t.album ?? ""}`);
    return words.filter((w) => hay.includes(w)).length;
  };
  const scored = tracks.map((t) => ({ t, s: score(t) })).filter((x) => x.s > 0);
  if (!scored.length) return undefined;
  const best = Math.max(...scored.map((x) => x.s));
  const top = scored.filter((x) => x.s === best).map((x) => x.t);
  // все песни исполнителя — очередью; одна песня — её и остальные следом
  const byArtist = top.every((t) => norm(t.artist) === norm(top[0]!.artist)) && top.length > 1;
  if (byArtist) return { ids: top.map((t) => t.id), what: `${top[0]!.artist} (${top.length})` };
  const first = top[0]!;
  return { ids: [first.id, ...tracks.filter((t) => t.id !== first.id).map((t) => t.id)], what: `«${first.title}» — ${first.artist}` };
}

export function buildAppTools(d: AppToolDeps): ToolDef[] {
  return [
    defineTool({
      name: "app_open",
      description: "Открыть окно Камадо на нужном экране (сегодня, задания, план, сессия, заметки, ссылки, музыка, фокус, чат, настройки) или плеер «Сейчас играет».",
      schema: z.object({
        screen: z.enum(SCREENS).describe("today — главная, tasks — задания, plan — план недели, session — сессия, notes — заметки, links — ссылки, music — музыка, focus — фокус, chat — чат, settings — настройки"),
        now_playing: z.boolean().optional().describe("true — открыть большой плеер с пластинкой"),
      }),
      run: (i) => {
        d.showWindow();
        d.act({ type: "screen", screen: i.screen, nowPlaying: i.now_playing });
        return i.now_playing ? "Открыл плеер." : `Открыл экран ${i.screen}.`;
      },
    }),

    defineTool({
      name: "app_music",
      description:
        "Управлять музыкой в Камадо на компьютере: включить песню, исполнителя или плейлист (query), всё вперемешку, пауза, продолжить, следующая, предыдущая. Что сейчас играет — app_now_playing.",
      schema: z.object({
        action: z.enum(["play", "shuffle_all", "pause", "resume", "next", "prev"]),
        query: z.string().optional().describe("Для play: название песни, исполнитель, «любимое» или имя плейлиста"),
      }),
      run: (i) => {
        const tracks = d.tracks();
        if (i.action === "shuffle_all") {
          if (!tracks.length) return "В библиотеке нет музыки — добавь папку в «Музыке».";
          d.act({ type: "play", trackIds: tracks.map((t) => t.id), index: Math.floor(Math.random() * tracks.length), shuffle: true });
          return `Включил всё вперемешку (${tracks.length} песен).`;
        }
        if (i.action === "play") {
          if (!i.query) {
            d.act({ type: "music", action: "resume" });
            return "Включил музыку.";
          }
          const found = findMusic(i.query, tracks, d.playlists(), d.favorites());
          if (!found) return `Не нашёл в библиотеке «${i.query}». Есть, например: ${tracks.slice(0, 5).map((t) => `«${t.title}» — ${t.artist}`).join(", ") || "ничего"}.`;
          d.act({ type: "play", trackIds: found.ids, index: 0 });
          return `Включил ${found.what}.`;
        }
        d.act({ type: "music", action: i.action });
        return { pause: "Пауза.", resume: "Продолжаю.", next: "Следующая.", prev: "Предыдущая." }[i.action];
      },
    }),

    defineTool({
      name: "app_now_playing",
      description: "Что сейчас играет в Камадо и на какой громкости.",
      schema: z.object({}),
      run: () => {
        const np = d.nowPlaying();
        const vol = Math.round(d.settings().volume * 100);
        return np ? `${np.playing ? "Играет" : "На паузе"}: «${np.title}» — ${np.artist}. Громкость ${vol}%.` : `Ничего не играет. Громкость ${vol}%.`;
      },
    }),

    defineTool({
      name: "app_window",
      description:
        "Окно и сама программа: развернуть на весь экран, вернуть обычное окно, свернуть, спрятать, перезапустить или выключить Камадо. " +
        "Выключить (quit) и перезапустить (restart) — только если хозяин прямо попросил; для них confirmed=true. После выключения Telegram-бот тоже перестанет отвечать, пока Камадо не запустят снова.",
      schema: z.object({
        action: z.enum(["fullscreen", "windowed", "minimize", "hide", "show", "restart", "quit"]),
        confirmed: z.boolean().optional().describe("Хозяин прямо попросил выключить/перезапустить"),
      }),
      run: (i) => {
        if ((i.action === "quit" || i.action === "restart") && !i.confirmed) return "Нужно подтверждение: спроси хозяина, точно ли выключить/перезапустить Камадо.";
        if (i.action === "show") {
          d.showWindow();
          return "Показал окно.";
        }
        if (i.action === "fullscreen") d.showWindow();
        // выключение — чуть позже, чтобы ответ успел дойти
        setTimeout(() => d.window(i.action as Exclude<typeof i.action, "show">), i.action === "quit" || i.action === "restart" ? 1500 : 0);
        return {
          fullscreen: "Развернул на весь экран.",
          windowed: "Вернул обычное окно.",
          minimize: "Свернул.",
          hide: "Спрятал окно — Камадо работает в фоне.",
          restart: "Перезапускаю Камадо.",
          quit: "Выключаю Камадо. Чтобы снова писать мне, запусти его на компьютере.",
        }[i.action];
      },
    }),

    defineTool({
      name: "app_settings",
      description:
        "Поменять настройки Камадо по просьбе хозяина: громкость, цветовая тема, цвета из обложки, режим текста песни, визуализатор, slowed/nightcore, эквалайзер, " +
        "автовыравнивание громкости, подгонка текста по звуку, заставка (вкл/выкл, через сколько минут, сцена, на весь экран), фоновые звуки вкл/выкл. Ключи и прочее важное здесь не меняются.",
      schema: z.object({
        volume: z.number().min(0).max(100).optional().describe("Громкость, %"),
        palette: z.enum(PALETTE_IDS).optional().describe("midnight — фиолетовая ночь, sakura — розовая, tokyo — неон, sunset — закат, matcha — зелёная, ocean — синяя, cherry — вишня, nord — северная, dracula, y2k, mono — монохром, vanilla — светлая"),
        cover_colors: z.boolean().optional().describe("Брать цвета из обложки песни"),
        lyrics_mode: z.enum(["flow", "burst", "line", "off"]).optional().describe("Текст песни: flow — лента, burst — взрыв, line — строка, off — без текста"),
        visualizer: z.enum(["wave", "bars", "ring", "off"]).optional(),
        sound_mode: z.enum(["normal", "slowed", "nightcore"]).optional(),
        eq_preset: z.enum(EQ).optional().describe("Эквалайзер: flat — ровно, bass — басы, vocal — голос, calm, headphones, night, bright, club"),
        auto_level: z.boolean().optional().describe("Выравнивать громкость песен"),
        lyrics_by_ear: z.boolean().optional().describe("Подгонять текст песни по звуку сам"),
        screensaver_enabled: z.boolean().optional(),
        screensaver_delay_min: z.number().int().min(1).max(60).optional(),
        screensaver_scene: z.enum(SCENES).optional(),
        screensaver_fullscreen: z.boolean().optional().describe("Разворачивать окно на весь экран для заставки"),
        ambience_on: z.boolean().optional().describe("Фоновые звуки (дождь и т. п.)"),
      }),
      run: (i) => {
        const s = d.settings();
        const patch: Partial<AppSettings> = {};
        const done: string[] = [];
        if (i.volume !== undefined) (patch.volume = i.volume / 100), done.push(`громкость ${i.volume}%`);
        if (i.palette) (patch.palette = i.palette), (patch.coverColors = i.cover_colors ?? false), done.push(`тема ${i.palette}`);
        if (i.cover_colors !== undefined && !i.palette) (patch.coverColors = i.cover_colors), done.push(i.cover_colors ? "цвета из обложки" : "цвета темы");
        if (i.lyrics_mode) (patch.lyricsMode = i.lyrics_mode), done.push(`текст: ${i.lyrics_mode}`);
        if (i.visualizer) (patch.visualizer = i.visualizer), done.push(`визуализатор: ${i.visualizer}`);
        if (i.sound_mode) (patch.soundMode = i.sound_mode), done.push(`звук: ${i.sound_mode}`);
        if (i.eq_preset) (patch.eq = { ...s.eq, preset: i.eq_preset }), done.push(`эквалайзер: ${i.eq_preset}`);
        if (i.auto_level !== undefined) (patch.autoLevel = i.auto_level), done.push(`выравнивание ${i.auto_level ? "вкл" : "выкл"}`);
        if (i.lyrics_by_ear !== undefined) (patch.lyricsByEar = i.lyrics_by_ear), done.push(`подгонка по звуку ${i.lyrics_by_ear ? "вкл" : "выкл"}`);
        const ss = { ...s.screensaver };
        let ssChanged = false;
        if (i.screensaver_enabled !== undefined) (ss.enabled = i.screensaver_enabled), (ssChanged = true), done.push(`заставка ${i.screensaver_enabled ? "вкл" : "выкл"}`);
        if (i.screensaver_delay_min) (ss.delay = i.screensaver_delay_min), (ssChanged = true), done.push(`заставка через ${i.screensaver_delay_min} мин`);
        if (i.screensaver_scene) (ss.scene = i.screensaver_scene), (ssChanged = true), done.push(`сцена ${i.screensaver_scene}`);
        if (i.screensaver_fullscreen !== undefined) (ss.fullscreen = i.screensaver_fullscreen), (ssChanged = true), done.push(`заставка ${i.screensaver_fullscreen ? "на весь экран" : "в окне"}`);
        if (ssChanged) patch.screensaver = ss;
        if (i.ambience_on !== undefined) (patch.ambience = { ...s.ambience, on: i.ambience_on }), done.push(`фон ${i.ambience_on ? "вкл" : "выкл"}`);
        if (!done.length) return "Нечего менять — скажи, что именно поменять.";
        d.saveSettings(patch);
        return `Поменял: ${done.join(", ")}.`;
      },
    }),

    defineTool({
      name: "app_focus",
      description: "Фокус-таймер в Камадо: запустить, пауза, сбросить. Открывает экран «Фокус».",
      schema: z.object({ action: z.enum(["start", "pause", "reset"]) }),
      run: (i) => {
        d.showWindow();
        d.act({ type: "focus", action: i.action });
        return { start: "Запустил фокус.", pause: "Фокус на паузе.", reset: "Сбросил таймер." }[i.action];
      },
    }),

    defineTool({
      name: "app_screensaver",
      description: "Включить заставку-визуализатор прямо сейчас или выключить её.",
      schema: z.object({ on: z.boolean() }),
      run: (i) => {
        if (i.on) d.showWindow();
        d.act({ type: "screensaver", on: i.on });
        return i.on ? "Включил заставку." : "Выключил заставку.";
      },
    }),
  ];
}
