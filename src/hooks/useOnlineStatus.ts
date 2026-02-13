'use client';

import { useState, useEffect } from 'react';
import { onPendingCountChange, onSyncingChange, isSyncing } from '@/lib/offline-sync';
import { getPendingCount } from '@/lib/offline-queue';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(() => isSyncing());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to pending count changes
    const unsubCount = onPendingCountChange(setPendingCount);
    const unsubSyncing = onSyncingChange(setSyncing);

    // Get initial count
    getPendingCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubCount();
      unsubSyncing();
    };
  }, []);

  return { isOnline, pendingCount, isSyncing: syncing };
}
