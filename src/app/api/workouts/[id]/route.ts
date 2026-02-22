import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { invalidateCache } from '@/lib/api-cache';
import { calculateLevel, ESTIMATED_SECONDS_PER_UNIT } from '@shared/constants';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * DELETE /api/workouts/[id]
 * Revert (delete) a workout
 * - Subtracts XP and updates user totals
 * - Updates challenge progress if applicable
 * - Only allows reverting own workouts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workoutId } = await params;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(decodedToken, '/api/workouts/revert', RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Get the workout log
    const logRef = db.collection('exercise_logs').doc(workoutId);
    const logDoc = await logRef.get();

    if (!logDoc.exists) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    const logData = logDoc.data()!;

    // Verify ownership
    if (logData.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only revert your own workouts' },
        { status: 403 }
      );
    }

    // Get current user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const { type, amount, xpEarned } = logData;

    // Calculate new totals and XP (subtract)
    const newTotals = {
      ...userData.totals,
      [type]: Math.max(0, (userData.totals[type] || 0) - amount),
    };
    const newXp = Math.max(0, userData.xp - xpEarned);
    const newLevel = calculateLevel(newXp);

    // Check if any other workouts remain for the deleted workout's day
    // TODO: Streak dates use UTC which may differ from user's local day.
    // Fix requires storing user timezone preference. See issues.md.
    const deletedDate = new Date(logData.timestamp).toISOString().split('T')[0];
    const dayStart = new Date(deletedDate + 'T00:00:00Z').getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const sameDaySnapshot = await db
      .collection('exercise_logs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', dayStart)
      .where('timestamp', '<', dayEnd)
      .limit(2) // Only need to know if >1 exists (the one being deleted + another)
      .get();

    // If only the one being deleted remains for that day, recalculate streak
    const otherWorkoutsOnDay = sameDaySnapshot.docs.filter(d => d.id !== workoutId).length > 0;

    let streakUpdate: Record<string, unknown> = {};

    if (!otherWorkoutsOnDay) {
      // Recalculate streak from recent logs (last 90 days)
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const recentLogsSnapshot = await db
        .collection('exercise_logs')
        .where('userId', '==', userId)
        .where('timestamp', '>=', ninetyDaysAgo)
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();

      // Get unique dates (excluding the deleted workout)
      const uniqueDates = new Set<string>();
      for (const doc of recentLogsSnapshot.docs) {
        if (doc.id === workoutId) continue;
        const date = new Date(doc.data().timestamp).toISOString().split('T')[0];
        uniqueDates.add(date);
      }

      // Walk backwards from today to calculate current streak
      const sortedDates = Array.from(uniqueDates).sort().reverse();
      const today = new Date().toISOString().split('T')[0];
      let currentStreak = 0;
      const checkDate = new Date(today);

      for (let i = 0; i < 90; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (sortedDates.includes(dateStr)) {
          currentStreak++;
        } else if (currentStreak > 0 || dateStr < today) {
          // Only break if we've already started counting or we're past today
          if (currentStreak > 0) break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const longestStreak = Math.max(userData.longestStreak || 0, currentStreak);
      const lastWorkoutDate = sortedDates.length > 0 ? sortedDates[0] : undefined;

      streakUpdate = {
        currentStreak,
        longestStreak,
        ...(lastWorkoutDate ? { lastWorkoutDate } : {}),
      };
    }

    // Use a batch write to update user and delete log atomically
    const batch = db.batch();

    batch.delete(logRef);
    batch.update(userRef, {
      totals: newTotals,
      xp: newXp,
      level: newLevel,
      totalWorkoutSets: FieldValue.increment(-1),
      ...streakUpdate,
    });

    // Decrement pre-aggregated monthly stats (personal + community)
    const deletedMonth = deletedDate.slice(0, 7); // "YYYY-MM"
    const secsPerUnit = ESTIMATED_SECONDS_PER_UNIT[type] || 0;

    const monthlyStatsRef = db.collection('users').doc(userId).collection('monthlyStats').doc(deletedMonth);
    batch.set(monthlyStatsRef, {
      [`activityMap.${deletedDate}`]: FieldValue.increment(-1),
      totalWorkouts: FieldValue.increment(-1),
      estimatedExerciseSeconds: FieldValue.increment(-(amount * secsPerUnit)),
      [`exerciseByDay.${deletedDate}.${type}`]: FieldValue.increment(-amount),
      [`xpByDay.${deletedDate}`]: FieldValue.increment(-xpEarned),
    }, { merge: true });

    const communityStatsRef = db.doc(`_system/communityStats_${deletedMonth}`);
    batch.set(communityStatsRef, {
      [`exerciseByDay.${deletedDate}.${type}`]: FieldValue.increment(-amount),
      [`workoutsByDay.${deletedDate}`]: FieldValue.increment(-1),
      [`xpByDay.${deletedDate}`]: FieldValue.increment(-xpEarned),
      totalXp: FieldValue.increment(-xpEarned),
    }, { merge: true });

    await batch.commit();

    // Invalidate server-side caches
    invalidateCache('/api/leaderboard/trend', userId);
    invalidateCache('/api/leaderboard/stats', userId);
    invalidateCache('/api/leaderboard/stats', '_community');
    invalidateCache('/api/leaderboard', userId);
    invalidateCache('/api/profile/stats', userId);
    invalidateCache('/api/achievements', userId);

    // Update challenge progress using transactions to prevent race conditions
    try {
      const now = Date.now();
      const challengesSnapshot = await db
        .collection('challenges')
        .where('participantIds', 'array-contains', userId)
        .where('endDate', '>', now)
        .get();

      const challengeUpdates: Promise<void>[] = [];

      for (const challengeDoc of challengesSnapshot.docs) {
        const challengeData = challengeDoc.data();

        if (challengeData.type === type) {
          challengeUpdates.push(
            db.runTransaction(async (transaction) => {
              const freshDoc = await transaction.get(challengeDoc.ref);
              if (!freshDoc.exists) return;
              const freshData = freshDoc.data()!;
              const participants = freshData.participants || [];
              const idx = participants.findIndex(
                (p: { userId: string }) => p.userId === userId
              );
              if (idx !== -1) {
                participants[idx].progress = Math.max(
                  0,
                  (participants[idx].progress || 0) - amount
                );
                transaction.update(challengeDoc.ref, { participants });
              }
            })
          );
        }
      }

      await Promise.all(challengeUpdates);
    } catch (challengeError) {
      console.error('Error updating challenges (workout still reverted):', challengeError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Workout reverted successfully',
        xpDeducted: xpEarned,
        newXp,
        newLevel,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in DELETE /api/workouts/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to revert workout' },
      { status: 500 }
    );
  }
}
