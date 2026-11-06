// «Настройки»: внешний вид, плавность, музыка и тряска, ИИ, Telegram-бот.
import { useEffect, useState } from "react";
import { AlarmClock, Check, Download, FolderPlus, Image as ImageIcon, KeyRound, Music4, Play, RefreshCw, Shuffle, Sparkles, Square, Trash2 } from "lucide-react";
import { SCENES } from "../lib/scenes";
import { startScreensaver } from "../components/Screensaver";
import type { AiConfig, AiStatus, BotStatus } from "../../../shared/types";
import type { AppSettings } from "../../../shared/settings";
import { api } from "../lib/api";
import { fps } from "../lib/frame";
import { PALETTES } from "../lib/palettes";
import { useStore } from "../lib/store";
import { app, toast, updateSettings } from "../state/app";
import { player, setAutoLevel } from "../state/player";
import { Row, Segmented, Slider, Toggle } from "../components/ui";
import { EqPanel } from "../components/Equalizer";
import { ALARM_SOUNDS, alarmPlaying, startAlarm, stopAlarm } from "../lib/alarmSounds";
import { ring } from "../state/alarms";

function PaletteGrid({ s }: { s: AppSettings }) {
  return (
    <div className="palette-grid">
      {PALETTES.map((p) => (
        <button
          key={p.id}
          className={`pal ${s.palette === p.id && !s.coverColors ? "active" : ""}`}
          style={{
            background: `radial-gradient(120% 90% at 20% 10%, ${p.accent}55, transparent 60%), radial-gradient(90% 90% at 90% 90%, ${p.accent2}44, transparent 60%), ${p.bg}`,
            color: p.text,
          }}
          onClick={() => updateSettings({ palette: p.id, coverColors: false })}
        >
          <span className="pal-dots">
            <i style={{ background: p.accent }} />
            <i style={{ background: p.accent2 }} />
            <i style={{ background: p.accent3 }} />
          </span>
          <span className="pal-name">{p.name}</span>
          <span className="pal-vibe" style={{ color: p.muted }}>
            {p.vibe}
          </span>
          {s.palette === p.id && !s.coverColors && (
            <span className="pal-check" style={{ background: p.accent, color: p.bg }}>
              <Check size={13} strokeWidth={3} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function LiveFps() {
  const [v, setV] = useState(fps.value);
  useEffect(() => {
    const t = setInterval(() => setV(fps.value), 500);
    return () => clearInterval(t);
  }, []);
  return <b className="live-fps">{v} FPS</b>;
}

function UpdatesSection() {
  const u = useStore(app, (x) => x.update);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    app.set({ update: await api.updates.check() });
    setBusy(false);
  };
  const text: Record<typeof u.state, string> = {
    dev: "Запущено из исходников — обновления приходят через git.",
    idle: "Проверю обновления через пару секунд.",
    checking: "Проверяю…",
    none: "У тебя последняя версия ✓",
    downloading: `Качаю версию ${u.version ?? ""}… ${u.percent ?? 0}%`,
    ready: `Версия ${u.version} скачана. Перезапусти — и всё обновится, задания и настройки сохранятся.`,
    manual: `Вышла версия ${u.version}. Скачай и поставь поверх — задания и настройки сохранятся.`,
    error: u.error ?? "Не получилось проверить обновления.",
  };
  return (
    <section className="set-section glass">
      <h3>Обновления</h3>
      <Row title={`Камадо ${u.current || ""}`} hint={text[u.state]}>
        {u.state === "ready" || u.state === "manual" ? (
          <button className="btn primary" onClick={() => void api.updates.install()}>
            <Download size={16} /> {u.state === "ready" ? "Перезапустить и обновить" : "Скачать"}
          </button>
        ) : (
          u.state !== "dev" && (
            <button className="btn" disabled={busy || u.state === "checking" || u.state === "downloading"} onClick={() => void check()}>
              <RefreshCw size={16} className={u.state === "checking" ? "spin" : ""} /> Проверить
            </button>
          )
        )}
      </Row>
      {u.state === "downloading" && (
        <div className="update-progress">
          <i style={{ width: `${u.percent ?? 0}%` }} />
        </div>
      )}
      <div className="set-hint">Камадо сам проверяет обновления при запуске и каждые 3 часа.</div>
    </section>
  );
}

const AI_KINDS = [
  { value: "gemini" as const, label: "Gemini — бесплатно" },
  { value: "anthropic" as const, label: "Claude" },
  { value: "openai" as const, label: "Другая модель" },
];

const isLocal = (u: string) => /localhost|127\.0\.0\.1/.test(u);

function AiSection() {
  const [st, setSt] = useState<AiStatus | null>(null);
  const [kind, setKind] = useState<AiConfig["kind"]>("gemini");
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState({ input: 0, output: 0 });
  const [free, setFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = () =>
    void api.ai.status().then((x) => {
      setSt(x);
      setKind(x.kind);
      setBaseUrl(x.config.baseUrl ?? "");
      setModel(x.config.models?.brain ?? "");
      setPrice(x.config.price ?? { input: 0, output: 0 });
      setFree(x.kind === "openai" && !!x.config.free);
    });
  useEffect(load, []);
  const current = st?.kind === kind && st.enabled;
  const save = async () => {
    setBusy(true);
    const cfg: AiConfig =
      kind === "gemini"
        ? { kind, free: true, ...(model ? { models: { brain: model, smart: model } } : {}) }
        : kind === "anthropic"
          ? { kind, ...(model ? { models: { brain: model } } : {}) }
          : { kind, baseUrl: baseUrl.trim(), price, free, ...(model ? { models: { fast: model, brain: model, smart: model } } : {}) };
    const r = await api.ai.connect(cfg, key || undefined);
    setBusy(false);
    if (r.ok) {
      setKey("");
      toast("Готово — ИИ включён 🧠", "ok");
    } else toast(r.error ?? "Не подошло", "warn");
    load();
  };
  const preset = st?.presets.find((p) => baseUrl.startsWith(p.baseUrl));
  const canSave = !busy && (!!key || current || (kind === "openai" && isLocal(baseUrl)));
  return (
    <section className="set-section glass">
      <h3>ИИ</h3>
      <Row
        title={st?.enabled ? `Включён: ${AI_KINDS.find((k) => k.value === st.kind)?.label ?? ""}${st.keyHint ? `, ключ ${st.keyHint}` : ""}` : "Выключен — ручной режим"}
        hint={st ? `Потрачено в этом месяце ~$${st.spentUsd.toFixed(2)} из $${st.budgetUsd} · модель ${st.model || "—"}` : ""}
      >
        {st?.enabled && (
          <button className="btn" onClick={() => void api.ai.clearKey().then(load)}>
            Выключить
          </button>
        )}
      </Row>
      <Segmented size="sm" value={kind} options={AI_KINDS} onChange={(v) => setKind(v)} />

      {kind === "gemini" && (
        <ol className="ai-steps">
          <li>
            Открой <b>Google AI Studio</b> под своим Google-аккаунтом.{" "}
            <button className="btn sm-link" onClick={() => window.open("https://aistudio.google.com/apikey")}>
              Открыть AI Studio
            </button>
          </li>
          <li>
            Нажми <b>Create API key</b> и скопируй ключ — он начинается с <code>AQ.</code> (у старых ключей — <code>AIza</code>). Карта не нужна.
          </li>
          <li>Вставь его ниже и нажми «Подключить».</li>
        </ol>
      )}
      {kind === "anthropic" && (
        <div className="set-hint">
          Ключ — на console.anthropic.com: войди, пополни баланс, API Keys → Create Key.{" "}
          <button className="btn sm-link" onClick={() => window.open("https://console.anthropic.com/settings/keys")}>
            Открыть сайт Anthropic
          </button>
        </div>
      )}
      {kind === "openai" && (
        <div className="ai-openai">
          <div className="chips">
            {st?.presets.map((p) => (
              <button
                key={p.id}
                className={`chip-btn ${baseUrl.startsWith(p.baseUrl) ? "on" : ""}`}
                title={p.hint}
                onClick={() => {
                  setBaseUrl(p.baseUrl);
                  setModel(p.model);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          {preset && <div className="set-hint">{preset.hint}</div>}
          <input className="input mono" placeholder="Адрес API, например https://openrouter.ai/api/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          {/googleapis\.com/.test(baseUrl) && (
            <div className="set-hint">Это Gemini — при «Подключить» Камадо сам переключится на вкладку Gemini: так работают и новые ключи AQ., и бесплатный тариф.</div>
          )}
          {!/openrouter\.ai/.test(baseUrl) && !isLocal(baseUrl) && baseUrl && (
            <Row title="Бесплатная модель" hint="Включи, только если сервис правда ничего не берёт (например модели с пометкой :free). Тогда цену указывать не нужно.">
              <Toggle value={free} onChange={setFree} />
            </Row>
          )}
          {!free && !/openrouter\.ai/.test(baseUrl) && !isLocal(baseUrl) && baseUrl && (
            <div className="ai-price">
              <span>Цена модели, $ за 1 млн токенов:</span>
              <input className="input sm" type="number" min={0} step={0.01} value={price.input} onChange={(e) => setPrice({ ...price, input: Number(e.target.value) })} />
              <span>вход</span>
              <input className="input sm" type="number" min={0} step={0.01} value={price.output} onChange={(e) => setPrice({ ...price, output: Number(e.target.value) })} />
              <span>выход</span>
            </div>
          )}
        </div>
      )}

      <input
        className="input mono"
        placeholder={kind === "openai" ? "Название модели (например deepseek-chat)" : "Модель — можно не трогать, по умолчанию самая подходящая"}
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />
      <div className="key-row">
        <KeyRound size={17} />
        <input
          className="input"
          type="password"
          placeholder={kind === "gemini" ? "AQ.… или AIza…" : kind === "anthropic" ? "sk-ant-…" : "Ключ сервиса (для своей модели на компьютере не нужен)"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSave && void save()}
        />
        <button className="btn primary" disabled={!canSave} onClick={() => void save()}>
          {busy ? "Проверяю…" : current && !key ? "Сохранить" : "Подключить"}
        </button>
      </div>
      <div className="set-hint">
        Ключ проверяется бесплатным запросом и хранится только у тебя на компьютере, в зашифрованном виде.
        {kind === "gemini" &&
          " На бесплатном тарифе Google может использовать запросы для улучшения своих моделей, и есть дневной лимит — когда он кончится, Камадо скажет и перейдёт в ручной режим до завтра."}
      </div>
    </section>
  );
}

function DiscordSection({ s }: { s: AppSettings }) {
  const [st, setSt] = useState<string>("off");
  const [id, setId] = useState(s.discord.clientId);
  useEffect(() => {
    const load = () => void api.discord.status().then(setSt);
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);
  const label: Record<string, string> = {
    off: "Выключено",
    connecting: "Подключаюсь к Discord…",
    on: "✓ Работает — в Discord видно, что ты слушаешь",
    "no-discord": "Discord не запущен — подключусь, как только откроешь его",
  };
  return (
    <section className="set-section glass">
      <h3>Discord</h3>
      <Row title="Показывать, что я слушаю" hint={label[st] ?? ""}>
        <Toggle value={s.discord.enabled} onChange={(v) => updateSettings({ discord: { ...s.discord, enabled: v } })} />
      </Row>
      {s.discord.enabled && (
        <>
          <ol className="steps">
            <li>
              Открой Discord Developer Portal, нажми <b>New Application</b>, назови «Camado».
              <button className="btn" onClick={() => window.open("https://discord.com/developers/applications", "_blank")}>
                Открыть портал Discord
              </button>
            </li>
            <li>
              Скопируй <b>Application ID</b> и вставь сюда. (По желанию: во вкладке Rich Presence → Art Assets загрузи иконку с именем{" "}
              <code>camado</code>.)
              <div className="key-row">
                <input
                  className="input"
                  placeholder="Application ID, например 1234567890123456789"
                  value={id}
                  onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
                />
                <button
                  className="btn primary"
                  disabled={!id || id === s.discord.clientId}
                  onClick={() => updateSettings({ discord: { ...s.discord, clientId: id } })}
                >
                  Сохранить
                </button>
              </div>
            </li>
          </ol>
        </>
      )}
    </section>
  );
}

function BotSection({ s }: { s: AppSettings }) {
  const [st, setSt] = useState<BotStatus | null>(null);
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () => void api.bot.status().then(setSt);
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (st?.configured && !st.paired) void api.bot.pairingCode().then(setCode);
  }, [st?.configured, st?.paired]);

  const connect = async () => {
    setBusy(true);
    const r = await api.bot.connect(token);
    setBusy(false);
    if (r.ok) {
      setToken("");
      toast(`Бот @${r.username} подключён`, "ok");
      setSt(await api.bot.status());
    } else toast(r.error ?? "Не получилось", "warn");
  };

  const open = (url: string) => window.open(url, "_blank");

  return (
    <section className="set-section glass">
      <h3>Telegram-бот</h3>
      <div className="set-hint" style={{ marginBottom: 14 }}>
        Пиши Камадо с телефона и получай напоминания в Telegram. Необязательно — приложение работает и без бота.
      </div>

      {!st?.configured && (
        <ol className="steps">
          <li>
            <b>Создай бота.</b> Открой @BotFather, нажми «Start», отправь <code>/newbot</code> и придумай имя — например «Мой Камадо».
            <button className="btn" onClick={() => open("https://t.me/BotFather")}>
              Открыть @BotFather
            </button>
          </li>
          <li>
            <b>Вставь сюда токен</b>, который пришлёт BotFather (длинная строка вида <code>123456789:AAF…</code>).
            <div className="key-row">
              <input
                className="input"
                placeholder="123456789:AAF…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void connect()}
              />
              <button className="btn primary" disabled={!token || busy} onClick={() => void connect()}>
                {busy ? "Проверяю…" : "Подключить"}
              </button>
            </div>
          </li>
        </ol>
      )}

      {st?.configured && !st.paired && (
        <div className="pairing">
          <div>
            <b>Последний шаг:</b> открой своего бота
            {st.username ? ` @${st.username}` : ""} и отправь ему этот код — так он запомнит, что ты хозяин.
          </div>
          <div className="pair-code">{code}</div>
          {st.username && (
            <button className="btn primary" onClick={() => open(`https://t.me/${st.username}`)}>
              Открыть @{st.username}
            </button>
          )}
        </div>
      )}

      {st?.configured && st.paired && (
        <Row
          title={st.running ? `✓ Бот @${st.username ?? ""} работает и привязан к тебе` : "Бот привязан, но сейчас остановлен"}
          hint={st.error ?? "Напоминания приходят и сюда, и в Telegram."}
        >
          <Toggle value={s.runBot} onChange={(v) => updateSettings({ runBot: v })} />
        </Row>
      )}
      {st?.configured && !st.paired && st.error && <div className="set-hint warn-text">{st.error}</div>}

      <Row title="Закрытие окна — в трей" hint="Напоминания и бот продолжат работать, пока Камадо в трее.">
        <Toggle value={s.closeToTray} onChange={(v) => updateSettings({ closeToTray: v })} />
      </Row>
      <Row title="Таймер и дедлайн в меню-баре" hint="Рядом с часами: «⏱ 18:42» во время фокуса или «⚑ Матан · 5 ч», если что-то горит в ближайшие сутки.">
        <Toggle value={s.menubar} onChange={(v) => updateSettings({ menubar: v })} />
      </Row>
      {st?.configured && (
        <button className="link-btn danger-link" onClick={() => void api.bot.disconnect().then(() => api.bot.status().then(setSt))}>
          Отключить бота
        </button>
      )}
    </section>
  );
}

/** Заставка-визуализатор: сцены, через сколько включаться, что показывать. */
function ScreensaverSection({ s }: { s: AppSettings }) {
  const c = s.screensaver;
  const set = (patch: Partial<AppSettings["screensaver"]>) => updateSettings({ screensaver: { ...c, ...patch } });
  return (
    <section className="set-section glass">
      <h3>Заставка</h3>
      <div className="set-hint">Играет музыка, а ты ничего не трогаешь — экран превращается в живую сцену в цветах песни, с текстом. Любое движение — выход.</div>
      <Row title="Включать заставку">
        <Toggle value={c.enabled} onChange={(v) => set({ enabled: v })} />
      </Row>
      <Row title="Через сколько" hint="Считается, только когда окно Камадо открыто и в фокусе — поверх других программ не вылезет.">
        <Segmented
          size="sm"
          value={c.delay}
          onChange={(v) => set({ delay: v })}
          options={[1, 2, 5, 10].map((m) => ({ value: m, label: `${m} мин` }))}
        />
      </Row>
      <div className="ss-scenes">
        <button className={`ss-scene-btn ${c.scene === "random" ? "on" : ""}`} onClick={() => set({ scene: "random" })}>
          <Shuffle size={18} />
          <span>Случайная на каждый трек</span>
        </button>
        {SCENES.map((x) => (
          <div key={x.id} className={`ss-scene-btn ${c.scene === x.id ? "on" : ""}`}>
            <button className="ss-pick" onClick={() => set({ scene: x.id })}>
              <span>{x.name}</span>
            </button>
            <button className="icon-btn" title="Посмотреть" onClick={() => startScreensaver(x.id)}>
              <Play size={14} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
      <Row
        title="Своя картинка"
        hint={c.image ? `Сейчас: ${c.imageName ?? "картинка"}. Сцена «Своя картинка» покажет её во весь экран.` : "Любое фото или арт. Пока не выбрана — сцена «Своя картинка» показывает обложку песни."}
      >
        <div className="row-actions">
          <button
            className="btn"
            onClick={async () => {
              const r = await api.screensaver.pickImage();
              if (r) set({ image: r.url, imageName: r.name, scene: "picture" });
            }}
          >
            <ImageIcon size={14} /> {c.image ? "Другая" : "Выбрать"}
          </button>
          {c.image && (
            <button className="btn sm-link" onClick={() => set({ image: undefined, imageName: undefined })}>
              Убрать
            </button>
          )}
        </div>
      </Row>
      <Row title="Поверх картинки">
        <Segmented
          size="sm"
          value={c.imageFx}
          onChange={(v) => set({ imageFx: v })}
          options={[
            { value: "none", label: "Ничего" },
            { value: "dust", label: "Пылинки" },
            { value: "rain", label: "Капли" },
          ]}
        />
      </Row>
      <Row title="Текст песни на заставке">
        <Toggle value={c.lyrics} onChange={(v) => set({ lyrics: v })} />
      </Row>
      <Row title="Часы">
        <Toggle value={c.clock} onChange={(v) => set({ clock: v })} />
      </Row>
      <Row title="На весь экран">
        <Toggle value={c.fullscreen} onChange={(v) => set({ fullscreen: v })} />
      </Row>
      <button className="btn" onClick={() => startScreensaver()}>
        <Sparkles size={16} /> Показать сейчас
      </button>
    </section>
  );
}

/** Звук напоминаний: 10 своих звуков, свой файл, нарастание громкости. */
function AlarmSection({ s }: { s: AppSettings }) {
  const a = s.alarm;
  const [preview, setPreview] = useState<string | null>(null);
  const set = (patch: Partial<AppSettings["alarm"]>) => updateSettings({ alarm: { ...a, ...patch } });
  useEffect(() => () => stopAlarm(), []);
  const listen = (id: string) => {
    if (preview === id && alarmPlaying()) {
      stopAlarm();
      setPreview(null);
      return;
    }
    set({ sound: id });
    setPreview(id);
    startAlarm({
      sound: id,
      ramp: 0,
      volume: a.volume,
      customUrl: a.customUrl,
      once: true,
    });
    setTimeout(() => setPreview((p) => (p === id ? null : p)), 3500);
  };
  const pickCustom = async () => {
    const r = await api.alarm.pickSound();
    if (!r) return;
    updateSettings({
      alarm: { ...a, sound: "custom", customName: r.name, customUrl: r.url },
    });
    toast(`Свой звук: ${r.name}`, "ok");
  };
  return (
    <section className="set-section glass">
      <h3>Напоминания</h3>
      <div className="set-hint">Звенит, когда подходит срок задания и для твоих напоминаний на «Сегодня». Нажми звук, чтобы послушать.</div>
      <div className="alarm-grid">
        {ALARM_SOUNDS.map((x) => (
          <button key={x.id} className={`alarm-opt ${a.sound === x.id ? "on" : ""}`} onClick={() => listen(x.id)}>
            <span className="ao-play">
              {preview === x.id ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            </span>
            <span className="ao-name">{x.name}</span>
            <span className="ao-hint">{x.hint}</span>
          </button>
        ))}
        <button
          className={`alarm-opt custom ${a.sound === "custom" ? "on" : ""}`}
          onClick={() => (a.customUrl ? listen("custom") : void pickCustom())}
        >
          <span className="ao-play">
            <Music4 size={14} />
          </span>
          <span className="ao-name">{a.customName ? "Свой звук" : "Свой звук…"}</span>
          <span className="ao-hint">{a.customName || "выбрать файл"}</span>
        </button>
      </div>
      {a.customUrl && (
        <button className="btn sm-link" onClick={() => void pickCustom()}>
          Выбрать другой файл
        </button>
      )}
      <Row
        title="Громкость нарастает"
        hint={a.ramp ? `Начинает еле слышно и за ${a.ramp} с становится громким — не пугает` : "Сразу на полную"}
      >
        <Segmented
          size="sm"
          value={a.ramp}
          onChange={(v) => set({ ramp: v })}
          options={[
            { value: 0, label: "сразу" },
            { value: 5, label: "5 с" },
            { value: 10, label: "10 с" },
            { value: 20, label: "20 с" },
            { value: 30, label: "30 с" },
          ]}
        />
      </Row>
      <Row title="Громкость напоминаний">
        <Slider value={a.volume} step={0.01} onChange={(v) => set({ volume: v })} label="Громкость напоминаний" />
      </Row>
      <button className="btn" onClick={() => ring("⏰ Проверка: так будет звучать напоминание")}>
        <AlarmClock size={16} /> Проверить, как звенит
      </button>
    </section>
  );
}

export function Settings() {
  const s = useStore(app, (x) => x.settings);
  const info = useStore(app, (x) => x.info);
  const folders = useStore(player, (x) => x.library.folders);
  const shake = (patch: Partial<AppSettings["shake"]>) => updateSettings({ shake: { ...s.shake, ...patch } });

  return (
    <div className="screen settings">
      <header className="screen-head">
        <h1 className="display">Настройки</h1>
      </header>

      <UpdatesSection />

      <section className="set-section glass">
        <h3>Внешний вид</h3>
        <PaletteGrid s={s} />
        <Row title="Цвета из обложки" hint="Фон, пластинка и волны перекрашиваются под каждый трек.">
          <Toggle value={s.coverColors} onChange={(v) => updateSettings({ coverColors: v })} />
        </Row>
        <Row title="Фон" hint="«Сияние» дышит в такт музыке.">
          <Segmented
            size="sm"
            value={s.background}
            onChange={(v) => updateSettings({ background: v })}
            options={[
              { value: "aurora", label: "Сияние" },
              { value: "calm", label: "Спокойный" },
              { value: "static", label: "Статичный" },
            ]}
          />
        </Row>
        <Row title="Размытие под панелями" hint="Красиво, но нагружает видеокарту. Включай, если компьютер мощный.">
          <Toggle value={s.blur} onChange={(v) => updateSettings({ blur: v })} />
        </Row>
      </section>

      <section className="set-section glass">
        <h3>Плавность</h3>
        <Row
          title="Частота кадров"
          hint={`Твой монитор: ${info.refreshRate} Гц. «Авто» — подстраивается под монитор (60, 144, 165…). Сейчас: `}
        >
          <Segmented
            size="sm"
            value={s.fpsCap}
            onChange={(v) => updateSettings({ fpsCap: v })}
            options={[
              { value: 0 as const, label: "Авто" },
              { value: 60 as const, label: "60" },
              { value: 144 as const, label: "144" },
              { value: 240 as const, label: "240" },
            ]}
          />
        </Row>
        <Row title="Показывать FPS" hint="Счётчик в углу окна.">
          <span className="row-inline">
            <LiveFps />
            <Toggle value={s.showFps} onChange={(v) => updateSettings({ showFps: v })} />
          </span>
        </Row>
      </section>

      <section className="set-section glass">
        <h3>Музыка</h3>
        <Row title="Визуализатор">
          <Segmented
            size="sm"
            value={s.visualizer}
            onChange={(v) => updateSettings({ visualizer: v })}
            options={[
              { value: "wave", label: "Волны" },
              { value: "bars", label: "Столбики" },
              { value: "ring", label: "Кольцо" },
              { value: "off", label: "Выкл" },
            ]}
          />
        </Row>
        <Row title="Текст песни" hint="«Взрыв» — слова выпрыгивают по всему окну.">
          <Segmented
            size="sm"
            value={s.lyricsMode}
            onChange={(v) => updateSettings({ lyricsMode: v })}
            options={[
              { value: "flow", label: "Лента" },
              { value: "burst", label: "Взрыв" },
              { value: "line", label: "Строка" },
              { value: "off", label: "Выкл" },
            ]}
          />
        </Row>
        <div className="set-row eq-row">
          <div className="set-text">
            <div className="set-title">Эквалайзер</div>
            <div className="set-hint">Пресеты или свои ползунки. Двойной щелчок по ползунку — обратно в ноль. Есть и в плеере.</div>
          </div>
          <EqPanel />
        </div>
        <Row
          title="Выравнивать громкость песен"
          hint="Скачанные треки записаны по-разному. Камадо измеряет каждую песню: тихие подтягивает, громкие приглушает. Подстроить одну песню — кнопка с ползунками в плеере."
        >
          <Toggle value={s.autoLevel} onChange={setAutoLevel} />
        </Row>
        <Row
          title="Плавный переход между треками"
          hint={s.crossfade ? `${s.crossfade} с — песни перетекают одна в другую` : "Выключен — треки сменяются сразу"}
        >
          <Slider value={s.crossfade} min={0} max={12} step={1} onChange={(v) => updateSettings({ crossfade: v })} />
        </Row>
        <Row title="Звук" hint="Slowed + reverb — медленнее, ниже и с эхом. Nightcore — быстрее и выше.">
          <Segmented
            size="sm"
            value={s.soundMode}
            onChange={(v) => updateSettings({ soundMode: v })}
            options={[
              { value: "normal", label: "Обычный" },
              { value: "slowed", label: "Slowed + reverb" },
              { value: "nightcore", label: "Nightcore" },
            ]}
          />
        </Row>
        {s.soundMode !== "normal" && (
          <Row
            title={s.soundMode === "slowed" ? "Скорость slowed" : "Скорость nightcore"}
            hint="Можно менять и прямо в плеере, кнопкой режима звука."
          >
            {s.soundMode === "slowed" ? (
              <Slider value={s.slowedRate} min={0.7} max={0.95} step={0.01} onChange={(v) => updateSettings({ slowedRate: v })} />
            ) : (
              <Slider value={s.nightcoreRate} min={1.05} max={1.4} step={0.01} onChange={(v) => updateSettings({ nightcoreRate: v })} />
            )}
          </Row>
        )}
        <Row
          title="Подгонять текст по звуку сам"
          hint="Если текст в базе сделан под версию другой длины, ИИ послушает песню и сам расставит строки. Песня уходит в Gemini на анализ; нужен ключ ИИ. Вручную — кнопка с волной рядом с ⌖ в плеере."
        >
          <Toggle value={s.lyricsByEar} onChange={(v) => updateSettings({ lyricsByEar: v })} />
        </Row>
        <Row title="Размер текста">
          <Slider value={s.lyricsSize} min={0.7} max={1.4} step={0.05} onChange={(v) => updateSettings({ lyricsSize: v })} />
        </Row>

        <div className="folders">
          <div className="set-title">Папки с музыкой</div>
          <div className="set-hint">
            Камадо следит за ними: скачал трек в такую папку любым способом — через пару секунд он появится в библиотеке.
          </div>
          {folders.map((f) => (
            <div key={f} className="folder">
              <span>{f}</span>
              <button className="icon-btn danger" onClick={() => void api.library.removeFolder(f)}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button className="btn" onClick={() => void api.library.pickFolder()}>
            <FolderPlus size={16} /> Добавить папку
          </button>
        </div>
      </section>

      <ScreensaverSection s={s} />

      <AlarmSection s={s} />

      <section className="set-section glass">
        <h3>Тряска в такт</h3>
        <Row title="Включить тряску" hint="Экран вздрагивает на ударах баса.">
          <Toggle value={s.shake.enabled} onChange={(v) => shake({ enabled: v })} />
        </Row>
        <Row title="Сила">
          <Slider value={s.shake.intensity} onChange={(v) => shake({ intensity: v })} />
        </Row>
        <Row title="Чувствительность" hint="Выше — реагирует и на тихие удары.">
          <Slider value={s.shake.sensitivity} onChange={(v) => shake({ sensitivity: v })} />
        </Row>
        <Row title="Что трясти">
          <Segmented
            size="sm"
            value={s.shake.target}
            onChange={(v) => shake({ target: v })}
            options={[
              { value: "scene", label: "Всю сцену" },
              { value: "cover", label: "Обложку" },
              { value: "lyrics", label: "Текст" },
            ]}
          />
        </Row>
        <Row title="Поворот">
          <Toggle value={s.shake.rotation} onChange={(v) => shake({ rotation: v })} />
        </Row>
        <Row title="Пульс (приближение)">
          <Toggle value={s.shake.zoom} onChange={(v) => shake({ zoom: v })} />
        </Row>
      </section>

      <DiscordSection s={s} />
      <AiSection />
      <BotSection s={s} />

      <div className="about muted small">
        Камадо {info.version} · пояс {info.timeZone} · Ctrl+K — быстрые команды · Ctrl+Shift+Пробел — записать задание из любой программы · пробел — пауза
      </div>
    </div>
  );
}
