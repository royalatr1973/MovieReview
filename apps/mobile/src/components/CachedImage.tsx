import { useEffect, useState } from 'react';
import { Image, ImageProps, ImageSourcePropType } from 'react-native';
import { getCachedPosterUri } from '../services/poster-cache';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string | null | undefined;
  fallback?: ImageSourcePropType;
}

/**
 * Drop-in Image replacement that downloads a remote URL into the filesystem
 * cache on first render and thereafter serves from disk. Falls back to the
 * original URL if caching fails.
 */
export function CachedImage({ uri, fallback, ...rest }: CachedImageProps) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setResolved(null);
      return;
    }
    getCachedPosterUri(uri).then((r) => {
      if (!cancelled) setResolved(r);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!resolved) {
    if (fallback) return <Image {...rest} source={fallback} />;
    return null;
  }
  return <Image {...rest} source={{ uri: resolved }} />;
}
