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
 * GET /api/admin/users
 * List all users with search, filter, and sort
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

    // Parse query parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all, active, banned
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, level, xp, username
    const order = searchParams.get('order') || 'desc'; // asc, desc
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build base query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db.collection('users');

    // Apply status filter
    if (status === 'banned') {
      query = query.where('isBanned', '==', true);
    } else if (status === 'active') {
      query = query.where('isBanned', '==', false);
    }

    // Apply sorting
    const orderDirection = order === 'asc' ? 'asc' : 'desc';
    query = query.orderBy(sortBy, orderDirection);

    // Get results
    const snapshot = await query.limit(limit).offset(offset).get();

    // Filter by search term (username) if provided
    let users = snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((user: { username: string }) =>
        user.username.toLowerCase().includes(searchLower)
      );
    }

    // Get total count
    const countQuery = db.collection('users');
    const countSnapshot = await countQuery.count().get();
    const total = countSnapshot.data().count;

    return NextResponse.json(
      {
        users,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + users.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update user (ban, unban, promote, demote)
 */
const userUpdateSchema = z.object({
  userId: z.string(),
  action: z.enum(['ban', 'unban', 'promote', 'demote']),
});

export async function PATCH(request: NextRequest) {
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
    const validation = userUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, action } = validation.data;
    const { db } = getAdminInstances();

    // Prevent self-action
    if (userId === adminCheck.userId) {
      return NextResponse.json(
        { error: 'Cannot perform this action on yourself' },
        { status: 400 }
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Perform action
    const updates: { isBanned?: boolean; isAdmin?: boolean } = {};

    switch (action) {
      case 'ban':
        updates.isBanned = true;
        break;
      case 'unban':
        updates.isBanned = false;
        break;
      case 'promote':
        updates.isAdmin = true;
        break;
      case 'demote':
        updates.isAdmin = false;
        break;
    }

    await userRef.update(updates);

    return NextResponse.json(
      { success: true, message: `User ${action}ned successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete user and all associated data
 */
const userDeleteSchema = z.object({
  userId: z.string(),
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
    const validation = userDeleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId } = validation.data;
    const { db, auth } = getAdminInstances();

    // Prevent self-deletion
    if (userId === adminCheck.userId) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    // Delete user from Firestore
    await db.collection('users').doc(userId).delete();

    // Delete user's exercise logs
    const logsSnapshot = await db.collection('exercise_logs')
      .where('userId', '==', userId)
      .get();

    const deleteBatch = db.batch();
    logsSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));

    // Delete user's custom exercises
    const customExercisesSnapshot = await db.collection('custom_exercises')
      .where('userId', '==', userId)
      .get();

    customExercisesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));

    // Delete user's invite codes
    const inviteCodesSnapshot = await db.collection('inviteCodes')
      .where('createdBy', '==', userId)
      .get();

    inviteCodesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));

    await deleteBatch.commit();

    // Delete from Firebase Auth
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      console.error('Error deleting user from Auth:', authError);
      // Continue even if auth deletion fails
    }

    return NextResponse.json(
      { success: true, message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
