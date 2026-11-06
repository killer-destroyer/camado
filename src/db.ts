import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type DB = DatabaseSync;

// Каждая миграция выполняется один раз. Новые — только дописывать в конец.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE subjects (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    name_key   TEXT NOT NULL UNIQUE, -- имя в нижнем регистре: SQLite не умеет без регистра для кириллицы
    teacher    TEXT,
    info       TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE tasks (
    id         INTEGER PRIMARY KEY,
    subject    TEXT,
    title      TEXT NOT NULL,
    details    TEXT,
    kind       TEXT NOT NULL DEFAULT 'homework',
    due_at     TEXT,
    status     TEXT NOT NULL DEFAULT 'todo',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX tasks_open ON tasks (status, due_at);

  CREATE TABLE reminders_sent (
    task_id INTEGER NOT NULL,
    rule    TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    PRIMARY KEY (task_id, rule)
  );

  CREATE TABLE memory (
    id         INTEGER PRIMARY KEY,
    fact       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE chat_log (
    id         INTEGER PRIMARY KEY,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE llm_usage (
    id                 INTEGER PRIMARY KEY,
    model              TEXT NOT NULL,
    input_tokens       INTEGER NOT NULL,
    output_tokens      INTEGER NOT NULL,
    cache_read_tokens  INTEGER NOT NULL,
    cache_write_tokens INTEGER NOT NULL,
    cost_usd           REAL NOT NULL,
    created_at         TEXT NOT NULL
  );

  CREATE TABLE kv (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // 2: заметки и фокус-сессии (приложение на ПК)
  `
  CREATE TABLE notes (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    subject    TEXT,
    pinned     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE focus_sessions (
    id         INTEGER PRIMARY KEY,
    subject    TEXT,
    minutes    REAL NOT NULL,
    started_at TEXT NOT NULL
  );
  CREATE INDEX focus_started ON focus_sessions (started_at);
  `,
  // 3: ссылки на уроки, плейлисты, любимое, история прослушиваний
  `
  CREATE TABLE links (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    url        TEXT NOT NULL UNIQUE,
    subject    TEXT,
    note       TEXT NOT NULL DEFAULT '',
    pinned     INTEGER NOT NULL DEFAULT 0,
    opened_at  TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE playlists (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE playlist_tracks (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id    TEXT NOT NULL,
    pos         REAL NOT NULL,
    PRIMARY KEY (playlist_id, track_id)
  );

  CREATE TABLE favorites (
    track_id   TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );

  CREATE TABLE plays (
    id        INTEGER PRIMARY KEY,
    track_id  TEXT NOT NULL,
    title     TEXT NOT NULL,
    artist    TEXT NOT NULL,
    seconds   REAL NOT NULL,
    played_at TEXT NOT NULL
  );
  CREATE INDEX plays_at ON plays (played_at);
  `,
];

export function openDb(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
