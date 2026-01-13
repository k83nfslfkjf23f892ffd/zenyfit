import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { checkAchievements, type AchievementStats } from '@shared/achievements';

/**
 * GET /api/achievements
 * Get user's unlocked achievements
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

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    // Get workout count
    const workoutsSnapshot = await db
      .collection('exercise_logs')
      .where('userId', '==', userId)
      .get();

    // Get challenges created
    const challengesCreatedSnapshot = await db
      .collection('challenges')
      .where('createdBy', '==', userId)
      .get();

    // Get completed challenges (where user reached 100% of goal)
    const challengesSnapshot = await db
      .collection('challenges')
      .where('participantIds', 'array-contains', userId)
      .get();

    let challengesCompleted = 0;
    challengesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const participant = data.participants?.find((p: { userId: string }) => p.userId === userId);
      if (participant && participant.progress >= data.goal) {
        challengesCompleted++;
      }
    });

    // Get users invited (count used invite codes)
    const inviteCodesSnapshot = await db
      .collection('inviteCodes')
      .where('createdBy', '==', userId)
      .where('used', '==', true)
      .get();

    // Build stats object
    const stats: AchievementStats = {
      totalWorkouts: workoutsSnapshot.size,
      totalXP: userData.xp || 0,
      level: userData.level || 1,
      totals: userData.totals || { pullups: 0, pushups: 0, dips: 0, running: 0 },
      challengesCompleted,
      challengesCreated: challengesCreatedSnapshot.size,
      usersInvited: inviteCodesSnapshot.size,
    };

    // Check achievements
    const unlockedIds = checkAchievements(stats);

    return NextResponse.json(
      {
        unlockedAchievements: unlockedIds,
        stats,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
