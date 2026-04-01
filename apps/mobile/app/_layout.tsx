import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth';
import { useVisitStore } from '../src/stores/visits';

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
        v.promptState !== 'discarded' &&
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

export default function RootLayout() {
  const { loadToken } = useAuthStore();
  const router = useRouter();
  const notificationListenerRef = useRef<any>(null);

  useEffect(() => {
    loadToken();
  }, []);

  // Pick up pending visits on app launch and when app comes to foreground
  useEffect(() => {
    // Check on mount
    const timeout = setTimeout(() => {
      const visit = pickUpPendingVisits();
      if (visit) {
        router.push(`/visit/${visit.visitId}/confirm`);
      }
    }, 1000);

    // Check when app returns to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const visit = pickUpPendingVisits();
        if (visit) {
          router.push(`/visit/${visit.visitId}/confirm`);
        }
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
