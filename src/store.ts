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

/** Всё, что Камадо хранит о тебе, — в одном месте. */
export class Store {
  constructor(
    private db: DB,
    private now: () => Date = () => new Date(),
  ) {}

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
    return { id: Number(res.lastInsertRowid), fact };
  }

  forget(id: number): boolean {
    return Number(this.db.prepare("DELETE FROM memory WHERE id = ?").run(id).changes) > 0;
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

  // ---------- Мелкие настройки ----------

  getKv(key: string): string | undefined {
    const row = this.db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as Row | undefined;
    return row ? (row.value as string) : undefined;
  }

  setKv(key: string, value: string): void {
    this.db
      .prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }
}
