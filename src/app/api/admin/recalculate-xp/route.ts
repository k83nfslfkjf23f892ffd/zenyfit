import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { XP_RATES, EXERCISE_INFO, calculateLevel } from '@shared/constants';

interface LogChange {
  logId: string;
  type: string;
  typeName: string;
  amount: number;
  oldXp: number;
  newXp: number;
  timestamp: number;
}

interface UserChange {
  userId: string;
  username: string;
  oldXp: number;
  newXp: number;
  xpDiff: number;
  oldLevel: number;
  newLevel: number;
  logsChanged: number;
  logDetails?: LogChange[];
}

/**
 * POST /api/admin/recalculate-xp
 * Recalculate XP for all users based on their exercise logs
 * Admin only endpoint
 *
 * Query params:
 * - preview=true: Show what would change without applying (dry run)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = getAdminInstances();
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    // Check if user is admin
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const results: UserChange[] = [];
    let totalLogsChanged = 0;

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
      const logChanges: LogChange[] = [];

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

        // Track if this log would change
        const oldLogXp = log.xpEarned || 0;
        if (oldLogXp !== xpEarned) {
          logChanges.push({
            logId: logDoc.id,
            type,
            typeName: EXERCISE_INFO[type]?.label || type,
            amount,
            oldXp: oldLogXp,
            newXp: xpEarned,
            timestamp: log.timestamp,
          });

          // Update the log's xpEarned if not preview
          if (!isPreview) {
            await logDoc.ref.update({ xpEarned });
          }
        }
      }

      // Calculate new level
      const newLevel = calculateLevel(totalXp);

      // Check if user would change
      if (totalXp !== oldXp || newLevel !== oldLevel || logChanges.length > 0) {
        // Update user if not preview
        if (!isPreview && (totalXp !== oldXp || newLevel !== oldLevel)) {
          await userDocRef.ref.update({
            xp: totalXp,
            level: newLevel,
            totals: {
              ...userData.totals,
              ...totals,
            },
          });
        }

        totalLogsChanged += logChanges.length;

        results.push({
          userId,
          username: userData.username,
          oldXp,
          newXp: totalXp,
          xpDiff: totalXp - oldXp,
          oldLevel,
          newLevel,
          logsChanged: logChanges.length,
          // Include log details in preview mode
          ...(isPreview && logChanges.length > 0 ? { logDetails: logChanges.slice(0, 20) } : {}),
        });
      }
    }

    // Sort by XP difference (biggest changes first)
    results.sort((a, b) => Math.abs(b.xpDiff) - Math.abs(a.xpDiff));

    return NextResponse.json({
      success: true,
      preview: isPreview,
      message: isPreview
        ? `Preview: ${results.length} users would be updated, ${totalLogsChanged} logs would change`
        : `Recalculated XP for ${results.length} users, updated ${totalLogsChanged} logs`,
      usersAffected: results.length,
      logsAffected: totalLogsChanged,
      details: results,
    });
  } catch (error) {
    console.error('Error recalculating XP:', error);
    return NextResponse.json({ error: 'Failed to recalculate XP' }, { status: 500 });
  }
}
