import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * Helper: Verify user is admin
 */
async function verifyAdmin(authHeader: string | null) {
  const decodedToken = await verifyAuthToken(authHeader);
  if (!decodedToken) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { db } = getAdminInstances();
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();

  if (!userDoc.exists) {
    return { error: 'User not found', status: 404 };
  }

  const userData = userDoc.data();
  if (!userData?.isAdmin) {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { userId: decodedToken.uid, decodedToken, isAdmin: true };
}

/**
 * Helper: Generate random invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking chars
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /api/admin/invites
 * List all invite codes with usage information
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminCheck = await verifyAdmin(authHeader);

    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(adminCheck.decodedToken!, request.nextUrl.pathname, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) return rateLimitResponse;

    const { db } = getAdminInstances();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') || 'all'; // all, used, unused
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = db.collection('inviteCodes').orderBy('createdAt', 'desc');

    if (status === 'used') {
      query = query.where('used', '==', true);
    } else if (status === 'unused') {
      query = query.where('used', '==', false);
    }

    // Get invite codes
    const snapshot = await query.limit(limit).offset(offset).get();

    // Get creator and user data
    const creatorIds = new Set<string>();
    const userIds = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      creatorIds.add(data.createdBy);
      if (data.usedBy) {
        userIds.add(data.usedBy);
      }
    });

    const allUserIds = [...creatorIds, ...userIds];
    const usersMap = new Map();

    if (allUserIds.length > 0) {
      // Fetch users in chunks of 10 (Firestore 'in' query limit)
      for (let i = 0; i < allUserIds.length; i += 10) {
        const chunk = allUserIds.slice(i, i + 10);
        const usersSnapshot = await db.collection('users')
          .where('__name__', 'in', chunk)
          .get();

        usersSnapshot.docs.forEach(doc => {
          usersMap.set(doc.id, {
            username: doc.data().username,
            avatar: doc.data().avatar,
          });
        });
      }
    }

    // Format results
    const inviteCodes = snapshot.docs.map(doc => {
      const data = doc.data();
      const creator = usersMap.get(data.createdBy);
      const user = data.usedBy ? usersMap.get(data.usedBy) : null;

      return {
        code: doc.id,
        createdBy: data.createdBy,
        creatorUsername: creator?.username || 'Unknown',
        creatorAvatar: creator?.avatar,
        used: data.used,
        usedBy: data.usedBy,
        userUsername: user?.username,
        userAvatar: user?.avatar,
        createdAt: data.createdAt,
        usedAt: data.usedAt,
      };
    });

    // Get total count
    const countSnapshot = await db.collection('inviteCodes').count().get();
    const total = countSnapshot.data().count;

    return NextResponse.json(
      {
        inviteCodes,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + inviteCodes.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/admin/invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite codes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/invites
 * Generate bulk invite codes (admin only)
 */
const bulkInviteSchema = z.object({
  count: z.number().int().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminCheck = await verifyAdmin(authHeader);

    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(adminCheck.decodedToken!, request.nextUrl.pathname, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = bulkInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { count } = validation.data;
    const { db } = getAdminInstances();

    // Generate unique codes
    const codes: string[] = [];
    const batch = db.batch();

    for (let i = 0; i < count; i++) {
      let code = generateInviteCode();

      // Ensure code is unique
      let attempts = 0;
      while (codes.includes(code) && attempts < 10) {
        code = generateInviteCode();
        attempts++;
      }

      codes.push(code);

      const codeRef = db.collection('inviteCodes').doc(code);
      batch.set(codeRef, {
        createdBy: adminCheck.userId,
        used: false,
        createdAt: Date.now(),
      });
    }

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        codes,
        message: `Generated ${count} invite code(s)`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/invites:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite codes' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invites
 * Revoke (delete) unused invite code
 */
const revokeInviteSchema = z.object({
  code: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminCheck = await verifyAdmin(authHeader);

    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(adminCheck.decodedToken!, request.nextUrl.pathname, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = revokeInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code } = validation.data;
    const { db } = getAdminInstances();

    const codeRef = db.collection('inviteCodes').doc(code);
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      return NextResponse.json(
        { error: 'Invite code not found' },
        { status: 404 }
      );
    }

    const codeData = codeDoc.data();

    if (codeData?.used) {
      return NextResponse.json(
        { error: 'Cannot revoke used invite code' },
        { status: 400 }
      );
    }

    await codeRef.delete();

    return NextResponse.json(
      { success: true, message: 'Invite code revoked' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/admin/invites:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invite code' },
      { status: 500 }
    );
  }
}
