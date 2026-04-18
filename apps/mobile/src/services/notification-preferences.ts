import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api-client';

export const NOTIF_PREF_KEY = '@cinereview/notif_pref';

export interface NotificationPreference {
  userId: string;
  reviewUpdateOptIn: boolean;
  digestMode: 'immediate' | 'daily';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  lastNotificationSentAt: string | null;
}

/** Read the cached preference from AsyncStorage (safe to call from background tasks). */
export async function readCachedNotificationPreference(): Promise<NotificationPreference | null> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCachedNotificationPreference(pref: NotificationPreference): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREF_KEY, JSON.stringify(pref));
}

export async function fetchNotificationPreference(): Promise<NotificationPreference> {
  const pref = await api.get<NotificationPreference>('/notification-preferences');
  await writeCachedNotificationPreference(pref);
  return pref;
}

export async function updateNotificationPreference(
  patch: Partial<
    Pick<NotificationPreference, 'reviewUpdateOptIn' | 'digestMode' | 'quietHoursStart' | 'quietHoursEnd'>
  >
): Promise<NotificationPreference> {
  const pref = await api.patch<NotificationPreference>('/notification-preferences', patch);
  await writeCachedNotificationPreference(pref);
  return pref;
}

/**
 * Returns true if the current time falls within the user's quiet hours.
 * Quiet-hours strings are "HH:MM" in local time. Handles overnight wrap-around
 * (e.g. 22:00 → 08:00).
 */
export function isWithinQuietHours(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return false;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin === endMin) return false;
  if (startMin < endMin) {
    return currentMin >= startMin && currentMin < endMin;
  }
  // Overnight wrap-around (e.g. 22:00 → 08:00)
  return currentMin >= startMin || currentMin < endMin;
}
