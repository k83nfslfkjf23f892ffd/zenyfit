import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/challenges/[id]
 * Get challenge details
 */
export async function GET(
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

    const challengeDoc = await db.collection('challenges').doc(challengeId).get();

    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challengeData = challengeDoc.data()!;

    // Check if user can view this challenge
    const isParticipant = challengeData.participantIds?.includes(userId);
    const isPublic = challengeData.isPublic;

    if (!isParticipant && !isPublic) {
      return NextResponse.json(
        { error: 'You do not have access to this challenge' },
        { status: 403 }
      );
    }

    // Fetch current avatars for all participants
    const participantIds = challengeData.participantIds || [];
    if (participantIds.length > 0) {
      const userDocs = await db.getAll(
        ...participantIds.map((id: string) => db.collection('users').doc(id))
      );
      const avatarMap = new Map<string, string>();
      for (const doc of userDocs) {
        if (doc.exists) {
          const data = doc.data();
          avatarMap.set(doc.id, data?.avatar || '');
        }
      }
      // Update participants with current avatars
      challengeData.participants = challengeData.participants.map((p: { userId: string; avatar?: string }) => ({
        ...p,
        avatar: avatarMap.get(p.userId) || p.avatar || '',
      }));
    }

    return NextResponse.json(
      { challenge: { id: challengeDoc.id, ...challengeData } },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/challenges/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/challenges/[id]
 * Delete a challenge (creator only)
 */
export async function DELETE(
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

    const challengeDoc = await db.collection('challenges').doc(challengeId).get();

    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challengeData = challengeDoc.data()!;

    // Only creator can delete
    if (challengeData.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Only the creator can delete this challenge' },
        { status: 403 }
      );
    }

    await challengeDoc.ref.delete();

    return NextResponse.json(
      { success: true, message: 'Challenge deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in DELETE /api/challenges/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete challenge' },
      { status: 500 }
    );
  }
}
