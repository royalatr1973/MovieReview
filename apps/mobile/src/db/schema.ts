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
      chain TEXT,
      city TEXT NOT NULL DEFAULT 'Chennai',
      active INTEGER NOT NULL DEFAULT 1,
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movies_cache (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      year INTEGER,
      language TEXT,
      format TEXT,
      tmdb_id INTEGER,
      poster_url TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      average_rating REAL,
      user_submitted INTEGER NOT NULL DEFAULT 0,
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id);
    CREATE INDEX IF NOT EXISTS idx_visits_cinema ON visits(cinema_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_visit ON reviews(visit_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status);
    CREATE INDEX IF NOT EXISTS idx_movies_title ON movies_cache(title);
    CREATE INDEX IF NOT EXISTS idx_movies_review_count ON movies_cache(review_count DESC);
    CREATE INDEX IF NOT EXISTS idx_cinemas_active ON cinemas_cache(active);
  `);
}

export async function applyMigrationV3(db: SQLiteDatabase): Promise<void> {
  // Watchlist table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS watchlist (
      movie_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      year INTEGER,
      language TEXT,
      poster_url TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Sync pending count cache (for offline queue indicator)
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(sync_status) WHERE sync_status = 'pending';
  `);
}

export async function applyMigrationV2(db: SQLiteDatabase): Promise<void> {
  // Add new columns to cinemas_cache (for upgrades from v1)
  const cinemaCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(cinemas_cache)`
  );
  const cinemaColNames = cinemaCols.map((c) => c.name);

  if (!cinemaColNames.includes('chain')) {
    await db.execAsync(`ALTER TABLE cinemas_cache ADD COLUMN chain TEXT`);
  }
  if (!cinemaColNames.includes('city')) {
    await db.execAsync(`ALTER TABLE cinemas_cache ADD COLUMN city TEXT NOT NULL DEFAULT 'Chennai'`);
  }
  if (!cinemaColNames.includes('active')) {
    await db.execAsync(`ALTER TABLE cinemas_cache ADD COLUMN active INTEGER NOT NULL DEFAULT 1`);
  }

  // Add new columns to movies_cache (for upgrades from v1)
  const movieCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(movies_cache)`
  );
  const movieColNames = movieCols.map((c) => c.name);

  if (!movieColNames.includes('tmdb_id')) {
    await db.execAsync(`ALTER TABLE movies_cache ADD COLUMN tmdb_id INTEGER`);
  }
  if (!movieColNames.includes('poster_url')) {
    await db.execAsync(`ALTER TABLE movies_cache ADD COLUMN poster_url TEXT`);
  }
  if (!movieColNames.includes('review_count')) {
    await db.execAsync(`ALTER TABLE movies_cache ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0`);
  }
  if (!movieColNames.includes('average_rating')) {
    await db.execAsync(`ALTER TABLE movies_cache ADD COLUMN average_rating REAL`);
  }
  if (!movieColNames.includes('user_submitted')) {
    await db.execAsync(`ALTER TABLE movies_cache ADD COLUMN user_submitted INTEGER NOT NULL DEFAULT 0`);
  }

  // Add new indexes if missing
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_movies_title ON movies_cache(title);
    CREATE INDEX IF NOT EXISTS idx_movies_review_count ON movies_cache(review_count DESC);
    CREATE INDEX IF NOT EXISTS idx_cinemas_active ON cinemas_cache(active);
  `);
}
