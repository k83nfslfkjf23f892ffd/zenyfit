import type { User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';
import {
  getPendingWorkouts,
  removePendingWorkout,
  markSyncing,
  markPending,
  onPendingCountChange,
} from './offline-queue';
import { invalidateWorkoutCaches } from './client-cache';

let initialized = false;
let firebaseUserRef: FirebaseUser | null = null;
let syncing = false;

// Syncing state listeners
type SyncingListener = (isSyncing: boolean) => void;
const syncingListeners = new Set<SyncingListener>();

export function onSyncingChange(callback: SyncingListener): () => void {
  syncingListeners.add(callback);
  return () => { syncingListeners.delete(callback); };
}

function setSyncing(value: boolean) {
  syncing = value;
  syncingListeners.forEach(cb => cb(value));
}

export function isSyncing(): boolean {
  return syncing;
}

async function syncPendingWorkouts() {
  if (syncing || !firebaseUserRef || !navigator.onLine) return;

  const pending = await getPendingWorkouts();
  const toSync = pending.filter(w => w.status === 'pending');
  if (toSync.length === 0) return;

  setSyncing(true);
  let syncedCount = 0;
  let failedCount = 0;
  const total = toSync.length;

  try {
    const token = await firebaseUserRef.getIdToken(true);

    if (total > 1) {
      toast.info(`Syncing ${total} workouts...`);
    }

    for (const workout of toSync) {
      await markSyncing(workout.id);

      try {
        const response = await fetch('/api/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            type: workout.type,
            amount: workout.amount,
            sets: workout.sets,
            loggedAt: workout.queuedAt,
            _idempotencyKey: workout.id,
          }),
        });

        if (response.ok) {
          await removePendingWorkout(workout.id);
          syncedCount++;
        } else {
          const data = await response.json().catch(() => ({}));
          // Validation errors (400) — don't retry, remove from queue
          if (response.status === 400) {
            console.error('Server rejected offline workout:', data.error);
            await removePendingWorkout(workout.id);
            failedCount++;
            toast.error(`Sync rejected: ${data.error || 'Invalid workout'}`);
          } else {
            // Transient error — mark back to pending for retry
            await markPending(workout.id);
            break;
          }
        }
      } catch {
        // Network error during sync — mark back to pending
        await markPending(workout.id);
        break;
      }

      // 500ms delay between syncs to avoid rate limits
      if (toSync.indexOf(workout) < toSync.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (syncedCount > 0) {
      invalidateWorkoutCaches();
      const remaining = total - syncedCount - failedCount;
      if (remaining > 0) {
        toast.warning(`${syncedCount} synced, ${remaining} still pending`);
      } else {
        toast.success(`${syncedCount} workout${syncedCount > 1 ? 's' : ''} synced`);
      }
    }
  } catch {
    // Token refresh failed or other error — workouts stay queued
    console.error('Sync failed — will retry when online');
    toast.error('Sync failed — will retry when back online');
  } finally {
    setSyncing(false);
  }
}

export function initSyncEngine(firebaseUser: FirebaseUser) {
  firebaseUserRef = firebaseUser;

  if (initialized) return;
  initialized = true;

  window.addEventListener('online', () => {
    syncPendingWorkouts();
  });

  // Sync on init if online and queue has items
  if (navigator.onLine) {
    syncPendingWorkouts();
  }
}

// Re-export for hook
export { onPendingCountChange };
