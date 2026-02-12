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

    // Read pre-aggregated monthly stats (2 reads instead of 500+)
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.toISOString().slice(0, 7);

    const monthlyStatsCol = db.collection('users').doc(userId).collection('monthlyStats');
    const [currentMonthDoc, prevMonthDoc] = await Promise.all([
      monthlyStatsCol.doc(currentMonth).get(),
      monthlyStatsCol.doc(prevMonth).get(),
    ]);
    trackReads('profile/stats', 2, userId);

    // If monthly stats docs don't exist, fall back to scanning logs (one-time migration)
    const hasMonthlyStats = currentMonthDoc.exists || prevMonthDoc.exists;

    const activityMap: Record<string, number> = {};
    let estimatedExerciseSeconds = 0;
    let recentWorkoutDays: number;

    if (hasMonthlyStats) {
      // Build activityMap from pre-aggregated data
      const currentData = currentMonthDoc.exists ? currentMonthDoc.data()! : {};
      const prevData = prevMonthDoc.exists ? prevMonthDoc.data()! : {};

      const currentActivityMap: Record<string, number> = currentData.activityMap || {};
      const prevActivityMap: Record<string, number> = prevData.activityMap || {};

      // Merge both months, filtering to last 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const allDays = { ...prevActivityMap, ...currentActivityMap };

      for (const [date, count] of Object.entries(allDays)) {
        if (count > 0 && new Date(date + 'T00:00:00Z').getTime() >= thirtyDaysAgo) {
          activityMap[date] = count;
        }
      }

      recentWorkoutDays = Object.keys(activityMap).length;
      estimatedExerciseSeconds = currentData.estimatedExerciseSeconds || 0;
    } else {
      // Legacy fallback: scan all logs for this period, then write monthly stats docs
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const recentLogsSnapshot = await db
        .collection('exercise_logs')
        .where('userId', '==', userId)
        .where('timestamp', '>=', thirtyDaysAgo)
        .orderBy('timestamp', 'desc')
        .get();
      trackReads('profile/stats', recentLogsSnapshot.docs.length, userId);

      // Build activity maps per month for migration
      const monthlyMaps: Record<string, Record<string, number>> = {};
      const monthlyWorkouts: Record<string, number> = {};
      const monthlySeconds: Record<string, number> = {};

      for (const doc of recentLogsSnapshot.docs) {
        const log = doc.data();
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        const month = date.slice(0, 7);

        if (!monthlyMaps[month]) {
          monthlyMaps[month] = {};
          monthlyWorkouts[month] = 0;
          monthlySeconds[month] = 0;
        }
        monthlyMaps[month][date] = (monthlyMaps[month][date] || 0) + 1;
        monthlyWorkouts[month]++;
        const secsPerUnit = ESTIMATED_SECONDS_PER_UNIT[log.type] || 0;
        monthlySeconds[month] += (log.amount || 0) * secsPerUnit;

        activityMap[date] = (activityMap[date] || 0) + 1;
      }

      recentWorkoutDays = Object.keys(activityMap).length;
      estimatedExerciseSeconds = monthlySeconds[currentMonth] || 0;

      // Write monthly stats docs for future reads (non-blocking migration)
      try {
        const batch = db.batch();
        for (const [month, map] of Object.entries(monthlyMaps)) {
          const ref = monthlyStatsCol.doc(month);
          batch.set(ref, {
            activityMap: map,
            totalWorkouts: monthlyWorkouts[month],
            estimatedExerciseSeconds: monthlySeconds[month],
          });
        }
        await batch.commit();
      } catch (migrationErr) {
        console.error('Monthly stats migration failed (non-blocking):', migrationErr);
      }
    }

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
