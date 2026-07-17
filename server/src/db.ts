import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "fit15.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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

CREATE INDEX IF NOT EXISTS idx_logs_user_date ON activity_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
`);
