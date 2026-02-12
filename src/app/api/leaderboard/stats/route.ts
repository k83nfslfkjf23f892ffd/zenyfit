import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { EXERCISE_INFO, EXERCISE_CATEGORIES } from '@shared/constants';
import { getCached, setCache } from '@/lib/api-cache';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

// Get calisthenics exercise types
const CALISTHENICS_TYPES = EXERCISE_CATEGORIES.calisthenics.exercises;

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

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'community';
    const range = searchParams.get('range') || 'weekly';
    const userId = decodedToken.uid;

    // Server cache — community data shared across users, personal per-user
    const cacheUser = scope === 'community' ? '_community' : userId;
    const cacheParams = `${scope}_${range}`;
    const cached = getCached('/api/leaderboard/stats', cacheUser, cacheParams);
    if (cached) {
      trackCacheHit('leaderboard/stats', userId);
      return NextResponse.json(cached, { status: 200 });
    }

    const { db } = getAdminInstances();
    const { startTime, dateFormat, numPeriods, now } = getTimeRange(range);
    const periodKeys = generatePeriodKeys(dateFormat, numPeriods, now);

    let query: FirebaseFirestore.Query = db.collection('exercise_logs')
      .where('timestamp', '>', startTime)
      .orderBy('timestamp', 'asc');

    if (scope === 'personal') {
      query = db.collection('exercise_logs')
        .where('userId', '==', userId)
        .where('timestamp', '>', startTime)
        .orderBy('timestamp', 'asc')
        .limit(2000);
    } else {
      query = query.limit(5000);
    }

    const logsSnapshot = await query.get();
    trackReads('leaderboard/stats', logsSnapshot.docs.length, userId);

    const agg = initAggregation(periodKeys);
    processLogs(logsSnapshot.docs, agg, dateFormat);

    const responseData = formatResponse(agg, periodKeys, scope, range);
    setCache('/api/leaderboard/stats', cacheUser, responseData, undefined, cacheParams);
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
