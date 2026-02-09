/**
 * In-memory Firestore usage metrics tracking.
 * Tracks reads/writes per API route. Resets on server restart/deploy.
 */

interface RouteMetrics {
  reads: number;
  writes: number;
  calls: number;
  cacheHits: number;
}

const metrics = new Map<string, RouteMetrics>();
let startedAt = Date.now();

function getOrCreate(route: string): RouteMetrics {
  let m = metrics.get(route);
  if (!m) {
    m = { reads: 0, writes: 0, calls: 0, cacheHits: 0 };
    metrics.set(route, m);
  }
  return m;
}

/** Track Firestore document reads for a route */
export function trackReads(route: string, count: number) {
  const m = getOrCreate(route);
  m.reads += count;
  m.calls += 1;
}

/** Track Firestore document writes for a route */
export function trackWrites(route: string, count: number) {
  const m = getOrCreate(route);
  m.writes += count;
}

/** Track a cache hit (no Firestore read needed) */
export function trackCacheHit(route: string) {
  const m = getOrCreate(route);
  m.cacheHits += 1;
  m.calls += 1;
}

/** Get all metrics as a summary */
export function getMetrics() {
  const routes: Array<{
    route: string;
    reads: number;
    writes: number;
    calls: number;
    cacheHits: number;
  }> = [];

  let totalReads = 0;
  let totalWrites = 0;
  let totalCalls = 0;
  let totalCacheHits = 0;

  for (const [route, m] of metrics.entries()) {
    routes.push({ route, ...m });
    totalReads += m.reads;
    totalWrites += m.writes;
    totalCalls += m.calls;
    totalCacheHits += m.cacheHits;
  }

  // Sort by reads descending (heaviest first)
  routes.sort((a, b) => b.reads - a.reads);

  return {
    startedAt,
    uptimeMs: Date.now() - startedAt,
    totals: {
      reads: totalReads,
      writes: totalWrites,
      calls: totalCalls,
      cacheHits: totalCacheHits,
    },
    routes,
  };
}

/** Reset all metrics */
export function resetMetrics() {
  metrics.clear();
  startedAt = Date.now();
}
