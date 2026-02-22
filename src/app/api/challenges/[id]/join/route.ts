import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/challenges/[id]/join
 * Join a public challenge
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Get user data (outside transaction — doesn't need atomicity)
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    const challengeRef = db.collection('challenges').doc(challengeId);

    // Use transaction to atomically check + join (prevents duplicate joins from concurrent requests)
    const result = await db.runTransaction(async (transaction) => {
      const challengeDoc = await transaction.get(challengeRef);

      if (!challengeDoc.exists) {
        return { error: 'Challenge not found', status: 404 };
      }

      const challengeData = challengeDoc.data()!;

      if (!challengeData.isPublic) {
        return { error: 'This challenge is not public', status: 403 };
      }

      if (challengeData.endDate < Date.now()) {
        return { error: 'This challenge has ended', status: 400 };
      }

      if (challengeData.participantIds?.includes(userId)) {
        return { error: 'You are already a participant', status: 400 };
      }

      const newParticipant = {
        userId,
        username: userData.username,
        avatar: userData.avatar || '',
        progress: 0,
      };

      transaction.update(challengeRef, {
        participants: [...(challengeData.participants || []), newParticipant],
        participantIds: [...(challengeData.participantIds || []), userId],
      });

      return { success: true };
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Successfully joined challenge' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/challenges/[id]/join:', error);
    return NextResponse.json(
      { error: 'Failed to join challenge' },
      { status: 500 }
    );
  }
}
