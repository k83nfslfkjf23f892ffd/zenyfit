import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';

interface UserBackup {
  id: string;
  username: string;
  xp: number;
  level: number;
  totals: Record<string, number>;
}

interface LogBackup {
  id: string;
  userId: string;
  type: string;
  amount: number;
  xpEarned: number;
  timestamp: number;
}

/**
 * GET /api/admin/backup-xp
 * List all XP backups
 */
export async function GET(request: NextRequest) {
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

    // Get all backups
    const backupsSnapshot = await db
      .collection('xp_backups')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const backups = backupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Don't include full data in list
      users: undefined,
      logs: undefined,
      userCount: doc.data().users?.length || 0,
      logCount: doc.data().logs?.length || 0,
    }));

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup-xp
 * Create a backup of all XP data
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

    // Get optional description from body
    let description = '';
    try {
      const body = await request.json();
      description = body.description || '';
    } catch {
      // No body is fine
    }

    // Backup all users' XP data — select only needed fields
    const usersSnapshot = await db.collection('users')
      .select('username', 'xp', 'level', 'totals')
      .get();
    const users: UserBackup[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      xp: doc.data().xp || 0,
      level: doc.data().level || 1,
      totals: doc.data().totals || {},
    }));

    // Backup all exercise logs' XP data — select only needed fields
    const logsSnapshot = await db.collection('exercise_logs')
      .select('userId', 'type', 'amount', 'xpEarned', 'timestamp')
      .get();
    const logs: LogBackup[] = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId,
      type: doc.data().type,
      amount: doc.data().amount || 0,
      xpEarned: doc.data().xpEarned || 0,
      timestamp: doc.data().timestamp,
    }));

    // Calculate totals for summary
    const totalXp = users.reduce((sum, u) => sum + u.xp, 0);

    // Create backup document
    const backupId = `backup_${Date.now()}`;
    const backupData = {
      createdAt: Date.now(),
      createdBy: decodedToken.uid,
      description,
      summary: {
        totalUsers: users.length,
        totalLogs: logs.length,
        totalXp,
      },
      users,
      logs,
    };

    await db.collection('xp_backups').doc(backupId).set(backupData);

    return NextResponse.json({
      success: true,
      backupId,
      message: `Backup created with ${users.length} users and ${logs.length} logs`,
      summary: backupData.summary,
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
