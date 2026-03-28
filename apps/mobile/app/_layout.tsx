import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth';

export default function RootLayout() {
  const { loadToken } = useAuthStore();

  useEffect(() => {
    loadToken();
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
      </Stack>
    </>
  );
}
