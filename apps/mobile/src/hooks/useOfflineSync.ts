import { useEffect, useRef } from 'react';
import * as Network from 'expo-network';

export function useOfflineSync(onSync: () => Promise<void>) {
  const syncingRef = useRef(false);

  useEffect(() => {
    const checkAndSync = async () => {
      if (syncingRef.current) return;

      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) return;

      syncingRef.current = true;
      try {
        await onSync();
      } catch (err) {
        console.error('Sync error:', err);
      } finally {
        syncingRef.current = false;
      }
    };

    // Sync on mount
    checkAndSync();

    // Periodic sync every 15 minutes
    const interval = setInterval(checkAndSync, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [onSync]);
}
