import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/notifications/subscribe
 * Save push notification subscription for a user
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request.headers.get('authorization'));
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(authResult, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const { db } = getAdminInstances();

    // Save subscription to user's document
    await db.collection('users').doc(authResult.uid).update({
      pushSubscription: subscription,
      pushEnabled: true,
      pushSubscribedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Remove push notification subscription for a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request.headers.get('authorization'));
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(authResult, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();

    // Remove subscription from user's document
    await db.collection('users').doc(authResult.uid).update({
      pushSubscription: null,
      pushEnabled: false,
      pushUnsubscribedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/subscribe
 * Get current push notification subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request.headers.get('authorization'));
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(authResult, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();
    const userDoc = await db.collection('users').doc(authResult.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      enabled: userData?.pushEnabled || false,
      hasSubscription: !!userData?.pushSubscription,
    });
  } catch (error) {
    console.error('Error getting push subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
