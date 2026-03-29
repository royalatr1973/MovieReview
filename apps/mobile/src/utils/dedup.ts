import * as Crypto from 'expo-crypto';

export function generateClientEventId(): string {
  return Crypto.randomUUID();
}

export function isDuplicate<T extends { clientEventId: string }>(
  items: T[],
  clientEventId: string
): boolean {
  return items.some((item) => item.clientEventId === clientEventId);
}
