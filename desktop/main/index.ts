// Приложение Камадо для компьютера: окно + всё ядро (задания, напоминания, ИИ, бот) в одном процессе.
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  protocol,
  screen,
  session,
  shell,
  Tray,
  webContents,
} from "electron";
import type { Bot } from "grammy";
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
import type { AppInfo, BotStatus, TaskInput, TaskPatch } from "../shared/types.js";
import { Library } from "./library.js";
import { LyricsService } from "./lyrics.js";
import { serveFile } from "./media.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const SETTINGS_KV = "desktop_settings";
const ONLINE_HOSTS = /(^|\.)(yandex\.(ru|com|by|kz|uz)|ya\.ru|soundcloud\.com|sndcdn\.com|google\.com|apple\.com|facebook\.com|vk\.com|vk\.ru)$/;

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
const botStatus: BotStatus = { configured: Boolean(config.TELEGRAM_BOT_TOKEN), running: false };

const send = (channel: string, payload?: unknown) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

const library = new Library(dataDir, () => send("library-changed"));
const lyrics = new LyricsService(join(dataDir, "lyrics-cache"), (id) => library.trackPath(id));

// Любое изменение данных (из окна, бота или ИИ) — окно перерисовывает списки.
let changeTimer: NodeJS.Timeout | undefined;
store.onChange = () => {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => send("data-changed"), 60);
};

function iconPath(name: string): string {
  return join(app.getAppPath(), "desktop", "assets", name);
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: iconPath("icon.png"), silent: false });
  n.on("click", () => showWindow());
  n.show();
}

// ---------- Telegram-бот внутри приложения ----------

function startBot(): void {
  if (bot || !config.TELEGRAM_BOT_TOKEN || !settings.runBot) return;
  try {
    bot = createCoreBot(core);
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
    loopbackSupported: process.platform === "win32" || process.platform === "darwin",
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

  "bot.status": () => ({ ...botStatus }),

  "settings.get": () => settings,
  "settings.set": async (patch: Partial<AppSettings>) => {
    const before = settings.runBot;
    const next = saveSettings(patch);
    if (before !== next.runBot) next.runBot ? startBot() : await stopBot();
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

  "online.sendKey": (id: number, key: string) => {
    const wc = webContents.fromId(id);
    if (!wc || wc.getType() !== "webview") return;
    wc.sendInputEvent({ type: "keyDown", keyCode: key });
    wc.sendInputEvent({ type: "keyUp", keyCode: key });
  },

  "window.setTitleBarColors": (symbol: string) => {
    if (win && process.platform !== "darwin") win.setTitleBarOverlay({ color: "#00000000", symbolColor: symbol, height: 44 });
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
      webviewTag: true,
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
  win.on("closed", () => (win = undefined));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(here, "../renderer/index.html"));

  if (process.env.CAMADO_SHOTS) {
    win.webContents.on("console-message", (e) => console.log(`[окно] ${e.message}`));
    void takeScreenshots(win, process.env.CAMADO_SHOTS);
  }
}

function createTray(): void {
  const img = nativeImage.createFromPath(iconPath("tray.png"));
  if (img.isEmpty()) return;
  tray = new Tray(img);
  tray.setToolTip("Камадо");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Открыть Камадо", click: () => showWindow() },
      { label: "Пауза / играть", click: () => send("media-key", "playpause") },
      { type: "separator" },
      {
        label: "Выйти",
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", () => showWindow());
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
  }
  quitting = true;
  app.quit();
}

// ---------- Запуск ----------

app.on("second-instance", () => showWindow());

app.on("web-contents-created", (_e, contents) => {
  // Встроенные плееры (Яндекс Музыка, SoundCloud): без доступа к Node, только свои сайты.
  contents.on("will-attach-webview", (event, prefs, params) => {
    delete prefs.preload;
    prefs.nodeIntegration = false;
    prefs.contextIsolation = true;
    try {
      if (!ONLINE_HOSTS.test(new URL(params.src ?? "").hostname)) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  if (contents.getType() === "webview") {
    // Окна входа (логин через Яндекс ID, Google и т. п.) открываем в том же плеере.
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) void contents.loadURL(url);
      return { action: "deny" };
    });
  }
});

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

  // Захват системного звука для визуализатора онлайн-плееров (Windows, macOS).
  session.defaultSession.setDisplayMediaRequestHandler(
    (_req, callback) => {
      void desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
        const supported = process.platform === "win32" || process.platform === "darwin";
        callback(supported && sources[0] ? { video: sources[0], audio: "loopback" } : {});
      });
    },
    { useSystemPicker: false },
  );

  await library.load();
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
  startReminderLoop(
    store,
    async (text) => {
      notify("Камадо", text);
      send("reminder", { text });
      if (bot && config.OWNER_TELEGRAM_ID) await bot.api.sendMessage(config.OWNER_TELEGRAM_ID, text).catch(() => undefined);
    },
    config.CAMADO_TIMEZONE,
  );
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  void stopBot();
});
