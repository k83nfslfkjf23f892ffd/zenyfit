import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances } from '@/lib/firebase-admin';
import { usernameToEmail } from '@shared/constants';
import { rateLimitByIP, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/users/validate?username=xxx
 * Check if username is available
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitByIP(request, RATE_LIMITS.PUBLIC_MODERATE);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || username.length > 12) {
      return NextResponse.json(
        { available: false, error: 'Username must be 3-12 characters' },
        { status: 200 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { available: false, error: 'Username can only contain letters, numbers, and underscores' },
        { status: 200 }
      );
    }

    const { auth } = getAdminInstances();
    const email = usernameToEmail(username);

    // Check if user exists with this email (username)
    try {
      await auth.getUserByEmail(email);
      // User exists, username is taken
      return NextResponse.json(
        { available: false },
        { status: 200 }
      );
    } catch (error: unknown) {
      // User doesn't exist, username is available
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        return NextResponse.json(
          { available: true },
          { status: 200 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in /api/users/validate:', error);
    return NextResponse.json(
      { error: 'Failed to validate username' },
      { status: 500 }
    );
  }
}
