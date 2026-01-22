import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { EXERCISE_INFO, EXERCISE_CATEGORIES } from '@shared/constants';

// Get calisthenics exercise types
const CALISTHENICS_TYPES = EXERCISE_CATEGORIES.calisthenics.exercises;

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

    const now = Date.now();
    const userId = decodedToken.uid;

    // Calculate time range
    let startTime: number;
    let dateFormat: 'hour' | 'day' | 'week';
    let numPeriods: number;

    switch (range) {
      case 'daily':
        startTime = now - 24 * 60 * 60 * 1000; // Last 24 hours
        dateFormat = 'hour';
        numPeriods = 24;
        break;
      case 'monthly':
        startTime = now - 30 * 24 * 60 * 60 * 1000; // Last 30 days
        dateFormat = 'day';
        numPeriods = 30;
        break;
      case 'weekly':
      default:
        startTime = now - 7 * 24 * 60 * 60 * 1000; // Last 7 days
        dateFormat = 'day';
        numPeriods = 7;
        break;
    }

    // Build query based on scope
    let logsQuery = db.collection('exercise_logs')
      .where('timestamp', '>', startTime)
      .orderBy('timestamp', 'asc');

    if (scope === 'personal') {
      logsQuery = db.collection('exercise_logs')
        .where('userId', '==', userId)
        .where('timestamp', '>', startTime)
        .orderBy('timestamp', 'asc');
    }

    const logsSnapshot = await logsQuery.get();

    // Generate time period keys
    const periodKeys: string[] = [];
    for (let i = 0; i < numPeriods; i++) {
      const time = now - (numPeriods - 1 - i) * (dateFormat === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
      const date = new Date(time);
      let key: string;
      if (dateFormat === 'hour') {
        key = `${date.getHours()}:00`;
      } else {
        key = date.toISOString().split('T')[0];
      }
      periodKeys.push(key);
    }

    // Initialize data structures
    const repsByExercise: Record<string, number> = {};
    const repsByPeriod: Record<string, Record<string, number>> = {};
    const activityByPeriod: Record<string, { reps: number; workouts: number }> = {};

    // Initialize periods
    periodKeys.forEach(key => {
      repsByPeriod[key] = {};
      activityByPeriod[key] = { reps: 0, workouts: 0 };
      CALISTHENICS_TYPES.forEach(type => {
        repsByPeriod[key][type] = 0;
      });
    });

    // Initialize exercise totals
    CALISTHENICS_TYPES.forEach(type => {
      repsByExercise[type] = 0;
    });

    // Process logs - focus on calisthenics only
    logsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const type = data.type;

      // Only process calisthenics exercises
      if (!CALISTHENICS_TYPES.includes(type)) return;

      const amount = data.amount || 0;
      const timestamp = data.timestamp;
      const date = new Date(timestamp);

      // Get period key
      let periodKey: string;
      if (dateFormat === 'hour') {
        periodKey = `${date.getHours()}:00`;
      } else {
        periodKey = date.toISOString().split('T')[0];
      }

      // Aggregate totals
      repsByExercise[type] = (repsByExercise[type] || 0) + amount;

      // Aggregate by period
      if (repsByPeriod[periodKey]) {
        repsByPeriod[periodKey][type] = (repsByPeriod[periodKey][type] || 0) + amount;
        activityByPeriod[periodKey].reps += amount;
        activityByPeriod[periodKey].workouts += 1;
      }
    });

    // Format reps by exercise for bar chart
    const exerciseTotals = Object.entries(repsByExercise)
      .map(([type, reps]) => ({
        type,
        name: EXERCISE_INFO[type]?.label || type,
        reps,
      }))
      .filter(e => e.reps > 0)
      .sort((a, b) => b.reps - a.reps);

    // Format reps over time for line/area chart
    const repsOverTime = periodKeys.map(period => {
      const data: Record<string, string | number> = { period };
      let totalReps = 0;

      CALISTHENICS_TYPES.forEach(type => {
        const reps = repsByPeriod[period]?.[type] || 0;
        if (reps > 0) {
          data[EXERCISE_INFO[type]?.label || type] = reps;
          totalReps += reps;
        }
      });

      data.total = totalReps;
      return data;
    });

    // Format activity summary
    const activity = periodKeys.map(period => ({
      period,
      reps: activityByPeriod[period]?.reps || 0,
      workouts: activityByPeriod[period]?.workouts || 0,
    }));

    // Get top exercises for legend
    const topExercises = exerciseTotals.slice(0, 5).map(e => e.type);

    // Calculate total stats
    const totalReps = Object.values(repsByExercise).reduce((sum, reps) => sum + reps, 0);
    const totalWorkouts = logsSnapshot.docs.filter(doc =>
      CALISTHENICS_TYPES.includes(doc.data().type)
    ).length;

    return NextResponse.json({
      scope,
      range,
      exerciseTotals,
      repsOverTime,
      activity,
      topExercises,
      summary: {
        totalReps,
        totalWorkouts,
        periodLabel: range === 'daily' ? 'today' : range === 'weekly' ? 'this week' : 'this month',
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/leaderboard/stats:', errorMessage, error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard stats', details: errorMessage },
      { status: 500 }
    );
  }
}
