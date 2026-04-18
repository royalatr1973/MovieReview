import * as FileSystem from 'expo-file-system';

/**
 * Small disk cache for TMDB posters. Filename is derived from the URL so
 * repeated renders of the same poster don't re-fetch. The disk copy
 * survives app kills and makes offline browsing work.
 */
const CACHE_DIR = `${FileSystem.cacheDirectory}posters/`;

let ensured = false;
async function ensureCacheDir(): Promise<void> {
  if (ensured) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  ensured = true;
}

function filenameFor(url: string): string {
  // Take the last path segment; fall back to a hash-like hex of the URL.
  const match = url.match(/([^/]+)(?:\?.*)?$/);
  if (match && match[1] && match[1].includes('.')) return match[1];
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (h * 31 + url.charCodeAt(i)) >>> 0;
  }
  return `${h.toString(16)}.img`;
}

/**
 * Returns a file:// URI for the cached copy of the poster, downloading it
 * on the first call. If anything fails, returns the original URL so the
 * caller can fall back to a network fetch.
 */
export async function getCachedPosterUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    await ensureCacheDir();
    const dest = `${CACHE_DIR}${filenameFor(url)}`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return info.uri;
    const res = await FileSystem.downloadAsync(url, dest);
    return res.uri;
  } catch {
    return url;
  }
}
