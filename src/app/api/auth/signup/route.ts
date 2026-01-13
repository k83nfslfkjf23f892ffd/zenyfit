import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances } from '@/lib/firebase-admin';
import { signUpSchema } from '@shared/schema';
import { usernameToEmail } from '@shared/constants';
import { sanitizeUsername } from '@/lib/sanitize';
import { rateLimitByIP, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/auth/signup
 * Create new user with invite code validation
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitByIP(request, RATE_LIMITS.PUBLIC_STRICT);
  if (rateLimitResponse) return rateLimitResponse;

  try {

    const body = await request.json();

    // Validate request body
    const validation = signUpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { password, inviteCode } = validation.data;
    const username = sanitizeUsername(validation.data.username); // Sanitize username
    const { db, auth } = getAdminInstances();

    // Check if invite code is valid
    const masterInviteCode = process.env.MASTER_INVITE_CODE;
    const isMasterCode = inviteCode === masterInviteCode;

    let inviteDoc = null;
    let inviterUserId: string | undefined;

    if (!isMasterCode) {
      // Check regular invite code
      inviteDoc = await db.collection('inviteCodes').doc(inviteCode).get();

      if (!inviteDoc.exists) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 400 }
        );
      }

      const inviteData = inviteDoc.data();
      if (inviteData?.used) {
        return NextResponse.json(
          { error: 'Invite code already used' },
          { status: 400 }
        );
      }

      inviterUserId = inviteData?.createdBy;
    }

    // Convert username to email
    const email = usernameToEmail(username);

    // Check if username (email) already exists
    try {
      await auth.getUserByEmail(email);
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    } catch (error: unknown) {
      // User doesn't exist, which is what we want
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username,
    });

    // Create Firestore user document
    const userData = {
      id: userRecord.uid,
      username,
      email,
      level: 1,
      xp: 0,
      totals: {
        pullups: 0,
        pushups: 0,
        dips: 0,
        running: 0,
      },
      isAdmin: isMasterCode, // Auto-admin for master invite code
      isBanned: false,
      invitedBy: inviterUserId,
      createdAt: Date.now(),
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Mark invite code as used (if not master code)
    if (!isMasterCode && inviteDoc) {
      await inviteDoc.ref.update({
        used: true,
        usedBy: userRecord.uid,
        usedAt: Date.now(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userRecord.uid,
          username,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in /api/auth/signup:', error);

    // Handle specific Firebase errors
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
