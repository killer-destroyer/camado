// Пульт для ИИ: Камадо по просьбе сам открывает экраны, включает музыку, меняет настройки,
// разворачивает окно, ставит фокус. Работает и из Telegram («включи музыку на компе»).
// Ключи, бот, лимит трат и прочее важное ИИ менять не может — только список ниже.
import { z } from "zod";
import { defineTool } from "../../src/llm/tool.js";
import type { ToolDef } from "../../src/llm/types.js";
import type { AppSettings } from "../shared/settings.js";
import type { Playlist } from "../../src/store.js";
import type { NowPlayingState, Track } from "../shared/types.js";
import { CARD_LABEL, CARDS, DEFAULT_CUSTOM, moveCard, SECTION_LABEL, SECTIONS, setCard, setSidebar } from "../shared/custom.js";

const SCREENS = ["today", "tasks", "plan", "session", "notes", "links", "grow", "money", "music", "focus", "chat", "settings"] as const;
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
  /** Правка трека (название, исполнитель, альбом; null — как в файле). */
  editTrack?(id: string, patch: { title?: string | null; artist?: string | null; album?: string | null }): Promise<Track | undefined>;
  /** Уроки «Прокачки» — чтобы открыть нужный по словам. */
  lessons?(): { course: string; id: string; title: string; module: string }[];
}

export type AppAction =
  | { type: "screen"; screen: (typeof SCREENS)[number]; nowPlaying?: boolean }
  | { type: "play"; trackIds: string[]; index: number; shuffle?: boolean }
  | { type: "music"; action: "pause" | "resume" | "next" | "prev" }
  | { type: "focus"; action: "start" | "pause" | "reset" }
  | { type: "screensaver"; on: boolean }
  | { type: "grow"; tab: string; lesson?: string; modal?: string }
  | { type: "wave"; mood: "mine" | "energy" | "calm" | "study" | "new" | "stop" };

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
      name: "app_learn",
      description:
        "«Прокачка»: открыть курс (python, java, cpp, html), урок по словам («указатели», «словари»), задачник, библиотеку книг, " +
        "программу курса, проверку кода, разминку дня или повторение карточек.",
      schema: z.object({
        tab: z.enum(["python", "java", "cpp", "html", "problems", "library", "syllabus", "review"]),
        lesson: z.string().optional().describe("Тема урока своими словами, если нужно открыть конкретный урок"),
        then: z.enum(["warmup", "review"]).optional().describe("Сразу открыть разминку дня или повторение карточек"),
      }),
      run: (i) => {
        let lesson: { id: string; title: string } | undefined;
        if (i.lesson && d.lessons) {
          const words = norm(i.lesson).split(" ").filter((w) => w.length >= 3);
          const pool = d.lessons().filter((l) => l.course === i.tab);
          const score = (l: { title: string; module: string }) => {
            const hay = norm(`${l.title} ${l.module}`);
            return words.filter((w) => hay.includes(w.slice(0, Math.max(3, w.length - 2)))).length;
          };
          const best = pool.map((l) => ({ l, s: score(l) })).sort((a, b) => b.s - a.s)[0];
          if (best && best.s > 0) lesson = best.l;
        }
        d.showWindow();
        d.act({ type: "grow", tab: i.tab, lesson: lesson?.id, modal: i.then });
        if (i.lesson && !lesson) return `Открыл «Прокачку» (${i.tab}), но урок про «${i.lesson}» не нашёл — открыл курс.`;
        return lesson ? `Открыл урок «${lesson.title}».` : `Открыл «Прокачку» → ${i.tab}.`;
      },
    }),
    defineTool({
      name: "app_open",
      description: "Открыть окно Камадо на нужном экране (сегодня, задания, план, сессия, заметки, ссылки, прокачка — курсы программирования и программа курса, музыка, фокус, чат, настройки) или плеер «Сейчас играет».",
      schema: z.object({
        screen: z.enum(SCREENS).describe("today — главная, tasks — задания, plan — план недели, session — сессия, notes — заметки, links — ссылки, grow — прокачка (курсы Python/Java/C++/HTML, программа курса), music — музыка, focus — фокус, chat — чат, settings — настройки"),
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
      name: "app_track_edit",
      description:
        "Поправить у песни в библиотеке название, исполнителя или альбом (файл не меняется, правка хранится в Камадо). " +
        "Песня — та, что играет сейчас (track не указан), или найденная по словам track. reset=true — вернуть всё как в файле.",
      schema: z.object({
        track: z.string().optional().describe("Какую песню: название/исполнитель. Пусто — та, что играет сейчас"),
        title: z.string().optional(),
        artist: z.string().optional(),
        album: z.string().optional(),
        reset: z.boolean().optional(),
      }),
      run: async (i) => {
        if (!d.editTrack) return "Правка треков здесь недоступна.";
        const tracks = d.tracks();
        let t: Track | undefined;
        if (i.track) {
          const found = findMusic(i.track, tracks, [], []);
          t = found ? tracks.find((x) => x.id === found.ids[0]) : undefined;
        } else {
          const np = d.nowPlaying();
          t = np ? tracks.find((x) => x.id === np.trackId) : undefined;
        }
        if (!t) return i.track ? `Не нашёл в библиотеке «${i.track}».` : "Сейчас ничего не играет — скажи, какую песню поправить.";
        const was = `«${t.title}» — ${t.artist}`;
        const res = await d.editTrack(t.id, i.reset ? { title: null, artist: null, album: null } : { title: i.title, artist: i.artist, album: i.album });
        if (!res) return "Не получилось поправить.";
        return i.reset ? `Вернул как в файле: «${res.title}» — ${res.artist}.` : `Было ${was}, стало «${res.title}» — ${res.artist}${res.album ? ` (альбом «${res.album}»)` : ""}.`;
      },
    }),

    defineTool({
      name: "app_wave",
      description:
        "«Моя волна» — бесконечный поток музыки под вкус хозяина: его треки + новая музыка из открытой базы (ccMixter, Internet Archive, свободные лицензии). " +
        "mood: mine — под меня, energy — бодро, calm — спокойно, study — для учёбы, new — что-то новое; stop — выйти из волны. Популярных треков со стримингов там нет.",
      schema: z.object({ mood: z.enum(["mine", "energy", "calm", "study", "new", "stop"]) }),
      run: (i) => {
        d.act({ type: "wave", mood: i.mood });
        return i.mood === "stop" ? "Вышел из волны — музыка доиграет." : "Включил «Мою волну».";
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
        lyrics_mode: z.enum(["flow", "burst", "line", "karaoke", "off"]).optional().describe("Текст песни: flow — лента, burst — взрыв, line — строка, karaoke — караоке, off — без текста"),
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
        fps_cap: z.number().int().min(0).max(240).optional().describe("Ограничить кадры в секунду: 0 (как монитор), 30, 60, 120 или 144. 60 или 30 — легче для слабого компьютера"),
        background: z.enum(["aurora", "calm", "static"]).optional().describe("Фон окна: aurora — живой, calm — спокойный, static — неподвижный (легче всего)"),
        lyrics_size: z.number().min(0.7).max(1.4).optional().describe("Размер текста песни, 1 — обычный"),
        crossfade_sec: z.number().min(0).max(12).optional().describe("Плавный переход между песнями, секунды (0 — выкл)"),
        shake: z.boolean().optional().describe("Тряска в такт музыке"),
        vinyl: z.boolean().optional().describe("Показывать пластинку"),
        word_sync: z.boolean().optional().describe("Расставлять время каждому слову текста песни (распознавание на компьютере)"),
        focus_work_min: z.number().int().min(5).max(180).optional(),
        focus_break_min: z.number().int().min(1).max(60).optional(),
        focus_long_break_min: z.number().int().min(5).max(90).optional(),
        focus_track_apps: z.boolean().optional().describe("Считать, куда отвлекаюсь во время фокуса"),
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
        if (i.screensaver_fullscreen !== undefined) (ss.fullscreen = i.screensaver_fullscreen), (ss.fsChosen = true), (ssChanged = true), done.push(`заставка ${i.screensaver_fullscreen ? "на весь экран" : "в окне"}`);
        if (ssChanged) patch.screensaver = ss;
        if (i.ambience_on !== undefined) (patch.ambience = { ...s.ambience, on: i.ambience_on }), done.push(`фон ${i.ambience_on ? "вкл" : "выкл"}`);
        if (i.fps_cap !== undefined) {
          const caps = [0, 30, 60, 120, 144] as const;
          const cap = caps.reduce((a, b) => (Math.abs(b - i.fps_cap!) < Math.abs(a - i.fps_cap!) ? b : a), 0 as (typeof caps)[number]);
          patch.fpsCap = cap;
          done.push(cap ? `не больше ${cap} кадров` : "кадры как у монитора");
        }
        if (i.background) (patch.background = i.background), done.push(`фон: ${i.background}`);
        if (i.lyrics_size !== undefined) (patch.lyricsSize = i.lyrics_size), done.push(`размер текста ${i.lyrics_size}`);
        if (i.crossfade_sec !== undefined) (patch.crossfade = i.crossfade_sec), done.push(i.crossfade_sec ? `переход ${i.crossfade_sec} с` : "без перехода");
        if (i.shake !== undefined) (patch.shake = { ...s.shake, enabled: i.shake }), done.push(`тряска ${i.shake ? "вкл" : "выкл"}`);
        if (i.vinyl !== undefined) (patch.vinyl = i.vinyl), done.push(`пластинка ${i.vinyl ? "вкл" : "выкл"}`);
        if (i.word_sync !== undefined) (patch.wordSync = i.word_sync), done.push(`текст по словам ${i.word_sync ? "вкл" : "выкл"}`);
        if (i.focus_work_min || i.focus_break_min || i.focus_long_break_min || i.focus_track_apps !== undefined) {
          patch.focus = {
            ...s.focus,
            ...(i.focus_work_min ? { work: i.focus_work_min, preset: "custom" } : {}),
            ...(i.focus_break_min ? { short: i.focus_break_min, preset: "custom" } : {}),
            ...(i.focus_long_break_min ? { long: i.focus_long_break_min, preset: "custom" } : {}),
            ...(i.focus_track_apps !== undefined ? { trackApps: i.focus_track_apps } : {}),
          };
          done.push("фокус");
        }
        if (!done.length) return "Нечего менять — скажи, что именно поменять.";
        d.saveSettings(patch);
        return `Поменял: ${done.join(", ")}.`;
      },
    }),

    defineTool({
      name: "app_custom",
      description:
        "«Кастом»: что стоит на боковой панели (и порядок) и как устроен главный экран «Сегодня» — порядок карточек, размер, скрыть/показать. " +
        "Разделы: today, tasks, plan, session, notes, links, grow, money, music, focus, chat. Карточки: " +
        "sections (иконки разделов), setup, class (пары), plan, hot (горит), quick (быстрая запись), focus, music, week, energy, money, grow, notes, alarms. " +
        "Размер: s — маленькая, m — половина, w — широкая, l — во всю ширину.",
      schema: z.object({
        sidebar_add: z.array(z.enum(SECTIONS)).optional(),
        sidebar_remove: z.array(z.enum(SECTIONS)).optional(),
        sidebar_order: z.array(z.enum(SECTIONS)).optional().describe("Полный новый порядок боковой панели"),
        cards: z
          .array(
            z.object({
              card: z.enum(CARDS),
              size: z.enum(["s", "m", "w", "l"]).optional(),
              hide: z.boolean().optional().describe("true — спрятать, false — вернуть"),
              position: z.union([z.enum(["first", "last"]), z.number().int().min(1)]).optional().describe("Куда поставить: first, last или номер (1 — первая)"),
            }),
          )
          .optional(),
        reset: z.enum(["home", "sidebar", "all"]).optional(),
        show: z.boolean().optional().describe("Просто показать, как сейчас устроено"),
      }),
      run: (i) => {
        let c = d.settings().custom;
        const done: string[] = [];
        if (i.reset) {
          c = { sidebar: i.reset === "home" ? c.sidebar : [...DEFAULT_CUSTOM.sidebar], home: i.reset === "sidebar" ? c.home : DEFAULT_CUSTOM.home.map((x) => ({ ...x })) };
          done.push(`сбросил ${i.reset === "home" ? "главный экран" : i.reset === "sidebar" ? "боковую панель" : "всё"}`);
        }
        if (i.sidebar_order?.length) (c = setSidebar(c, i.sidebar_order)), done.push("порядок панели");
        if (i.sidebar_add?.length) (c = setSidebar(c, [...c.sidebar, ...i.sidebar_add.filter((x) => !c.sidebar.includes(x))])), done.push(`на панель: ${i.sidebar_add.map((x) => SECTION_LABEL[x]).join(", ")}`);
        if (i.sidebar_remove?.length) (c = setSidebar(c, c.sidebar.filter((x) => !i.sidebar_remove!.includes(x)))), done.push(`с панели убрал: ${i.sidebar_remove.map((x) => SECTION_LABEL[x]).join(", ")} (они иконками на главном)`);
        for (const k of i.cards ?? []) {
          if (k.size) c = setCard(c, k.card, { size: k.size });
          if (k.hide !== undefined) c = setCard(c, k.card, { hidden: k.hide });
          if (k.position !== undefined) c = moveCard(c, k.card, k.position === "first" ? 0 : k.position === "last" ? c.home.length : k.position - 1);
          done.push(`${CARD_LABEL[k.card]}${k.size ? ` — ${k.size}` : ""}${k.hide === true ? " — спрятал" : k.hide === false ? " — вернул" : ""}${k.position !== undefined ? ` — на место ${k.position}` : ""}`);
        }
        const now = `Панель: ${c.sidebar.map((x) => SECTION_LABEL[x]).join(", ")}. Главный экран: ${c.home.filter((x) => !x.hidden).map((x) => `${CARD_LABEL[x.id]} (${x.size})`).join(", ")}${c.home.some((x) => x.hidden) ? `; скрыто: ${c.home.filter((x) => x.hidden).map((x) => CARD_LABEL[x.id]).join(", ")}` : ""}.`;
        if (!done.length) return now;
        d.saveSettings({ custom: c });
        d.act({ type: "screen", screen: "today" });
        return `Сделал: ${done.join("; ")}. ${now}`;
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
