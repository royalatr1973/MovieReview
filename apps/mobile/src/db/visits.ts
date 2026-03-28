import type { SQLiteDatabase } from 'expo-sqlite';
import type { VisitCandidate, QualificationState, PromptState } from '@moviereview/shared';

export interface LocalVisit extends VisitCandidate {
  cinemaName?: string;
  syncStatus: string;
}

export async function insertVisit(
  db: SQLiteDatabase,
  visit: LocalVisit
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO visits (
      visit_id, user_id, cinema_id, cinema_name, entry_time, exit_time,
      dwell_minutes, location_confidence, qualification_state, prompt_state,
      client_event_id, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    visit.visitId,
    visit.userId,
    visit.cinemaId,
    visit.cinemaName ?? null,
    visit.entryTime,
    visit.exitTime ?? null,
    visit.dwellMinutes ?? null,
    visit.locationConfidence,
    visit.qualificationState,
    visit.promptState,
    visit.clientEventId,
    visit.syncStatus
  );
}

export async function updateVisitExit(
  db: SQLiteDatabase,
  visitId: string,
  exitTime: string,
  dwellMinutes: number,
  qualificationState: QualificationState
): Promise<void> {
  await db.runAsync(
    `UPDATE visits SET exit_time = ?, dwell_minutes = ?, qualification_state = ? WHERE visit_id = ?`,
    exitTime,
    dwellMinutes,
    qualificationState,
    visitId
  );
}

export async function updateVisitPromptState(
  db: SQLiteDatabase,
  visitId: string,
  promptState: PromptState
): Promise<void> {
  await db.runAsync(
    `UPDATE visits SET prompt_state = ? WHERE visit_id = ?`,
    promptState,
    visitId
  );
}

export async function getVisitById(
  db: SQLiteDatabase,
  visitId: string
): Promise<LocalVisit | null> {
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM visits WHERE visit_id = ?`,
    visitId
  );
  return row ? mapRowToVisit(row) : null;
}

export async function getRecentVisits(
  db: SQLiteDatabase,
  userId: string,
  limit = 20
): Promise<LocalVisit[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM visits WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    userId,
    limit
  );
  return rows.map(mapRowToVisit);
}

export async function getActiveVisit(
  db: SQLiteDatabase,
  userId: string
): Promise<LocalVisit | null> {
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM visits WHERE user_id = ? AND exit_time IS NULL ORDER BY created_at DESC LIMIT 1`,
    userId
  );
  return row ? mapRowToVisit(row) : null;
}

export async function countRecentVisitsToCinema(
  db: SQLiteDatabase,
  userId: string,
  cinemaId: string,
  dayWindow: number
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM visits
     WHERE user_id = ? AND cinema_id = ?
     AND created_at >= datetime('now', ?)`,
    userId,
    cinemaId,
    `-${dayWindow} days`
  );
  return result?.count ?? 0;
}

function mapRowToVisit(row: any): LocalVisit {
  return {
    visitId: row.visit_id,
    userId: row.user_id,
    cinemaId: row.cinema_id,
    cinemaName: row.cinema_name,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    dwellMinutes: row.dwell_minutes,
    locationConfidence: row.location_confidence,
    qualificationState: row.qualification_state,
    promptState: row.prompt_state,
    clientEventId: row.client_event_id,
    createdAt: row.created_at,
    syncStatus: row.sync_status,
  };
}
