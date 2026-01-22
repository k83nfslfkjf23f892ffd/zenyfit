import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { XP_RATES, calculateLevel } from '@shared/constants';

/**
 * POST /api/admin/recalculate-xp
 * Recalculate XP for all users based on their exercise logs
 * Admin only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = getAdminInstances();

    // Check if user is admin
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const results: Array<{ userId: string; username: string; oldXp: number; newXp: number; oldLevel: number; newLevel: number }> = [];

    for (const userDocRef of usersSnapshot.docs) {
      const userId = userDocRef.id;
      const userData = userDocRef.data();
      const oldXp = userData.xp || 0;
      const oldLevel = userData.level || 1;

      // Get all exercise logs for this user
      const logsSnapshot = await db
        .collection('exercise_logs')
        .where('userId', '==', userId)
        .get();

      // Calculate total XP from logs
      let totalXp = 0;
      const totals: Record<string, number> = {};

      for (const logDoc of logsSnapshot.docs) {
        const log = logDoc.data();
        const type = log.type;
        const amount = log.amount || 0;

        // Skip custom exercises (they don't earn XP)
        if (type === 'custom' || log.isCustom) continue;

        // Calculate XP for this log
        const xpRate = XP_RATES[type as keyof typeof XP_RATES] || 0;
        const xpEarned = Math.floor(amount * xpRate);
        totalXp += xpEarned;

        // Track totals
        totals[type] = (totals[type] || 0) + amount;

        // Update the log's xpEarned if it's different
        if (log.xpEarned !== xpEarned) {
          await logDoc.ref.update({ xpEarned });
        }
      }

      // Calculate new level
      const newLevel = calculateLevel(totalXp);

      // Update user if XP changed
      if (totalXp !== oldXp || newLevel !== oldLevel) {
        await userDocRef.ref.update({
          xp: totalXp,
          level: newLevel,
          totals: {
            ...userData.totals,
            ...totals,
          },
        });

        results.push({
          userId,
          username: userData.username,
          oldXp,
          newXp: totalXp,
          oldLevel,
          newLevel,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated XP for ${results.length} users`,
      usersUpdated: results.length,
      details: results,
    });
  } catch (error) {
    console.error('Error recalculating XP:', error);
    return NextResponse.json({ error: 'Failed to recalculate XP' }, { status: 500 });
  }
}
