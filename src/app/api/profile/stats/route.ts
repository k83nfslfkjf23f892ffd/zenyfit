import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

/**
 * GET /api/profile/stats
 * Get personal bests and consistency score
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

    // Fetch all exercise logs for the user
    const logsSnapshot = await db
      .collection('exercise_logs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();
    trackReads('profile/stats', logsSnapshot.docs.length);

    // Calculate personal bests (max amount in single workout per type)
    const personalBests: Record<string, number> = {};
    const workoutDates = new Set<string>();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    let recentWorkoutDays = 0;

    for (const doc of logsSnapshot.docs) {
      const log = doc.data();
      const type = log.type;
      const amount = log.amount || 0;

      // Track personal best for non-custom exercises
      if (type !== 'custom') {
        if (!personalBests[type] || amount > personalBests[type]) {
          personalBests[type] = amount;
        }
      }

      // Track workout dates for consistency
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      workoutDates.add(date);

      // Count recent workout days (last 30 days)
      if (log.timestamp >= thirtyDaysAgo) {
        const recentDate = new Date(log.timestamp).toISOString().split('T')[0];
        if (!workoutDates.has(`recent_${recentDate}`)) {
          workoutDates.add(`recent_${recentDate}`);
          recentWorkoutDays++;
        }
      }
    }

    // Calculate consistency score (0-100)
    // Based on: workout days in last 30 days
    // Perfect score = working out at least 4 days per week (16-17 days per month)
    // Score formula: min(100, (recentWorkoutDays / 16) * 100)
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
