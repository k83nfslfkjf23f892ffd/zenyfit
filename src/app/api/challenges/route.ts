import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

const createChallengeSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['pullups', 'pushups', 'dips', 'running']),
  goal: z.number().positive(),
  duration: z.number().int().positive().max(365), // days
  isPublic: z.boolean().default(false),
  inviteUserIds: z.array(z.string()).optional(),
  colors: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/challenges
 * Create a new challenge
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

    // Get user data for participant info
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    // Validate request
    const body = await request.json();
    const validation = createChallengeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, description, type, goal, duration, isPublic, inviteUserIds, colors } = validation.data;

    const now = Date.now();
    const endDate = now + duration * 24 * 60 * 60 * 1000;

    // Create challenge with creator as first participant
    const challengeRef = db.collection('challenges').doc();
    const challengeData = {
      id: challengeRef.id,
      title,
      description: description || '',
      type,
      goal,
      startDate: now,
      endDate,
      isPublic,
      createdBy: userId,
      participants: [
        {
          userId,
          username: userData.username,
          avatar: userData.avatar || '',
          progress: 0,
        },
      ],
      participantIds: [userId],
      colors: colors || { primary: '#000000', secondary: '#ffffff' },
      createdAt: now,
    };

    await challengeRef.set(challengeData);

    // Create invites if specified
    if (inviteUserIds && inviteUserIds.length > 0) {
      const inviteBatch = db.batch();

      for (const invitedUserId of inviteUserIds) {
        if (invitedUserId !== userId) {
          const inviteRef = db.collection('challengeInvites').doc();
          inviteBatch.set(inviteRef, {
            id: inviteRef.id,
            challengeId: challengeRef.id,
            invitedUserId,
            invitedBy: userId,
            status: 'pending',
            timestamp: now,
          });
        }
      }

      await inviteBatch.commit();
    }

    return NextResponse.json(
      { success: true, challenge: challengeData },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/challenges:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/challenges
 * Get challenges (user's challenges or public challenges)
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

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'my'; // 'my' or 'public'

    let challenges: unknown[] = [];

    if (filter === 'public') {
      // Get public challenges (excluding ones user has already joined)
      const snapshot = await db
        .collection('challenges')
        .where('isPublic', '==', true)
        .where('endDate', '>', Date.now())
        .orderBy('endDate', 'desc')
        .limit(50)
        .get();

      // Filter out challenges the user is already participating in
      challenges = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((challenge) => {
          const participantIds = (challenge as { participantIds?: string[] }).participantIds || [];
          return !participantIds.includes(userId);
        });
    } else {
      // Get user's challenges
      const snapshot = await db
        .collection('challenges')
        .where('participantIds', 'array-contains', userId)
        .orderBy('endDate', 'desc')
        .limit(50)
        .get();

      challenges = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    return NextResponse.json({ challenges }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}
