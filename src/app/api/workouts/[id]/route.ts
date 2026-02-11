import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { invalidateCache } from '@/lib/api-cache';
import { calculateLevel } from '@shared/constants';

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
      ...streakUpdate,
    });

    await batch.commit();

    // Invalidate server-side caches (same-instance only; client-side cache
    // invalidation handles the primary deduplication on serverless)
    invalidateCache('/api/leaderboard/trend', userId);
    invalidateCache('/api/leaderboard', userId);
    invalidateCache('/api/profile/stats', userId);
    invalidateCache('/api/achievements', userId);

    // Update challenge progress (non-blocking)
    try {
      const now = Date.now();
      const challengesSnapshot = await db
        .collection('challenges')
        .where('participantIds', 'array-contains', userId)
        .where('endDate', '>', now)
        .get();

      const challengeUpdates: Promise<unknown>[] = [];

      for (const challengeDoc of challengesSnapshot.docs) {
        const challengeData = challengeDoc.data();

        if (challengeData.type === type) {
          const participants = challengeData.participants || [];
          const participantIndex = participants.findIndex(
            (p: { userId: string }) => p.userId === userId
          );

          if (participantIndex !== -1) {
            participants[participantIndex].progress = Math.max(
              0,
              (participants[participantIndex].progress || 0) - amount
            );

            challengeUpdates.push(
              challengeDoc.ref.update({
                participants,
              })
            );
          }
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
