import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { LIMITS } from '@shared/constants';

/**
 * Generate a random 10-character invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/invites/generate
 * Generate a new invite code
 * - Max 5 invite codes per user
 * - Generates unique 10-character code
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

    // Check if user has reached the limit
    const existingCodesSnapshot = await db
      .collection('inviteCodes')
      .where('createdBy', '==', userId)
      .get();

    if (existingCodesSnapshot.size >= LIMITS.inviteCodes) {
      return NextResponse.json(
        { error: `Maximum ${LIMITS.inviteCodes} invite codes allowed` },
        { status: 400 }
      );
    }

    // Generate unique code
    let inviteCode = generateInviteCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (codeExists && attempts < maxAttempts) {
      const docRef = db.collection('inviteCodes').doc(inviteCode);
      const doc = await docRef.get();

      if (!doc.exists) {
        codeExists = false;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: 'Failed to generate unique code, please try again' },
        { status: 500 }
      );
    }

    // Create invite code document
    const inviteCodeData = {
      createdBy: userId,
      used: false,
      usedBy: null,
      createdAt: Date.now(),
      usedAt: null,
    };

    await db.collection('inviteCodes').doc(inviteCode).set(inviteCodeData);

    return NextResponse.json(
      {
        success: true,
        inviteCode: {
          code: inviteCode,
          ...inviteCodeData,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/invites/generate:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite code' },
      { status: 500 }
    );
  }
}
