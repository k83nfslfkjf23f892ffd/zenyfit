import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { EXERCISE_INFO } from '@shared/constants';

/**
 * GET /api/leaderboard/stats
 * Get comprehensive stats for leaderboard charts:
 * - Weekly XP trends per user
 * - Exercise distribution (global)
 * - Activity heatmap data
 * - Ranking history
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

    const { db } = getAdminInstances();

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get all users (for chart data)
    const usersSnapshot = await db.collection('users')
      .where('isBanned', '==', false)
      .orderBy('xp', 'desc')
      .limit(20)
      .get();

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      xp: doc.data().xp,
      level: doc.data().level,
      totals: doc.data().totals || {},
    }));

    // Get workout logs for last 7 days (for trends)
    const weeklyLogsSnapshot = await db.collection('exercise_logs')
      .where('timestamp', '>', sevenDaysAgo)
      .orderBy('timestamp', 'asc')
      .get();

    // Get workout logs for last 30 days (for heatmap)
    const monthlyLogsSnapshot = await db.collection('exercise_logs')
      .where('timestamp', '>', thirtyDaysAgo)
      .orderBy('timestamp', 'asc')
      .get();

    // 1. Weekly XP Trends per user (top 10 users)
    const weeklyTrends: Record<string, Record<string, number>> = {};
    const topUserIds = users.slice(0, 10).map(u => u.id);

    // Generate date keys for last 7 days
    const dateKeys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dateKeys.push(dateKey);

      // Initialize for each user
      topUserIds.forEach(userId => {
        if (!weeklyTrends[userId]) weeklyTrends[userId] = {};
        weeklyTrends[userId][dateKey] = 0;
      });
    }

    // Aggregate XP by user by day
    weeklyLogsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!topUserIds.includes(data.userId)) return;

      const date = new Date(data.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (weeklyTrends[data.userId] && weeklyTrends[data.userId][dateKey] !== undefined) {
        weeklyTrends[data.userId][dateKey] += data.xpEarned || 0;
      }
    });

    // Format for chart: array of { date, user1: xp, user2: xp, ... }
    const xpTrends = dateKeys.map(date => {
      const point: Record<string, number | string> = { date };
      topUserIds.forEach(userId => {
        const user = users.find(u => u.id === userId);
        if (user) {
          point[user.username] = weeklyTrends[userId]?.[date] || 0;
        }
      });
      return point;
    });

    // 2. Exercise Distribution (global totals from all users)
    const exerciseDistribution: Record<string, { count: number; xp: number; category: string }> = {};

    weeklyLogsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const type = data.type;
      if (type === 'custom') return;

      const info = EXERCISE_INFO[type];
      if (!exerciseDistribution[type]) {
        exerciseDistribution[type] = {
          count: 0,
          xp: 0,
          category: info?.category || 'other'
        };
      }
      exerciseDistribution[type].count += 1;
      exerciseDistribution[type].xp += data.xpEarned || 0;
    });

    // Format for chart
    const distribution = Object.entries(exerciseDistribution)
      .map(([type, stats]) => ({
        name: EXERCISE_INFO[type]?.label || type,
        type,
        ...stats,
      }))
      .sort((a, b) => b.xp - a.xp);

    // 3. Activity Heatmap (workouts per day for last 30 days)
    const heatmapData: Record<string, { count: number; xp: number }> = {};

    // Initialize 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(now - (29 - i) * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      heatmapData[dateKey] = { count: 0, xp: 0 };
    }

    monthlyLogsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (heatmapData[dateKey]) {
        heatmapData[dateKey].count += 1;
        heatmapData[dateKey].xp += data.xpEarned || 0;
      }
    });

    const heatmap = Object.entries(heatmapData)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Current Rankings (with XP breakdown)
    const rankings = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      xp: user.xp,
      level: user.level,
      weeklyXp: Object.values(weeklyTrends[user.id] || {}).reduce((sum, xp) => sum + xp, 0),
    }));

    // 5. Category totals for pie chart
    const categoryTotals: Record<string, number> = {
      calisthenics: 0,
      cardio: 0,
      team_sports: 0,
    };

    distribution.forEach(item => {
      if (categoryTotals[item.category] !== undefined) {
        categoryTotals[item.category] += item.xp;
      }
    });

    return NextResponse.json({
      xpTrends,
      distribution,
      heatmap,
      rankings,
      categoryTotals,
      topUsers: users.slice(0, 10).map(u => ({ id: u.id, username: u.username })),
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/leaderboard/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard stats' },
      { status: 500 }
    );
  }
}
