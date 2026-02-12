import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';

/**
 * Helper: Verify user is admin
 */
async function verifyAdmin(authHeader: string | null) {
  const decodedToken = await verifyAuthToken(authHeader);
  if (!decodedToken) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { db } = getAdminInstances();
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();

  if (!userDoc.exists) {
    return { error: 'User not found', status: 404 };
  }

  const userData = userDoc.data();
  if (!userData?.isAdmin) {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { userId: decodedToken.uid, decodedToken, isAdmin: true };
}

/**
 * GET /api/admin/stats
 * Get system-wide statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminCheck = await verifyAdmin(authHeader);

    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(adminCheck.decodedToken!, request.nextUrl.pathname, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) return rateLimitResponse;

    // Server cache — admin stats don't need to be real-time
    const cached = getCached('/api/admin/stats', adminCheck.userId!);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const { db } = getAdminInstances();

    // Get user counts
    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    const activeUsersSnapshot = await db.collection('users')
      .where('isBanned', '==', false)
      .count()
      .get();
    const activeUsers = activeUsersSnapshot.data().count;

    // Get workout counts
    const workoutsSnapshot = await db.collection('exercise_logs').count().get();
    const totalWorkouts = workoutsSnapshot.data().count;

    // Get total XP across all users (cached for 5 min, admin-only)
    const allUsersSnapshot = await db.collection('users').get();
    let totalXp = 0;
    allUsersSnapshot.docs.forEach(doc => {
      totalXp += doc.data().xp || 0;
    });

    // Get challenge counts
    const challengesSnapshot = await db.collection('challenges').count().get();
    const totalChallenges = challengesSnapshot.data().count;

    const now = Date.now();
    const activeChallengesSnapshot = await db.collection('challenges')
      .where('endDate', '>', now)
      .count()
      .get();
    const activeChallenges = activeChallengesSnapshot.data().count;

    // Get invite code stats
    const inviteCodesSnapshot = await db.collection('inviteCodes').count().get();
    const totalInviteCodes = inviteCodesSnapshot.data().count;

    const usedInvitesSnapshot = await db.collection('inviteCodes')
      .where('used', '==', true)
      .count()
      .get();
    const usedInviteCodes = usedInvitesSnapshot.data().count;

    // Get custom exercise counts
    const customExercisesSnapshot = await db.collection('custom_exercises').count().get();
    const totalCustomExercises = customExercisesSnapshot.data().count;

    // Calculate growth data (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const newUsersSnapshot = await db.collection('users')
      .where('createdAt', '>', thirtyDaysAgo)
      .get();

    // Group new users by day
    const signupsByDay: { [key: string]: number } = {};
    newUsersSnapshot.docs.forEach(doc => {
      const createdAt = doc.data().createdAt;
      const date = new Date(createdAt).toISOString().split('T')[0];
      signupsByDay[date] = (signupsByDay[date] || 0) + 1;
    });

    // Get workout growth data (last 30 days)
    const recentWorkoutsSnapshot = await db.collection('exercise_logs')
      .where('timestamp', '>', thirtyDaysAgo)
      .get();

    const workoutsByDay: { [key: string]: number } = {};
    const xpByDay: { [key: string]: number } = {};

    recentWorkoutsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.timestamp).toISOString().split('T')[0];
      workoutsByDay[date] = (workoutsByDay[date] || 0) + 1;
      xpByDay[date] = (xpByDay[date] || 0) + (data.xpEarned || 0);
    });

    // Get top 10 users by XP
    const topUsersSnapshot = await db.collection('users')
      .orderBy('xp', 'desc')
      .limit(10)
      .get();

    const topUsers = topUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      level: doc.data().level,
      xp: doc.data().xp,
      avatar: doc.data().avatar,
    }));

    // Calculate activity stats (users active in last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentLogsSnapshot = await db.collection('exercise_logs')
      .where('timestamp', '>', sevenDaysAgo)
      .get();

    const activeUserIds = new Set<string>();
    recentLogsSnapshot.docs.forEach(doc => {
      activeUserIds.add(doc.data().userId);
    });

    const activeUsersLast7Days = activeUserIds.size;

    const responseData = {
      overview: {
        totalUsers,
        activeUsers,
        totalWorkouts,
        totalXp,
        totalChallenges,
        activeChallenges,
        totalInviteCodes,
        usedInviteCodes,
        totalCustomExercises,
        activeUsersLast7Days,
      },
      growth: {
        signupsByDay,
        workoutsByDay,
        xpByDay,
      },
      topUsers,
    };

    setCache('/api/admin/stats', adminCheck.userId!, responseData);
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
