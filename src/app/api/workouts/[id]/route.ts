import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
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

    // Use a batch write to update user and delete log atomically
    const batch = db.batch();

    batch.delete(logRef);
    batch.update(userRef, {
      totals: newTotals,
      xp: newXp,
      level: newLevel,
    });

    await batch.commit();

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
