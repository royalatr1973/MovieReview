import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS visits (
      visit_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      cinema_id TEXT NOT NULL,
      cinema_name TEXT,
      entry_time TEXT NOT NULL,
      exit_time TEXT,
      dwell_minutes INTEGER,
      location_confidence REAL NOT NULL,
      qualification_state TEXT NOT NULL DEFAULT 'pending',
      prompt_state TEXT NOT NULL DEFAULT 'pending',
      client_event_id TEXT NOT NULL UNIQUE,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_sync_attempt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      review_id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      movie_id TEXT,
      raw_title TEXT,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review_text TEXT,
      spoiler_flag INTEGER NOT NULL DEFAULT 0,
      match_confidence REAL,
      selection_source TEXT NOT NULL,
      client_event_id TEXT NOT NULL UNIQUE,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_sync_attempt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      edited_at TEXT,
      FOREIGN KEY (visit_id) REFERENCES visits(visit_id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_event_id TEXT NOT NULL UNIQUE,
      entity_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_attempt_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cinemas_cache (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius INTEGER NOT NULL DEFAULT 100,
      address TEXT,
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movies_cache (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      year INTEGER,
      language TEXT,
      format TEXT,
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id);
    CREATE INDEX IF NOT EXISTS idx_visits_cinema ON visits(cinema_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_visit ON reviews(visit_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status);
  `);
}
