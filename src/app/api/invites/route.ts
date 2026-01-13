import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { LIMITS } from '@shared/constants';

/**
 * GET /api/invites
 * Get all invite codes created by the authenticated user
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

    // Get all invite codes created by this user
    const snapshot = await db
      .collection('inviteCodes')
      .where('createdBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const inviteCodes = snapshot.docs.map((doc) => ({
      code: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      {
        inviteCodes,
        count: inviteCodes.length,
        limit: LIMITS.inviteCodes,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite codes' },
      { status: 500 }
    );
  }
}
