import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';

/**
 * POST /api/admin/restore-xp
 * Restore XP data from a backup
 *
 * Query params:
 * - backupId: The backup ID to restore from
 * - preview: Set to "true" to see what would change without applying
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
    const backupId = searchParams.get('backupId');
    const isPreview = searchParams.get('preview') === 'true';

    if (!backupId) {
      return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the backup
    const backupDoc = await db.collection('xp_backups').doc(backupId).get();
    if (!backupDoc.exists) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backup = backupDoc.data()!;
    const backupUsers = backup.users || [];
    const backupLogs = backup.logs || [];

    let usersRestored = 0;
    let logsRestored = 0;
    const changes: Array<{ type: string; id: string; field: string; from: number; to: number }> = [];

    // Restore user XP data
    for (const backupUser of backupUsers) {
      const currentUserDoc = await db.collection('users').doc(backupUser.id).get();
      if (!currentUserDoc.exists) continue;

      const currentData = currentUserDoc.data()!;
      const needsUpdate =
        currentData.xp !== backupUser.xp ||
        currentData.level !== backupUser.level;

      if (needsUpdate) {
        if (isPreview) {
          changes.push({
            type: 'user',
            id: backupUser.username,
            field: 'xp',
            from: currentData.xp || 0,
            to: backupUser.xp,
          });
        } else {
          await currentUserDoc.ref.update({
            xp: backupUser.xp,
            level: backupUser.level,
            totals: backupUser.totals,
          });
        }
        usersRestored++;
      }
    }

    // Restore log xpEarned values
    for (const backupLog of backupLogs) {
      const currentLogDoc = await db.collection('exercise_logs').doc(backupLog.id).get();
      if (!currentLogDoc.exists) continue;

      const currentData = currentLogDoc.data()!;
      if (currentData.xpEarned !== backupLog.xpEarned) {
        if (isPreview && changes.length < 50) {
          changes.push({
            type: 'log',
            id: `${backupLog.type} x${backupLog.amount}`,
            field: 'xpEarned',
            from: currentData.xpEarned || 0,
            to: backupLog.xpEarned,
          });
        }

        if (!isPreview) {
          await currentLogDoc.ref.update({
            xpEarned: backupLog.xpEarned,
          });
        }
        logsRestored++;
      }
    }

    return NextResponse.json({
      success: true,
      preview: isPreview,
      backupId,
      backupDate: new Date(backup.createdAt).toISOString(),
      message: isPreview
        ? `Preview: Would restore ${usersRestored} users and ${logsRestored} logs`
        : `Restored ${usersRestored} users and ${logsRestored} logs from backup`,
      usersRestored,
      logsRestored,
      ...(isPreview ? { changes: changes.slice(0, 50) } : {}),
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
