import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';
import { getCached, setCache } from '@/lib/api-cache';
import { EXERCISE_INFO } from '@shared/constants';

const CHART_COLORS = [
  'rgb(var(--chart-1))',
  'rgb(var(--chart-2))',
  'rgb(var(--chart-3))',
  'rgb(var(--chart-4))',
  'rgb(var(--chart-5))',
];

/**
 * GET /api/challenges/[id]/progress
 * Returns daily cumulative progress for all challenge participants.
 * Used by the ChallengeProgressChart component.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = rateLimitByUser(decodedToken, request.nextUrl.pathname, RATE_LIMITS.MODERATE);
    if (rateLimitResponse) return rateLimitResponse;

    const userId = decodedToken.uid;

    // Check server cache (shared by all viewers of the same challenge)
    const cached = getCached<unknown>('/api/challenges/progress', challengeId);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const { db } = getAdminInstances();

    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challengeData = challengeDoc.data()!;

    // Access check: must be participant or public
    const isParticipant = challengeData.participantIds?.includes(userId);
    if (!isParticipant && !challengeData.isPublic) {
      return NextResponse.json(
        { error: 'You do not have access to this challenge' },
        { status: 403 }
      );
    }

    const { type: challengeType, startDate, endDate, goal, participants } = challengeData;
    const participantIds: string[] = challengeData.participantIds || [];
    const clampedEnd = Math.min(endDate, Date.now());

    // Generate day keys from startDate to clampedEnd
    const dayKeys: string[] = [];
    const dayLabels: Record<string, string> = {};
    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(clampedEnd);
    dayEnd.setHours(23, 59, 59, 999);

    const cursor = new Date(dayStart);
    while (cursor <= dayEnd) {
      const key = cursor.toISOString().split('T')[0]; // YYYY-MM-DD
      dayKeys.push(key);
      dayLabels[key] = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Read from pre-aggregated monthly stats (1-2 reads per participant)
    // instead of scanning exercise_logs (50-200+ reads per participant)
    const startMonth = new Date(startDate).toISOString().slice(0, 7);
    const endMonth = new Date(clampedEnd).toISOString().slice(0, 7);
    const months = [startMonth];
    if (endMonth !== startMonth) months.push(endMonth);

    const logsByParticipant = await Promise.all(
      participantIds.map(async (pid: string) => {
        // Try monthly stats first
        const monthlyDocs = await Promise.all(
          months.map(m =>
            db.collection('users').doc(pid).collection('monthlyStats').doc(m).get()
          )
        );

        const hasPreAggregated = monthlyDocs.some(d => d.exists && d.data()?.exerciseByDay);

        if (hasPreAggregated) {
          const dailyAmounts: Record<string, number> = {};
          for (const doc of monthlyDocs) {
            if (!doc.exists) continue;
            const exerciseByDay: Record<string, Record<string, number>> =
              doc.data()!.exerciseByDay || {};
            for (const [date, exercises] of Object.entries(exerciseByDay)) {
              const amount = exercises[challengeType] || 0;
              if (amount > 0) {
                dailyAmounts[date] = (dailyAmounts[date] || 0) + amount;
              }
            }
          }
          return { userId: pid, dailyAmounts };
        }

        // Legacy fallback: query exercise_logs for users without monthly stats
        const snapshot = await db
          .collection('exercise_logs')
          .where('userId', '==', pid)
          .where('type', '==', challengeType)
          .where('timestamp', '>=', startDate)
          .where('timestamp', '<=', clampedEnd)
          .orderBy('timestamp', 'desc')
          .get();

        const dailyAmounts: Record<string, number> = {};
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const dayKey = new Date(data.timestamp).toISOString().split('T')[0];
          dailyAmounts[dayKey] = (dailyAmounts[dayKey] || 0) + (data.amount || 0);
        }

        return { userId: pid, dailyAmounts };
      })
    );

    // Build cumulative progress data for each day
    const cumulativeTotals: Record<string, number> = {};
    for (const pid of participantIds) {
      cumulativeTotals[pid] = 0;
    }

    const progress = dayKeys.map((dayKey) => {
      const point: Record<string, string | number> = { date: dayLabels[dayKey] };

      for (const { userId: pid, dailyAmounts } of logsByParticipant) {
        cumulativeTotals[pid] += dailyAmounts[dayKey] || 0;
        point[pid] = Math.floor(cumulativeTotals[pid]);
      }

      return point;
    });

    // Build participant info with colors
    const participantInfo = participantIds.map((pid: string, index: number) => {
      const p = (participants || []).find((pp: { userId: string }) => pp.userId === pid);
      return {
        userId: pid,
        username: p?.username || 'Unknown',
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    const unit = EXERCISE_INFO[challengeType]?.unit || 'reps';

    const responseData = { progress, participants: participantInfo, goal, unit };

    setCache('/api/challenges/progress', challengeId, responseData);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in GET /api/challenges/[id]/progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge progress' },
      { status: 500 }
    );
  }
}
