import { NextRequest, NextResponse } from 'next/server';
import { rateLimitByIP, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/config
 * Returns Firebase configuration for client-side initialization
 * This keeps sensitive config server-side while exposing only what's needed
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitByIP(request, RATE_LIMITS.PUBLIC_MODERATE);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // When using emulator, return mock config (emulator doesn't validate these)
    const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';

    const config = useEmulator ? {
      apiKey: 'demo-api-key',
      authDomain: 'demo-project.firebaseapp.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'zenyfit',
      storageBucket: 'demo-project.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef',
      webPushPublicKey: null,
    } : {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY || null,
    };

    // Validate that all required env vars are present (skip validation for emulator)
    if (!useEmulator) {
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missingVars = requiredKeys.filter(key => !config[key as keyof typeof config]);

      if (missingVars.length > 0) {
        console.error('Missing Firebase config vars:', missingVars);
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error in /api/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
