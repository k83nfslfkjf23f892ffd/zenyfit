import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { LIMITS } from '@shared/constants';

// Word lists for generating memorable invite codes
const ADJECTIVES = [
  'SWIFT', 'BOLD', 'CALM', 'WILD', 'GOLD', 'IRON', 'DARK', 'FAST', 'KEEN', 'LOUD',
  'WARM', 'COOL', 'BRAVE', 'WISE', 'FREE', 'PURE', 'RARE', 'EPIC', 'MEGA', 'SUPER',
  'BRIGHT', 'SHARP', 'GRAND', 'PRIME', 'ELITE', 'NOBLE', 'ROYAL', 'VITAL', 'RAPID', 'MIGHTY',
  'FIERCE', 'SLICK', 'CRISP', 'VIVID', 'PROUD', 'LUCKY', 'HAPPY', 'FRESH', 'STARK', 'SOLID',
];

const COLORS = [
  'RED', 'BLUE', 'GOLD', 'JADE', 'ONYX', 'RUBY', 'CYAN', 'LIME', 'MINT', 'NAVY',
  'PINK', 'PLUM', 'ROSE', 'SAGE', 'SAND', 'SNOW', 'TEAL', 'WINE', 'ZINC', 'AMBER',
  'AZURE', 'CORAL', 'CREAM', 'FROST', 'GRAPE', 'HONEY', 'IVORY', 'LEMON', 'LILAC', 'MAPLE',
  'OCEAN', 'OLIVE', 'PEACH', 'PEARL', 'SLATE', 'STEEL', 'STORM', 'SUNNY', 'BLAZE', 'EMBER',
];

const NOUNS = [
  'TIGER', 'EAGLE', 'STORM', 'FLAME', 'WOLF', 'HAWK', 'BEAR', 'LION', 'CROW', 'FROG',
  'SHARK', 'WHALE', 'HORSE', 'RAVEN', 'COBRA', 'VIPER', 'OTTER', 'PANDA', 'ZEBRA', 'FALCON',
  'PHOENIX', 'DRAGON', 'PANTHER', 'JAGUAR', 'LEOPARD', 'CONDOR', 'PYTHON', 'RAPTOR', 'BADGER', 'BISON',
  'COYOTE', 'DINGO', 'FERRET', 'GAZELLE', 'HERON', 'IGUANA', 'JACKAL', 'KOALA', 'LEMUR', 'MAMBA',
];

/**
 * Generate a memorable 3-word invite code (e.g., SWIFT-RED-TIGER)
 */
function generateInviteCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${color}-${noun}`;
}

/**
 * POST /api/invites/generate
 * Generate a new invite code
 * - Max 5 invite codes per user
 * - Generates unique 10-character code
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;
    const { db } = getAdminInstances();

    // Check if user has reached the limit
    const existingCodesSnapshot = await db
      .collection('inviteCodes')
      .where('createdBy', '==', userId)
      .get();

    if (existingCodesSnapshot.size >= LIMITS.inviteCodes) {
      return NextResponse.json(
        { error: `Maximum ${LIMITS.inviteCodes} invite codes allowed` },
        { status: 400 }
      );
    }

    // Generate unique code
    let inviteCode = generateInviteCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (codeExists && attempts < maxAttempts) {
      const docRef = db.collection('inviteCodes').doc(inviteCode);
      const doc = await docRef.get();

      if (!doc.exists) {
        codeExists = false;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: 'Failed to generate unique code, please try again' },
        { status: 500 }
      );
    }

    // Create invite code document
    const inviteCodeData = {
      createdBy: userId,
      used: false,
      usedBy: null,
      createdAt: Date.now(),
      usedAt: null,
    };

    await db.collection('inviteCodes').doc(inviteCode).set(inviteCodeData);

    return NextResponse.json(
      {
        success: true,
        inviteCode: {
          code: inviteCode,
          ...inviteCodeData,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/invites/generate:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite code' },
      { status: 500 }
    );
  }
}
