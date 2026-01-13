import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * PATCH /api/exercises/custom/[id]
 * Update a custom exercise
 * - Only owner can update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: exerciseId } = await params;
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

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Get the exercise document
    const exerciseRef = db.collection('custom_exercises').doc(exerciseId);
    const exerciseDoc = await exerciseRef.get();

    if (!exerciseDoc.exists) {
      return NextResponse.json(
        { error: 'Custom exercise not found' },
        { status: 404 }
      );
    }

    const exerciseData = exerciseDoc.data()!;

    // Check if user is the owner
    if (exerciseData.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own exercises' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = ['name', 'unit', 'quickActions'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate updated fields
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.length < 1 || updates.name.length > 50) {
        return NextResponse.json(
          { error: 'Name must be 1-50 characters' },
          { status: 400 }
        );
      }
    }

    if (updates.unit !== undefined) {
      if (typeof updates.unit !== 'string' || updates.unit.length < 1 || updates.unit.length > 20) {
        return NextResponse.json(
          { error: 'Unit must be 1-20 characters' },
          { status: 400 }
        );
      }
    }

    if (updates.quickActions !== undefined) {
      if (!Array.isArray(updates.quickActions) || updates.quickActions.length > 6) {
        return NextResponse.json(
          { error: 'Quick actions must be an array with max 6 items' },
          { status: 400 }
        );
      }
      // Validate all items are positive numbers
      if (!updates.quickActions.every((n: unknown) => typeof n === 'number' && n > 0)) {
        return NextResponse.json(
          { error: 'Quick actions must be positive numbers' },
          { status: 400 }
        );
      }
    }

    // Update the document
    await exerciseRef.update(updates);

    // Get updated document
    const updatedDoc = await exerciseRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json(
      {
        success: true,
        exercise: updatedData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in PATCH /api/exercises/custom/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update custom exercise' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exercises/custom/[id]
 * Delete a custom exercise
 * - Only owner can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: exerciseId } = await params;
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

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Get the exercise document
    const exerciseRef = db.collection('custom_exercises').doc(exerciseId);
    const exerciseDoc = await exerciseRef.get();

    if (!exerciseDoc.exists) {
      return NextResponse.json(
        { error: 'Custom exercise not found' },
        { status: 404 }
      );
    }

    const exerciseData = exerciseDoc.data()!;

    // Check if user is the owner
    if (exerciseData.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own exercises' },
        { status: 403 }
      );
    }

    // Delete the document
    await exerciseRef.delete();

    return NextResponse.json(
      {
        success: true,
        message: 'Custom exercise deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in DELETE /api/exercises/custom/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom exercise' },
      { status: 500 }
    );
  }
}
