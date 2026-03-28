import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GEOFENCE_MAX_REGIONS } from '@moviereview/shared';
import type { Cinema } from '@moviereview/shared';

export const GEOFENCE_TASK_NAME = 'cinema-geofence-task';

export interface GeofenceEvent {
  cinemaId: string;
  cinemaName: string;
  eventType: 'enter' | 'exit';
  timestamp: string;
  latitude: number;
  longitude: number;
}

type GeofenceCallback = (event: GeofenceEvent) => void;

let onGeofenceEvent: GeofenceCallback | null = null;

export function setGeofenceCallback(callback: GeofenceCallback) {
  onGeofenceEvent = callback;
}

// Define the background task
TaskManager.defineTask(GEOFENCE_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  const event: GeofenceEvent = {
    cinemaId: region.identifier!,
    cinemaName: (region as any).cinemaName || region.identifier!,
    eventType:
      eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit',
    timestamp: new Date().toISOString(),
    latitude: region.latitude,
    longitude: region.longitude,
  };

  if (onGeofenceEvent) {
    onGeofenceEvent(event);
  }
});

export async function registerGeofences(cinemas: Cinema[]): Promise<void> {
  const hasPermission = await checkBackgroundLocationPermission();
  if (!hasPermission) {
    console.warn('Background location permission not granted');
    return;
  }

  // iOS limits to 20 regions, take nearest or first N
  const regions = cinemas.slice(0, GEOFENCE_MAX_REGIONS).map((cinema) => ({
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

export async function sortCinemasByDistance(
  cinemas: Cinema[],
  userLat: number,
  userLng: number
): Promise<Cinema[]> {
  return [...cinemas].sort((a, b) => {
    const distA = haversineDistance(userLat, userLng, a.latitude, a.longitude);
    const distB = haversineDistance(userLat, userLng, b.latitude, b.longitude);
    return distA - distB;
  });
}

function haversineDistance(
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
