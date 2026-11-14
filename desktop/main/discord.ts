// Статус в Discord: «Слушает Camado — трек, исполнитель» с полоской времени.
// Нужен ID своего приложения Discord (Discord Developer Portal → New Application) — вводится в настройках.
import { Client } from "@xhayper/discord-rpc";
import type { NowPlayingState } from "../shared/types.js";

const LISTENING = 2; // тип активности «Слушает»

export class DiscordPresence {
  private client?: Client;
  private clientId = "";
  private ready = false;
  private retry?: NodeJS.Timeout;
  private lastKey = "";
  status: "off" | "connecting" | "on" | "no-discord" = "off";

  async configure(enabled: boolean, clientId: string): Promise<void> {
    const id = enabled ? clientId.trim() : "";
    if (id === this.clientId) return;
    await this.stop();
    this.clientId = id;
    if (id) void this.connect();
  }

  private async connect(): Promise<void> {
    if (!this.clientId) return;
    this.status = "connecting";
    const client = new Client({ clientId: this.clientId, transport: { type: "ipc" } });
    client.on("ready", () => {
      this.ready = true;
      this.status = "on";
      this.lastKey = "";
    });
    client.on("disconnected", () => {
      this.ready = false;
      this.status = "no-discord";
      this.scheduleRetry();
    });
    this.client = client;
    try {
      await client.login();
    } catch {
      this.ready = false;
      this.status = "no-discord"; // Discord не запущен — попробуем позже
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.connect(), 30_000);
  }

  async update(np: NowPlayingState | null): Promise<void> {
    if (!this.ready || !this.client?.user) return;
    const key = np ? `${np.title}|${np.artist}|${np.playing}|${Math.round(np.position / 5)}` : "none";
    if (key === this.lastKey) return;
    this.lastKey = key;
    try {
      if (!np || !np.playing) {
        await this.client.user.clearActivity();
        return;
      }
      const start = Date.now() - np.position * 1000;
      await this.client.user.setActivity({
        type: LISTENING,
        details: np.title.slice(0, 120),
        state: np.artist.slice(0, 120) || "Camado",
        startTimestamp: start,
        endTimestamp: np.duration > 0 ? start + np.duration * 1000 : undefined,
        largeImageKey: "camado",
        largeImageText: "Camado",
      } as Parameters<NonNullable<Client["user"]>["setActivity"]>[0]);
    } catch {
      // Discord закрыли — переподключимся
    }
  }

  async stop(): Promise<void> {
    clearTimeout(this.retry);
    this.ready = false;
    this.status = "off";
    const c = this.client;
    this.client = undefined;
    await c?.destroy().catch(() => undefined);
  }
}
