import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

try {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };

    if (!locations || locations.length === 0) return;

    const location = locations[locations.length - 1];

    console.log('Background location update:', {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy,
    });
  });
} catch (e) {
  console.warn('[BackgroundLocation] Failed to define task:', e);
}

export async function startBackgroundLocationUpdates(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: false,
    deferredUpdatesInterval: 5 * 60 * 1000,
  });

  return true;
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
