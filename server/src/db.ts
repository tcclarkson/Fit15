import { createClient, type Client, type InStatement } from "@libsql/client";
import path from "path";
import fs from "fs";

// Local scratch dirs are only used for the local-file fallback and photo uploads.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// In production, point at a Turso/libSQL database via env vars so data persists
// across restarts and redeploys. With no URL set, fall back to a local SQLite
// file (used for development and tests) — same SQL dialect either way.
const DB_URL = process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, "fit15.db")}`;
const DB_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const IS_LOCAL_FILE = DB_URL.startsWith("file:");

if (process.env.NODE_ENV === "production" && IS_LOCAL_FILE) {
  console.warn(
    "WARNING: No TURSO_DATABASE_URL set in production — using an ephemeral local file. " +
      "Data will be LOST on restart/redeploy. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to persist data."
  );
}

export const client: Client = createClient({
  url: DB_URL,
  authToken: DB_AUTH_TOKEN,
});

export async function dbGet<T = any>(sql: string, args: any[] = []): Promise<T | undefined> {
  const res = await client.execute({ sql, args });
  return res.rows[0] as unknown as T | undefined;
}

export async function dbAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const res = await client.execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function dbRun(sql: string, args: any[] = []): Promise<void> {
  await client.execute({ sql, args });
}

// Run several write statements atomically (all-or-nothing).
export async function dbBatch(statements: InStatement[]): Promise<void> {
  await client.batch(statements, "write");
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🏃',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  note TEXT,
  photo_url TEXT,
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted')),
  created_at TEXT NOT NULL,
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_user_id TEXT,
  created_at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  window_type TEXT NOT NULL CHECK(window_type IN ('fixed','rolling')),
  start_date TEXT,
  end_date TEXT,
  duration_days INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenge_members (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('invited','active','declined','left')),
  member_start_date TEXT,
  member_end_date TEXT,
  reset_date TEXT,
  invited_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Activity photos live in the DB (base64) so they persist across restarts on
-- hosts without a durable disk. Kept in a separate table so list queries never
-- pull the image blob.
CREATE TABLE IF NOT EXISTS activity_photos (
  log_id TEXT PRIMARY KEY REFERENCES activity_logs(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  data TEXT NOT NULL
);

-- Reactions ("props") on feed posts.
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL REFERENCES activity_logs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(log_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_log ON reactions(log_id);

CREATE INDEX IF NOT EXISTS idx_logs_user_date ON activity_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_challenge_members_challenge ON challenge_members(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_members_user ON challenge_members(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
`;

// Columns added after the initial release — applied idempotently so existing
// production databases pick them up without a manual migration.
const USER_COLUMNS: { name: string; ddl: string }[] = [
  { name: "reminder_enabled", ddl: "ALTER TABLE users ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0" },
  { name: "reminder_minutes", ddl: "ALTER TABLE users ADD COLUMN reminder_minutes INTEGER" },
  { name: "tz_offset_minutes", ddl: "ALTER TABLE users ADD COLUMN tz_offset_minutes INTEGER" },
  { name: "last_reminded_date", ddl: "ALTER TABLE users ADD COLUMN last_reminded_date TEXT" },
];

async function migrateUserColumns(): Promise<void> {
  const info = await client.execute("PRAGMA table_info(users)");
  const existing = new Set(info.rows.map((r: any) => r.name));
  for (const col of USER_COLUMNS) {
    if (!existing.has(col.name)) {
      await client.execute(col.ddl);
    }
  }
}

export async function initDb(): Promise<void> {
  if (IS_LOCAL_FILE) {
    // Pragmas only meaningfully apply to the embedded/local file engine.
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA foreign_keys = ON");
  }
  await client.executeMultiple(SCHEMA);
  await migrateUserColumns();
}
