/**
 * Comprehensive rate limiting middleware for ZenyFit APIs
 *
 * Implements hybrid rate limiting:
 * - IP-based for public endpoints
 * - User-based for authenticated endpoints
 * - Tiered limits for different endpoint types
 */

import { NextRequest, NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';

// In-memory rate limit storage
// For production at scale, consider using Redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Public endpoints (IP-based)
  PUBLIC_STRICT: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  PUBLIC_MODERATE: { maxRequests: 10, windowMs: 60 * 1000 },   // 10 per minute

  // Authenticated endpoints (user-based)
  WRITE_HEAVY: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200 per hour (workouts are individual sets)
  READ_HEAVY: { maxRequests: 100, windowMs: 60 * 60 * 1000 },  // 100 per hour
  MODERATE: { maxRequests: 50, windowMs: 60 * 60 * 1000 },     // 50 per hour

  // Admin endpoints
  ADMIN: { maxRequests: 100, windowMs: 60 * 60 * 1000 },       // 100 per hour
} as const;

/**
 * Check if request is within rate limit
 */
function checkLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true };
}

/**
 * IP-based rate limiting
 * Use for public endpoints (signup, validate invite codes, etc.)
 */
export function rateLimitByIP(
  request: NextRequest,
  limit: { maxRequests: number; windowMs: number } = RATE_LIMITS.PUBLIC_MODERATE
): NextResponse | null {
  // Skip rate limiting in emulator mode for easier testing
  if (process.env.USE_FIREBASE_EMULATOR === 'true') {
    return null;
  }

  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const identifier = `ip:${ip}:${request.nextUrl.pathname}`;
  const result = checkLimit(identifier, limit.maxRequests, limit.windowMs);

  if (!result.allowed) {
    const retryAfter = result.resetTime
      ? Math.ceil((result.resetTime - Date.now()) / 1000)
      : 60;

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime?.toString() || '',
        }
      }
    );
  }

  return null;
}

/**
 * User-based rate limiting
 * Use for authenticated endpoints
 */
export function rateLimitByUser(
  authToken: DecodedIdToken,
  endpoint: string,
  limit: { maxRequests: number; windowMs: number } = RATE_LIMITS.MODERATE
): NextResponse | null {
  const identifier = `user:${authToken.uid}:${endpoint}`;
  const result = checkLimit(identifier, limit.maxRequests, limit.windowMs);

  if (!result.allowed) {
    const retryAfter = result.resetTime
      ? Math.ceil((result.resetTime - Date.now()) / 1000)
      : 60;

    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime?.toString() || '',
        }
      }
    );
  }

  return null;
}

/**
 * Cleanup old rate limit entries
 * Call periodically to prevent memory leaks
 */
export function cleanupRateLimits(): void {
  const now = Date.now();

  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 10 * 60 * 1000);
}

/**
 * Get rate limit stats (for debugging)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeEntries: number;
} {
  const now = Date.now();
  let activeEntries = 0;

  for (const record of rateLimitMap.values()) {
    if (now <= record.resetTime) {
      activeEntries++;
    }
  }

  return {
    totalEntries: rateLimitMap.size,
    activeEntries,
  };
}
