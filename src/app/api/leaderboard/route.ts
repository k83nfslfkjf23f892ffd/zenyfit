import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';

/**
 * GET /api/leaderboard
 * Get leaderboard rankings
 * - Default: Total XP (from standard exercises only)
 * - Can filter by exercise type (pullups, pushups, dips, running)
 * - Supports pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.READ_HEAVY);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get('type'); // 'pullups', 'pushups', 'dips', 'running', or null for total XP
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Check server cache
    const cacheParams = `type=${type || 'xp'}&limit=${limit}&offset=${offset}`;
    const cached = getCached('/api/leaderboard', userId, cacheParams);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    let query;

    if (type && ['pullups', 'pushups', 'dips', 'running'].includes(type)) {
      // Filter by specific exercise type
      query = db
        .collection('users')
        .orderBy(`totals.${type}`, 'desc')
        .limit(limit)
        .offset(offset);
    } else {
      // Total XP leaderboard
      query = db
        .collection('users')
        .orderBy('xp', 'desc')
        .limit(limit)
        .offset(offset);
    }

    const snapshot = await query.get();

    // Format results with rank
    const rankings = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: offset + index + 1,
        id: doc.id,
        username: data.username,
        avatar: data.avatar || '',
        level: data.level,
        xp: data.xp,
        totals: data.totals,
        score: type ? data.totals?.[type] || 0 : data.xp,
      };
    });

    const responseData = {
      rankings,
      type: type || 'xp',
      pagination: {
        limit,
        offset,
        hasMore: snapshot.size === limit,
      },
    };

    setCache('/api/leaderboard', userId, responseData, undefined, cacheParams);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
