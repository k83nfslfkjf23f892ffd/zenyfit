import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { customExerciseSchema } from '@shared/schema';
import { LIMITS } from '@shared/constants';

/**
 * POST /api/exercises/custom
 * Create a new custom exercise
 * - Enforces max 12 custom exercises per user
 * - Custom exercises earn 0 XP
 */
export async function POST(request: NextRequest) {
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

    // Check if user has reached the limit
    const existingExercisesSnapshot = await db
      .collection('custom_exercises')
      .where('userId', '==', userId)
      .get();

    if (existingExercisesSnapshot.size >= LIMITS.customExercises) {
      return NextResponse.json(
        { error: `Maximum ${LIMITS.customExercises} custom exercises allowed` },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = customExerciseSchema.safeParse({
      ...body,
      userId,
      createdAt: Date.now(),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const exerciseData = validation.data;

    // Create custom exercise document
    const exerciseRef = db.collection('custom_exercises').doc();
    const exerciseWithId = {
      ...exerciseData,
      id: exerciseRef.id,
    };

    await exerciseRef.set(exerciseWithId);

    return NextResponse.json(
      {
        success: true,
        exercise: exerciseWithId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/exercises/custom:', error);
    return NextResponse.json(
      { error: 'Failed to create custom exercise' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exercises/custom
 * Get all custom exercises for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Get all custom exercises for this user
    const snapshot = await db
      .collection('custom_exercises')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const exercises = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      {
        exercises,
        count: exercises.length,
        limit: LIMITS.customExercises,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/exercises/custom:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom exercises' },
      { status: 500 }
    );
  }
}
