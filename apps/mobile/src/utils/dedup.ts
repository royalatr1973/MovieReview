import { v4 as uuidv4 } from 'uuid';

export function generateClientEventId(): string {
  return uuidv4();
}

export function isDuplicate<T extends { clientEventId: string }>(
  items: T[],
  clientEventId: string
): boolean {
  return items.some((item) => item.clientEventId === clientEventId);
}
