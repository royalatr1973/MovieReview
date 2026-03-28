import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth';

export default function Index() {
  const { token, hasCompletedOnboarding } = useAuthStore();

  if (!token || !hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
