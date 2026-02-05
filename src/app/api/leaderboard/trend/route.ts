import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';

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
      return NextResponse.json(cached, { status: 200 });
    }

    // Calculate timestamp for 7 days ago
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Build query - equality filters first, then inequality filters
    let query: FirebaseFirestore.Query = db.collection('exercise_logs');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    query = query
      .where('timestamp', '>', sevenDaysAgo)
      .orderBy('timestamp', 'asc');

    const snapshot = await query.get();

    // Group by day
    const dailyData: Record<string, { workouts: number; xp: number }> = {};

    // Initialize all 7 days with 0 values
    for (let i = 0; i < 7; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { workouts: 0, xp: 0 };
    }

    // Aggregate data by day
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const date = new Date(data.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (dailyData[dateKey]) {
        dailyData[dateKey].workouts += 1;
        dailyData[dateKey].xp += data.xpEarned || 0;
      }
    });

    // Convert to array and sort by date
    const trendData = Object.entries(dailyData)
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const responseData = {
      trend: trendData,
      totalWorkouts: snapshot.size,
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
