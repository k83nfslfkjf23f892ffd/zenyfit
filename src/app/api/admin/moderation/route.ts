import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

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
 * GET /api/admin/moderation
 * Get content for moderation (challenges, custom exercises, recent activity)
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

    const { db } = getAdminInstances();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // all, challenges, exercises, activity
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result: {
      challenges?: unknown[];
      customExercises?: unknown[];
      recentActivity?: unknown[];
    } = {};

    // Get all challenges (public and private)
    if (type === 'all' || type === 'challenges') {
      const challengesSnapshot = await db.collection('challenges')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      result.challenges = challengesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // Get all custom exercises
    if (type === 'all' || type === 'exercises') {
      const exercisesSnapshot = await db.collection('custom_exercises')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      result.customExercises = exercisesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // Get recent activity (all users' workout logs)
    if (type === 'all' || type === 'activity') {
      const activitySnapshot = await db.collection('exercise_logs')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      // Fetch user data for each activity
      const userIds = [...new Set(activitySnapshot.docs.map(doc => doc.data().userId))];
      const usersSnapshot = await db.collection('users')
        .where('__name__', 'in', userIds.slice(0, 10)) // Firestore 'in' query limit
        .get();

      const usersMap = new Map();
      usersSnapshot.docs.forEach(doc => {
        usersMap.set(doc.id, {
          username: doc.data().username,
          avatar: doc.data().avatar,
        });
      });

      result.recentActivity = activitySnapshot.docs.map(doc => {
        const data = doc.data();
        const user = usersMap.get(data.userId);
        return {
          id: doc.id,
          ...data,
          username: user?.username || 'Unknown',
          avatar: user?.avatar,
        };
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/admin/moderation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/moderation
 * Delete content (challenge, custom exercise, or workout log)
 */
const deleteContentSchema = z.object({
  type: z.enum(['challenge', 'customExercise', 'workoutLog']),
  id: z.string(),
});

export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const validation = deleteContentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { type, id } = validation.data;
    const { db } = getAdminInstances();

    switch (type) {
      case 'challenge':
        // Delete challenge and associated invites
        await db.collection('challenges').doc(id).delete();

        const invitesSnapshot = await db.collection('challengeInvites')
          .where('challengeId', '==', id)
          .get();

        const batch = db.batch();
        invitesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        break;

      case 'customExercise':
        await db.collection('custom_exercises').doc(id).delete();
        break;

      case 'workoutLog':
        await db.collection('exercise_logs').doc(id).delete();
        break;
    }

    return NextResponse.json(
      { success: true, message: 'Content deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/admin/moderation:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
