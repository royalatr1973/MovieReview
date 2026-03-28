import type { SQLiteDatabase } from 'expo-sqlite';
import type { Review, CreateReviewInput } from '@moviereview/shared';

export interface LocalReview extends Review {
  syncStatus: string;
}

export async function insertReview(
  db: SQLiteDatabase,
  review: CreateReviewInput & { reviewId: string; userId: string }
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO reviews (
      review_id, visit_id, movie_id, raw_title, user_id, rating,
      review_text, spoiler_flag, selection_source, client_event_id, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    review.reviewId,
    review.visitId,
    review.movieId ?? null,
    review.rawTitle ?? null,
    review.userId,
    review.rating,
    review.reviewText ?? null,
    review.spoilerFlag ? 1 : 0,
    review.selectionSource,
    review.clientEventId
  );
}

export async function updateReview(
  db: SQLiteDatabase,
  reviewId: string,
  updates: { rating?: number; reviewText?: string; spoilerFlag?: boolean }
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.rating !== undefined) {
    fields.push('rating = ?');
    values.push(updates.rating);
  }
  if (updates.reviewText !== undefined) {
    fields.push('review_text = ?');
    values.push(updates.reviewText);
  }
  if (updates.spoilerFlag !== undefined) {
    fields.push('spoiler_flag = ?');
    values.push(updates.spoilerFlag ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push("edited_at = datetime('now')");
  fields.push("sync_status = 'pending'");
  values.push(reviewId);

  await db.runAsync(
    `UPDATE reviews SET ${fields.join(', ')} WHERE review_id = ?`,
    ...values
  );
}

export async function deleteReview(
  db: SQLiteDatabase,
  reviewId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM reviews WHERE review_id = ?`, reviewId);
}

export async function getReviewById(
  db: SQLiteDatabase,
  reviewId: string
): Promise<LocalReview | null> {
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM reviews WHERE review_id = ?`,
    reviewId
  );
  return row ? mapRowToReview(row) : null;
}

export async function getUserReviews(
  db: SQLiteDatabase,
  userId: string,
  limit = 50
): Promise<LocalReview[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    userId,
    limit
  );
  return rows.map(mapRowToReview);
}

function mapRowToReview(row: any): LocalReview {
  return {
    reviewId: row.review_id,
    visitId: row.visit_id,
    movieId: row.movie_id,
    rawTitle: row.raw_title,
    userId: row.user_id,
    rating: row.rating,
    reviewText: row.review_text,
    spoilerFlag: !!row.spoiler_flag,
    matchConfidence: row.match_confidence,
    selectionSource: row.selection_source,
    clientEventId: row.client_event_id,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    syncStatus: row.sync_status,
  };
}
