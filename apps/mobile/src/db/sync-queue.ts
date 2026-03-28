import type { SQLiteDatabase } from 'expo-sqlite';
import type { SyncEntityType } from '@moviereview/shared';
import { SYNC_MAX_RETRIES } from '@moviereview/shared';

export interface SyncQueueItem {
  id: number;
  clientEventId: string;
  entityType: SyncEntityType;
  payload: string;
  syncStatus: string;
  retryCount: number;
  createdAt: string;
  lastAttemptAt: string | null;
}

export async function enqueue(
  db: SQLiteDatabase,
  clientEventId: string,
  entityType: SyncEntityType,
  payload: Record<string, unknown>
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_queue (client_event_id, entity_type, payload, sync_status)
     VALUES (?, ?, ?, 'pending')`,
    clientEventId,
    entityType,
    JSON.stringify(payload)
  );
}

export async function getPendingItems(
  db: SQLiteDatabase,
  limit = 50
): Promise<SyncQueueItem[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue
     WHERE sync_status = 'pending' AND retry_count < ?
     ORDER BY created_at ASC LIMIT ?`,
    SYNC_MAX_RETRIES,
    limit
  );
  return rows.map(mapRow);
}

export async function markSynced(
  db: SQLiteDatabase,
  clientEventId: string
): Promise<void> {
  await db.runAsync(
    `UPDATE sync_queue SET sync_status = 'synced', last_attempt_at = datetime('now')
     WHERE client_event_id = ?`,
    clientEventId
  );
}

export async function markFailed(
  db: SQLiteDatabase,
  clientEventId: string
): Promise<void> {
  await db.runAsync(
    `UPDATE sync_queue SET
      sync_status = CASE WHEN retry_count + 1 >= ? THEN 'failed' ELSE 'pending' END,
      retry_count = retry_count + 1,
      last_attempt_at = datetime('now')
     WHERE client_event_id = ?`,
    SYNC_MAX_RETRIES,
    clientEventId
  );
}

export async function removeSynced(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM sync_queue WHERE sync_status = 'synced'`);
}

export async function getPendingCount(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'pending'`
  );
  return result?.count ?? 0;
}

function mapRow(row: any): SyncQueueItem {
  return {
    id: row.id,
    clientEventId: row.client_event_id,
    entityType: row.entity_type,
    payload: row.payload,
    syncStatus: row.sync_status,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    lastAttemptAt: row.last_attempt_at,
  };
}
