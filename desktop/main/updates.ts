// Обновления прямо из программы — по кнопке. Камадо только сообщает «вышла новая версия», а когда нажимаешь
// «Скачать обновление», дальше всё само: загрузка с полоской, установка, перезапуск. Без сайта и Терминала.
// Windows: стандартный установщик (electron-updater). Mac: без платной подписи Apple стандартное обновление
// не работает, поэтому Камадо сам качает архив новой версии, после выхода заменяет себя в «Программах»,
// подписывает «для себя» (codesign -s -, есть на каждом Mac) и запускается снова.
import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, constants, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { app } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateStatus } from "../shared/types.js";
import { isNewer, versionFromYml } from "../shared/version.js";
import { changesBetween, parseChangelog } from "../shared/changelog.js";
import { macSwapScript } from "./macSwap.js";

const { autoUpdater } = electronUpdater;
const run = promisify(execFile);

export const FEED = "https://github.com/killer-destroyer/camado/releases/latest/download";
/** Архив для Mac под свой процессор: Camado-mac-arm64.zip (M1/M2/…) или Camado-mac-x64.zip (Intel). */
export const macZipUrl = (arch: string = process.arch) => `${FEED}/Camado-mac-${arch === "arm64" ? "arm64" : "x64"}.zip`;
const CHECK_EVERY = 3 * 3600e3;

function explain(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/404|Cannot find latest|HttpError: 40[34]/i.test(msg)) {
    return "Не вижу новых версий: GitHub не отдаёт файлы обновлений. Скорее всего, проект приватный — открой его на GitHub → Settings → внизу «Change visibility» → Public.";
  }
  if (/ENOTFOUND|ETIMEDOUT|ECONNRESET|net::|getaddrinfo|fetch failed/i.test(msg)) return "Нет связи с интернетом — попробуй ещё раз чуть позже.";
  return msg.length < 160 ? msg : "Не получилось обновиться. Попробуй ещё раз позже.";
}

export class Updates {
  status: UpdateStatus;
  private timer?: NodeJS.Timeout;
  /** Windows и Linux (AppImage) — стандартный установщик; Mac — своя замена программы. */
  private readonly std = process.platform === "win32" || (process.platform === "linux" && !!process.env.APPIMAGE);

  constructor(
    private emit: (s: UpdateStatus) => void,
    /** Перед выходом для установки: чтобы окно не спряталось в фон, а программа правда закрылась. */
    private prepareQuit: () => void = () => undefined,
  ) {
    this.status = { state: app.isPackaged ? "idle" : "dev", current: app.getVersion() };
  }

  private set(patch: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...patch };
    this.emit(this.status);
  }

  start(): void {
    if (!app.isPackaged) return;
    if (this.std) {
      // Сами ничего не качаем — только по кнопке «Скачать обновление».
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.on("update-available", (i) => {
        this.set({ state: "available", version: i.version });
        void this.loadNotes(i.version);
      });
      autoUpdater.on("update-not-available", () => this.set({ state: "none", checkedAt: Date.now() }));
      autoUpdater.on("download-progress", (p) => this.set({ state: "downloading", percent: Math.round(p.percent) }));
      autoUpdater.on("update-downloaded", (i) => {
        this.set({ state: "installing", version: i.version, percent: 100 });
        this.prepareQuit();
        // тихо поставить и сразу запустить новую версию
        setTimeout(() => autoUpdater.quitAndInstall(true, true), 1200);
      });
      autoUpdater.on("error", (e) => this.set({ state: "error", error: explain(e), checkedAt: Date.now() }));
    }
    setTimeout(() => void this.check(), 8000);
    this.timer = setInterval(() => void this.check(), CHECK_EVERY);
  }

  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged) return this.status;
    if (["downloading", "installing", "available"].includes(this.status.state)) return this.status;
    this.set({ state: "checking", error: undefined });
    if (this.std) {
      try {
        await autoUpdater.checkForUpdates();
      } catch (e) {
        this.set({ state: "error", error: explain(e), checkedAt: Date.now() });
      }
      return this.status;
    }
    // Mac: сравниваем номер версии из latest.yml.
    try {
      const res = await fetch(`${FEED}/latest.yml`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HttpError: ${res.status}`);
      const v = versionFromYml(await res.text());
      if (v && isNewer(v, app.getVersion())) {
        this.set({ state: "available", version: v, checkedAt: Date.now() });
        void this.loadNotes(v);
      }
      else this.set({ state: "none", checkedAt: Date.now() });
    } catch (e) {
      this.set({ state: "error", error: explain(e), checkedAt: Date.now() });
    }
    return this.status;
  }

  /** Что добавит новая версия: changelog.md лежит в релизе рядом с установщиками. Без него — просто без списка. */
  private async loadNotes(version: string): Promise<void> {
    try {
      const res = await fetch(`${FEED}/changelog.md`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return;
      const text = (await res.text()).slice(0, 200_000);
      const notes = changesBetween(parseChangelog(text), app.getVersion(), version).slice(0, 10);
      if (notes.length && this.status.version === version) this.set({ notes });
    } catch {
      /* нет сети — покажем без списка */
    }
  }

  /** Кнопка «Скачать обновление»: скачать, поставить, перезапуститься — всё само. */
  async download(): Promise<void> {
    if (this.status.state !== "available" && this.status.state !== "error") return;
    this.set({ state: "downloading", percent: 0, error: undefined });
    try {
      if (this.std) {
        await autoUpdater.downloadUpdate();
        return; // дальше — «update-downloaded»: установка и перезапуск
      }
      await this.macUpdate();
    } catch (e) {
      this.set({ state: "error", error: explain(e), checkedAt: Date.now() });
    }
  }

  private async macUpdate(): Promise<void> {
    // где сейчас стоит программа: …/Camado.app/Contents/MacOS/Camado → …/Camado.app
    const appPath = resolve(app.getPath("exe"), "../../..");
    if (!appPath.endsWith(".app")) throw new Error("Не нашёл, где лежит Камадо — обнови вручную.");
    try {
      await access(dirname(appPath), constants.W_OK);
    } catch {
      throw new Error("Нет прав заменить Камадо в этой папке. Перенеси Камадо в «Программы» и попробуй снова.");
    }
    if (/AppTranslocation|\/Volumes\//.test(appPath)) throw new Error("Камадо запущен прямо из загрузок или образа — сначала перенеси его в «Программы».");

    const dir = join(app.getPath("userData"), "update");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const zip = join(dir, "Camado.zip");

    // скачиваем с полоской загрузки (файл, скачанный самой программой, не получает пометку «из интернета»)
    const res = await fetch(macZipUrl(), { signal: AbortSignal.timeout(30 * 60e3) });
    if (!res.ok || !res.body) throw new Error(`HttpError: ${res.status}`);
    const total = Number(res.headers.get("content-length")) || 0;
    let got = 0;
    let shown = -1;
    const body = Readable.fromWeb(res.body as never);
    body.on("data", (chunk: Buffer) => {
      got += chunk.length;
      const pct = total ? Math.min(99, Math.floor((got / total) * 100)) : 0;
      if (pct !== shown) {
        shown = pct;
        this.set({ state: "downloading", percent: pct });
      }
    });
    await pipeline(body, createWriteStream(zip));

    // распаковываем родной программой Mac (сохраняет ссылки внутри программы)
    const out = join(dir, "new");
    await mkdir(out, { recursive: true });
    await run("/usr/bin/ditto", ["-x", "-k", zip, out]);
    const name = (await readdir(out)).find((f) => f.endsWith(".app"));
    if (!name) throw new Error("В скачанном архиве нет программы — попробуй ещё раз позже.");
    await rm(zip, { force: true });

    // после выхода скрипт поставит новую версию на место старой и запустит её
    const script = join(dir, "swap.sh");
    await writeFile(script, macSwapScript(), { mode: 0o755 });
    this.set({ state: "installing", percent: 100 });
    spawn("/bin/bash", [script, String(process.pid), join(out, name), appPath], { detached: true, stdio: "ignore" }).unref();
    this.prepareQuit();
    setTimeout(() => app.quit(), 800);
  }

  stop(): void {
    clearInterval(this.timer);
  }
}
