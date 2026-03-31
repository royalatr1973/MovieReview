import * as Notifications from 'expo-notifications';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('Failed to set notification handler:', e);
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleReviewPrompt(
  cinemaName: string,
  visitId: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rate your movie!',
      body: `Looks like you just left ${cinemaName}. How was the movie?`,
      data: { visitId, type: 'review_prompt' },
    },
    trigger: null,
  });
}

export async function scheduleDelayedPrompt(
  cinemaName: string,
  visitId: string,
  delaySeconds: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rate your movie!',
      body: `You visited ${cinemaName} recently. Want to leave a review?`,
      data: { visitId, type: 'review_prompt' },
    },
    trigger: { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
