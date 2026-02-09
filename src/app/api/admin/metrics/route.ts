import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { getMetrics, resetMetrics } from '@/lib/firestore-metrics';

async function verifyAdmin(authHeader: string | null) {
  const decodedToken = await verifyAuthToken(authHeader);
  if (!decodedToken) return null;

  const { db } = getAdminInstances();
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) return null;

  return decodedToken;
}

/** GET /api/admin/metrics - Get Firestore usage metrics */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request.headers.get('authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(getMetrics(), { status: 200 });
}

/** POST /api/admin/metrics - Reset metrics */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request.headers.get('authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  resetMetrics();
  return NextResponse.json({ message: 'Metrics reset' }, { status: 200 });
}
