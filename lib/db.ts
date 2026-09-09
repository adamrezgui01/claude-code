import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH =
  process.env.FLASHCARDS_DB ?? path.join(process.cwd(), "data", "flashcards.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL REFERENCES decks(id),
  content_key TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,

  last_confidence INTEGER,
  last_reviewed_at TEXT,
  next_review_at TEXT NOT NULL DEFAULT (date('now')),
  total_reviews INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_content_key ON cards(deck_id, content_key);
CREATE INDEX IF NOT EXISTS idx_cards_deck_due ON cards(deck_id, next_review_at);

CREATE TABLE IF NOT EXISTS review_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id),
  confidence INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  interval_after INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_card ON review_history(card_id, reviewed_at);
`;

const globalForDb = globalThis as unknown as {
  flashcardsDb?: Database.Database;
};

export function getDb(): Database.Database {
  if (globalForDb.flashcardsDb) return globalForDb.flashcardsDb;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  globalForDb.flashcardsDb = db;
  return db;
}
