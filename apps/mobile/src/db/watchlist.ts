import type { SQLiteDatabase } from 'expo-sqlite';

export interface WatchlistItem {
  movieId: string;
  title: string;
  year: number | null;
  language: string | null;
  posterUrl: string | null;
  addedAt: string;
}

export async function addToWatchlist(
  db: SQLiteDatabase,
  item: Omit<WatchlistItem, 'addedAt'>
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO watchlist (movie_id, title, year, language, poster_url)
     VALUES (?, ?, ?, ?, ?)`,
    item.movieId,
    item.title,
    item.year ?? null,
    item.language ?? null,
    item.posterUrl ?? null
  );
}

export async function removeFromWatchlist(
  db: SQLiteDatabase,
  movieId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM watchlist WHERE movie_id = ?`, movieId);
}

export async function getWatchlist(
  db: SQLiteDatabase,
  limit = 100
): Promise<WatchlistItem[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM watchlist ORDER BY added_at DESC LIMIT ?`,
    limit
  );
  return rows.map((r) => ({
    movieId: r.movie_id,
    title: r.title,
    year: r.year,
    language: r.language,
    posterUrl: r.poster_url,
    addedAt: r.added_at,
  }));
}

export async function isInWatchlist(
  db: SQLiteDatabase,
  movieId: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM watchlist WHERE movie_id = ?`,
    movieId
  );
  return (row?.c ?? 0) > 0;
}

export async function getWatchlistCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM watchlist`
  );
  return row?.c ?? 0;
}
