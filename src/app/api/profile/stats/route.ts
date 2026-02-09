import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

/**
 * GET /api/profile/stats
 * Get personal bests and consistency score
 *
 * Personal bests are stored on the user document (maintained by POST /api/workouts).
 * If not yet populated (legacy users), a one-time migration scans all logs and stores
 * the result. After that, only last-30-day logs are fetched for consistency.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;

    // Check server cache
    const cached = getCached('/api/profile/stats', userId);
    if (cached) {
      trackCacheHit('profile/stats');
      return NextResponse.json(cached);
    }

    const { db } = getAdminInstances();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    trackReads('profile/stats', 1);

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const personalBests: Record<string, number> = userData.personalBests || {};

    // One-time migration: if user has no personalBests stored, calculate from all logs
    if (!userData.personalBests) {
      const allLogsSnapshot = await db
        .collection('exercise_logs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .get();
      trackReads('profile/stats', allLogsSnapshot.docs.length);

      for (const doc of allLogsSnapshot.docs) {
        const log = doc.data();
        const type = log.type;
        const amount = log.amount || 0;

        if (type !== 'custom') {
          if (!personalBests[type] || amount > personalBests[type]) {
            personalBests[type] = amount;
          }
        }
      }

      // Store on user doc so this never happens again
      await userRef.update({ personalBests });
    }

    // Fetch only last 30 days of logs for consistency
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recentLogsSnapshot = await db
      .collection('exercise_logs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', thirtyDaysAgo)
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();
    trackReads('profile/stats', recentLogsSnapshot.docs.length);

    // Count unique workout days in last 30 days
    const recentDates = new Set<string>();
    for (const doc of recentLogsSnapshot.docs) {
      const log = doc.data();
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      recentDates.add(date);
    }
    const recentWorkoutDays = recentDates.size;

    // Consistency score: perfect = 16+ days per month (4+ per week)
    const consistencyScore = Math.min(100, Math.round((recentWorkoutDays / 16) * 100));

    const responseData = {
      personalBests,
      consistencyScore,
      workoutDaysLast30: recentWorkoutDays,
    };

    setCache('/api/profile/stats', userId, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /api/profile/stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
