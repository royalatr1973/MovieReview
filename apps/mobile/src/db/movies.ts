import type { SQLiteDatabase } from 'expo-sqlite';

export interface LocalMovie {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  format: string | null;
  tmdbId: number | null;
  posterUrl: string | null;
  reviewCount: number;
  averageRating: number | null;
  userSubmitted: boolean;
  cachedAt: string;
}

export async function upsertMovie(
  db: SQLiteDatabase,
  movie: Omit<LocalMovie, 'cachedAt' | 'reviewCount' | 'averageRating'> & {
    reviewCount?: number;
    averageRating?: number | null;
  }
): Promise<void> {
  await db.runAsync(
    `INSERT INTO movies_cache (id, title, year, language, format, tmdb_id, poster_url, review_count, average_rating, user_submitted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       year = excluded.year,
       language = excluded.language,
       format = excluded.format,
       tmdb_id = COALESCE(excluded.tmdb_id, tmdb_id),
       poster_url = COALESCE(excluded.poster_url, poster_url),
       user_submitted = excluded.user_submitted,
       cached_at = datetime('now')`,
    movie.id,
    movie.title,
    movie.year ?? null,
    movie.language ?? null,
    movie.format ?? null,
    movie.tmdbId ?? null,
    movie.posterUrl ?? null,
    movie.reviewCount ?? 0,
    movie.averageRating ?? null,
    movie.userSubmitted ? 1 : 0
  );
}

/**
 * Atomically increment review count and recalculate average rating.
 * Uses a running Bayesian-style update: newAvg = (oldAvg * oldCount + newRating) / newCount
 */
export async function recordMovieReview(
  db: SQLiteDatabase,
  movieId: string,
  rating: number
): Promise<void> {
  await db.runAsync(
    `UPDATE movies_cache SET
       review_count = review_count + 1,
       average_rating = CASE
         WHEN average_rating IS NULL THEN ?
         ELSE ROUND((average_rating * review_count + ?) / (review_count + 1.0), 2)
       END,
       cached_at = datetime('now')
     WHERE id = ?`,
    rating,
    rating,
    movieId
  );
}

export async function getMovieById(
  db: SQLiteDatabase,
  movieId: string
): Promise<LocalMovie | null> {
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM movies_cache WHERE id = ?`,
    movieId
  );
  return row ? mapRowToMovie(row) : null;
}

/**
 * Search local movies_cache.
 * Returns: (1) any movie with title match that has review_count >= 3 or is not user-submitted,
 *          ordered by review_count DESC so popular movies surface first.
 */
export async function searchMoviesLocal(
  db: SQLiteDatabase,
  query: string,
  limit = 20
): Promise<LocalMovie[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM movies_cache
     WHERE title LIKE ? AND (user_submitted = 0 OR review_count >= 3)
     ORDER BY review_count DESC, title ASC
     LIMIT ?`,
    `%${query}%`,
    limit
  );
  return rows.map(mapRowToMovie);
}

/**
 * Get all movies with at least 1 review, ordered by review_count DESC.
 * Used for the Movies tab.
 */
export async function getAllMoviesWithStats(
  db: SQLiteDatabase,
  limit = 100
): Promise<LocalMovie[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM movies_cache
     ORDER BY review_count DESC, average_rating DESC
     LIMIT ?`,
    limit
  );
  return rows.map(mapRowToMovie);
}

/**
 * Get or create a user-submitted movie.
 * Returns the existing movie ID if a title match exists (case-insensitive),
 * otherwise inserts a new user_submitted movie and returns its new ID.
 */
export async function getOrCreateUserMovie(
  db: SQLiteDatabase,
  title: string,
  movieId: string
): Promise<string> {
  // Check for an exact case-insensitive match
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM movies_cache WHERE LOWER(title) = LOWER(?) LIMIT 1`,
    title
  );
  if (existing) return existing.id;

  // Create new user-submitted entry
  await db.runAsync(
    `INSERT OR IGNORE INTO movies_cache (id, title, user_submitted, review_count)
     VALUES (?, ?, 1, 0)`,
    movieId,
    title
  );
  return movieId;
}

export function mapRowToMovie(row: any): LocalMovie {
  return {
    id: row.id,
    title: row.title,
    year: row.year ?? null,
    language: row.language ?? null,
    format: row.format ?? null,
    tmdbId: row.tmdb_id ?? null,
    posterUrl: row.poster_url ?? null,
    reviewCount: row.review_count ?? 0,
    averageRating: row.average_rating ?? null,
    userSubmitted: !!row.user_submitted,
    cachedAt: row.cached_at,
  };
}
