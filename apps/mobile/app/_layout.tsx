import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth';
import { useVisitStore } from '../src/stores/visits';
import { getDatabase } from '../src/db/database';
import { bulkUpsertCinemas, getCinemaCount, getActiveCinemas } from '../src/db/cinemas';
import { CHENNAI_CINEMAS } from '../src/data/chennai-cinemas';
import { runSync } from '../src/services/sync';

// Import geofence task definition so it registers at top level
if (Platform.OS !== 'web') {
  try { require('../src/services/geofence'); } catch (e) {}
  try { require('../src/services/notifications'); } catch (e) {}
}

function pickUpPendingVisits() {
  if (!global._pendingVisits || global._pendingVisits.length === 0) return null;
  const pending = [...global._pendingVisits];
  global._pendingVisits = [];

  const { addVisit, visits } = useVisitStore.getState();
  const now = Date.now();
  for (const pv of pending) {
    // Deduplicate: skip if a non-discarded visit for this cinema exists within the last 4 hours
    const recentDupe = visits.find(
      (v) =>
        v.cinemaId === pv.cinemaId &&
        v.promptState !== 'dismissed' &&
        now - new Date(v.createdAt).getTime() < 4 * 60 * 60 * 1000
    );
    if (recentDupe) continue;

    addVisit({
      visitId: pv.visitId,
      userId: 'local-user',
      cinemaId: pv.cinemaId,
      cinemaName: pv.cinemaName,
      entryTime: pv.entryTime,
      exitTime: pv.exitTime,
      dwellMinutes: pv.dwellMinutes,
      locationConfidence: 0.9,
      qualificationState: 'soft_confirm',
      promptState: 'pending',
      clientEventId: pv.visitId,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
  }
  // Return the most recent visit for navigation
  return pending[pending.length - 1];
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

    // Register geofences using whatever is active in the DB
    const { registerGeofences } = require('../src/services/geofence');
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
  }, []);

  // Initialize DB, seed cinemas, register geofences on first launch
  useEffect(() => {
    initializeCinemasAndGeofences();
  }, []);

  // Pick up pending visits on app launch and when app comes to foreground
  // Also trigger a background sync pass each time
  useEffect(() => {
    // Check on mount
    const timeout = setTimeout(() => {
      const visit = pickUpPendingVisits();
      if (visit) {
        router.push(`/visit/${visit.visitId}/confirm`);
      }
      // Fire sync after a short delay to let auth token load first
      runSync();
    }, 1500);

    // Check when app returns to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const visit = pickUpPendingVisits();
        if (visit) {
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
      (response: any) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'review_prompt' && data?.visitId) {
          // Pick up any pending visits first
          pickUpPendingVisits();

          // Make sure this visit exists in the store
          const { getVisit, addVisit } = useVisitStore.getState();
          if (!getVisit(data.visitId)) {
            addVisit({
              visitId: data.visitId,
              userId: 'local-user',
              cinemaId: 'geofence-cinema',
              cinemaName: 'Cinema Visit',
              entryTime: new Date().toISOString(),
              exitTime: new Date().toISOString(),
              dwellMinutes: 1,
              locationConfidence: 0.9,
              qualificationState: 'soft_confirm',
              promptState: 'pending',
              clientEventId: data.visitId,
              createdAt: new Date().toISOString(),
              syncStatus: 'pending',
            });
          }

          router.push(`/visit/${data.visitId}/confirm`);
        }
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
      </Stack>
    </>
  );
}
