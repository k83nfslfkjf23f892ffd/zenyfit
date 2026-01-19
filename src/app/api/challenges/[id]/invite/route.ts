import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

const inviteSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

/**
 * POST /api/challenges/[id]/invite
 * Send a challenge invitation to a user
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

    // Validate request body
    const body = await request.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { username } = validation.data;

    // Get challenge
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();

    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challengeData = challengeDoc.data()!;

    // Only participants can invite (typically the creator or members)
    if (!challengeData.participantIds?.includes(userId)) {
      return NextResponse.json(
        { error: 'Only participants can invite others' },
        { status: 403 }
      );
    }

    // Check if challenge has ended
    if (challengeData.endDate < Date.now()) {
      return NextResponse.json(
        { error: 'Cannot invite to an ended challenge' },
        { status: 400 }
      );
    }

    // Find user by username
    const usersSnapshot = await db
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invitedUserDoc = usersSnapshot.docs[0];
    const invitedUserId = invitedUserDoc.id;

    // Cannot invite yourself
    if (invitedUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot invite yourself' },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    if (challengeData.participantIds?.includes(invitedUserId)) {
      return NextResponse.json(
        { error: 'User is already a participant' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invite
    const existingInvite = await db
      .collection('challengeInvites')
      .where('challengeId', '==', challengeId)
      .where('invitedUserId', '==', invitedUserId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvite.empty) {
      return NextResponse.json(
        { error: 'User already has a pending invite' },
        { status: 400 }
      );
    }

    // Get inviter's username
    const inviterDoc = await db.collection('users').doc(userId).get();
    const inviterUsername = inviterDoc.exists ? inviterDoc.data()!.username : 'Unknown';

    // Create the invite
    const inviteRef = db.collection('challengeInvites').doc();
    const inviteData = {
      id: inviteRef.id,
      challengeId,
      challengeTitle: challengeData.title,
      invitedUserId,
      invitedBy: userId,
      invitedByUsername: inviterUsername,
      status: 'pending',
      timestamp: Date.now(),
    };

    await inviteRef.set(inviteData);

    return NextResponse.json(
      { success: true, message: `Invitation sent to ${username}` },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/challenges/[id]/invite:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
