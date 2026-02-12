import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { exerciseLogSchema } from '@shared/schema';
import { XP_RATES, ESTIMATED_SECONDS_PER_UNIT, calculateLevel } from '@shared/constants';
import { trackReads, trackWrites } from '@/lib/firestore-metrics';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/workouts
 * Log a new workout
 * - Calculates XP server-side
 * - Updates user totals, XP, and level
 * - Auto-updates matching challenges
 */
export async function POST(request: NextRequest) {
  try {
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
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.WRITE_HEAVY);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Parse and validate request body
    const body = await request.json();

    // Allow offline-synced workouts to provide their original timestamp
    const now = Date.now();
    const loggedAt = typeof body.loggedAt === 'number' && body.loggedAt > 0 && body.loggedAt <= now
      ? body.loggedAt
      : now;

    const validation = exerciseLogSchema.safeParse({
      ...body,
      userId,
      timestamp: loggedAt,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { type, amount, customExerciseId } = validation.data;
    const sets = Math.min(Math.max(1, body.sets || 1), 20); // 1-20 sets max

    // For custom exercises, verify it exists and belongs to user
    let customExerciseName: string | undefined;
    let customExerciseUnit: string | undefined;
    if (type === 'custom') {
      if (!customExerciseId) {
        return NextResponse.json(
          { error: 'Custom exercise ID is required for custom type' },
          { status: 400 }
        );
      }

      const customExerciseDoc = await db
        .collection('custom_exercises')
        .doc(customExerciseId)
        .get();
      trackReads('workouts', 1, userId);

      if (!customExerciseDoc.exists) {
        return NextResponse.json(
          { error: 'Custom exercise not found' },
          { status: 404 }
        );
      }

      const customExerciseData = customExerciseDoc.data()!;
      if (customExerciseData.userId !== userId) {
        return NextResponse.json(
          { error: 'Custom exercise does not belong to you' },
          { status: 403 }
        );
      }

      customExerciseName = customExerciseData.name;
      customExerciseUnit = customExerciseData.unit;
    }

    // Calculate XP earned (server-side only) - custom exercises earn 0 XP
    const xpRate = type === 'custom' ? 0 : (XP_RATES[type as keyof typeof XP_RATES] || 0);
    const xpPerSet = Math.floor(amount * xpRate);
    const totalXpEarned = xpPerSet * sets;
    const totalAmount = amount * sets;

    // Get current user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    trackReads('workouts', 1, userId);

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;

    // Calculate new totals and XP (only update totals for standard exercises)
    const newTotals = type === 'custom'
      ? userData.totals
      : {
          ...userData.totals,
          [type]: (userData.totals[type] || 0) + totalAmount,
        };
    const newXp = userData.xp + totalXpEarned;
    const newLevel = calculateLevel(newXp);

    // Update personal bests if this set amount is a new record
    const personalBests = userData.personalBests || {};
    const newPersonalBests = type !== 'custom' && amount > (personalBests[type] || 0)
      ? { ...personalBests, [type]: amount }
      : personalBests;

    // Create exercise logs - one per set with slightly different timestamps
    const baseTimestamp = loggedAt;
    const logRefs: FirebaseFirestore.DocumentReference[] = [];
    const logDataList: Record<string, unknown>[] = [];

    for (let i = 0; i < sets; i++) {
      const logRef = db.collection('exercise_logs').doc();
      logRefs.push(logRef);

      const logData: Record<string, unknown> = {
        id: logRef.id,
        userId,
        type,
        amount,
        timestamp: baseTimestamp + i, // Offset by 1ms per set to ensure unique timestamps
        xpEarned: xpPerSet,
        synced: true,
        isCustom: type === 'custom',
      };

      // Add custom exercise fields if applicable
      if (type === 'custom') {
        logData.customExerciseId = customExerciseId;
        logData.customExerciseName = customExerciseName;
        logData.customExerciseUnit = customExerciseUnit;
      }

      logDataList.push(logData);
    }

    // Use a batch write to update user and create all logs atomically
    const batch = db.batch();

    for (let i = 0; i < logRefs.length; i++) {
      batch.set(logRefs[i], logDataList[i]);
    }

    // Calculate streak update — use the workout's actual date (may differ for offline syncs)
    const workoutDate = new Date(loggedAt).toISOString().split('T')[0];
    const lastWorkoutDate: string | undefined = userData.lastWorkoutDate;
    let currentStreak: number = userData.currentStreak || 0;
    let longestStreak: number = userData.longestStreak || 0;

    if (lastWorkoutDate !== workoutDate) {
      // Check if the day before the workout date
      const dayBefore = new Date(loggedAt);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeDate = dayBefore.toISOString().split('T')[0];

      if (lastWorkoutDate === dayBeforeDate) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    batch.update(userRef, {
      totals: newTotals,
      xp: newXp,
      level: newLevel,
      personalBests: newPersonalBests,
      currentStreak,
      longestStreak,
      lastWorkoutDate: workoutDate,
    });

    // Pre-aggregate monthly stats (personal + community)
    const workoutMonth = workoutDate.slice(0, 7); // "YYYY-MM"
    const secsPerUnit = ESTIMATED_SECONDS_PER_UNIT[type] || 0;

    // Personal monthly stats
    const monthlyStatsRef = db.collection('users').doc(userId).collection('monthlyStats').doc(workoutMonth);
    batch.set(monthlyStatsRef, {
      [`activityMap.${workoutDate}`]: FieldValue.increment(sets),
      totalWorkouts: FieldValue.increment(sets),
      estimatedExerciseSeconds: FieldValue.increment(sets * amount * secsPerUnit),
      [`exerciseByDay.${workoutDate}.${type}`]: FieldValue.increment(totalAmount),
      [`xpByDay.${workoutDate}`]: FieldValue.increment(totalXpEarned),
    }, { merge: true });

    // Community-wide monthly stats
    const communityStatsRef = db.doc(`_system/communityStats_${workoutMonth}`);
    batch.set(communityStatsRef, {
      [`exerciseByDay.${workoutDate}.${type}`]: FieldValue.increment(totalAmount),
      [`workoutsByDay.${workoutDate}`]: FieldValue.increment(sets),
      [`xpByDay.${workoutDate}`]: FieldValue.increment(totalXpEarned),
      totalXp: FieldValue.increment(totalXpEarned),
    }, { merge: true });

    await batch.commit();
    trackWrites('workouts', sets + 1, userId); // sets exercise_log docs + 1 user update

    // Check for active challenges that match this exercise type (non-blocking)
    // If this fails, workout is still logged successfully
    try {
      const now = Date.now();
      const challengesSnapshot = await db
        .collection('challenges')
        .where('participantIds', 'array-contains', userId)
        .where('endDate', '>', now)
        .get();
      trackReads('workouts', challengesSnapshot.docs.length, userId);

      // Update matching challenges
      const challengeUpdates: Promise<unknown>[] = [];

      for (const challengeDoc of challengesSnapshot.docs) {
        const challengeData = challengeDoc.data();

        // Check if challenge type matches the exercise type
        if (challengeData.type === type) {
          // Update participant's progress
          const participants = challengeData.participants || [];
          const participantIndex = participants.findIndex(
            (p: { userId: string }) => p.userId === userId
          );

          if (participantIndex !== -1) {
            participants[participantIndex].progress =
              (participants[participantIndex].progress || 0) + totalAmount;

            challengeUpdates.push(
              challengeDoc.ref.update({
                participants,
              })
            );
          }
        }
      }

      // Wait for all challenge updates to complete
      await Promise.all(challengeUpdates);
      if (challengeUpdates.length > 0) {
        trackWrites('workouts', challengeUpdates.length, userId);
      }
    } catch (challengeError) {
      // Log but don't fail the workout
      console.error('Error updating challenges (workout still logged):', challengeError);
    }

    return NextResponse.json(
      {
        success: true,
        log: logDataList[logDataList.length - 1], // Return last log for undo
        logs: logDataList,
        sets,
        amountPerSet: amount,
        totalAmount,
        xpEarned: totalXpEarned,
        xpPerSet: xpPerSet,
        newXp,
        newLevel,
        leveledUp: newLevel > userData.level,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/workouts:', error);
    return NextResponse.json(
      { error: 'Failed to log workout' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workouts
 * Get workout history
 * - Supports filtering by type
 * - Supports pagination (limit, offset)
 * - Returns logs ordered by timestamp descending
 */
export async function GET(request: NextRequest) {
  try {
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
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.WRITE_HEAVY);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // Optional: filter by exercise type
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = db
      .collection('exercise_logs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc');

    // Add type filter if provided
    if (type) {
      query = query.where('type', '==', type);
    }

    // Apply pagination
    const snapshot = await query.limit(limit).offset(offset).get();
    trackReads('workouts', snapshot.docs.length, userId);

    // Get total count for pagination info
    const countQuery = db
      .collection('exercise_logs')
      .where('userId', '==', userId);

    const countSnapshot = await countQuery.count().get();
    trackReads('workouts', 1, userId); // count aggregation = 1 read
    const total = countSnapshot.data().count;

    // Format results
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      {
        logs,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + logs.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/workouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}
