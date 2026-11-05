// Онлайн-плееры: Яндекс Музыка и SoundCloud — их официальные сайты внутри приложения.
// Ты входишь в свой аккаунт сам, Камадо только смотрит, что играет (название, позиция),
// чтобы показать текст и визуализатор, и умеет нажать пауза/дальше.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, Maximize2, RotateCw } from "lucide-react";
import { api } from "../lib/api";
import { engine } from "../lib/audio";
import { useStore } from "../lib/store";
import { app, toast } from "../state/app";
import { loadCoverPalette, loadLyrics, player, type OnlineNow } from "../state/player";

export type Service = "yandex" | "soundcloud";

export const SERVICES: Record<Service, { name: string; url: string }> = {
  yandex: { name: "Яндекс Музыка", url: "https://music.yandex.ru/" },
  soundcloud: { name: "SoundCloud", url: "https://soundcloud.com/discover" },
};

// Подключается к странице: запоминает кнопки управления и позицию, которые сайт отдаёт системе.
const HOOK = `(() => {
  if (window.__camadoHooked) return; window.__camadoHooked = true;
  const ms = navigator.mediaSession; if (!ms) return;
  window.__camadoHandlers = {};
  const set = ms.setActionHandler.bind(ms);
  ms.setActionHandler = (a, h) => { window.__camadoHandlers[a] = h; return set(a, h); };
  if (ms.setPositionState) {
    const pos = ms.setPositionState.bind(ms);
    ms.setPositionState = (s) => { if (s) window.__camadoPos = { duration: s.duration, position: s.position, rate: s.playbackRate || 1, at: performance.now() }; return pos(s); };
  }
})()`;

const PROBE = `(() => {
  const ms = navigator.mediaSession, m = ms && ms.metadata;
  const media = [...document.querySelectorAll('audio,video')];
  const a = media.find(x => !x.paused) || media[0];
  let position = a && isFinite(a.currentTime) ? a.currentTime : 0;
  let duration = a && isFinite(a.duration) ? a.duration : 0;
  const playing = ms && ms.playbackState && ms.playbackState !== 'none' ? ms.playbackState === 'playing' : !!(a && !a.paused);
  const p = window.__camadoPos;
  if (p && p.duration) { duration = p.duration; position = p.position + (playing ? (performance.now() - p.at) / 1000 * p.rate : 0); }
  const art = m && m.artwork && m.artwork.length ? m.artwork[m.artwork.length - 1].src : '';
  return { title: (m && m.title) || '', artist: (m && m.artist) || '', artwork: art, position, duration, playing };
})()`;

const control = (action: string) => `(() => {
  const h = window.__camadoHandlers || {};
  const media = [...document.querySelectorAll('audio,video')];
  const a = media.find(x => !x.paused) || media[0];
  let act = ${JSON.stringify(action)};
  if (act === 'playpause') act = a && !a.paused ? 'pause' : 'play';
  if (h[act]) { h[act]({ action: act }); return true; }
  if ((act === 'play' || act === 'pause') && a) { act === 'play' ? a.play() : a.pause(); return true; }
  return false;
})()`;

interface WebviewEl extends HTMLElement {
  executeJavaScript(code: string): Promise<unknown>;
  getWebContentsId(): number;
  goBack(): void;
  goForward(): void;
  reload(): void;
}

function OnlineView({ service, visible }: { service: Service; visible: boolean }) {
  const ref = useRef<WebviewEl | null>(null);
  const ready = useRef(false);
  const lastTitle = useRef("");

  useEffect(() => {
    const wv = ref.current!;
    const onReady = () => {
      ready.current = true;
      void wv.executeJavaScript(HOOK).catch(() => undefined);
    };
    wv.addEventListener("dom-ready", onReady);

    const timer = window.setInterval(async () => {
      if (!ready.current) return;
      try {
        const r = (await wv.executeJavaScript(PROBE)) as Omit<OnlineNow, "service" | "at">;
        if (!r.title) return;
        const now: OnlineNow = { ...r, service, at: performance.now() };
        const s = player.get();
        // Заиграло онлайн — локальный плеер на паузу, источник — онлайн.
        if (now.playing && s.source !== "online") {
          engine.el.pause();
          player.set({ source: "online" });
        }
        if (s.source === "online" || now.playing) {
          player.set({
            online: now,
            playing: now.playing,
            onlineControl: (action) => {
              void wv.executeJavaScript(control(action)).then((ok) => {
                if (!ok && action === "playpause") void api.online.sendKey(wv.getWebContentsId(), "Space");
              });
            },
          });
          const key = `${now.artist}|${now.title}`;
          if (key !== lastTitle.current) {
            lastTitle.current = key;
            void loadLyrics();
            void loadCoverPalette(now.artwork);
          }
        }
      } catch {
        // страница перезагружается — попробуем на следующем тике
      }
    }, 600);

    return () => {
      wv.removeEventListener("dom-ready", onReady);
      clearInterval(timer);
    };
  }, [service]);

  return (
    <webview
      ref={(el) => {
        ref.current = el as WebviewEl | null;
      }}
      className={`online-view ${visible ? "visible" : ""}`}
      src={SERVICES[service].url}
      partition="persist:online"
      allowpopups={"true" as unknown as boolean}
    />
  );
}

/** Держит онлайн-плееры живыми, даже когда открыт другой экран, — музыка не прерывается. */
export function OnlineHost() {
  const screen = useStore(app, (s) => s.screen);
  const [tab, setTab] = useState<Service | null>(null);
  const [opened, setOpened] = useState<Service[]>([]);
  const [loop, setLoop] = useState(engine.loopbackActive);
  const supported = useStore(app, (s) => s.info.loopbackSupported);

  useEffect(() => {
    const open = (e: Event) => {
      const svc = (e as CustomEvent<Service | null>).detail;
      setTab(svc);
      if (svc) setOpened((o) => (o.includes(svc) ? o : [...o, svc]));
    };
    window.addEventListener("camado-online", open);
    return () => window.removeEventListener("camado-online", open);
  }, []);

  const visible = screen === "music" && tab !== null;
  const current = () => document.querySelector<WebviewEl>(".online-view.visible");

  const toggleLoop = async () => {
    if (engine.loopbackActive) {
      engine.stopLoopback();
      setLoop(false);
      return;
    }
    try {
      const ok = await engine.startLoopback();
      setLoop(ok);
      toast(ok ? "Визуализатор слушает системный звук 🎧" : "Система не дала звук для визуализатора", ok ? "ok" : "warn");
    } catch {
      toast("Не получилось включить захват звука", "warn");
    }
  };

  return (
    <div className={`online-host ${visible ? "visible" : ""}`}>
      <div className="online-bar glass">
        <button className="icon-btn" onClick={() => current()?.goBack()} title="Назад">
          <ArrowLeft size={17} />
        </button>
        <button className="icon-btn" onClick={() => current()?.goForward()} title="Вперёд">
          <ArrowRight size={17} />
        </button>
        <button className="icon-btn" onClick={() => current()?.reload()} title="Обновить">
          <RotateCw size={16} />
        </button>
        <span className="online-name">{tab ? SERVICES[tab].name : ""}</span>
        <span className="spacer" />
        {supported && (
          <button className={`chip-btn ${loop ? "on" : ""}`} onClick={() => void toggleLoop()} title="Визуализатор и тряска от звука онлайн-плеера">
            <AudioLines size={15} /> {loop ? "визуализатор слушает" : "включить визуализатор"}
          </button>
        )}
        <button className="chip-btn" onClick={() => app.set({ nowPlaying: true })}>
          <Maximize2 size={15} /> текст и плеер
        </button>
      </div>
      {opened.map((svc) => (
        <OnlineView key={svc} service={svc} visible={visible && tab === svc} />
      ))}
    </div>
  );
}

export function openOnline(svc: Service | null): void {
  window.dispatchEvent(new CustomEvent("camado-online", { detail: svc }));
}
