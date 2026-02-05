/**
 * Shared client-side cache utilities
 *
 * Provides consistent cache-with-TTL for all components.
 * Widgets and pages reading the same API share one cache entry,
 * so the first component to fetch writes cache and others reuse it.
 */

/** Shared cache keys — widgets/pages reading same API use the same key */
export const CACHE_KEYS = {
  profileStats: 'zenyfit_profile_stats_v2',
  trend: 'zenyfit_trend_cache',
  statsGrid: 'zenyfit_stats_grid_v2',
  challenges: 'zenyfit_challenges',
  achievements: 'zenyfit_achievements_v2',
  rankings: 'zenyfit_rankings_cache',
  chartData: 'zenyfit_chart_cache',
  chartFilters: 'zenyfit_chart_filters',
} as const;

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheWrapper<T> {
  data: T;
  timestamp: number;
}

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
}

/**
 * Get cached data with staleness info.
 * Returns null if no cache exists.
 * Returns { data, isStale: false } if cache is fresh (< TTL).
 * Returns { data, isStale: true } if cache exists but is expired.
 */
export function getCache<T>(key: string, ttl: number = DEFAULT_TTL): CacheResult<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const wrapper: CacheWrapper<T> = JSON.parse(raw);
    if (!wrapper || !wrapper.data) return null;

    const age = Date.now() - wrapper.timestamp;
    return {
      data: wrapper.data,
      isStale: age >= ttl,
    };
  } catch {
    return null;
  }
}

/**
 * Get cached data from a nested cache (keyed by sub-key within one localStorage entry).
 * Used for caches that store multiple variants (e.g. rankings by type, challenges by filter).
 */
export function getNestedCache<T>(
  key: string,
  subKey: string,
  ttl: number = DEFAULT_TTL
): CacheResult<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const outer = JSON.parse(raw);
    const entry = outer[subKey];
    if (!entry || !entry.data) return null;

    const age = Date.now() - entry.timestamp;
    return {
      data: entry.data,
      isStale: age >= ttl,
    };
  } catch {
    return null;
  }
}

/**
 * Set cache data with current timestamp.
 */
export function setLocalCache<T>(key: string, data: T): void {
  try {
    const wrapper: CacheWrapper<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(wrapper));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Set nested cache data (one sub-key within a multi-entry cache).
 */
export function setNestedCache<T>(key: string, subKey: string, data: T): void {
  try {
    const raw = localStorage.getItem(key);
    const outer = raw ? JSON.parse(raw) : {};
    outer[subKey] = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(outer));
  } catch {
    // Ignore storage errors
  }
}
