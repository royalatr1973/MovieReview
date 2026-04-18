import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEOFENCE_MAX_REGIONS } from '@moviereview/shared';
import type { Cinema } from '@moviereview/shared';

export const GEOFENCE_TASK_NAME = 'cinema-geofence-task';
export const LOCATION_KEEPALIVE_TASK = 'cinema-location-keepalive';
const CINEMA_NAME_MAP_KEY = '@cinereview/cinema_name_map';
const PENDING_VISITS_KEY = '@cinereview/pending_visits';
const SETTINGS_KEY = '@cinereview/settings';
const TEST_CINEMA_ID = 'my-test-cinema';

interface PersistedSettings {
  testDwellMinutes?: number;
  testGeofenceRadius?: number;
  cinemaDetectionEnabled?: boolean;
  reviewNotificationsEnabled?: boolean;
}

async function readSettings(): Promise<PersistedSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export interface GeofenceEvent {
  cinemaId: string;
  cinemaName: string;
  eventType: 'enter' | 'exit';
  timestamp: string;
  latitude: number;
  longitude: number;
}

export interface PendingVisit {
  visitId: string;
  cinemaId: string;
  cinemaName: string;
  entryTime: string;
  exitTime: string;
  dwellMinutes: number;
  latitude?: number;
  longitude?: number;
}

/** Append a pending visit to the persistent AsyncStorage queue. */
async function appendPendingVisit(visit: PendingVisit): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    const arr: PendingVisit[] = raw ? JSON.parse(raw) : [];
    arr.push(visit);
    await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(arr));
  } catch (err) {
    console.error('[Geofence] appendPendingVisit failed:', err);
  }
}

/** Read and clear all pending visits from AsyncStorage. */
export async function drainPendingVisits(): Promise<PendingVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(PENDING_VISITS_KEY);
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Geofence] drainPendingVisits failed:', err);
    return [];
  }
}

/** Read pending visits without clearing (for lookup on notification tap). */
export async function peekPendingVisits(): Promise<PendingVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Remove a specific pending visit by visitId. */
export async function removePendingVisit(visitId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_VISITS_KEY);
    if (!raw) return;
    const arr: PendingVisit[] = JSON.parse(raw);
    const filtered = arr.filter((v) => v.visitId !== visitId);
    await AsyncStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[Geofence] removePendingVisit failed:', err);
  }
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

// Track enter times for dwell calculation — persisted to AsyncStorage so
// it survives app restarts / background task respawns.
const ENTER_TIMES_KEY = '@cinereview/enter_times';
let enterTimes: Record<string, string> = {};

async function loadEnterTimes(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ENTER_TIMES_KEY);
    if (raw) enterTimes = JSON.parse(raw);
  } catch {}
}

async function saveEnterTimes(): Promise<void> {
  try {
    await AsyncStorage.setItem(ENTER_TIMES_KEY, JSON.stringify(enterTimes));
  } catch {}
}

/** Record an enter event for a cinema (called when registering test location). */
export async function recordManualEntry(cinemaId: string): Promise<void> {
  await loadEnterTimes();
  enterTimes[cinemaId] = new Date().toISOString();
  await saveEnterTimes();
  console.log(`[Geofence] Manual entry recorded for ${cinemaId} at ${enterTimes[cinemaId]}`);
}

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

    if (!region?.identifier) return;

    const cinemaId = region.identifier!;
    const nameMap = await getCinemaNameMap();
    const cinemaName = nameMap[cinemaId] ?? cinemaId;
    const now = new Date().toISOString();

    // Load persisted enter times (survives app restart)
    await loadEnterTimes();

    if (eventType === Location.GeofencingEventType.Enter) {
      enterTimes[cinemaId] = now;
      await saveEnterTimes();
      console.log(`[Geofence] Entered ${cinemaName} at ${now}`);
    } else if (eventType === Location.GeofencingEventType.Exit) {
      const entryTime = enterTimes[cinemaId];
      let dwellMinutes = 0;

      if (entryTime) {
        dwellMinutes = Math.round(
          (new Date(now).getTime() - new Date(entryTime).getTime()) / 60000
        );
        delete enterTimes[cinemaId];
        await saveEnterTimes();
      }

      console.log(`[Geofence] Exited ${cinemaName}, dwell: ${dwellMinutes} min`);

      const settings = await readSettings();

      // Test-cinema semantics: gate the notification on testDwellMinutes so
      // the tester gets predictable behavior. Real cinemas ignore this gate.
      if (
        cinemaId === TEST_CINEMA_ID &&
        typeof settings.testDwellMinutes === 'number' &&
        dwellMinutes < settings.testDwellMinutes
      ) {
        console.log(
          `[Geofence] Test visit below testDwellMinutes (${dwellMinutes} < ${settings.testDwellMinutes}). Skipping.`
        );
        return;
      }

      const visitId = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        await appendPendingVisit({
          visitId,
          cinemaId,
          cinemaName,
          entryTime: entryTime || now,
          exitTime: now,
          dwellMinutes: Math.max(dwellMinutes, 1),
          latitude: region.latitude,
          longitude: region.longitude,
        });

        // Respect the "Review Notifications" toggle. If disabled, still
        // persist the pending visit so the user sees it when they open
        // the app, but don't interrupt them with a push.
        if (settings.reviewNotificationsEnabled === false) {
          console.log(`[Geofence] Notifications disabled — skipping push for ${cinemaName}`);
          return;
        }

        // Respect server-side notification preferences (opt-in, quiet hours,
        // digest mode). The preference is cached in AsyncStorage by the
        // mobile app on fetch; if the cache is empty we default to sending.
        try {
          const { readCachedNotificationPreference, isWithinQuietHours } = require('./notification-preferences');
          const pref = await readCachedNotificationPreference();
          if (pref) {
            if (!pref.reviewUpdateOptIn) {
              console.log('[Geofence] User opted out of review notifications — skipping push');
              return;
            }
            if (pref.digestMode === 'daily') {
              console.log('[Geofence] Digest mode active — visit queued, push skipped');
              return;
            }
            if (isWithinQuietHours(pref.quietHoursStart, pref.quietHoursEnd)) {
              console.log('[Geofence] Within quiet hours — skipping push');
              return;
            }
          }
        } catch (err) {
          console.warn('[Geofence] Failed to read notification preferences:', err);
        }

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

// Location-updates keepalive task — kept deliberately lightweight. Its job is
// NOT to track location; it's to keep the OS-level process warm so the
// separate geofence task fires reliably in Doze mode.
try {
  TaskManager.defineTask(LOCATION_KEEPALIVE_TASK, async () => {
    // No-op: we don't care about the locations, only that the process runs.
  });
} catch (e) {
  console.warn('[Geofence] Failed to define keepalive task:', e);
}

/** Start a low-power background location updates task that doubles as a
 * foreground service, keeping the OS process warm so geofence events fire
 * reliably under Doze mode on Android. */
export async function startForegroundKeepalive(): Promise<void> {
  const hasPermission = await checkBackgroundLocationPermission();
  if (!hasPermission) return;

  const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_KEEPALIVE_TASK);
  if (isRunning) return;

  try {
    await Location.startLocationUpdatesAsync(LOCATION_KEEPALIVE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15 * 60 * 1000, // 15 min
      distanceInterval: 500, // 500 m
      deferredUpdatesInterval: 15 * 60 * 1000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: 'CineReview is monitoring cinemas',
        notificationBody:
          'Tap to open. We only notify you if you visit a cinema.',
        notificationColor: '#e94560',
      },
    });
    console.log('[Geofence] Foreground keepalive started');
  } catch (err) {
    console.warn('[Geofence] Failed to start foreground keepalive:', err);
  }
}

export async function stopForegroundKeepalive(): Promise<void> {
  const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_KEEPALIVE_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_KEEPALIVE_TASK);
  }
}

const USER_HOME_COORDS_KEY = '@cinereview/user_home_coords';

/** Persist user's last-known location so geofence selection can prefer nearest cinemas. */
export async function saveUserHomeCoords(
  coords: { latitude: number; longitude: number }
): Promise<void> {
  await AsyncStorage.setItem(USER_HOME_COORDS_KEY, JSON.stringify(coords));
}

async function getUserHomeCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_HOME_COORDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function registerGeofences(cinemas: Cinema[]): Promise<void> {
  const hasPermission = await checkBackgroundLocationPermission();
  if (!hasPermission) {
    console.warn('Background location permission not granted');
    return;
  }

  // Sort by distance from user's last-known location so the 20 registered
  // regions are actually the 20 nearest to the user (not a random slice).
  let sorted = [...cinemas];
  const home = await getUserHomeCoords();
  if (home) {
    sorted.sort(
      (a, b) =>
        haversineDistance(home.latitude, home.longitude, a.latitude, a.longitude) -
        haversineDistance(home.latitude, home.longitude, b.latitude, b.longitude)
    );
  }

  const selected = sorted.slice(0, GEOFENCE_MAX_REGIONS);

  // Persist name map before registering so background task can look up names
  await saveCinemaNameMap(selected.map((c) => ({ id: c.id, name: c.name })));

  const regions = selected.map((cinema) => ({
    identifier: cinema.id,
    latitude: cinema.latitude,
    longitude: cinema.longitude,
    radius: 100, // hardcoded 100m for real cinema detection
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
