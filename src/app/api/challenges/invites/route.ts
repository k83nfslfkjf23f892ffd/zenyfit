import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * GET /api/challenges/invites
 * Get pending challenge invites for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Get pending invites
    const snapshot = await db
      .collection('challengeInvites')
      .where('invitedUserId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('timestamp', 'desc')
      .get();

    const invites = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const inviteData = doc.data();

        // Get challenge details
        const challengeDoc = await db
          .collection('challenges')
          .doc(inviteData.challengeId)
          .get();

        const challengeData = challengeDoc.exists ? challengeDoc.data() : null;

        // Get inviter details
        const inviterDoc = await db
          .collection('users')
          .doc(inviteData.invitedBy)
          .get();

        const inviterData = inviterDoc.exists ? inviterDoc.data() : null;

        return {
          id: doc.id,
          ...inviteData,
          challenge: challengeData
            ? {
                id: inviteData.challengeId,
                title: challengeData.title,
                type: challengeData.type,
                goal: challengeData.goal,
              }
            : null,
          inviter: inviterData
            ? {
                username: inviterData.username,
                avatar: inviterData.avatar,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ invites }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/challenges/invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

const respondInviteSchema = z.object({
  inviteId: z.string(),
  action: z.enum(['accept', 'decline']),
});

/**
 * POST /api/challenges/invites
 * Accept or decline a challenge invite
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = respondInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { inviteId, action } = validation.data;

    // Get invite
    const inviteRef = db.collection('challengeInvites').doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const inviteData = inviteDoc.data()!;

    // Check if invite is for this user
    if (inviteData.invitedUserId !== userId) {
      return NextResponse.json(
        { error: 'This invite is not for you' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (inviteData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite already responded to' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Get challenge
      const challengeRef = db.collection('challenges').doc(inviteData.challengeId);
      const challengeDoc = await challengeRef.get();

      if (!challengeDoc.exists) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
      }

      const challengeData = challengeDoc.data()!;

      // Check if challenge has ended
      if (challengeData.endDate < Date.now()) {
        await inviteRef.update({ status: 'expired' });
        return NextResponse.json(
          { error: 'Challenge has ended' },
          { status: 400 }
        );
      }

      // Check if already a participant
      if (challengeData.participantIds?.includes(userId)) {
        await inviteRef.update({ status: 'accepted' });
        return NextResponse.json(
          { success: true, message: 'Already a participant' },
          { status: 200 }
        );
      }

      // Get user data
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const userData = userDoc.data()!;

      // Add user to challenge
      const newParticipant = {
        userId,
        username: userData.username,
        avatar: userData.avatar || '',
        progress: 0,
      };

      await challengeRef.update({
        participants: [...(challengeData.participants || []), newParticipant],
        participantIds: [...(challengeData.participantIds || []), userId],
      });

      await inviteRef.update({ status: 'accepted' });

      return NextResponse.json(
        { success: true, message: 'Invite accepted' },
        { status: 200 }
      );
    } else {
      // Decline
      await inviteRef.update({ status: 'declined' });

      return NextResponse.json(
        { success: true, message: 'Invite declined' },
        { status: 200 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in POST /api/challenges/invites:', error);
    return NextResponse.json(
      { error: 'Failed to respond to invite' },
      { status: 500 }
    );
  }
}
