import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';
import { checkAchievements, type AchievementStats } from '@shared/achievements';
import { trackReads, trackCacheHit } from '@/lib/firestore-metrics';

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
    const route = '/api/achievements';

    // Check server cache
    const cached = getCached(route, userId);
    if (cached) {
      trackCacheHit('achievements');
      return NextResponse.json(cached, { status: 200 });
    }

    const { db } = getAdminInstances();

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    trackReads('achievements', 1);
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    // Get workout count (count only, no doc reads)
    const workoutsCount = await db
      .collection('exercise_logs')
      .where('userId', '==', userId)
      .count()
      .get();
    trackReads('achievements', 1); // count aggregation = 1 read

    // Get challenges created (count only)
    const challengesCreatedCount = await db
      .collection('challenges')
      .where('createdBy', '==', userId)
      .count()
      .get();
    trackReads('achievements', 1); // count aggregation = 1 read

    // Get completed challenges (need docs to check participant progress)
    const challengesSnapshot = await db
      .collection('challenges')
      .where('participantIds', 'array-contains', userId)
      .limit(50)
      .get();
    trackReads('achievements', challengesSnapshot.docs.length);

    let challengesCompleted = 0;
    challengesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const participant = data.participants?.find((p: { userId: string }) => p.userId === userId);
      if (participant && participant.progress >= data.goal) {
        challengesCompleted++;
      }
    });

    // Get users invited (count only)
    const inviteCodesCount = await db
      .collection('inviteCodes')
      .where('createdBy', '==', userId)
      .where('used', '==', true)
      .count()
      .get();
    trackReads('achievements', 1); // count aggregation = 1 read

    // Build stats object
    const stats: AchievementStats = {
      totalWorkouts: workoutsCount.data().count,
      totalXP: userData.xp || 0,
      level: userData.level || 1,
      totals: userData.totals || { pullups: 0, pushups: 0, dips: 0, running: 0 },
      challengesCompleted,
      challengesCreated: challengesCreatedCount.data().count,
      usersInvited: inviteCodesCount.data().count,
    };

    // Check achievements
    const unlockedIds = checkAchievements(stats);

    const responseData = {
      unlockedAchievements: unlockedIds,
      stats,
    };

    setCache(route, userId, responseData);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
