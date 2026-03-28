export function isIdempotentCreate<T extends { clientEventId: string }>(
  existing: T | null
): boolean {
  return existing !== null;
}
