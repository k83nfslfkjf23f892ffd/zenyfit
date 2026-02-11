'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, WifiOff, Check } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = useOnlineStatus();
  const [showSynced, setShowSynced] = useState(false);
  const [prevSyncing, setPrevSyncing] = useState(false);

  // Show "Synced" flash when syncing completes
  useEffect(() => {
    if (prevSyncing && !isSyncing && isOnline && pendingCount === 0) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevSyncing(isSyncing);
  }, [isSyncing, isOnline, pendingCount, prevSyncing]);

  const showBanner = !isOnline || isSyncing || showSynced;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
              showSynced
                ? 'bg-emerald-500/15 text-emerald-400'
                : isSyncing
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {showSynced ? (
              <>
                <Check className="h-4 w-4" />
                <span>All synced</span>
              </>
            ) : isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Syncing {pendingCount} workout{pendingCount !== 1 ? 's' : ''}...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Offline — workouts will be saved locally</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
