import type { SQLiteDatabase } from 'expo-sqlite';
import { api } from './api-client';
import {
  getPendingItems,
  markSynced,
  markFailed,
  removeSynced,
} from '../db/sync-queue';
import type { SyncBatchResult } from '@moviereview/shared';

export async function performSync(db: SQLiteDatabase): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await getPendingItems(db);

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const items = pending.map((item) => ({
    clientEventId: item.clientEventId,
    entityType: item.entityType as 'visit' | 'review',
    payload: JSON.parse(item.payload),
  }));

  let synced = 0;
  let failed = 0;

  try {
    const response = await api.post<{ results: SyncBatchResult[] }>(
      '/sync/batch',
      { items }
    );

    for (const result of response.results) {
      if (result.status === 'created' || result.status === 'duplicate') {
        await markSynced(db, result.clientEventId);
        synced++;
      } else {
        await markFailed(db, result.clientEventId);
        failed++;
      }
    }

    // Clean up successfully synced items
    await removeSynced(db);
  } catch (err) {
    // Network error: mark all as failed (will retry)
    for (const item of pending) {
      await markFailed(db, item.clientEventId);
    }
    failed = pending.length;
  }

  return { synced, failed };
}

export async function isSyncNeeded(db: SQLiteDatabase): Promise<boolean> {
  const pending = await getPendingItems(db, 1);
  return pending.length > 0;
}
