/**
 * In-memory caches for /api/leaderboard/stats
 *
 * Extracted to a separate module so the DELETE handler can invalidate
 * these caches without exporting from a Next.js route file.
 */

export interface StatsAggregation {
  repsByExercise: Record<string, number>;
  activityByPeriod: Record<string, { reps: number; workouts: number }>;
  repsByPeriod: Record<string, Record<string, number>>;
  totalWorkouts: number;
}

export interface CommunityCache {
  data: Record<string, unknown>;
  expiry: number;
  lastTimestamp: number;
  aggregation: StatsAggregation;
}

export interface PersonalCache {
  data: Record<string, unknown>;
  expiry: number;
  lastTimestamp: number;
  aggregation: StatsAggregation;
}

export const communityCache = new Map<string, CommunityCache>();
export const personalCache = new Map<string, PersonalCache>();

/**
 * Invalidate stats caches after a workout is deleted.
 * Clears all community caches (they include all users' data)
 * and the specific user's personal caches.
 */
export function invalidateStatsCaches(userId: string): void {
  communityCache.clear();
  for (const key of personalCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      personalCache.delete(key);
    }
  }
}
