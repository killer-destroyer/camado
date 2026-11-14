// 1.2: деньги, сон и энергия, расписание пар и «перед парой», фото → заметка, экзаменатор, свои задачи,
// резервная копия базы и учёт отвлечений во время фокуса. Всё хранится у пользователя (база и папка программы).
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, renameSync, rmSync } from "node:fs";
import { copyFile, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { BrowserWindow, Dialog } from "electron";
import type { CamadoCore } from "../../src/core.js";
import { cleanClass, customProblem, examinerTurn, noteFromPhotos, parseSchedule, type ClassSlot } from "../../src/camado/extras.js";
import type { Attachment, HistoryMessage } from "../../src/llm/types.js";
import { sameSubject } from "../../src/subjects.js";
import {
  classesOn,
  classesToRemind,
  defaultOddMonday,
  isoDate,
  nextClass,
  type EnergyEntry,
  type MoneyEntry,
  type MoneyState,
  type Peak,
  type ScheduleState,
  type Subscription,
} from "../shared/life.js";
import { detectTools, runCode } from "./runner.js";
import { sameOutput } from "../shared/courses/format.js";

type Handler = (...args: never[]) => unknown;
type WithAi = <T extends object>(fn: () => Promise<T | { error: string }>) => Promise<T | { error: string }>;

const MONEY_KV = "money";
const ENERGY_KV = "energy";
const SCHEDULE_KV = "schedule";
const CUSTOM_KV = "grow.custom";
const BACKUP_KV = "backup";
const DISTRACT_KV = "focus.distractions";

export interface CustomProblem {
  id: string;
  title: string;
  text: string;
  topic: string;
  level: 1 | 2 | 3;
  tests: { input: string; output: string }[];
  solution: string;
  /** Выходы тестов проверены запуском эталона на компьютере. */
  verified: boolean;
  addedAt: string;
}

export interface BackupState {
  folder?: string;
  last?: string;
  error?: string;
}

export interface FocusApp {
  app: string;
  title?: string;
  seconds: number;
  switches: number;
}
export interface DistractionLog {
  at: string;
  minutes: number;
  apps: FocusApp[];
}

const img = (x: unknown): Attachment | undefined => {
  const a = x as Attachment;
  return a && typeof a.data === "string" && /^image\/(jpeg|png|webp|heic)$/.test(a.mime) && a.data.length < 12 * 1024 * 1024 ? { mime: a.mime, data: a.data } : undefined;
};

export function lifeHandlers(deps: {
  core: CamadoCore;
  withAi: WithAi;
  dataDir: string;
  dbPath: () => string;
  dialog: Dialog;
  win: () => BrowserWindow | undefined;
  notify: (title: string, body: string) => void;
  send: (channel: string, payload?: unknown) => void;
}): { handlers: Record<string, Handler>; start: () => void; stop: () => void } {
  const { core, withAi } = deps;
  const { store } = core;
  const load = <T>(key: string, fallback: T): T => {
    try {
      const raw = store.getKv(key);
      return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
    } catch {
      return fallback;
    }
  };
  const loadArr = <T>(key: string): T[] => {
    try {
      const v = JSON.parse(store.getKv(key) ?? "[]") as unknown;
      return Array.isArray(v) ? (v as T[]) : [];
    } catch {
      return [];
    }
  };
  const save = (key: string, v: unknown) => store.setKv(key, JSON.stringify(v));
  const changed = (what: string) => deps.send("life-changed", what);

  // ---------- деньги ----------
  const money = (): MoneyState => load<MoneyState>(MONEY_KV, { entries: [], subs: [] });
  const num = (n: unknown, max = 1e8) => (Number.isFinite(Number(n)) ? Math.max(-max, Math.min(max, Math.round(Number(n) * 100) / 100)) : 0);
  const saveMoney = (m: MoneyState) => {
    m.entries = m.entries.slice(-3000);
    save(MONEY_KV, m);
    changed("money");
    return m;
  };

  // ---------- сон и энергия ----------
  const energy = () => load<{ log: EnergyEntry[]; peak: Peak }>(ENERGY_KV, { log: [], peak: "day" });

  // ---------- расписание ----------
  const schedule = (): ScheduleState => load<ScheduleState>(SCHEDULE_KV, { classes: [], oddMonday: defaultOddMonday(new Date()), remindMin: 15 });
  const saveSchedule = (s: ScheduleState) => {
    save(SCHEDULE_KV, s);
    changed("schedule");
    return s;
  };

  /** «Перед парой»: тема по программе, сроки по предмету, сколько карточек повторить. */
  const beforeClass = (subject: string, date: Date) => {
    const day = isoDate(date);
    const progs = loadArr<{ subject: string; topics: { n: number; title: string; date?: string; done?: boolean; reading?: string }[] }>("syllabus.programmes");
    const prog = progs.find((p) => sameSubject(p.subject, subject));
    const topic = prog
      ? (prog.topics.find((t) => t.date === day) ?? prog.topics.find((t) => !t.done && (!t.date || t.date >= day)))
      : undefined;
    const tasks = store
      .listTasks()
      .filter((t) => t.subject && sameSubject(t.subject, subject) && t.dueAt)
      .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1))
      .slice(0, 3)
      .map((t) => ({ title: t.title, dueAt: t.dueAt! }));
    const cards = store.listCards({ dueBefore: new Date() }).filter((c) => c.subject && sameSubject(c.subject, subject)).length;
    return { topic: topic ? { title: topic.title, reading: topic.reading } : undefined, tasks, cards };
  };

  let remindTimer: NodeJS.Timeout | undefined;
  const reminded = new Set<string>();
  const tickSchedule = () => {
    const s = schedule();
    if (!s.classes.length) return;
    const now = new Date();
    for (const c of classesToRemind(now, s)) {
      const key = `${isoDate(now)}|${c.start}|${c.subject}`;
      if (reminded.has(key)) continue;
      reminded.add(key);
      const info = beforeClass(c.subject, now);
      const lines = [
        `${c.start}${c.room ? ` · ауд. ${c.room}` : ""}${c.kind ? ` · ${c.kind}` : ""}`,
        info.topic ? `Тема: ${info.topic.title}` : "",
        info.tasks[0] ? `Срок: ${info.tasks[0].title}` : "",
        info.cards ? `Повторить карточек: ${info.cards}` : "",
      ].filter(Boolean);
      deps.notify(`Через ${s.remindMin} мин: ${c.subject}`, lines.join("\n"));
      deps.send("before-class", { ...c, startAt: c.startAt.toISOString(), endAt: c.endAt.toISOString(), info });
    }
  };

  // ---------- резервная копия ----------
  const backup = () => load<BackupState>(BACKUP_KV, {});
  const runBackup = async (): Promise<BackupState> => {
    const b = backup();
    if (!b.folder) return b;
    try {
      await mkdir(b.folder, { recursive: true });
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const dir = join(b.folder, `Камадо ${stamp}`);
      await mkdir(dir, { recursive: true });
      const tmp = join(dir, "camado.db.part");
      await rm(tmp, { force: true });
      store.backupTo(tmp);
      await rename(tmp, join(dir, "camado.db"));
      // храним 14 последних копий
      const all = (await readdir(b.folder)).filter((n) => n.startsWith("Камадо ")).sort();
      for (const old of all.slice(0, Math.max(0, all.length - 14))) await rm(join(b.folder, old), { recursive: true, force: true });
      const next = { ...b, last: new Date().toISOString(), error: undefined };
      save(BACKUP_KV, next);
      changed("backup");
      return next;
    } catch (e) {
      const next = { ...b, error: e instanceof Error ? e.message : String(e) };
      save(BACKUP_KV, next);
      changed("backup");
      return next;
    }
  };
  let backupTimer: NodeJS.Timeout | undefined;
  const tickBackup = () => {
    const b = backup();
    if (!b.folder) return;
    const last = b.last ? Date.parse(b.last) : 0;
    const h = new Date().getHours();
    // раз в сутки: ночью (3–5) или при запуске, если прошлой копии больше суток
    if (Date.now() - last > 26 * 3600e3 || (Date.now() - last > 12 * 3600e3 && h >= 3 && h < 5)) void runBackup();
  };

  /** Папки облаков, которые часто стоят на компьютере (Google Диск, Яндекс Диск, iCloud, OneDrive). */
  const cloudFolders = async (): Promise<string[]> => {
    const home = homedir();
    const cands = [join(home, "Yandex.Disk"), join(home, "YandexDisk"), join(home, "Яндекс.Диск"), join(home, "Google Drive"), join(home, "OneDrive"), join(home, "iCloud Drive")];
    const cloud = join(home, "Library", "CloudStorage");
    for (const n of await readdir(cloud).catch(() => [] as string[])) cands.push(join(cloud, n));
    const mobile = join(home, "Library", "Mobile Documents", "com~apple~CloudDocs");
    cands.push(mobile);
    const out: string[] = [];
    for (const c of cands) if ((await stat(c).catch(() => undefined))?.isDirectory()) out.push(c);
    return out;
  };

  // ---------- отвлечения во время фокуса ----------
  let watch: { started: number; apps: Map<string, FocusApp>; last?: string; timer?: NodeJS.Timeout; ps?: ChildProcess } | undefined;
  const ownNames = /^(camado|камадо|electron)$/i;
  const onFront = (app: string, title?: string) => {
    if (!watch || !app) return;
    const key = app.trim();
    const cur = watch.apps.get(key) ?? { app: key, title: undefined, seconds: 0, switches: 0 };
    if (title && !ownNames.test(key)) cur.title = title.slice(0, 120);
    cur.seconds += 5;
    if (watch.last !== key) cur.switches++;
    watch.last = key;
    watch.apps.set(key, cur);
  };
  const exec1 = (cmd: string, args: string[]) =>
    new Promise<string>((res) => execFile(cmd, args, { timeout: 4000, windowsHide: true }, (err, out) => res(err ? "" : String(out).trim())));
  const BROWSERS: Record<string, string> = {
    "Google Chrome": 'tell application "Google Chrome" to get title of active tab of front window',
    Arc: 'tell application "Arc" to get title of active tab of front window',
    "Yandex": 'tell application "Yandex" to get title of active tab of front window',
    Safari: 'tell application "Safari" to get name of front document',
  };
  const pollMac = async () => {
    const app = await exec1("/usr/bin/osascript", ["-e", 'tell application "System Events" to get name of first application process whose frontmost is true']);
    const script = BROWSERS[app];
    const title = script ? await exec1("/usr/bin/osascript", ["-e", script]) : undefined;
    onFront(app, title);
  };
  const startWatch = () => {
    if (watch) return;
    watch = { started: Date.now(), apps: new Map() };
    if (process.platform === "darwin") watch.timer = setInterval(() => void pollMac(), 5000);
    else if (process.platform === "win32") {
      // один процесс PowerShell на всю сессию: раз в 5 с печатает программу и заголовок окна спереди
      const ps = `Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p); }
"@
[Console]::OutputEncoding = [Text.Encoding]::UTF8
while ($true) { $h=[W]::GetForegroundWindow(); $sb=New-Object Text.StringBuilder 300; [void][W]::GetWindowText($h,$sb,300); $p=0; [void][W]::GetWindowThreadProcessId($h,[ref]$p);
$n=(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; Write-Output ("$n|" + $sb.ToString()); Start-Sleep -Seconds 5 }`;
      const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { windowsHide: true });
      let buf = "";
      child.stdout.on("data", (d: Buffer) => {
        buf += d.toString("utf8");
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          const [app, ...rest] = line.split("|");
          if (app) onFront(app, rest.join("|"));
        }
      });
      child.on("error", () => undefined);
      watch.ps = child;
    } else {
      watch.timer = setInterval(async () => {
        const title = await exec1("xdotool", ["getactivewindow", "getwindowname"]);
        if (title) onFront(title.split(" - ").pop() ?? title, title);
      }, 5000);
    }
  };
  const stopWatch = (): DistractionLog | undefined => {
    if (!watch) return undefined;
    if (watch.timer) clearInterval(watch.timer);
    watch.ps?.kill();
    const minutes = Math.round((Date.now() - watch.started) / 60e3);
    const apps = [...watch.apps.values()].filter((a) => !ownNames.test(a.app)).sort((a, b) => b.seconds - a.seconds);
    watch = undefined;
    if (minutes < 1) return undefined;
    const log: DistractionLog = { at: new Date().toISOString(), minutes, apps };
    save(DISTRACT_KV, [...loadArr<DistractionLog>(DISTRACT_KV), log].slice(-60));
    return log;
  };

  // ---------- свои задачи ----------
  const customList = () => loadArr<CustomProblem>(CUSTOM_KV);

  const handlers: Record<string, Handler> = {
    // деньги
    "money.get": () => money(),
    "money.add": (amount: number, title: string, at?: string) => {
      const m = money();
      const e: MoneyEntry = { id: randomUUID(), at: at && !Number.isNaN(Date.parse(at)) ? at : new Date().toISOString(), amount: num(amount), title: String(title ?? "").trim().slice(0, 60) || "Без названия" };
      if (!e.amount) return m;
      m.entries.push(e);
      return saveMoney(m);
    },
    "money.remove": (id: string) => {
      const m = money();
      m.entries = m.entries.filter((e) => e.id !== id);
      return saveMoney(m);
    },
    "money.setIncome": (income: MoneyState["income"] | null) => {
      const m = money();
      m.income = income && num(income.amount) > 0 ? { amount: num(income.amount), day: Math.max(1, Math.min(31, Math.round(Number(income.day)) || 1)), name: String(income.name || "Стипендия").slice(0, 40) } : undefined;
      return saveMoney(m);
    },
    "money.setBalance": (amount: number | null) => {
      const m = money();
      m.balance = amount === null ? undefined : { amount: num(amount), at: new Date().toISOString() };
      return saveMoney(m);
    },
    "money.saveSub": (sub: Partial<Subscription>) => {
      const m = money();
      const s: Subscription = { id: sub.id || randomUUID(), name: String(sub.name ?? "").trim().slice(0, 40) || "Подписка", amount: Math.abs(num(sub.amount)), day: Math.max(1, Math.min(31, Math.round(Number(sub.day)) || 1)) };
      m.subs = [...m.subs.filter((x) => x.id !== s.id), s];
      return saveMoney(m);
    },
    "money.removeSub": (id: string) => {
      const m = money();
      m.subs = m.subs.filter((x) => x.id !== id);
      return saveMoney(m);
    },

    // сон и энергия
    "energy.get": () => energy(),
    "energy.check": (e: EnergyEntry) => {
      const st = energy();
      const entry: EnergyEntry = { date: /^\d{4}-\d{2}-\d{2}$/.test(e?.date) ? e.date : isoDate(new Date()), sleep: Math.max(0, Math.min(16, num(e?.sleep))), energy: Math.max(1, Math.min(5, Math.round(Number(e?.energy)) || 3)) };
      st.log = [...st.log.filter((x) => x.date !== entry.date), entry].slice(-120);
      save(ENERGY_KV, st);
      changed("energy");
      return st;
    },
    "energy.setPeak": (peak: Peak) => {
      const st = energy();
      if (peak === "morning" || peak === "day" || peak === "evening") st.peak = peak;
      save(ENERGY_KV, st);
      changed("energy");
      return st;
    },

    // расписание
    "schedule.get": () => schedule(),
    "schedule.save": (patch: Partial<ScheduleState>) => {
      const s = schedule();
      if (Array.isArray(patch.classes)) s.classes = patch.classes.map((c) => cleanClass(c as ClassSlot)).filter((c): c is ClassSlot => !!c).slice(0, 100);
      if (typeof patch.oddMonday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.oddMonday)) s.oddMonday = patch.oddMonday;
      if (Number.isFinite(patch.remindMin)) s.remindMin = Math.max(0, Math.min(120, Math.round(patch.remindMin!)));
      return saveSchedule(s);
    },
    "schedule.import": (input: { text?: string; images?: Attachment[]; replace?: boolean }) =>
      withAi(async () => {
        const images = (input?.images ?? []).map(img).filter((x): x is Attachment => !!x);
        const text = typeof input?.text === "string" ? input.text.slice(0, 20000) : undefined;
        if (!images.length && !text?.trim()) return { error: "Пришли фото или текст расписания" };
        const classes = await parseSchedule(core.llm, { text, images });
        if (!classes.length) return { error: "Не нашёл пар — проверь, что это расписание" };
        const s = schedule();
        s.classes = input?.replace === false ? [...s.classes, ...classes].slice(0, 100) : classes;
        saveSchedule(s);
        return { schedule: s, added: classes.length };
      }),
    "schedule.next": () => {
      const c = nextClass(new Date(), schedule());
      return c ? { ...c, startAt: c.startAt.toISOString(), endAt: c.endAt.toISOString(), info: beforeClass(c.subject, c.startAt) } : null;
    },
    "schedule.day": (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return [];
      return classesOn(d, schedule()).map((c) => ({ ...c, startAt: c.startAt.toISOString(), endAt: c.endAt.toISOString() }));
    },

    // фото конспекта → заметка
    "notes.fromPhotos": (images: Attachment[], subject?: string | null, hint?: string) =>
      withAi(async () => {
        const list = (Array.isArray(images) ? images : []).map(img).filter((x): x is Attachment => !!x).slice(0, 6);
        if (!list.length) return { error: "Нужно фото (JPG или PNG)" };
        const r = await noteFromPhotos(core.llm, store, list, { subject: subject || null, hint });
        if (!r) return { error: "Не получилось разобрать фото — попробуй сфоткать ровнее и ближе" };
        deps.send("data-changed");
        return r;
      }),

    // экзаменатор
    "exam.turn": (input: { examId: number; ticketId: number; history: HistoryMessage[]; answer?: string; audio?: Attachment }) =>
      withAi(async () => {
        const exam = store.listExams().find((e) => e.id === Number(input?.examId));
        const ticket = exam?.tickets.find((t) => t.id === Number(input?.ticketId));
        if (!exam || !ticket) return { error: "Билет не найден" };
        const audio = input.audio && typeof input.audio.data === "string" && /^audio\//.test(input.audio.mime) && input.audio.data.length < 10 * 1024 * 1024 ? input.audio : undefined;
        const history = (Array.isArray(input.history) ? input.history : []).slice(-20).map((h) => ({ role: h.role === "assistant" ? ("assistant" as const) : ("user" as const), content: String(h.content).slice(0, 8000) }));
        const r = await examinerTurn(core.llm, { exam: `${exam.title}${exam.subject ? ` (${exam.subject})` : ""}`, ticket: `№${ticket.num}. ${ticket.title}`, history, answer: input.answer, audio });
        if (r.grade) {
          store.setTicketStatus(ticket.id, r.grade >= 5 ? "known" : "review");
          deps.send("data-changed");
        }
        return r;
      }),

    // свои задачи для «Задачника»
    "grow.custom.list": () => customList(),
    "grow.custom.remove": (id: string) => {
      save(CUSTOM_KV, customList().filter((p) => p.id !== id));
      return customList();
    },
    "grow.custom.create": (input: { text?: string; images?: Attachment[] }) =>
      withAi(async () => {
        const images = (input?.images ?? []).map(img).filter((x): x is Attachment => !!x);
        const text = typeof input?.text === "string" ? input.text.slice(0, 12000) : undefined;
        if (!images.length && !text?.trim()) return { error: "Вставь условие или фото задачи" };
        const d = await customProblem(core.llm, { text, images });
        if (!d) return { error: "Не похоже на задачу по программированию" };
        // пустой ввод — это пустая строка (иначе обычный input() в Python падает на «конце файла»)
        d.tests = d.tests.map((t) => ({ ...t, input: t.input === "" ? "\n" : t.input }));
        // выходы тестов — запуском эталона на компьютере: модель могла ошибиться в ответах
        let tests = d.tests;
        let verified = false;
        const tools = await detectTools();
        if (tools.python) {
          const runs = await runCode(tools, "python", d.solution, d.tests.map((t) => t.input));
          if (Array.isArray(runs) && runs.every((r) => r.ok)) {
            const agree = runs.filter((r, i) => sameOutput(r.stdout, d.tests[i]!.output)).length;
            tests = d.tests.map((t, i) => ({ input: t.input, output: runs[i]!.stdout.trimEnd() }));
            verified = true;
            if (agree < runs.length) console.warn(`Своя задача: эталон и модель расходятся на ${runs.length - agree} тестах — беру вывод эталона`);
          }
        }
        const p: CustomProblem = { id: `my-${randomUUID().slice(0, 8)}`, title: d.title, text: d.text, topic: d.topic, level: d.level, tests, solution: d.solution, verified, addedAt: new Date().toISOString() };
        save(CUSTOM_KV, [...customList(), p].slice(-200));
        return { problem: p };
      }),

    // резервная копия
    "backup.get": async () => ({ ...backup(), clouds: await cloudFolders() }),
    "backup.setFolder": async (folder?: string | null) => {
      let f = folder ?? undefined;
      if (f === undefined) {
        const w = deps.win();
        const opts = { title: "Куда класть резервные копии (лучше — папка Google Диска или Яндекс Диска)", properties: ["openDirectory", "createDirectory"] as ("openDirectory" | "createDirectory")[] };
        const res = await (w ? deps.dialog.showOpenDialog(w, opts) : deps.dialog.showOpenDialog(opts));
        if (res.canceled || !res.filePaths[0]) return backup();
        f = res.filePaths[0];
      }
      const next: BackupState = folder === null ? {} : { ...backup(), folder: join(f, f.endsWith("Камадо — резервные копии") ? "" : "Камадо — резервные копии") };
      save(BACKUP_KV, next);
      if (next.folder) return runBackup();
      return next;
    },
    "backup.now": () => runBackup(),
    "backup.restore": async () => {
      const b = backup();
      const w = deps.win();
      const opts = { title: "Какую копию вернуть", defaultPath: b.folder, properties: ["openDirectory"] as "openDirectory"[] };
      const res = await (w ? deps.dialog.showOpenDialog(w, opts) : deps.dialog.showOpenDialog(opts));
      if (res.canceled || !res.filePaths[0]) return { cancelled: true as const };
      const src = join(res.filePaths[0], "camado.db");
      if (!existsSync(src)) return { error: "В этой папке нет копии Камадо (файла camado.db)" };
      const ok = await deps.dialog.showMessageBox(w!, {
        type: "warning",
        buttons: ["Вернуть копию", "Отмена"],
        defaultId: 1,
        cancelId: 1,
        message: "Вернуть эту копию?",
        detail: "Задания, заметки и настройки станут такими, как в копии. Текущие данные сохранятся рядом (camado.db.before-restore). Камадо перезапустится.",
      });
      if (ok.response !== 0) return { cancelled: true as const };
      await copyFile(src, `${deps.dbPath()}.restore`);
      return { ok: true as const };
    },

    // отвлечения во время фокуса
    "distract.start": () => {
      startWatch();
      return true;
    },
    "distract.stop": () => stopWatch() ?? null,
    "distract.list": () => loadArr<DistractionLog>(DISTRACT_KV),
  };

  return {
    handlers,
    start: () => {
      remindTimer = setInterval(tickSchedule, 20_000);
      backupTimer = setInterval(tickBackup, 10 * 60e3);
      setTimeout(tickBackup, 60e3);
    },
    stop: () => {
      if (remindTimer) clearInterval(remindTimer);
      if (backupTimer) clearInterval(backupTimer);
      stopWatch();
    },
  };
}

/** Перед открытием базы: если пользователь выбрал «вернуть копию» — подменить файл (старый остаётся рядом). */
export function applyPendingRestore(dbPath: string): boolean {
  const pending = `${dbPath}.restore`;
  if (!existsSync(pending)) return false;
  if (existsSync(dbPath)) renameSync(dbPath, `${dbPath}.before-restore`);
  for (const ext of ["-wal", "-shm"]) rmSync(`${dbPath}${ext}`, { force: true });
  renameSync(pending, dbPath);
  return true;
}
