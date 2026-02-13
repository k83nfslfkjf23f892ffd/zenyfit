import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/sanitize';

const VALID_CATEGORIES = ['idea', 'bug', 'opinion'] as const;
const MAX_MESSAGE_LENGTH = 500;
const FEEDBACK_LIMIT = 50;

/**
 * POST /api/feedback — Submit anonymous feedback
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Strict rate limit: 3 per hour
    const rateLimitResponse = rateLimitByUser(
      decodedToken,
      '/api/feedback',
      { maxRequests: 3, windowMs: 60 * 60 * 1000 }
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { category, message } = body;

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const sanitized = sanitizeText(message, MAX_MESSAGE_LENGTH);
    if (!sanitized || sanitized.length < 3) {
      return NextResponse.json({ error: 'Message too short' }, { status: 400 });
    }

    const { db } = getAdminInstances();
    await db.collection('feedback').add({
      category,
      message: sanitized,
      userId: decodedToken.uid,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

/**
 * GET /api/feedback — Fetch recent feedback
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = rateLimitByUser(decodedToken, '/api/feedback-read', RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();
    const snapshot = await db.collection('feedback')
      .orderBy('createdAt', 'desc')
      .limit(FEEDBACK_LIMIT)
      .get();

    const userId = decodedToken.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const isAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;

    const feedback = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        category: data.category,
        message: data.message,
        createdAt: data.createdAt,
        fixed: data.fixed || false,
        isOwn: data.userId === userId || isAdmin,
      };
    });

    return NextResponse.json({ feedback }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

/**
 * DELETE /api/feedback — Delete own feedback
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('id');
    if (!feedbackId) {
      return NextResponse.json({ error: 'Missing feedback id' }, { status: 400 });
    }

    const { db } = getAdminInstances();
    const docRef = db.collection('feedback').doc(feedbackId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Allow owner or admin to delete
    const isOwner = doc.data()?.userId === decodedToken.uid;
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Not your feedback' }, { status: 403 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}

/**
 * PATCH /api/feedback — Admin: toggle bug as fixed
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = getAdminInstances();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, fixed } = body;
    if (!id || typeof fixed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const docRef = db.collection('feedback').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await docRef.update({ fixed });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}
