import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { EXERCISE_INFO, EXERCISE_CATEGORIES } from '@shared/constants';
import { getCached, setCache } from '@/lib/api-cache';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

// Get calisthenics exercise types
const CALISTHENICS_TYPES: readonly string[] = EXERCISE_CATEGORIES.calisthenics.exercises;

function getTimeRange(range: string, tzOffsetMinutes: number) {
  const now = new Date();
  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;
  let startTime: number;
  let dateFormat: 'halfhour' | 'day';
  let numPeriods: number;

  switch (range) {
    case 'daily': {
      // Local midnight = UTC midnight shifted by tzOffset
      const localNow = new Date(now.getTime() + tzOffsetMs);
      const localDateStr = localNow.toISOString().split('T')[0];
      startTime = new Date(localDateStr + 'T00:00:00Z').getTime() - tzOffsetMs;
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
      // Use UTC date — exerciseByDay in pre-aggregated Firestore docs is keyed by UTC date.
      // If we used local dates here, they'd mismatch the UTC keys and skip data entirely.
      periodKeys.push(new Date(time).toISOString().split('T')[0]);
    }
  }
  return periodKeys;
}

function getPeriodKey(timestamp: number, dateFormat: string, tzOffsetMinutes: number): string {
  if (dateFormat === 'halfhour') {
    // Daily: shift to local time so the half-hour label matches the user's clock
    const localDate = new Date(timestamp + tzOffsetMinutes * 60 * 1000);
    const hour = localDate.getUTCHours();
    const minute = localDate.getUTCMinutes() < 30 ? '00' : '30';
    return `${hour}:${minute}`;
  }
  // Weekly/monthly: use UTC date to match exerciseByDay keys stored in Firestore
  return new Date(timestamp).toISOString().split('T')[0];
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
  tzOffsetMinutes: number,
) {
  docs.forEach(doc => {
    const data = doc.data();
    const type = data.type;
    if (!CALISTHENICS_TYPES.includes(type)) return;

    const amount = data.amount || 0;
    const periodKey = getPeriodKey(data.timestamp, dateFormat, tzOffsetMinutes);

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
    const tzOffset = parseInt(searchParams.get('tzOffset') || '0', 10);
    const tzOffsetMinutes = isNaN(tzOffset) ? 0 : Math.max(-840, Math.min(840, tzOffset));
    const userId = decodedToken.uid;

    // Server cache — community data shared across users, personal per-user
    // Include tzOffset in cache key so different timezones don't share cached data
    // Skip caching for daily range: data changes throughout the day as users log workouts,
    // and in-memory cache isn't shared across Vercel instances so invalidation is unreliable.
    const cacheUser = scope === 'community' ? '_community' : userId;
    const cacheParams = `${scope}_${range}_tz${tzOffsetMinutes}`;
    if (range !== 'daily') {
      const cached = getCached('/api/leaderboard/stats', cacheUser, cacheParams);
      if (cached) {
        trackCacheHit('leaderboard/stats', userId);
        return NextResponse.json(cached, { status: 200 });
      }
    }

    const { db } = getAdminInstances();
    const { startTime, dateFormat, numPeriods, now } = getTimeRange(range, tzOffsetMinutes);
    const periodKeys = generatePeriodKeys(dateFormat, numPeriods, now);

    const agg = initAggregation(periodKeys);

    if (range === 'daily') {
      // Daily (half-hour) range: scan today's logs only (~10-50 docs)
      let query: FirebaseFirestore.Query = db.collection('exercise_logs')
        .where('timestamp', '>', startTime)
        .orderBy('timestamp', 'asc');

      if (scope === 'personal') {
        query = db.collection('exercise_logs')
          .where('userId', '==', userId)
          .where('timestamp', '>', startTime)
          .orderBy('timestamp', 'asc')
          .limit(500);
      } else {
        query = query.limit(1000);
      }

      const logsSnapshot = await query.get();
      trackReads('leaderboard/stats', logsSnapshot.docs.length, userId);
      processLogs(logsSnapshot.docs, agg, dateFormat, tzOffsetMinutes);
    } else {
      // Weekly/monthly: read from pre-aggregated docs (2-4 reads instead of 2000-5000)
      const currentMonth = now.toISOString().slice(0, 7);
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7);

      let docs: FirebaseFirestore.DocumentSnapshot[];
      if (scope === 'community') {
        docs = await Promise.all([
          db.doc(`_system/communityStats_${currentMonth}`).get(),
          db.doc(`_system/communityStats_${prevMonth}`).get(),
        ]);
      } else {
        const col = db.collection('users').doc(userId).collection('monthlyStats');
        docs = await Promise.all([
          col.doc(currentMonth).get(),
          col.doc(prevMonth).get(),
        ]);
      }
      trackReads('leaderboard/stats', 2, userId);

      const hasPreAggregated = docs.some(d => d.exists && d.data()?.exerciseByDay);

      if (hasPreAggregated) {
        // Build aggregation from pre-aggregated exerciseByDay data
        const startDate = new Date(startTime).toISOString().split('T')[0];
        for (const doc of docs) {
          if (!doc.exists) continue;
          const data = doc.data()!;
          const exerciseByDay: Record<string, Record<string, number>> = data.exerciseByDay || {};
          const workoutsByDay: Record<string, number> = data.workoutsByDay || {};

          for (const [date, exercises] of Object.entries(exerciseByDay)) {
            if (date < startDate) continue;
            if (!agg.repsByPeriod[date]) continue;

            for (const [type, amount] of Object.entries(exercises)) {
              if (!CALISTHENICS_TYPES.includes(type) || amount <= 0) continue;
              agg.repsByExercise[type] = (agg.repsByExercise[type] || 0) + amount;
              agg.repsByPeriod[date][type] = (agg.repsByPeriod[date][type] || 0) + amount;
              agg.activityByPeriod[date].reps += amount;
            }

            agg.activityByPeriod[date].workouts += workoutsByDay[date] || 0;
            agg.totalWorkouts += workoutsByDay[date] || 0;
          }
        }
      } else {
        // Legacy fallback: scan logs (will be replaced as users log new workouts)
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
        processLogs(logsSnapshot.docs, agg, dateFormat, tzOffsetMinutes);
      }
    }

    const responseData = formatResponse(agg, periodKeys, scope, range);
    if (range !== 'daily') {
      setCache('/api/leaderboard/stats', cacheUser, responseData, undefined, cacheParams);
    }
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
