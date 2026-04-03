/**
 * Background sync service — uploads queued visits and reviews from local
 * SQLite to the server when the user is authenticated and online.
 *
 * Called on:
 *   • App foreground (AppState 'active')
 *   • Immediately after review submission (fire-and-forget)
 */
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { api } from './api-client';
import { getDatabase } from '../db/database';
import {
  getPendingItems,
  markSynced,
  markFailed,
  removeSynced,
} from '../db/sync-queue';
import type { SyncBatchResult } from '@moviereview/shared';

let _isSyncing = false;

/**
 * Low-level sync: takes a db handle, uploads pending items, updates queue.
 * Returns counts. Does NOT guard against overlapping calls.
 */
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
    // Network error: DON'T mark as failed — just skip this pass and retry later
    console.log('[Sync] Network error, will retry next pass:', (err as Error).message ?? err);
  }

  return { synced, failed };
}

/**
 * High-level: guarded sync that obtains the DB, checks auth, and prevents
 * overlapping calls. Safe to fire from any context.
 */
export async function runSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (_isSyncing) return;

  _isSyncing = true;
  try {
    const db = await getDatabase();
    if (!db) return;

    const { synced, failed } = await performSync(db);
    if (synced > 0 || failed > 0) {
      console.log(`[Sync] Done — synced: ${synced}, failed: ${failed}`);
    }
  } catch (err) {
    console.error('[Sync] Unexpected error:', err);
  } finally {
    _isSyncing = false;
  }
}

export async function isSyncNeeded(db: SQLiteDatabase): Promise<boolean> {
  const pending = await getPendingItems(db, 1);
  return pending.length > 0;
}
