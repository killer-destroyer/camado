import type { DB } from "./db.js";

export const TASK_KINDS = ["homework", "test", "exam", "lab", "other"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: number;
  subject: string | null;
  title: string;
  details: string | null;
  kind: TaskKind;
  dueAt: string | null; // ISO в UTC
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: number;
  name: string;
  teacher: string | null;
  info: string | null;
}

export interface MemoryFact {
  id: number;
  fact: string;
}

export interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  subject: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonLink {
  id: number;
  title: string;
  url: string;
  subject: string | null;
  /** Пометка: «пары по вт 10:00», «пароль 1234», «сдавать сюда». */
  note: string;
  pinned: boolean;
  openedAt: string | null;
  createdAt: string;
}

export interface Playlist {
  id: number;
  name: string;
  /** id треков по порядку. */
  trackIds: string[];
}

export interface PlayStat {
  trackId: string;
  title: string;
  artist: string;
  plays: number;
  seconds: number;
}

export interface FocusSession {
  id: number;
  subject: string | null;
  minutes: number;
  startedAt: string;
}

export interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
}

type Row = Record<string, unknown>;

const subjectKey = (name: string) => name.trim().toLocaleLowerCase("ru");

function toTask(r: Row): Task {
  return {
    id: Number(r.id),
    subject: (r.subject as string | null) ?? null,
    title: r.title as string,
    details: (r.details as string | null) ?? null,
    kind: r.kind as TaskKind,
    dueAt: (r.due_at as string | null) ?? null,
    status: r.status as TaskStatus,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toNote(r: Row): Note {
  return {
    id: Number(r.id),
    title: r.title as string,
    body: r.body as string,
    subject: (r.subject as string | null) ?? null,
    pinned: Number(r.pinned) === 1,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toLink(r: Row): LessonLink {
  return {
    id: Number(r.id),
    title: r.title as string,
    url: r.url as string,
    subject: (r.subject as string | null) ?? null,
    note: (r.note as string) ?? "",
    pinned: Number(r.pinned) === 1,
    openedAt: (r.opened_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

/** Только обычные веб-ссылки: никаких file:, javascript: и прочего. Без схемы — считаем https. */
export function cleanLinkUrl(raw: string): string {
  let u = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = `https://${u}`;
  const parsed = new URL(u);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Можно сохранять только ссылки http(s)");
  return parsed.toString();
}

/** Всё, что Камадо хранит о тебе, — в одном месте. */
export class Store {
  /** Вызывается после любого изменения данных (приложение на ПК обновляет экран). */
  onChange: () => void = () => {};

  constructor(
    private db: DB,
    private now: () => Date = () => new Date(),
  ) {}

  private changed(): void {
    try {
      this.onChange();
    } catch (err) {
      console.error("Ошибка в onChange:", err);
    }
  }

  private ts(): string {
    return this.now().toISOString();
  }

  // ---------- Задания (ДЗ, контрольные, экзамены) ----------

  addTask(input: {
    subject?: string | null;
    title: string;
    details?: string | null;
    kind?: TaskKind;
    dueAt?: string | null;
  }): Task {
    const ts = this.ts();
    const res = this.db
      .prepare(
        `INSERT INTO tasks (subject, title, details, kind, due_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'todo', ?, ?)`,
      )
      .run(
        input.subject ?? null,
        input.title,
        input.details ?? null,
        input.kind ?? "homework",
        input.dueAt ?? null,
        ts,
        ts,
      );
    this.changed();
    return this.getTask(Number(res.lastInsertRowid))!;
  }

  getTask(id: number): Task | undefined {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Row | undefined;
    return row ? toTask(row) : undefined;
  }

  /** Открытые задания: сначала с ближайшим сроком, без срока — в конце. */
  listTasks(opts: { includeClosed?: boolean } = {}): Task[] {
    const where = opts.includeClosed ? "" : "WHERE status IN ('todo', 'in_progress')";
    const rows = this.db
      .prepare(`SELECT * FROM tasks ${where} ORDER BY due_at IS NULL, due_at, id`)
      .all() as Row[];
    return rows.map(toTask);
  }

  updateTask(
    id: number,
    patch: Partial<Pick<Task, "subject" | "title" | "details" | "kind" | "dueAt" | "status">>,
  ): Task | undefined {
    const current = this.getTask(id);
    if (!current) return undefined;
    // Поля, которые не передали (undefined), остаются как были.
    const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const next: Task = { ...current, ...changes };
    this.db
      .prepare(
        `UPDATE tasks SET subject = ?, title = ?, details = ?, kind = ?, due_at = ?, status = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(next.subject, next.title, next.details, next.kind, next.dueAt, next.status, this.ts(), id);
    // Перенесли срок — пусть напоминания сработают заново.
    if (patch.dueAt !== undefined && patch.dueAt !== current.dueAt) {
      this.db.prepare("DELETE FROM reminders_sent WHERE task_id = ?").run(id);
    }
    this.changed();
    return this.getTask(id);
  }

  // ---------- Предметы ----------

  /** Создаёт предмет или дополняет существующий. Пустые поля не затирают старые. */
  saveSubject(input: { name: string; teacher?: string | null; info?: string | null }): Subject {
    const key = subjectKey(input.name);
    const existing = this.db
      .prepare("SELECT * FROM subjects WHERE name_key = ?")
      .get(key) as Row | undefined;
    if (existing) {
      this.db
        .prepare("UPDATE subjects SET teacher = ?, info = ?, updated_at = ? WHERE id = ?")
        .run(
          input.teacher ?? (existing.teacher as string | null),
          input.info ?? (existing.info as string | null),
          this.ts(),
          Number(existing.id),
        );
    } else {
      this.db
        .prepare("INSERT INTO subjects (name, name_key, teacher, info, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run(input.name.trim(), key, input.teacher ?? null, input.info ?? null, this.ts());
    }
    this.changed();
    const row = this.db.prepare("SELECT * FROM subjects WHERE name_key = ?").get(key) as Row;
    return {
      id: Number(row.id),
      name: row.name as string,
      teacher: (row.teacher as string | null) ?? null,
      info: (row.info as string | null) ?? null,
    };
  }

  listSubjects(): Subject[] {
    const rows = this.db.prepare("SELECT * FROM subjects ORDER BY name").all() as Row[];
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name as string,
      teacher: (r.teacher as string | null) ?? null,
      info: (r.info as string | null) ?? null,
    }));
  }

  // ---------- Память ----------

  remember(fact: string): MemoryFact {
    const res = this.db
      .prepare("INSERT INTO memory (fact, created_at) VALUES (?, ?)")
      .run(fact, this.ts());
    this.changed();
    return { id: Number(res.lastInsertRowid), fact };
  }

  forget(id: number): boolean {
    const ok = Number(this.db.prepare("DELETE FROM memory WHERE id = ?").run(id).changes) > 0;
    this.changed();
    return ok;
  }

  listMemory(): MemoryFact[] {
    const rows = this.db.prepare("SELECT id, fact FROM memory ORDER BY id").all() as Row[];
    return rows.map((r) => ({ id: Number(r.id), fact: r.fact as string }));
  }

  // ---------- История разговора ----------

  appendChat(role: ChatEntry["role"], content: string): void {
    this.db
      .prepare("INSERT INTO chat_log (role, content, created_at) VALUES (?, ?, ?)")
      .run(role, content, this.ts());
  }

  /** Последние сообщения, от старых к новым. */
  recentChat(limit: number): ChatEntry[] {
    const rows = this.db
      .prepare("SELECT role, content FROM chat_log ORDER BY id DESC LIMIT ?")
      .all(limit) as Row[];
    return rows.reverse().map((r) => ({ role: r.role as ChatEntry["role"], content: r.content as string }));
  }

  // ---------- Расходы на модели ----------

  recordUsage(u: UsageRecord): void {
    this.db
      .prepare(
        `INSERT INTO llm_usage (model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(u.model, u.inputTokens, u.outputTokens, u.cacheReadTokens, u.cacheWriteTokens, u.costUsd, this.ts());
  }

  spentSince(since: Date): number {
    const row = this.db
      .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS total FROM llm_usage WHERE created_at >= ?")
      .get(since.toISOString()) as { total: number };
    return row.total;
  }

  // ---------- Напоминания ----------

  /** Отмечает напоминание отправленным. Возвращает false, если оно уже было. */
  markReminderSent(taskId: number, rule: string): boolean {
    const res = this.db
      .prepare("INSERT OR IGNORE INTO reminders_sent (task_id, rule, sent_at) VALUES (?, ?, ?)")
      .run(taskId, rule, this.ts());
    return Number(res.changes) > 0;
  }

  wasReminderSent(taskId: number, rule: string): boolean {
    return (
      this.db.prepare("SELECT 1 FROM reminders_sent WHERE task_id = ? AND rule = ?").get(taskId, rule) !==
      undefined
    );
  }

  // ---------- Заметки ----------

  saveNote(input: { id?: number; title: string; body?: string; subject?: string | null; pinned?: boolean }): Note {
    const ts = this.ts();
    if (input.id !== undefined) {
      const current = this.getNote(input.id);
      if (!current) throw new Error(`Заметки #${input.id} нет`);
      this.db
        .prepare("UPDATE notes SET title = ?, body = ?, subject = ?, pinned = ?, updated_at = ? WHERE id = ?")
        .run(
          input.title,
          input.body ?? current.body,
          input.subject === undefined ? current.subject : input.subject,
          (input.pinned ?? current.pinned) ? 1 : 0,
          ts,
          input.id,
        );
      this.changed();
      return this.getNote(input.id)!;
    }
    const res = this.db
      .prepare("INSERT INTO notes (title, body, subject, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(input.title, input.body ?? "", input.subject ?? null, input.pinned ? 1 : 0, ts, ts);
    this.changed();
    return this.getNote(Number(res.lastInsertRowid))!;
  }

  getNote(id: number): Note | undefined {
    const r = this.db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as Row | undefined;
    return r ? toNote(r) : undefined;
  }

  /** Закреплённые сверху, потом свежие. */
  listNotes(): Note[] {
    const rows = this.db.prepare("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC").all() as Row[];
    return rows.map(toNote);
  }

  deleteNote(id: number): boolean {
    const ok = Number(this.db.prepare("DELETE FROM notes WHERE id = ?").run(id).changes) > 0;
    this.changed();
    return ok;
  }

  // ---------- Ссылки на уроки ----------

  saveLink(input: { id?: number; title: string; url: string; subject?: string | null; note?: string; pinned?: boolean }): LessonLink {
    const url = cleanLinkUrl(input.url);
    const title = input.title.trim() || new URL(url).hostname.replace(/^www\./, "");
    let id = input.id;
    // Та же ссылка уже есть — не плодим копии, обновляем её.
    if (id === undefined) {
      const same = this.db.prepare("SELECT id FROM links WHERE url = ?").get(url) as Row | undefined;
      if (same) id = Number(same.id);
    }
    if (id !== undefined) {
      const cur = this.getLink(id);
      if (!cur) throw new Error(`Ссылки #${id} нет`);
      this.db
        .prepare("UPDATE links SET title = ?, url = ?, subject = ?, note = ?, pinned = ? WHERE id = ?")
        .run(
          title,
          url,
          input.subject === undefined ? cur.subject : input.subject,
          input.note ?? cur.note,
          (input.pinned ?? cur.pinned) ? 1 : 0,
          id,
        );
      this.changed();
      return this.getLink(id)!;
    }
    const res = this.db
      .prepare("INSERT INTO links (title, url, subject, note, pinned, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(title, url, input.subject ?? null, input.note ?? "", input.pinned ? 1 : 0, this.ts());
    this.changed();
    return this.getLink(Number(res.lastInsertRowid))!;
  }

  getLink(id: number): LessonLink | undefined {
    const r = this.db.prepare("SELECT * FROM links WHERE id = ?").get(id) as Row | undefined;
    return r ? toLink(r) : undefined;
  }

  listLinks(): LessonLink[] {
    return (this.db.prepare("SELECT * FROM links ORDER BY pinned DESC, title").all() as Row[]).map(toLink);
  }

  /** Запомнить, что ссылку открывали — частые всплывают наверх. */
  markLinkOpened(id: number): void {
    this.db.prepare("UPDATE links SET opened_at = ? WHERE id = ?").run(this.ts(), id);
    this.changed();
  }

  deleteLink(id: number): boolean {
    const ok = Number(this.db.prepare("DELETE FROM links WHERE id = ?").run(id).changes) > 0;
    this.changed();
    return ok;
  }

  // ---------- Плейлисты и любимое ----------

  listPlaylists(): Playlist[] {
    const lists = this.db.prepare("SELECT id, name FROM playlists ORDER BY created_at, id").all() as Row[];
    const items = this.db.prepare("SELECT playlist_id, track_id FROM playlist_tracks ORDER BY pos").all() as Row[];
    return lists.map((l) => ({
      id: Number(l.id),
      name: l.name as string,
      trackIds: items.filter((i) => Number(i.playlist_id) === Number(l.id)).map((i) => i.track_id as string),
    }));
  }

  createPlaylist(name: string): Playlist {
    const clean = name.trim() || "Новый плейлист";
    const res = this.db.prepare("INSERT INTO playlists (name, created_at) VALUES (?, ?)").run(clean, this.ts());
    this.changed();
    return { id: Number(res.lastInsertRowid), name: clean, trackIds: [] };
  }

  renamePlaylist(id: number, name: string): void {
    if (!name.trim()) return;
    this.db.prepare("UPDATE playlists SET name = ? WHERE id = ?").run(name.trim(), id);
    this.changed();
  }

  deletePlaylist(id: number): void {
    this.db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?").run(id);
    this.db.prepare("DELETE FROM playlists WHERE id = ?").run(id);
    this.changed();
  }

  /** Добавить треки в конец плейлиста (уже добавленные не дублируются). */
  addToPlaylist(id: number, trackIds: string[]): void {
    const last = this.db.prepare("SELECT MAX(pos) AS m FROM playlist_tracks WHERE playlist_id = ?").get(id) as Row;
    let pos = Number(last.m ?? 0);
    const ins = this.db.prepare("INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, pos) VALUES (?, ?, ?)");
    for (const t of trackIds) ins.run(id, t, ++pos);
    this.changed();
  }

  removeFromPlaylist(id: number, trackId: string): void {
    this.db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?").run(id, trackId);
    this.changed();
  }

  /** Новый порядок треков плейлиста целиком. */
  reorderPlaylist(id: number, trackIds: string[]): void {
    const upd = this.db.prepare("UPDATE playlist_tracks SET pos = ? WHERE playlist_id = ? AND track_id = ?");
    trackIds.forEach((t, i) => upd.run(i + 1, id, t));
    this.changed();
  }

  listFavorites(): string[] {
    return (this.db.prepare("SELECT track_id FROM favorites ORDER BY created_at DESC").all() as Row[]).map((r) => r.track_id as string);
  }

  /** Поставить/снять сердечко. Возвращает новое состояние. */
  toggleFavorite(trackId: string): boolean {
    const had = this.db.prepare("DELETE FROM favorites WHERE track_id = ?").run(trackId).changes;
    if (Number(had) === 0) this.db.prepare("INSERT INTO favorites (track_id, created_at) VALUES (?, ?)").run(trackId, this.ts());
    this.changed();
    return Number(had) === 0;
  }

  // ---------- История прослушиваний ----------

  addPlay(input: { trackId: string; title: string; artist: string; seconds: number; playedAt?: string }): void {
    this.db
      .prepare("INSERT INTO plays (track_id, title, artist, seconds, played_at) VALUES (?, ?, ?, ?, ?)")
      .run(input.trackId, input.title, input.artist, input.seconds, input.playedAt ?? this.ts());
  }

  /** Что слушал с даты: по трекам, от самых частых. */
  playStats(since: Date, limit = 50): PlayStat[] {
    const rows = this.db
      .prepare(
        `SELECT track_id, MAX(title) AS title, MAX(artist) AS artist, COUNT(*) AS plays, SUM(seconds) AS seconds
         FROM plays WHERE played_at >= ? GROUP BY track_id ORDER BY plays DESC, seconds DESC LIMIT ?`,
      )
      .all(since.toISOString(), limit) as Row[];
    return rows.map((r) => ({
      trackId: r.track_id as string,
      title: r.title as string,
      artist: r.artist as string,
      plays: Number(r.plays),
      seconds: Number(r.seconds),
    }));
  }

  // ---------- Фокус ----------

  addFocusSession(input: { subject?: string | null; minutes: number; startedAt: string }): FocusSession {
    const res = this.db
      .prepare("INSERT INTO focus_sessions (subject, minutes, started_at) VALUES (?, ?, ?)")
      .run(input.subject ?? null, input.minutes, input.startedAt);
    this.changed();
    return { id: Number(res.lastInsertRowid), subject: input.subject ?? null, minutes: input.minutes, startedAt: input.startedAt };
  }

  listFocusSessions(since: Date): FocusSession[] {
    const rows = this.db
      .prepare("SELECT * FROM focus_sessions WHERE started_at >= ? ORDER BY started_at")
      .all(since.toISOString()) as Row[];
    return rows.map((r) => ({
      id: Number(r.id),
      subject: (r.subject as string | null) ?? null,
      minutes: Number(r.minutes),
      startedAt: r.started_at as string,
    }));
  }

  // ---------- Мелкие настройки ----------

  getKv(key: string): string | undefined {
    const row = this.db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as Row | undefined;
    return row ? (row.value as string) : undefined;
  }

  deleteKv(key: string): void {
    this.db.prepare("DELETE FROM kv WHERE key = ?").run(key);
  }

  setKv(key: string, value: string): void {
    this.db
      .prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }
}
