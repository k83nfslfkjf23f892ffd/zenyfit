/**
 * Server-side in-memory API response cache
 *
 * Reduces Firestore reads by caching API responses for short TTLs.
 * Same in-memory Map approach as rate-limit.ts.
 */

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

/** Default TTLs per route (ms) */
export const CACHE_TTLS = {
  '/api/leaderboard/stats': 2 * 60 * 1000,
  '/api/leaderboard/trend': 2 * 60 * 1000,
  '/api/achievements': 2 * 60 * 1000,
  '/api/profile/stats': 2 * 60 * 1000,
  '/api/leaderboard': 2 * 60 * 1000,
  '/api/challenges': 1 * 60 * 1000,
} as const;

/**
 * Build a cache key from route + userId + optional query params
 */
function buildKey(route: string, userId: string, params?: string): string {
  return params ? `${route}:${userId}:${params}` : `${route}:${userId}`;
}

/**
 * Get cached response data if fresh
 */
export function getCached<T>(route: string, userId: string, params?: string): T | null {
  const key = buildKey(route, userId, params);
  const entry = cache.get(key);

  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store response data in cache
 */
export function setCache(route: string, userId: string, data: unknown, ttlMs?: number, params?: string): void {
  const key = buildKey(route, userId, params);
  const ttl = ttlMs ?? CACHE_TTLS[route as keyof typeof CACHE_TTLS] ?? 2 * 60 * 1000;

  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}

/**
 * Invalidate cache for a specific route + user
 */
export function invalidateCache(route: string, userId: string): void {
  const prefix = `${route}:${userId}`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Cleanup expired entries (called periodically)
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 5 * 60 * 1000);
}
