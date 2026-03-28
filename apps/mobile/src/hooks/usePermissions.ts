import { useCallback } from 'react';
import * as Location from 'expo-location';
import { requestNotificationPermission } from '../services/notifications';

export function usePermissions() {
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    // First request foreground permission
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    // Then request background permission
    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    return background === 'granted';
  }, []);

  return {
    requestLocationPermission,
    requestNotificationPermission,
  };
}
