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
    const allowedFields = ['avatar', 'theme', 'quickAddPresets', 'dashboardWidgets'];
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

    if (updates.quickAddPresets !== undefined) {
      // Validate quickAddPresets is a record of string -> number[]
      if (typeof updates.quickAddPresets !== 'object' || updates.quickAddPresets === null) {
        return NextResponse.json(
          { error: 'quickAddPresets must be an object' },
          { status: 400 }
        );
      }
      const presets = updates.quickAddPresets as Record<string, unknown>;
      // Max 20 exercise types to prevent abuse
      if (Object.keys(presets).length > 20) {
        return NextResponse.json(
          { error: 'Too many exercise presets (max 20)' },
          { status: 400 }
        );
      }
      for (const [key, value] of Object.entries(presets)) {
        if (!Array.isArray(value) || value.length > 8) {
          return NextResponse.json(
            { error: `Preset for ${key} must be an array (max 8 values)` },
            { status: 400 }
          );
        }
        for (const v of value) {
          if (typeof v !== 'number' || v <= 0) {
            return NextResponse.json(
              { error: `All preset values must be positive numbers` },
              { status: 400 }
            );
          }
        }
      }
    }

    if (updates.dashboardWidgets !== undefined) {
      // Validate dashboardWidgets is { order: string[], hidden: string[] }
      if (typeof updates.dashboardWidgets !== 'object' || updates.dashboardWidgets === null) {
        return NextResponse.json(
          { error: 'dashboardWidgets must be an object' },
          { status: 400 }
        );
      }
      const widgets = updates.dashboardWidgets as Record<string, unknown>;

      // Validate order array
      if (widgets.order !== undefined) {
        if (!Array.isArray(widgets.order) || widgets.order.length > 20) {
          return NextResponse.json(
            { error: 'order must be an array (max 20 items)' },
            { status: 400 }
          );
        }
        for (const id of widgets.order) {
          if (typeof id !== 'string' || id.length > 50) {
            return NextResponse.json(
              { error: 'Widget IDs must be strings (max 50 chars)' },
              { status: 400 }
            );
          }
        }
      }

      // Validate hidden array
      if (widgets.hidden !== undefined) {
        if (!Array.isArray(widgets.hidden) || widgets.hidden.length > 20) {
          return NextResponse.json(
            { error: 'hidden must be an array (max 20 items)' },
            { status: 400 }
          );
        }
        for (const id of widgets.hidden) {
          if (typeof id !== 'string' || id.length > 50) {
            return NextResponse.json(
              { error: 'Widget IDs must be strings (max 50 chars)' },
              { status: 400 }
            );
          }
        }
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
