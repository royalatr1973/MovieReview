import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

export const BACKGROUND_SYNC_TASK = 'background-sync-task';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    // In production, this would:
    // 1. Open the SQLite database
    // 2. Check for pending sync items
    // 3. Batch upload to server
    // 4. Mark as synced
    console.log('Background sync task executed');

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('Background sync error:', err);
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
}

export async function unregisterBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  }
}
