import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getNotificationPreference(userId: string) {
  return prisma.notificationPreference.findUnique({
    where: { userId },
  });
}

export async function upsertNotificationPreference(
  userId: string,
  prefs: {
    reviewUpdateOptIn?: boolean;
    digestMode?: string;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  }
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...prefs },
    update: prefs,
  });
}

export function isInQuietHours(
  quietHoursStart: string | null,
  quietHoursEnd: string | null
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = quietHoursStart.split(':').map(Number);
  const [endH, endM] = quietHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Wraps midnight
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
