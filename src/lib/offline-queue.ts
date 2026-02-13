import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'zenyfit_offline';
const STORE_NAME = 'pending_workouts';
const DB_VERSION = 1;

export interface PendingWorkout {
  id: string;
  type: string;
  amount: number;
  sets: number;
  queuedAt: number;
  status: 'pending' | 'syncing';
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueWorkout(workout: { type: string; amount: number; sets: number }): Promise<void> {
  const db = await getDB();
  const entry: PendingWorkout = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: workout.type,
    amount: workout.amount,
    sets: workout.sets,
    queuedAt: Date.now(),
    status: 'pending',
  };
  await db.put(STORE_NAME, entry);
  notifyListeners();
}

export async function getPendingWorkouts(): Promise<PendingWorkout[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return (all as PendingWorkout[]).sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_NAME);
}

export async function removePendingWorkout(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  notifyListeners();
}

export async function markSyncing(id: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get(STORE_NAME, id) as PendingWorkout | undefined;
  if (entry) {
    entry.status = 'syncing';
    await db.put(STORE_NAME, entry);
  }
}

export async function markPending(id: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get(STORE_NAME, id) as PendingWorkout | undefined;
  if (entry) {
    entry.status = 'pending';
    await db.put(STORE_NAME, entry);
  }
}

// Listener pattern for UI reactivity
type PendingCountListener = (count: number) => void;
const listeners = new Set<PendingCountListener>();

export function onPendingCountChange(callback: PendingCountListener): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

async function notifyListeners() {
  const count = await getPendingCount();
  listeners.forEach(cb => cb(count));
}
