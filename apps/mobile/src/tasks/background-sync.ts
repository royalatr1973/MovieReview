import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { getDatabase } from '../db/database';
import { getPendingItems } from '../db/sync-queue';
import { performSync } from '../services/sync';

export const BACKGROUND_SYNC_TASK = 'background-sync-task';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const db = await getDatabase();
    if (!db) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Short-circuit if nothing is pending
    const pending = await getPendingItems(db, 1);
    if (pending.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { synced, failed } = await performSync(db);
    console.log(`[BackgroundSync] synced=${synced} failed=${failed}`);

    return synced > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.error('[BackgroundSync] error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
  console.log('[BackgroundSync] registered');
}

export async function unregisterBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  }
}
