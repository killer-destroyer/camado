// Обновления прямо из программы. Windows: качает новую версию в фоне, ставит по кнопке «Перезапустить».
// Mac (без платной подписи Apple автообновление невозможно): сообщает о новой версии и даёт ссылку.
import { app, shell } from "electron";
import electronUpdater from "electron-updater";
import type { UpdateStatus } from "../shared/types.js";
import { isNewer, versionFromYml } from "../shared/version.js";

const { autoUpdater } = electronUpdater;

export const FEED = "https://github.com/killer-destroyer/camado-/releases/latest/download";
const MAC_DOWNLOAD = `${FEED}/Camado-mac.dmg`;
const CHECK_EVERY = 3 * 3600e3;

function explain(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/404|Cannot find latest|HttpError: 40[34]/i.test(msg)) {
    return "Не вижу новых версий: файлы обновлений недоступны. Если проект на GitHub приватный — сделай его публичным, тогда обновления заработают.";
  }
  if (/ENOTFOUND|ETIMEDOUT|ECONNRESET|net::|getaddrinfo/i.test(msg)) return "Нет связи с интернетом — проверю позже.";
  return "Не получилось проверить обновления. Попробую позже.";
}

export class Updates {
  status: UpdateStatus;
  private timer?: NodeJS.Timeout;
  private readonly auto = process.platform === "win32" || (process.platform === "linux" && !!process.env.APPIMAGE);

  constructor(private emit: (s: UpdateStatus) => void) {
    this.status = { state: app.isPackaged ? "idle" : "dev", current: app.getVersion() };
  }

  private set(patch: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...patch };
    this.emit(this.status);
  }

  start(): void {
    if (!app.isPackaged) return;
    if (this.auto) {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.on("checking-for-update", () => this.set({ state: "checking", error: undefined }));
      autoUpdater.on("update-not-available", () => this.set({ state: "none", checkedAt: Date.now() }));
      autoUpdater.on("update-available", (i) => this.set({ state: "downloading", version: i.version, percent: 0 }));
      autoUpdater.on("download-progress", (p) => this.set({ state: "downloading", percent: Math.round(p.percent) }));
      autoUpdater.on("update-downloaded", (i) => this.set({ state: "ready", version: i.version, percent: 100 }));
      autoUpdater.on("error", (e) => this.set({ state: "error", error: explain(e), checkedAt: Date.now() }));
    }
    setTimeout(() => void this.check(), 8000);
    this.timer = setInterval(() => void this.check(), CHECK_EVERY);
  }

  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged) return this.status;
    if (this.status.state === "downloading" || this.status.state === "ready") return this.status;
    if (this.auto) {
      try {
        await autoUpdater.checkForUpdates();
      } catch (e) {
        this.set({ state: "error", error: explain(e), checkedAt: Date.now() });
      }
      return this.status;
    }
    // Mac: просто сравниваем номер версии из latest.yml.
    this.set({ state: "checking", error: undefined });
    try {
      const res = await fetch(`${FEED}/latest.yml`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HttpError: ${res.status}`);
      const v = versionFromYml(await res.text());
      if (v && isNewer(v, app.getVersion())) this.set({ state: "manual", version: v, checkedAt: Date.now() });
      else this.set({ state: "none", checkedAt: Date.now() });
    } catch (e) {
      this.set({ state: "error", error: explain(e), checkedAt: Date.now() });
    }
    return this.status;
  }

  install(): void {
    if (this.status.state === "ready") autoUpdater.quitAndInstall(false, true);
    else if (this.status.state === "manual") void shell.openExternal(MAC_DOWNLOAD);
  }

  stop(): void {
    clearInterval(this.timer);
  }
}
