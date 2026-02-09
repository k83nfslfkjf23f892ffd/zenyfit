import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { EXERCISE_INFO, EXERCISE_CATEGORIES } from '@shared/constants';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

// Get calisthenics exercise types
const CALISTHENICS_TYPES = EXERCISE_CATEGORIES.calisthenics.exercises;

// In-memory cache for community stats (shared across all users)
interface CommunityCache {
  data: Record<string, unknown>;
  expiry: number;
  lastTimestamp: number; // most recent log timestamp we've seen
  aggregation: {
    repsByExercise: Record<string, number>;
    activityByPeriod: Record<string, { reps: number; workouts: number }>;
    repsByPeriod: Record<string, Record<string, number>>;
    totalWorkouts: number;
  };
}
const communityCache = new Map<string, CommunityCache>();

// Personal scope cache (per-user, incremental)
interface PersonalCache {
  data: Record<string, unknown>;
  expiry: number;
  lastTimestamp: number;
  aggregation: {
    repsByExercise: Record<string, number>;
    activityByPeriod: Record<string, { reps: number; workouts: number }>;
    repsByPeriod: Record<string, Record<string, number>>;
    totalWorkouts: number;
  };
}
const personalCache = new Map<string, PersonalCache>();

const COMMUNITY_TTL = 10 * 60 * 1000; // 10 minutes
const PERSONAL_TTL = 5 * 60 * 1000;   // 5 minutes

function getTimeRange(range: string) {
  const now = new Date();
  let startTime: number;
  let dateFormat: 'halfhour' | 'day';
  let numPeriods: number;

  switch (range) {
    case 'daily': {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      startTime = todayStart.getTime();
      dateFormat = 'halfhour';
      numPeriods = 48;
      break;
    }
    case 'monthly':
      startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      dateFormat = 'day';
      numPeriods = 30;
      break;
    case 'weekly':
    default:
      startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      dateFormat = 'day';
      numPeriods = 7;
      break;
  }

  return { startTime, dateFormat, numPeriods, now };
}

function generatePeriodKeys(dateFormat: string, numPeriods: number, now: Date): string[] {
  const periodKeys: string[] = [];
  if (dateFormat === 'halfhour') {
    for (let i = 0; i < 48; i++) {
      const hour = Math.floor(i / 2);
      const minute = (i % 2) * 30;
      periodKeys.push(`${hour}:${minute.toString().padStart(2, '0')}`);
    }
  } else {
    for (let i = 0; i < numPeriods; i++) {
      const time = now.getTime() - (numPeriods - 1 - i) * 24 * 60 * 60 * 1000;
      const date = new Date(time);
      periodKeys.push(date.toISOString().split('T')[0]);
    }
  }
  return periodKeys;
}

function getPeriodKey(timestamp: number, dateFormat: string): string {
  const date = new Date(timestamp);
  if (dateFormat === 'halfhour') {
    const hour = date.getHours();
    const minute = date.getMinutes() < 30 ? '00' : '30';
    return `${hour}:${minute}`;
  }
  return date.toISOString().split('T')[0];
}

function initAggregation(periodKeys: string[]) {
  const repsByExercise: Record<string, number> = {};
  const repsByPeriod: Record<string, Record<string, number>> = {};
  const activityByPeriod: Record<string, { reps: number; workouts: number }> = {};

  periodKeys.forEach(key => {
    repsByPeriod[key] = {};
    activityByPeriod[key] = { reps: 0, workouts: 0 };
    CALISTHENICS_TYPES.forEach(type => { repsByPeriod[key][type] = 0; });
  });
  CALISTHENICS_TYPES.forEach(type => { repsByExercise[type] = 0; });

  return { repsByExercise, repsByPeriod, activityByPeriod, totalWorkouts: 0 };
}

function processLogs(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  agg: ReturnType<typeof initAggregation>,
  dateFormat: string,
) {
  docs.forEach(doc => {
    const data = doc.data();
    const type = data.type;
    if (!CALISTHENICS_TYPES.includes(type)) return;

    const amount = data.amount || 0;
    const periodKey = getPeriodKey(data.timestamp, dateFormat);

    agg.repsByExercise[type] = (agg.repsByExercise[type] || 0) + amount;

    if (agg.repsByPeriod[periodKey]) {
      agg.repsByPeriod[periodKey][type] = (agg.repsByPeriod[periodKey][type] || 0) + amount;
      agg.activityByPeriod[periodKey].reps += amount;
      agg.activityByPeriod[periodKey].workouts += 1;
    }
    agg.totalWorkouts += 1;
  });
}

function formatResponse(
  agg: ReturnType<typeof initAggregation>,
  periodKeys: string[],
  scope: string,
  range: string,
) {
  const exerciseTotals = Object.entries(agg.repsByExercise)
    .map(([type, reps]) => ({ type, name: EXERCISE_INFO[type]?.label || type, reps }))
    .filter(e => e.reps > 0)
    .sort((a, b) => b.reps - a.reps);

  const repsOverTime = periodKeys.map(period => {
    const data: Record<string, string | number> = { period };
    let totalReps = 0;
    CALISTHENICS_TYPES.forEach(type => {
      const reps = agg.repsByPeriod[period]?.[type] || 0;
      if (reps > 0) {
        data[EXERCISE_INFO[type]?.label || type] = reps;
        totalReps += reps;
      }
    });
    data.total = totalReps;
    return data;
  });

  const activity = periodKeys.map(period => ({
    period,
    reps: agg.activityByPeriod[period]?.reps || 0,
    workouts: agg.activityByPeriod[period]?.workouts || 0,
  }));

  const totalReps = Object.values(agg.repsByExercise).reduce((sum, reps) => sum + reps, 0);

  return {
    scope,
    range,
    exerciseTotals,
    repsOverTime,
    activity,
    topExercises: exerciseTotals.slice(0, 5).map(e => e.type),
    summary: {
      totalReps,
      totalWorkouts: agg.totalWorkouts,
      periodLabel: range === 'daily' ? 'today' : range === 'weekly' ? 'this week' : 'this month',
    },
  };
}

/**
 * GET /api/leaderboard/stats
 * Query params:
 * - scope: 'personal' | 'community' (default: 'community')
 * - range: 'daily' | 'weekly' | 'monthly' (default: 'weekly')
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.READ_HEAVY);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'community';
    const range = searchParams.get('range') || 'weekly';
    const userId = decodedToken.uid;
    const { startTime, dateFormat, numPeriods, now } = getTimeRange(range);
    const periodKeys = generatePeriodKeys(dateFormat, numPeriods, now);

    // ── Community scope: shared cache + incremental updates ──
    if (scope === 'community') {
      const cacheKey = `community:${range}`;
      const cached = communityCache.get(cacheKey);

      if (cached && Date.now() < cached.expiry) {
        // Cache is fresh — check for new logs since last fetch
        const newLogsQuery = db.collection('exercise_logs')
          .where('timestamp', '>', cached.lastTimestamp)
          .orderBy('timestamp', 'asc')
          .limit(500);

        const newSnapshot = await newLogsQuery.get();

        if (newSnapshot.empty) {
          // No new data, return cached response
          trackCacheHit('leaderboard/stats');
          return NextResponse.json(cached.data, { status: 200 });
        }

        // Merge new logs into cached aggregation
        trackReads('leaderboard/stats', newSnapshot.docs.length);
        processLogs(newSnapshot.docs, cached.aggregation, dateFormat);
        const lastDoc = newSnapshot.docs[newSnapshot.docs.length - 1];
        cached.lastTimestamp = lastDoc.data().timestamp;
        cached.data = formatResponse(cached.aggregation, periodKeys, scope, range);

        return NextResponse.json(cached.data, { status: 200 });
      }

      // Cache miss or expired — full query
      const logsSnapshot = await db.collection('exercise_logs')
        .where('timestamp', '>', startTime)
        .orderBy('timestamp', 'asc')
        .limit(5000)
        .get();
      trackReads('leaderboard/stats', logsSnapshot.docs.length);

      const agg = initAggregation(periodKeys);
      processLogs(logsSnapshot.docs, agg, dateFormat);

      const lastTimestamp = logsSnapshot.empty
        ? startTime
        : logsSnapshot.docs[logsSnapshot.docs.length - 1].data().timestamp;

      const responseData = formatResponse(agg, periodKeys, scope, range);

      communityCache.set(cacheKey, {
        data: responseData,
        expiry: Date.now() + COMMUNITY_TTL,
        lastTimestamp,
        aggregation: agg,
      });

      return NextResponse.json(responseData, { status: 200 });
    }

    // ── Personal scope: per-user cache + incremental updates ──
    const personalKey = `${userId}:${range}`;
    const cached = personalCache.get(personalKey);

    if (cached && Date.now() < cached.expiry) {
      // Check for new logs since last fetch
      const newLogsQuery = db.collection('exercise_logs')
        .where('userId', '==', userId)
        .where('timestamp', '>', cached.lastTimestamp)
        .orderBy('timestamp', 'asc');

      const newSnapshot = await newLogsQuery.get();

      if (newSnapshot.empty) {
        trackCacheHit('leaderboard/stats');
        return NextResponse.json(cached.data, { status: 200 });
      }

      trackReads('leaderboard/stats', newSnapshot.docs.length);
      processLogs(newSnapshot.docs, cached.aggregation, dateFormat);
      const lastDoc = newSnapshot.docs[newSnapshot.docs.length - 1];
      cached.lastTimestamp = lastDoc.data().timestamp;
      cached.data = formatResponse(cached.aggregation, periodKeys, scope, range);

      return NextResponse.json(cached.data, { status: 200 });
    }

    // Cache miss — full query
    const logsSnapshot = await db.collection('exercise_logs')
      .where('userId', '==', userId)
      .where('timestamp', '>', startTime)
      .orderBy('timestamp', 'asc')
      .get();
    trackReads('leaderboard/stats', logsSnapshot.docs.length);

    const agg = initAggregation(periodKeys);
    processLogs(logsSnapshot.docs, agg, dateFormat);

    const lastTimestamp = logsSnapshot.empty
      ? startTime
      : logsSnapshot.docs[logsSnapshot.docs.length - 1].data().timestamp;

    const responseData = formatResponse(agg, periodKeys, scope, range);

    personalCache.set(personalKey, {
      data: responseData,
      expiry: Date.now() + PERSONAL_TTL,
      lastTimestamp,
      aggregation: agg,
    });

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/leaderboard/stats:', errorMessage, error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard stats', details: errorMessage },
      { status: 500 }
    );
  }
}
