// Offline sync utility for iOS and manual sync fallback
// Handles syncing queued workouts from IndexedDB when Background Sync API isn't available

const DB_NAME = 'ZenyFitDB';
const QUEUE_STORE = 'workout-queue';

interface QueuedRequest {
  id: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const getAllQueuedRequests = async (): Promise<QueuedRequest[]> => {
  const db = await openDB();
  const transaction = db.transaction([QUEUE_STORE], 'readonly');
  const store = transaction.objectStore(QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteQueuedRequest = async (id: number): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([QUEUE_STORE], 'readwrite');
  const store = transaction.objectStore(QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const syncOfflineWorkouts = async (): Promise<number> => {
  if (!navigator.onLine) {
    return 0; // Not online, skip sync
  }

  try {
    const queuedRequests = await getAllQueuedRequests();

    if (queuedRequests.length === 0) {
      return 0; // Nothing to sync
    }

    let syncedCount = 0;

    for (const queuedRequest of queuedRequests) {
      try {
        const response = await fetch(queuedRequest.url, {
          method: queuedRequest.method,
          headers: queuedRequest.headers,
          body: queuedRequest.body
        });

        if (response.ok) {
          await deleteQueuedRequest(queuedRequest.id);
          syncedCount++;
          console.log('Successfully synced queued workout');
        }
      } catch (error) {
        console.error('Failed to sync workout:', error);
        // Keep in queue for next sync attempt
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('Error syncing offline workouts:', error);
    return 0;
  }
};

export const getQueuedWorkoutsCount = async (): Promise<number> => {
  try {
    const queued = await getAllQueuedRequests();
    return queued.length;
  } catch (error) {
    console.error('Error getting queued workouts count:', error);
    return 0;
  }
};
