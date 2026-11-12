CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
