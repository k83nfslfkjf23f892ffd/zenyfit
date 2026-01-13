import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { exerciseLogSchema } from '@shared/schema';
import { XP_RATES, calculateLevel } from '@shared/constants';

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
    const validation = exerciseLogSchema.safeParse({
      ...body,
      userId,
      timestamp: Date.now(),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { type, amount } = validation.data;

    // Calculate XP earned (server-side only)
    const xpRate = XP_RATES[type as keyof typeof XP_RATES] || 0;
    const xpEarned = Math.floor(amount * xpRate);

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

    // Calculate new totals and XP
    const newTotals = {
      ...userData.totals,
      [type]: (userData.totals[type] || 0) + amount,
    };
    const newXp = userData.xp + xpEarned;
    const newLevel = calculateLevel(newXp);

    // Create exercise log
    const logRef = db.collection('exercise_logs').doc();
    const logData = {
      id: logRef.id,
      userId,
      type,
      amount,
      timestamp: Date.now(),
      xpEarned,
      synced: true,
      isCustom: false,
    };

    // Use a batch write to update user and create log atomically
    const batch = db.batch();

    batch.set(logRef, logData);
    batch.update(userRef, {
      totals: newTotals,
      xp: newXp,
      level: newLevel,
    });

    await batch.commit();

    // Check for active challenges that match this exercise type
    // Query challenges where user is a participant and challenge is active
    const now = Date.now();
    const challengesSnapshot = await db
      .collection('challenges')
      .where('participantIds', 'array-contains', userId)
      .where('endDate', '>', now)
      .get();

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
            (participants[participantIndex].progress || 0) + amount;

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

    return NextResponse.json(
      {
        success: true,
        log: logData,
        xpEarned,
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

    // Get total count for pagination info
    const countQuery = db
      .collection('exercise_logs')
      .where('userId', '==', userId);

    const countSnapshot = await countQuery.count().get();
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
