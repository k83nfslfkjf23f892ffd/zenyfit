import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances } from '@/lib/firebase-admin';
import { rateLimitByIP, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/invites/validate?code=xxx
 * Check if invite code is valid and unused
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitByIP(request, RATE_LIMITS.PUBLIC_MODERATE);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Code parameter is required' },
        { status: 400 }
      );
    }

    // Check if it's the master invite code
    const masterInviteCode = process.env.MASTER_INVITE_CODE;
    if (code === masterInviteCode) {
      return NextResponse.json(
        { valid: true, isMaster: true },
        { status: 200 }
      );
    }

    // Check regular invite code in Firestore
    const { db } = getAdminInstances();
    const inviteDoc = await db.collection('inviteCodes').doc(code).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { valid: false, error: 'Invalid invite code' },
        { status: 200 }
      );
    }

    const inviteData = inviteDoc.data();
    if (inviteData?.used) {
      return NextResponse.json(
        { valid: false, error: 'Invite code already used' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { valid: true, isMaster: false },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in /api/invites/validate:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}
