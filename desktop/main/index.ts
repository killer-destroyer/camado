// Приложение Камадо для компьютера: окно + всё ядро (задания, напоминания, ИИ, бот) в одном процессе.
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  protocol,
  screen,
  shell,
  Tray,
} from "electron";
import { Bot } from "grammy";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_KEY_KV } from "../../src/bot.js";
import { loadConfig } from "../../src/config.js";
import { createCore, createCoreBot, setApiKey, type CamadoCore } from "../../src/core.js";
import { checkAnthropicKey } from "../../src/llm/anthropic.js";
import { BudgetExceededError } from "../../src/llm/metered.js";
import { parseTaskArgs } from "../../src/manual.js";
import { startReminderLoop } from "../../src/reminders.js";
import { mergeSettings, type AppSettings } from "../shared/settings.js";
import type { AppInfo, BotStatus, NowPlayingState, OverlayState, TaskInput, TaskPatch } from "../shared/types.js";
import { DiscordPresence } from "./discord.js";
import { importFromUrl } from "./download.js";
import { Library } from "./library.js";
import { LyricsService } from "./lyrics.js";
import { Updates } from "./updates.js";
import { serveFile } from "./media.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const SETTINGS_KV = "desktop_settings";

protocol.registerSchemesAsPrivileged([
  { scheme: "camado-media", privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Русский формат дат в полях ввода и системных подписях окна.
app.commandLine.appendSwitch("lang", "ru-RU");

// Без пометки «Electron» в User-Agent: иначе некоторые сайты (плееры) считают браузер устаревшим.
app.userAgentFallback = app.userAgentFallback.replace(/\s?(Electron|camado)\/\S+/gi, "");

// ---------- Настройки окружения ----------

function loadEnv(): void {
  const envFile = app.isPackaged ? join(app.getPath("userData"), ".env") : join(process.cwd(), ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  if (app.isPackaged && !process.env.CAMADO_DB_PATH) {
    process.env.CAMADO_DB_PATH = join(app.getPath("userData"), "camado.db");
  }
}

loadEnv();
const config = loadConfig();
const core: CamadoCore = createCore(config);
const { store } = core;

let settings: AppSettings = mergeSettings(JSON.parse(store.getKv(SETTINGS_KV) ?? "null"));
const saveSettings = (patch: Partial<AppSettings>): AppSettings => {
  settings = mergeSettings({ ...settings, ...patch });
  store.setKv(SETTINGS_KV, JSON.stringify(settings));
  return settings;
};

const dataDir = app.getPath("userData");
let win: BrowserWindow | undefined;
let tray: Tray | undefined;
let quitting = false;
let bot: Bot | undefined;
const botStatus = { running: false } as Pick<BotStatus, "running" | "username" | "error">;

// Бот настраивается прямо в приложении (токен и хозяин хранятся в базе), .env — запасной вариант.
const TG_TOKEN_KV = "telegram_token";
const TG_OWNER_KV = "telegram_owner";
const botToken = () => store.getKv(TG_TOKEN_KV) ?? config.TELEGRAM_BOT_TOKEN;
const botOwner = (): number | undefined => {
  const v = store.getKv(TG_OWNER_KV);
  return v ? Number(v) : config.OWNER_TELEGRAM_ID;
};
let pairing: { code: string; until: number } | undefined;

const send = (channel: string, payload?: unknown) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

const library = new Library(dataDir, () => send("library-changed"));
const updates = new Updates((s) => send("update-status", s));
const discord = new DiscordPresence();
let nowPlaying: NowPlayingState | null = null;
const lyrics = new LyricsService(join(dataDir, "lyrics-cache"), (id) => library.trackPath(id));

// Любое изменение данных (из окна, бота или ИИ) — окно перерисовывает списки.
let changeTimer: NodeJS.Timeout | undefined;
store.onChange = () => {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => send("data-changed"), 60);
};

function iconPath(name: string): string {
  // В установленной программе иконки лежат рядом с ней (resources/assets), а не внутри архива.
  return app.isPackaged ? join(process.resourcesPath, "assets", name) : join(app.getAppPath(), "desktop", "assets", name);
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: iconPath("icon.png"), silent: false });
  n.on("click", () => showWindow());
  n.show();
}

// ---------- Telegram-бот внутри приложения ----------

function startBot(): void {
  const token = botToken();
  if (bot || !token || !settings.runBot) return;
  try {
    bot = createCoreBot(core, {
      token,
      owner: botOwner,
      pairing: {
        code: () => (pairing && Date.now() < pairing.until ? pairing.code : undefined),
        done: (userId) => {
          store.setKv(TG_OWNER_KV, String(userId));
          pairing = undefined;
          notify("Камадо", "Telegram-бот привязан к тебе 🎉");
        },
      },
    });
  } catch (err) {
    botStatus.error = err instanceof Error ? err.message : String(err);
    return;
  }
  bot
    .start({
      onStart: (me) => {
        botStatus.running = true;
        botStatus.username = me.username;
        botStatus.error = undefined;
      },
    })
    .catch((err: unknown) => {
      botStatus.running = false;
      botStatus.error =
        err instanceof Error && /409/.test(err.message)
          ? "Бот уже запущен где-то ещё (например, npm run dev). Оставь что-то одно."
          : err instanceof Error
            ? err.message
            : String(err);
      bot = undefined;
    });
}

async function stopBot(): Promise<void> {
  const b = bot;
  bot = undefined;
  botStatus.running = false;
  await b?.stop().catch(() => undefined);
}

// ---------- Обмен с окном ----------

type Handler = (...args: never[]) => unknown;

const handlers: Record<string, Handler> = {
  info: (): AppInfo => ({
    platform: process.platform,
    version: app.getVersion(),
    timeZone: config.CAMADO_TIMEZONE,
    refreshRate: Math.round(screen.getPrimaryDisplay().displayFrequency || 60),
  }),

  "tasks.list": (includeClosed?: boolean) => store.listTasks({ includeClosed }),
  "tasks.add": (input: TaskInput) => store.addTask(input),
  "tasks.update": (id: number, patch: TaskPatch) => store.updateTask(id, patch),
  "tasks.quickAdd": (text: string, kind?: TaskInput["kind"]) => {
    const parsed = parseTaskArgs(text, new Date(), config.CAMADO_TIMEZONE);
    if ("error" in parsed) return { error: parsed.error };
    return { task: store.addTask({ ...parsed, kind }) };
  },

  "subjects.list": () => store.listSubjects(),
  "subjects.save": (input: { name: string; teacher?: string; info?: string }) => store.saveSubject(input),

  "notes.list": () => store.listNotes(),
  "notes.save": (input: Parameters<typeof store.saveNote>[0]) => store.saveNote(input),
  "notes.remove": (id: number) => store.deleteNote(id),

  "focus.add": (input: Parameters<typeof store.addFocusSession>[0]) => store.addFocusSession(input),
  "focus.list": (sinceIso: string) => store.listFocusSessions(new Date(sinceIso)),

  "chat.history": () => store.recentChat(60),
  "chat.send": async (text: string) => {
    if (!core.ai.enabled) return { error: "ИИ выключен. Вставь ключ в Настройках → ИИ." };
    try {
      return { answer: await core.camado.handle({ text }) };
    } catch (err) {
      if (err instanceof BudgetExceededError) return { error: err.message };
      console.error("Ошибка чата:", err);
      return { error: "Не получилось ответить. Проверь интернет и ключ." };
    }
  },

  "ai.status": () => {
    const key = store.getKv(API_KEY_KV) ?? config.ANTHROPIC_API_KEY;
    return {
      enabled: core.ai.enabled,
      keyHint: key ? `…${key.slice(-4)}` : undefined,
      spentUsd: core.llm.spentThisMonth(),
      budgetUsd: config.CAMADO_MONTHLY_BUDGET_USD,
      model: config.CAMADO_MODEL_BRAIN,
    };
  },
  "ai.setKey": async (key: string) => {
    const k = key.trim();
    if (!/^sk-ant-[\w-]{20,}$/.test(k)) return { ok: false, error: "Ключ Anthropic начинается с sk-ant-" };
    try {
      if (!(await checkAnthropicKey(k))) return { ok: false, error: "Anthropic не принял этот ключ" };
    } catch {
      return { ok: false, error: "Нет связи с Anthropic, попробуй позже" };
    }
    setApiKey(core, k);
    return { ok: true };
  },
  "ai.clearKey": () => setApiKey(core, undefined),

  "bot.status": (): BotStatus => ({ ...botStatus, configured: Boolean(botToken()), paired: Boolean(botOwner()) }),
  "bot.connect": async (token: string) => {
    const t = token.trim();
    if (!/^\d+:[\w-]{30,}$/.test(t)) return { ok: false, error: "Токен выглядит так: 123456789:AAF… — скопируй его из сообщения @BotFather целиком" };
    let username: string | undefined;
    try {
      username = (await new Bot(t).api.getMe()).username;
    } catch {
      return { ok: false, error: "Telegram не принял токен. Проверь, что скопировал его целиком, и что есть интернет." };
    }
    await stopBot();
    store.setKv(TG_TOKEN_KV, t);
    store.deleteKv(TG_OWNER_KV); // новый бот — привязываем заново
    saveSettings({ runBot: true });
    startBot();
    return { ok: true, username };
  },
  "bot.pairingCode": () => {
    if (!pairing || Date.now() > pairing.until) {
      pairing = { code: String(Math.floor(100000 + Math.random() * 900000)), until: Date.now() + 15 * 60e3 };
    }
    return pairing.code;
  },
  "bot.disconnect": async () => {
    await stopBot();
    store.deleteKv(TG_TOKEN_KV);
    store.deleteKv(TG_OWNER_KV);
    botStatus.username = undefined;
    botStatus.error = undefined;
  },

  "settings.get": () => settings,
  "settings.set": async (patch: Partial<AppSettings>) => {
    const before = settings.runBot;
    const next = saveSettings(patch);
    if (before !== next.runBot) next.runBot ? startBot() : await stopBot();
    void discord.configure(next.discord.enabled, next.discord.clientId);
    return next;
  },

  "library.get": () => library.view(),
  "library.pickFolder": async () => {
    const res = await dialog.showOpenDialog(win!, { title: "Папка с музыкой", properties: ["openDirectory", "multiSelections"] });
    return res.canceled ? library.view() : library.addPaths(res.filePaths);
  },
  "library.addPaths": (paths: string[]) => library.addPaths(paths),
  "library.removeFolder": (path: string) => library.removeFolder(path),
  "library.rescan": () => library.rescan(),

  "lyrics.get": (q: Parameters<LyricsService["get"]>[0]) => lyrics.get(q),

  "music.importUrl": async (url: string) => {
    const dir = join(app.getPath("music"), "Камадо");
    const r = await importFromUrl(url, dir, (p) => send("download-progress", p));
    if (r.kind === "saved") await library.addPaths([dir]);
    return r;
  },



  "window.setTitleBarColors": (symbol: string) => {
    if (win && process.platform !== "darwin") win.setTitleBarOverlay({ color: "#00000000", symbolColor: symbol, height: 44 });
  },

  "overlay.toggle": () => toggleOverlay(),
  "overlay.isOpen": () => Boolean(overlay && !overlay.isDestroyed()),
  "overlay.push": (state: OverlayState) => {
    if (overlay && !overlay.isDestroyed()) overlay.webContents.send("overlay-state", state);
  },

  "nowPlaying.push": (state: NowPlayingState | null) => {
    nowPlaying = state;
    updateTray();
    if (mini && !mini.isDestroyed()) mini.webContents.send("np-state", state);
    void discord.update(state);
  },
  "nowPlaying.action": (action: "playpause" | "next" | "prev" | "open") => {
    if (action === "open") {
      mini?.hide();
      showWindow();
    } else send("media-key", action);
  },
  "discord.status": () => discord.status,

  "updates.status": () => updates.status,
  "updates.check": () => updates.check(),
  "updates.install": () => {
    // Иначе закрытие окна при установке свернуло бы его в трей, а не выключило программу.
    quitting = true;
    updates.install();
  },

  notify: (title: string, body: string) => notify(title, body),
};

ipcMain.handle("camado", async (event, method: string, ...args: unknown[]) => {
  if (event.senderFrame?.url && !isAppUrl(event.senderFrame.url)) throw new Error("forbidden");
  const h = handlers[method];
  if (!h) throw new Error(`Нет метода ${method}`);
  return (h as (...a: unknown[]) => unknown)(...args);
});

function isAppUrl(url: string): boolean {
  return url.startsWith("file://") || (process.env.ELECTRON_RENDERER_URL ? url.startsWith(process.env.ELECTRON_RENDERER_URL) : false);
}

// ---------- Текст песни поверх всех окон ----------

let overlay: BrowserWindow | undefined;

function loadRenderer(w: BrowserWindow, hash?: string): void {
  if (process.env.ELECTRON_RENDERER_URL) void w.loadURL(process.env.ELECTRON_RENDERER_URL + (hash ? `#${hash}` : ""));
  else void w.loadFile(join(here, "../renderer/index.html"), hash ? { hash } : undefined);
}

function toggleOverlay(): boolean {
  if (overlay && !overlay.isDestroyed()) {
    overlay.close();
    return false;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1100, area.width - 80);
  const height = 170;
  overlay = new BrowserWindow({
    width,
    height,
    x: Math.round(area.x + (area.width - width) / 2),
    y: area.y + area.height - height - 24,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    show: false,
    webPreferences: { preload: join(here, "../preload/index.cjs"), contextIsolation: true, sandbox: true, spellcheck: false },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setIgnoreMouseEvents(true); // клики проходят сквозь текст
  overlay.setVisibleOnAllWorkspaces(true);
  overlay.once("ready-to-show", () => overlay?.showInactive());
  overlay.on("closed", () => {
    overlay = undefined;
    send("overlay-changed", false);
  });
  loadRenderer(overlay, "overlay");
  send("overlay-changed", true);
  return true;
}

// ---------- Мини-плеер в меню-баре (Mac) и меню трея ----------

let mini: BrowserWindow | undefined;

function toggleMini(bounds?: Electron.Rectangle): void {
  if (mini && !mini.isDestroyed() && mini.isVisible()) {
    mini.hide();
    return;
  }
  if (!mini || mini.isDestroyed()) {
    mini = new BrowserWindow({
      width: 360,
      height: 150,
      frame: false,
      resizable: false,
      movable: false,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: process.platform === "darwin",
      backgroundColor: process.platform === "darwin" ? "#00000000" : "#14112a",
      ...(process.platform === "darwin" ? { vibrancy: "popover" as const, visualEffectState: "active" as const } : {}),
      webPreferences: { preload: join(here, "../preload/index.cjs"), contextIsolation: true, sandbox: true, spellcheck: false },
    });
    mini.on("blur", () => mini?.hide());
    loadRenderer(mini, "mini");
    mini.webContents.once("did-finish-load", () => mini?.webContents.send("np-state", nowPlaying));
  }
  const b = bounds ?? tray?.getBounds();
  if (b) {
    const area = screen.getDisplayMatching(b).workArea;
    const x = Math.round(Math.min(Math.max(b.x + b.width / 2 - 180, area.x + 8), area.x + area.width - 368));
    const y = process.platform === "darwin" ? b.y + b.height + 6 : b.y - 156;
    mini.setPosition(x, y);
  }
  mini.show();
  mini.focus();
}

function trayMenu(): Menu {
  const np = nowPlaying;
  return Menu.buildFromTemplate([
    ...(np
      ? [
          { label: `${np.playing ? "▶" : "⏸"}  ${np.title.slice(0, 40)}`, enabled: false },
          { label: `     ${np.artist.slice(0, 40)}`, enabled: false },
          { type: "separator" as const },
          { label: np.playing ? "Пауза" : "Играть", click: () => send("media-key", "playpause") },
          { label: "Следующий трек", click: () => send("media-key", "next") },
          { label: "Предыдущий трек", click: () => send("media-key", "prev") },
          { type: "separator" as const },
        ]
      : []),
    { label: "Открыть Камадо", click: () => showWindow() },
    { label: "Текст песни поверх окон", click: () => toggleOverlay() },
    { type: "separator" },
    {
      label: "Выйти",
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
}

let lastTrayKey = "";
function updateTray(): void {
  if (!tray) return;
  const np = nowPlaying;
  const key = np ? `${np.title}|${np.playing}` : "";
  if (key === lastTrayKey) return;
  lastTrayKey = key;
  tray.setToolTip(np ? `Камадо — ${np.title} · ${np.artist}` : "Камадо");
  // На Mac рядом с иконкой — название трека (коротко)
  if (process.platform === "darwin") tray.setTitle(np && np.playing ? ` ${np.title.length > 22 ? np.title.slice(0, 21) + "…" : np.title}` : "");
  if (process.platform !== "darwin") tray.setContextMenu(trayMenu());
}

// ---------- Окно и трей ----------

function showWindow(): void {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow(): void {
  const isMac = process.platform === "darwin";
  win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1040,
    minHeight: 660,
    show: false,
    title: "Камадо",
    backgroundColor: "#0b0a14",
    icon: iconPath("icon.png"),
    titleBarStyle: "hidden",
    ...(isMac
      ? { trafficLightPosition: { x: 18, y: 16 } }
      : { titleBarOverlay: { color: "#00000000", symbolColor: "#f3f0ff", height: 44 } }),
    webPreferences: {
      preload: join(here, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  win.once("ready-to-show", () => win?.show());
  win.on("close", (e) => {
    if (!quitting && settings.closeToTray && tray) {
      e.preventDefault();
      win?.hide();
    }
  });
  win.on("closed", () => {
    win = undefined;
    overlay?.close();
  });
  // Если окно всё-таки упало целиком — перезапускаем его, а не оставляем белый экран.
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("Окно упало:", details.reason);
    if (details.reason !== "clean-exit") win?.webContents.reload();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  loadRenderer(win);

  if (process.env.CAMADO_SHOTS) {
    win.webContents.on("console-message", (e) => console.log(`[окно] ${e.message}`));
    void takeScreenshots(win, process.env.CAMADO_SHOTS);
  }
}

function createTray(): void {
  const isMac = process.platform === "darwin";
  // На Mac — чёрно-белая «шаблонная» иконка: система сама подкрашивает её под тему меню-бара.
  const img = nativeImage.createFromPath(iconPath(isMac ? "trayTemplate.png" : "tray.png"));
  if (img.isEmpty()) return;
  if (isMac) img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip("Камадо");
  if (isMac) {
    tray.on("click", (_e, bounds) => toggleMini(bounds)); // клик — мини-плеер
    tray.on("right-click", () => tray?.popUpContextMenu(trayMenu()));
  } else {
    tray.setContextMenu(trayMenu());
    tray.on("click", () => showWindow());
  }
}

/** Меню Mac по-русски (на Windows меню скрыто — у окна своя шапка). */
function setAppMenu(): void {
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Camado",
        submenu: [
          { role: "about", label: "О программе Camado" },
          { type: "separator" },
          { label: "Настройки…", accelerator: "Cmd+,", click: () => send("go", "settings") },
          { type: "separator" },
          { role: "hide", label: "Скрыть Camado" },
          { role: "hideOthers", label: "Скрыть остальные" },
          { role: "unhide", label: "Показать все" },
          { type: "separator" },
          {
            label: "Выйти из Camado",
            accelerator: "Cmd+Q",
            click: () => {
              quitting = true;
              app.quit();
            },
          },
        ],
      },
      {
        label: "Правка",
        submenu: [
          { role: "undo", label: "Отменить" },
          { role: "redo", label: "Повторить" },
          { type: "separator" },
          { role: "cut", label: "Вырезать" },
          { role: "copy", label: "Копировать" },
          { role: "paste", label: "Вставить" },
          { role: "selectAll", label: "Выбрать всё" },
        ],
      },
      {
        label: "Плеер",
        submenu: [
          { label: "Пауза / играть", click: () => send("media-key", "playpause") },
          { label: "Следующий трек", accelerator: "Cmd+Right", click: () => send("media-key", "next") },
          { label: "Предыдущий трек", accelerator: "Cmd+Left", click: () => send("media-key", "prev") },
          { type: "separator" },
          { label: "Текст песни поверх окон", accelerator: "Cmd+Shift+L", click: () => toggleOverlay() },
        ],
      },
      {
        label: "Вид",
        submenu: [
          { role: "togglefullscreen", label: "Во весь экран" },
          { type: "separator" },
          { role: "resetZoom", label: "Обычный размер" },
          { role: "zoomIn", label: "Крупнее" },
          { role: "zoomOut", label: "Мельче" },
        ],
      },
      {
        label: "Окно",
        submenu: [
          { role: "minimize", label: "Свернуть" },
          { role: "zoom", label: "Развернуть" },
          { role: "close", label: "Закрыть окно" },
        ],
      },
    ]),
  );
}

// Для проверки дизайна: CAMADO_SHOTS=папка — снимки экранов и выход.
async function takeScreenshots(w: BrowserWindow, dir: string): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
  await new Promise<void>((r) => w.webContents.once("did-finish-load", () => r()));
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);
  const screens = (process.env.CAMADO_SHOT_LIST ?? "today").split(",");
  for (const name of screens) {
    await w.webContents.executeJavaScript(`window.__camadoShot && window.__camadoShot(${JSON.stringify(name)})`);
    await wait(Number(process.env.CAMADO_SHOT_WAIT ?? 1600));
    if (process.env.CAMADO_SHOT_DUMP) {
      const html = await w.webContents.executeJavaScript(
        `(document.querySelector(${JSON.stringify(process.env.CAMADO_SHOT_DUMP)})?.outerHTML ?? "нет элемента").slice(0, 1500)`,
      );
      console.log(`[дамп ${name}] ${html}`);
    }
    const img = await w.webContents.capturePage();
    await writeFile(join(dir, `${name}.png`), img.toPNG());
    if (overlay && !overlay.isDestroyed()) {
      await writeFile(join(dir, `${name}-overlay.png`), (await overlay.webContents.capturePage()).toPNG());
    }
  }
  quitting = true;
  app.quit();
}

// ---------- Запуск ----------

app.on("second-instance", () => showWindow());

app.on("before-quit", () => {
  quitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || !tray) app.quit();
});

app.on("activate", () => showWindow());

void app.whenReady().then(async () => {
  protocol.handle("camado-media", (req) => {
    const url = new URL(req.url);
    const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const path = url.hostname === "track" ? library.trackPath(name) : url.hostname === "cover" ? library.coverPath(name) : undefined;
    if (!path) return new Response("not found", { status: 404 });
    return serveFile(path, req.headers.get("range"));
  });

  await library.load();
  library.watchFolders();
  setAppMenu();
  if (process.platform === "darwin" && !app.isPackaged) app.dock?.setIcon(iconPath("icon.png"));
  void discord.configure(settings.discord.enabled, settings.discord.clientId);
  createWindow();
  // Подхватить новые файлы в папках, добавленных раньше.
  if (library.view().folders.length) void library.rescan();
  createTray();

  for (const [accel, action] of [
    ["MediaPlayPause", "playpause"],
    ["MediaNextTrack", "next"],
    ["MediaPreviousTrack", "prev"],
  ] as const) {
    try {
      globalShortcut.register(accel, () => send("media-key", action));
    } catch {
      // клавиша занята другой программой — не страшно
    }
  }

  startBot();
  updates.start();
  startReminderLoop(
    store,
    async (text) => {
      notify("Камадо", text);
      send("reminder", { text });
      const owner = botOwner();
      if (bot && owner) await bot.api.sendMessage(owner, text).catch(() => undefined);
    },
    config.CAMADO_TIMEZONE,
  );
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  void discord.stop();
  void stopBot();
});
