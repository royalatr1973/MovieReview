import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEOFENCE_MAX_REGIONS } from '@moviereview/shared';
import type { Cinema } from '@moviereview/shared';

export const GEOFENCE_TASK_NAME = 'cinema-geofence-task';
const CINEMA_NAME_MAP_KEY = '@cinereview/cinema_name_map';

export interface GeofenceEvent {
  cinemaId: string;
  cinemaName: string;
  eventType: 'enter' | 'exit';
  timestamp: string;
  latitude: number;
  longitude: number;
}

/** Persist a cinemaId→name map so the background task can read names. */
export async function saveCinemaNameMap(
  cinemas: Array<{ id: string; name: string }>
): Promise<void> {
  const map: Record<string, string> = {};
  for (const c of cinemas) {
    map[c.id] = c.name;
  }
  await AsyncStorage.setItem(CINEMA_NAME_MAP_KEY, JSON.stringify(map));
}

/** Read the persisted cinemaId→name map (callable from background task). */
async function getCinemaNameMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(CINEMA_NAME_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Track enter times for dwell calculation (in-process only; background task
// may be a fresh process after device restart – dwell will default to 1 min)
const enterTimes: Record<string, string> = {};

// Define the background task safely
try {
  TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Geofence task error:', error);
      return;
    }

    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: Location.LocationRegion;
    };

    const cinemaId = region.identifier!;
    const nameMap = await getCinemaNameMap();
    const cinemaName = nameMap[cinemaId] ?? cinemaId;
    const now = new Date().toISOString();

    if (eventType === Location.GeofencingEventType.Enter) {
      enterTimes[cinemaId] = now;
      console.log(`[Geofence] Entered ${cinemaName} at ${now}`);
    } else if (eventType === Location.GeofencingEventType.Exit) {
      const entryTime = enterTimes[cinemaId];
      let dwellMinutes = 0;

      if (entryTime) {
        dwellMinutes = Math.round(
          (new Date(now).getTime() - new Date(entryTime).getTime()) / 60000
        );
        delete enterTimes[cinemaId];
      }

      console.log(`[Geofence] Exited ${cinemaName}, dwell: ${dwellMinutes} min`);

      const visitId = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        if (!global._pendingVisits) {
          global._pendingVisits = [];
        }
        global._pendingVisits.push({
          visitId,
          cinemaId,
          cinemaName,
          entryTime: entryTime || now,
          exitTime: now,
          dwellMinutes: Math.max(dwellMinutes, 1),
          latitude: region.latitude,
          longitude: region.longitude,
        });

        const Notifications = require('expo-notifications');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Rate your movie!',
            body: `Looks like you just left ${cinemaName}. How was the movie?`,
            data: { visitId, type: 'review_prompt' },
          },
          trigger: null,
        });
        console.log(`[Geofence] Notification sent for ${cinemaName}`);
      } catch (err) {
        console.error('[Geofence] Failed to process exit:', err);
      }
    }
  });
} catch (e) {
  console.warn('[Geofence] Failed to define task:', e);
}

export async function registerGeofences(cinemas: Cinema[]): Promise<void> {
  const hasPermission = await checkBackgroundLocationPermission();
  if (!hasPermission) {
    console.warn('Background location permission not granted');
    return;
  }

  const selected = cinemas.slice(0, GEOFENCE_MAX_REGIONS);

  // Persist name map before registering so background task can look up names
  await saveCinemaNameMap(selected.map((c) => ({ id: c.id, name: c.name })));

  const regions = selected.map((cinema) => ({
    identifier: cinema.id,
    latitude: cinema.latitude,
    longitude: cinema.longitude,
    radius: cinema.radius,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
  }

  if (regions.length > 0) {
    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
    console.log(`[Geofence] Registered ${regions.length} geofences`);
  }
}

export async function stopGeofencing(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
  }
}

async function checkBackgroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status === 'granted';
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
