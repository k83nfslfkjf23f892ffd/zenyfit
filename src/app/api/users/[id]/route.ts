import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/users/[id]
 * Get user profile by ID
 * - Anyone authenticated can view profiles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();

    // Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;

    // Return user data (exclude sensitive fields if needed)
    return NextResponse.json(
      {
        user: {
          id: userDoc.id,
          ...userData,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update user profile
 * - Only owner can update
 * - Only avatar and theme fields can be updated
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting (higher limit for profile updates since avatar picker triggers many saves)
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.WRITE_HEAVY);
    if (rateLimitResponse) return rateLimitResponse;

    const authenticatedUserId = decodedToken.uid;

    // Check if user is updating their own profile
    if (authenticatedUserId !== targetUserId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own profile' },
        { status: 403 }
      );
    }

    const { db } = getAdminInstances();

    // Get user document
    const userRef = db.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = ['avatar', 'theme'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (updates.avatar !== undefined) {
      if (typeof updates.avatar !== 'string' || updates.avatar.length > 500) {
        return NextResponse.json(
          { error: 'Avatar must be a string (max 500 characters)' },
          { status: 400 }
        );
      }
    }

    if (updates.theme !== undefined) {
      if (typeof updates.theme !== 'string' || updates.theme.length > 50) {
        return NextResponse.json(
          { error: 'Theme must be a string (max 50 characters)' },
          { status: 400 }
        );
      }
    }

    // Update the document
    await userRef.update(updates);

    // Get updated document
    const updatedDoc = await userRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json(
      {
        success: true,
        user: updatedData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in PATCH /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
