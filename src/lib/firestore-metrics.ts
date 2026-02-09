/**
 * Firestore-persisted usage metrics tracking.
 * Tracks reads/writes per API route using atomic increments.
 * Works across serverless invocations (Vercel).
 *
 * Tracking is OFF by default to save Firestore writes.
 * Set ENABLE_FIRESTORE_METRICS=true in env to enable.
 */

import { getAdminInstances } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const METRICS_DOC = '_system/metrics';
const METRICS_ENABLED = process.env.ENABLE_FIRESTORE_METRICS === 'true';

// Sanitize route name for use as Firestore field path segment
function sanitizeRoute(route: string): string {
  return route.replace(/\//g, '_');
}

function getRef() {
  const { db } = getAdminInstances();
  return db.doc(METRICS_DOC);
}

/** Ensure the metrics document exists */
async function ensureDoc() {
  const ref = getRef();
  const doc = await ref.get();
  if (!doc.exists) {
    await ref.set({
      totals: { reads: 0, writes: 0, calls: 0, cacheHits: 0 },
      routes: {},
      startedAt: Date.now(),
    });
  }
}

/** Track Firestore document reads for a route (fire-and-forget) */
export function trackReads(route: string, count: number) {
  if (!METRICS_ENABLED) return;
  const key = sanitizeRoute(route);
  try {
    getRef().update({
      [`routes.${key}.reads`]: FieldValue.increment(count),
      [`routes.${key}.calls`]: FieldValue.increment(1),
      'totals.reads': FieldValue.increment(count),
      'totals.calls': FieldValue.increment(1),
    }).catch((err) => {
      // Document might not exist yet — create it and retry
      if (err.code === 5) {
        ensureDoc().then(() => {
          getRef().update({
            [`routes.${key}.reads`]: FieldValue.increment(count),
            [`routes.${key}.calls`]: FieldValue.increment(1),
            'totals.reads': FieldValue.increment(count),
            'totals.calls': FieldValue.increment(1),
          }).catch(() => {});
        }).catch(() => {});
      }
    });
  } catch {
    // Ignore
  }
}

/** Track Firestore document writes for a route (fire-and-forget) */
export function trackWrites(route: string, count: number) {
  if (!METRICS_ENABLED) return;
  const key = sanitizeRoute(route);
  try {
    getRef().update({
      [`routes.${key}.writes`]: FieldValue.increment(count),
      'totals.writes': FieldValue.increment(count),
    }).catch((err) => {
      if (err.code === 5) {
        ensureDoc().then(() => {
          getRef().update({
            [`routes.${key}.writes`]: FieldValue.increment(count),
            'totals.writes': FieldValue.increment(count),
          }).catch(() => {});
        }).catch(() => {});
      }
    });
  } catch {
    // Ignore
  }
}

/** Track a cache hit (fire-and-forget) */
export function trackCacheHit(route: string) {
  if (!METRICS_ENABLED) return;
  const key = sanitizeRoute(route);
  try {
    getRef().update({
      [`routes.${key}.cacheHits`]: FieldValue.increment(1),
      [`routes.${key}.calls`]: FieldValue.increment(1),
      'totals.cacheHits': FieldValue.increment(1),
      'totals.calls': FieldValue.increment(1),
    }).catch((err) => {
      if (err.code === 5) {
        ensureDoc().then(() => {
          getRef().update({
            [`routes.${key}.cacheHits`]: FieldValue.increment(1),
            [`routes.${key}.calls`]: FieldValue.increment(1),
            'totals.cacheHits': FieldValue.increment(1),
            'totals.calls': FieldValue.increment(1),
          }).catch(() => {});
        }).catch(() => {});
      }
    });
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
      metricsEnabled: METRICS_ENABLED,
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
    metricsEnabled: METRICS_ENABLED,
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
