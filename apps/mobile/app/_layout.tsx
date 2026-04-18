import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth';
import { useVisitStore } from '../src/stores/visits';
import { useSettingsStore } from '../src/stores/settings';
import { getDatabase } from '../src/db/database';
import { bulkUpsertCinemas, getCinemaCount, getActiveCinemas } from '../src/db/cinemas';
import { countRecentVisitsToCinema } from '../src/db/visits';
import { CHENNAI_CINEMAS } from '../src/data/chennai-cinemas';
import { runSync } from '../src/services/sync';
import { warmupApi } from '../src/services/api-client';
import { qualifyVisitLocally, shouldPromptUser } from '../src/services/visit-qualifier';
import { drainPendingVisits, peekPendingVisits, removePendingVisit } from '../src/services/geofence';
import { fetchNotificationPreference } from '../src/services/notification-preferences';
import { useWatchlistStore } from '../src/stores/watchlist';
import { EMPLOYEE_DETECTION } from '@moviereview/shared';

// Import geofence task definition so it registers at top level
if (Platform.OS !== 'web') {
  try { require('../src/services/geofence'); } catch (e) {}
  try { require('../src/services/notifications'); } catch (e) {}
  try { require('../src/tasks/background-sync'); } catch (e) {}
}

const USER_ID = 'local-user';

/**
 * Drain persisted pending visits from AsyncStorage, apply real qualification
 * thresholds, dedupe, and insert into the visit store. Returns the most
 * recent visit that should trigger navigation, or null.
 */
async function pickUpPendingVisits(): Promise<{ visitId: string; shouldNavigate: boolean } | null> {
  const pending = await drainPendingVisits();
  if (pending.length === 0) return null;

  const db = await getDatabase();
  const { addVisit, visits } = useVisitStore.getState();
  const now = Date.now();

  let lastPromptable: { visitId: string; shouldNavigate: boolean } | null = null;

  for (const pv of pending) {
    // Deduplicate: skip if a non-discarded visit for this cinema exists within the last 4 hours
    const recentDupe = visits.find(
      (v) =>
        v.cinemaId === pv.cinemaId &&
        v.promptState !== 'dismissed' &&
        now - new Date(v.createdAt).getTime() < 4 * 60 * 60 * 1000
    );
    if (recentDupe) continue;

    // Compute recent visit count for employee detection
    let recentVisitCount = 0;
    if (db) {
      try {
        recentVisitCount = await countRecentVisitsToCinema(
          db,
          USER_ID,
          pv.cinemaId,
          EMPLOYEE_DETECTION.WINDOW_DAYS
        );
      } catch (err) {
        console.error('[pickUpPendingVisits] countRecentVisitsToCinema failed:', err);
      }
    }

    const qualificationState = qualifyVisitLocally({
      dwellMinutes: pv.dwellMinutes,
      locationConfidence: 0.9,
      recentVisitCountAtSameCinema: recentVisitCount,
    });

    // Discard short/noise visits silently — don't even record them
    if (qualificationState === 'discarded') {
      console.log(`[pickUpPendingVisits] Discarded visit at ${pv.cinemaName} (dwell=${pv.dwellMinutes}m)`);
      continue;
    }

    addVisit({
      visitId: pv.visitId,
      userId: USER_ID,
      cinemaId: pv.cinemaId,
      cinemaName: pv.cinemaName,
      entryTime: pv.entryTime,
      exitTime: pv.exitTime,
      dwellMinutes: pv.dwellMinutes,
      locationConfidence: 0.9,
      qualificationState,
      promptState: 'pending',
      clientEventId: pv.visitId,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
    });

    // Only navigate if this visit actually warrants a prompt.
    // employee_check visits are recorded but NOT prompted.
    if (shouldPromptUser(qualificationState)) {
      lastPromptable = { visitId: pv.visitId, shouldNavigate: true };
    }
  }

  return lastPromptable;
}

/** Seed the cinema cache on first launch and auto-register geofences. */
async function initializeCinemasAndGeofences(): Promise<void> {
  if (Platform.OS === 'web') return;

  const db = await getDatabase();
  if (!db) return;

  try {
    // Seed cinemas if the local cache is empty
    const count = await getCinemaCount(db);
    if (count === 0) {
      await bulkUpsertCinemas(db, CHENNAI_CINEMAS);
      console.log(`[Init] Seeded ${CHENNAI_CINEMAS.length} Chennai cinemas`);
    }

    // Try to save current user location so nearest-cinema selection works.
    try {
      const Location = require('expo-location');
      const { saveUserHomeCoords } = require('../src/services/geofence');
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status === 'granted') {
        const pos = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 });
        if (pos?.coords) {
          await saveUserHomeCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      }
    } catch (err) {
      console.warn('[Init] Could not save user home coords:', err);
    }

    // Wait for settings to hydrate, then respect the Cinema Detection toggle.
    await useSettingsStore.getState().hydrate();
    const { cinemaDetectionEnabled } = useSettingsStore.getState();

    // Register geofences using whatever is active in the DB
    const { registerGeofences, startForegroundKeepalive } = require('../src/services/geofence');
    if (cinemaDetectionEnabled) {
      const cinemas = await getActiveCinemas(db);
      if (cinemas.length > 0) {
        const cinemaList = cinemas.map((c) => ({
          id: c.id,
          name: c.name,
          latitude: c.latitude,
          longitude: c.longitude,
          radius: c.radius,
          address: c.address ?? undefined,
          chain: c.chain ?? undefined,
          city: c.city,
          active: c.active,
        }));
        await registerGeofences(cinemaList);
      }

      // Start the foreground-service keepalive so geofence events fire
      // reliably even under Android Doze mode. Shows a persistent notification.
      try {
        await startForegroundKeepalive();
      } catch (err) {
        console.warn('[Init] Failed to start foreground keepalive:', err);
      }
    } else {
      console.log('[Init] Cinema detection disabled by user — skipping geofence registration.');
    }

    // Register background sync so queued items upload every ~15 min even
    // when the app isn't open.
    try {
      const { registerBackgroundSync } = require('../src/tasks/background-sync');
      await registerBackgroundSync();
    } catch (err) {
      console.warn('[Init] Failed to register background sync:', err);
    }
  } catch (err) {
    console.error('[Init] Failed to seed cinemas/geofences:', err);
  }
}

export default function RootLayout() {
  const { loadToken } = useAuthStore();
  const router = useRouter();
  const notificationListenerRef = useRef<any>(null);

  useEffect(() => {
    loadToken();
    // Hydrate persisted settings (toggles, test dwell, radius) so background
    // tasks reading AsyncStorage see the user's latest preferences.
    useSettingsStore.getState().hydrate();
    // Kick off a warmup ping so the Render free-tier backend wakes up before
    // the first real API call blocks a user-facing screen.
    warmupApi();
  }, []);

  // Initialize DB, seed cinemas, register geofences on first launch
  useEffect(() => {
    initializeCinemasAndGeofences();
  }, []);

  // Pick up pending visits on app launch and when app comes to foreground
  // Also trigger a background sync pass each time
  useEffect(() => {
    // Check on mount
    const timeout = setTimeout(async () => {
      const visit = await pickUpPendingVisits();
      if (visit?.shouldNavigate) {
        router.push(`/visit/${visit.visitId}/confirm`);
      }
      // Fire sync after a short delay to let auth token load first
      runSync();
      // Refresh notification preference cache (opt-in, quiet hours, digest)
      fetchNotificationPreference().catch(() => {});
      // Pull watchlist from server so devices stay in sync
      useWatchlistStore.getState().syncFromServer();
    }, 1500);

    // Check when app returns to foreground
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const visit = await pickUpPendingVisits();
        if (visit?.shouldNavigate) {
          router.push(`/visit/${visit.visitId}/confirm`);
        }
        runSync();
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, []);

  // Listen for notification taps
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let Notifications: any;
    try {
      Notifications = require('expo-notifications');
    } catch {
      return;
    }

    notificationListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      async (response: any) => {
        const data = response.notification.request.content.data;
        if (data?.type !== 'review_prompt' || !data?.visitId) return;

        // Drain pending visits first — this will insert any that haven't been
        // picked up yet (e.g. app was killed when the geofence fired).
        await pickUpPendingVisits();

        const { getVisit, addVisit } = useVisitStore.getState();

        // If the visit was qualified and inserted by drain, just navigate.
        if (getVisit(data.visitId)) {
          router.push(`/visit/${data.visitId}/confirm`);
          return;
        }

        // Otherwise, the visit may still be in the queue (e.g. discarded by
        // qualification) OR it's truly lost. Try to recover it from the
        // persisted queue and insert manually so the user can still review.
        const stillPending = await peekPendingVisits();
        const recovered = stillPending.find((v) => v.visitId === data.visitId);
        if (recovered) {
          addVisit({
            visitId: recovered.visitId,
            userId: USER_ID,
            cinemaId: recovered.cinemaId,
            cinemaName: recovered.cinemaName,
            entryTime: recovered.entryTime,
            exitTime: recovered.exitTime,
            dwellMinutes: recovered.dwellMinutes,
            locationConfidence: 0.9,
            qualificationState: 'soft_confirm',
            promptState: 'pending',
            clientEventId: recovered.visitId,
            createdAt: new Date().toISOString(),
            syncStatus: 'pending',
          });
          await removePendingVisit(recovered.visitId);
          router.push(`/visit/${data.visitId}/confirm`);
          return;
        }

        // Truly lost — route to the visit confirm screen which will show a
        // recovery state for unknown visitIds. No fake data is injected.
        console.warn('[NotificationTap] Visit not found in store or queue:', data.visitId);
        router.push(`/visit/${data.visitId}/confirm`);
      }
    );

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#16213e' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="visit/[visitId]/confirm"
          options={{ title: 'Cinema Visit', presentation: 'modal' }}
        />
        <Stack.Screen
          name="visit/[visitId]/select-movie"
          options={{ title: 'Select Movie' }}
        />
        <Stack.Screen
          name="visit/[visitId]/rate"
          options={{ title: 'Rate Movie' }}
        />
        <Stack.Screen
          name="review/[reviewId]"
          options={{ title: 'Review Details' }}
        />
        <Stack.Screen
          name="movie/[movieId]"
          options={{ title: 'Movie Details' }}
        />
        <Stack.Screen
          name="notifications/preferences"
          options={{ title: 'Notifications' }}
        />
        <Stack.Screen
          name="cinema/[cinemaId]"
          options={{ title: 'Cinema' }}
        />
        <Stack.Screen
          name="watchlist"
          options={{ title: 'Watchlist' }}
        />
      </Stack>
    </>
  );
}
