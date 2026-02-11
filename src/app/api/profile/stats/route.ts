import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { ESTIMATED_SECONDS_PER_UNIT } from '@shared/constants';
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
      trackCacheHit('profile/stats', userId);
      return NextResponse.json(cached);
    }

    const { db } = getAdminInstances();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    trackReads('profile/stats', 1, userId);

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const personalBests: Record<string, number> = userData.personalBests || {};

    // One-time migration: if user has no personalBests or streaks, calculate from all logs
    const needsPBMigration = !userData.personalBests;
    const needsStreakMigration = userData.currentStreak === undefined;

    if (needsPBMigration || needsStreakMigration) {
      const allLogsSnapshot = await db
        .collection('exercise_logs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .get();
      trackReads('profile/stats', allLogsSnapshot.docs.length, userId);

      const migrationUpdate: Record<string, unknown> = {};

      // Personal bests migration
      if (needsPBMigration) {
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
        migrationUpdate.personalBests = personalBests;
      }

      // Streak migration
      if (needsStreakMigration) {
        const uniqueDates = new Set<string>();
        for (const doc of allLogsSnapshot.docs) {
          const date = new Date(doc.data().timestamp).toISOString().split('T')[0];
          uniqueDates.add(date);
        }

        const sortedDates = Array.from(uniqueDates).sort();

        // Calculate longest streak from all dates
        let longestStreak = 0;
        let tempStreak = 0;
        let prevDate: Date | null = null;

        for (const dateStr of sortedDates) {
          const current = new Date(dateStr + 'T00:00:00Z');
          if (prevDate) {
            const diffDays = Math.round((current.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
            if (diffDays === 1) {
              tempStreak++;
            } else {
              tempStreak = 1;
            }
          } else {
            tempStreak = 1;
          }
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          prevDate = current;
        }

        // Calculate current streak (walk backwards from today)
        const today = new Date().toISOString().split('T')[0];
        const reversedDates = sortedDates.reverse();
        let currentStreak = 0;
        const checkDate = new Date();

        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (reversedDates.includes(dateStr)) {
            currentStreak++;
          } else if (currentStreak > 0) {
            break;
          } else if (dateStr < today) {
            // No workout today is fine, but if yesterday also has nothing, streak is 0
            break;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }

        const lastWorkoutDate = reversedDates.length > 0 ? reversedDates[0] : undefined;

        migrationUpdate.currentStreak = currentStreak;
        migrationUpdate.longestStreak = longestStreak;
        if (lastWorkoutDate) migrationUpdate.lastWorkoutDate = lastWorkoutDate;
      }

      await userRef.update(migrationUpdate);
      // Update local vars for response
      if (needsStreakMigration) {
        userData.currentStreak = migrationUpdate.currentStreak as number;
        userData.longestStreak = migrationUpdate.longestStreak as number;
        userData.lastWorkoutDate = migrationUpdate.lastWorkoutDate as string | undefined;
      }
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
    trackReads('profile/stats', recentLogsSnapshot.docs.length, userId);

    // Count workouts per day and unique workout days in last 30 days
    const recentDates = new Set<string>();
    const activityMap: Record<string, number> = {};
    // Estimated exercise seconds for the current month
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    let estimatedExerciseSeconds = 0;
    for (const doc of recentLogsSnapshot.docs) {
      const log = doc.data();
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      recentDates.add(date);
      activityMap[date] = (activityMap[date] || 0) + 1;
      // Accumulate estimated time for current month only
      if (date.startsWith(currentMonthPrefix)) {
        const secsPerUnit = ESTIMATED_SECONDS_PER_UNIT[log.type] || 0;
        estimatedExerciseSeconds += (log.amount || 0) * secsPerUnit;
      }
    }
    const recentWorkoutDays = recentDates.size;

    // Consistency score: perfect = 16+ days per month (4+ per week)
    const consistencyScore = Math.min(100, Math.round((recentWorkoutDays / 16) * 100));

    const responseData = {
      personalBests,
      consistencyScore,
      workoutDaysLast30: recentWorkoutDays,
      activityMap,
      estimatedExerciseSeconds,
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      lastWorkoutDate: userData.lastWorkoutDate,
    };

    setCache('/api/profile/stats', userId, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /api/profile/stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
