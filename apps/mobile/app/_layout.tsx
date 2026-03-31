import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth';
import { useVisitStore } from '../src/stores/visits';

// Import task definitions so they register before the app renders (safe on all platforms)
import '../src/services/geofence';
import '../src/tasks/background-location';

// Declare global for pending visits from geofence background task
declare global {
  var _pendingVisits: Array<{
    visitId: string;
    cinemaId: string;
    cinemaName: string;
    entryTime: string;
    exitTime: string;
    dwellMinutes: number;
    latitude: number;
    longitude: number;
  }> | undefined;
}

export default function RootLayout() {
  const { loadToken } = useAuthStore();
  const { addVisit } = useVisitStore();
  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, []);

  // Poll for pending visits from geofence background task (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let notificationListener: any;

    // Set up notification response listener for when user taps notification
    try {
      const Notifications = require('expo-notifications');
      notificationListener = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const { visitId } = response.notification.request.content.data || {};
          if (visitId) {
            router.push(`/visit/${visitId}/confirm`);
          }
        }
      );
    } catch (e) {
      // expo-notifications not available
    }

    // Poll for pending visits from background geofence task
    const interval = setInterval(() => {
      if (global._pendingVisits && global._pendingVisits.length > 0) {
        const visits = [...global._pendingVisits];
        global._pendingVisits = [];

        for (const pv of visits) {
          addVisit({
            visitId: pv.visitId,
            userId: 'local-user',
            cinemaId: pv.cinemaId,
            cinemaName: pv.cinemaName,
            entryTime: pv.entryTime,
            exitTime: pv.exitTime,
            dwellMinutes: pv.dwellMinutes,
            locationConfidence: 0.9,
            qualificationState: 'full_review',
            promptState: 'pending',
            clientEventId: pv.visitId,
            createdAt: pv.exitTime,
            syncStatus: 'pending',
          });
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (notificationListener) {
        notificationListener.remove();
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
