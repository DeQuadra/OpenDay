const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "openday.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  name TEXT,
  email TEXT,
  prize_emoji TEXT,
  prize_name TEXT,
  prize_hype TEXT,
  photo_path TEXT,
  lat REAL,
  lon REAL,
  accuracy REAL,
  ip TEXT,
  user_agent TEXT,
  os TEXT,
  browser TEXT,
  device TEXT,
  language TEXT,
  timezone TEXT,
  screen TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS quiz_scores (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  name TEXT,
  total_ms INTEGER,
  errors INTEGER
);
`);

module.exports = db;
