import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

/**
 * GET /api/leaderboard/trend
 * Get activity trend data for last 7 days
 * - Returns daily workout counts and XP earned
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.READ_HEAVY);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // Optional: specific user, otherwise global

    // Check server cache (key by requesting user + target userId)
    const cacheParams = `userId=${userId || 'global'}`;
    const cached = getCached('/api/leaderboard/trend', decodedToken.uid, cacheParams);
    if (cached) {
      trackCacheHit('leaderboard/trend', decodedToken.uid);
      return NextResponse.json(cached, { status: 200 });
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgoDate = new Date(sevenDaysAgo).toISOString().split('T')[0];

    // Initialize all 7 days with 0 values
    const dailyData: Record<string, { workouts: number; xp: number }> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { workouts: 0, xp: 0 };
    }

    // Try pre-aggregated data first (2 reads instead of 500)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const prevMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const prevMonth = prevMonthDate.toISOString().slice(0, 7);

    let docs: FirebaseFirestore.DocumentSnapshot[];
    if (!userId) {
      // Global trend — read community stats
      docs = await Promise.all([
        db.doc(`_system/communityStats_${currentMonth}`).get(),
        db.doc(`_system/communityStats_${prevMonth}`).get(),
      ]);
    } else {
      // Per-user trend
      const col = db.collection('users').doc(userId).collection('monthlyStats');
      docs = await Promise.all([
        col.doc(currentMonth).get(),
        col.doc(prevMonth).get(),
      ]);
    }
    trackReads('leaderboard/trend', 2, decodedToken.uid);

    const hasPreAggregated = docs.some(d => d.exists && d.data()?.xpByDay);

    if (hasPreAggregated) {
      for (const doc of docs) {
        if (!doc.exists) continue;
        const data = doc.data()!;
        const workoutsByDay: Record<string, number> = userId
          ? data.activityMap || {}
          : data.workoutsByDay || {};
        const xpByDay: Record<string, number> = data.xpByDay || {};

        for (const [date, count] of Object.entries(workoutsByDay)) {
          if (date < sevenDaysAgoDate || !dailyData[date]) continue;
          dailyData[date].workouts += count;
        }
        for (const [date, xp] of Object.entries(xpByDay)) {
          if (date < sevenDaysAgoDate || !dailyData[date]) continue;
          dailyData[date].xp += xp;
        }
      }
    } else {
      // Legacy fallback: scan logs
      let query: FirebaseFirestore.Query = db.collection('exercise_logs');
      if (userId) {
        query = query.where('userId', '==', userId);
      }
      query = query
        .where('timestamp', '>', sevenDaysAgo)
        .orderBy('timestamp', 'asc')
        .limit(500);

      const snapshot = await query.get();
      trackReads('leaderboard/trend', snapshot.docs.length, decodedToken.uid);

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const dateKey = new Date(data.timestamp).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].workouts += 1;
          dailyData[dateKey].xp += data.xpEarned || 0;
        }
      });
    }

    const trendData = Object.entries(dailyData)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const responseData = {
      trend: trendData,
      totalWorkouts: trendData.reduce((sum, day) => sum + day.workouts, 0),
      totalXp: trendData.reduce((sum, day) => sum + day.xp, 0),
    };

    setCache('/api/leaderboard/trend', decodedToken.uid, responseData, undefined, cacheParams);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/leaderboard/trend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity trend' },
      { status: 500 }
    );
  }
}
