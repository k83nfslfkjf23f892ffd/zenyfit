import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CORS middleware for API endpoints
 * Allows requests from:
 * - Vercel production domain (VERCEL_URL or NEXT_PUBLIC_VERCEL_URL)
 * - Vercel preview domains (*.vercel.app)
 * - Localhost for development
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || '';

  // Allowed origins
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'https://localhost:5000',
    'https://localhost:3000',
  ];

  // Add Vercel production URL if available
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    allowedOrigins.push(`https://${vercelUrl}`);
  }

  // Check if origin is allowed
  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.includes('localhost');

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}
