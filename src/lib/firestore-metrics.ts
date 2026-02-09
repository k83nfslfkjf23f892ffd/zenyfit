/**
 * Firestore-persisted usage metrics tracking.
 * Tracks reads/writes per API route using atomic increments.
 * Works across serverless invocations (Vercel).
 */

import { getAdminInstances } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const METRICS_DOC = '_system/metrics';

// Sanitize route name for use as Firestore field (no dots or slashes)
function sanitizeRoute(route: string): string {
  return route.replace(/\//g, '_');
}

/** Track Firestore document reads for a route (fire-and-forget) */
export function trackReads(route: string, count: number) {
  const key = sanitizeRoute(route);
  try {
    const { db } = getAdminInstances();
    db.doc(METRICS_DOC).set({
      routes: {
        [key]: {
          reads: FieldValue.increment(count),
          calls: FieldValue.increment(1),
        },
      },
      totals: {
        reads: FieldValue.increment(count),
        calls: FieldValue.increment(1),
      },
    }, { merge: true }).catch(() => {});
  } catch {
    // Ignore - metrics should never break the app
  }
}

/** Track Firestore document writes for a route (fire-and-forget) */
export function trackWrites(route: string, count: number) {
  const key = sanitizeRoute(route);
  try {
    const { db } = getAdminInstances();
    db.doc(METRICS_DOC).set({
      routes: {
        [key]: {
          writes: FieldValue.increment(count),
        },
      },
      totals: {
        writes: FieldValue.increment(count),
      },
    }, { merge: true }).catch(() => {});
  } catch {
    // Ignore
  }
}

/** Track a cache hit (fire-and-forget) */
export function trackCacheHit(route: string) {
  const key = sanitizeRoute(route);
  try {
    const { db } = getAdminInstances();
    db.doc(METRICS_DOC).set({
      routes: {
        [key]: {
          cacheHits: FieldValue.increment(1),
          calls: FieldValue.increment(1),
        },
      },
      totals: {
        cacheHits: FieldValue.increment(1),
        calls: FieldValue.increment(1),
      },
    }, { merge: true }).catch(() => {});
  } catch {
    // Ignore
  }
}

/** Get all metrics */
export async function getMetrics() {
  const { db } = getAdminInstances();
  const doc = await db.doc(METRICS_DOC).get();

  if (!doc.exists) {
    return {
      totals: { reads: 0, writes: 0, calls: 0, cacheHits: 0 },
      routes: [],
      startedAt: null,
    };
  }

  const data = doc.data()!;
  const totals = data.totals || { reads: 0, writes: 0, calls: 0, cacheHits: 0 };
  const routesMap = data.routes || {};

  const routes = Object.entries(routesMap).map(([route, m]) => {
    const metrics = m as Record<string, number>;
    return {
      route: route.replace(/_/g, '/'),
      reads: metrics.reads || 0,
      writes: metrics.writes || 0,
      calls: metrics.calls || 0,
      cacheHits: metrics.cacheHits || 0,
    };
  });

  routes.sort((a, b) => b.reads - a.reads);

  return {
    totals,
    routes,
    startedAt: data.startedAt || null,
  };
}

/** Reset all metrics */
export async function resetMetrics() {
  const { db } = getAdminInstances();
  await db.doc(METRICS_DOC).set({
    totals: { reads: 0, writes: 0, calls: 0, cacheHits: 0 },
    routes: {},
    startedAt: Date.now(),
  });
}
