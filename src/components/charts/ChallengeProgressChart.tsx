'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { getNestedCache, setNestedCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';
import { useHoldToReveal, tooltipVisibility, HighlightCursor, holdActiveDot, holdTransition, useStickyTooltip } from '@/lib/use-hold-to-reveal';

interface ParticipantInfo {
  userId: string;
  username: string;
  color: string;
}

interface ProgressData {
  progress: Array<Record<string, string | number>>;
  participants: ParticipantInfo[];
  goal: number;
  unit: string;
}

interface ChallengeProgressChartProps {
  challengeId: string;
  firebaseUser: { getIdToken: () => Promise<string> } | null;
}

interface ChallengeTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>;
  label?: string;
  unit: string;
}

function ChallengeTooltip({ active, payload, label, unit }: ChallengeTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-surface rounded-lg px-3 py-2 shadow-lg border border-border">
      <p className="text-xs text-foreground/40 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5 text-xs">
          <div
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-foreground/60">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.value} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChallengeProgressChart({ challengeId, firebaseUser }: ChallengeProgressChartProps) {
  const { isHolding, handlers, lastTooltipRef } = useHoldToReveal();
  const stickyProps = useStickyTooltip(lastTooltipRef, isHolding);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(
    async (skipCache = false) => {
      if (!skipCache) {
        const cached = getNestedCache<ProgressData>(
          CACHE_KEYS.challengeProgress,
          challengeId,
          CACHE_TTLS.challengeProgress
        );
        if (cached) {
          setData(cached.data);
          if (cached.isStale) {
            fetchProgress(true);
          }
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const token = await firebaseUser?.getIdToken();
        if (!token) return;

        const res = await fetch(`/api/challenges/${challengeId}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch progress');
        }

        const result: ProgressData = await res.json();
        setData(result);
        setNestedCache(CACHE_KEYS.challengeProgress, challengeId, result);
      } catch {
        setError('Could not load progress chart');
      } finally {
        setLoading(false);
      }
    },
    [firebaseUser, challengeId]
  );

  useEffect(() => {
    if (firebaseUser && challengeId) {
      fetchProgress();
    }
  }, [firebaseUser, challengeId, fetchProgress]);

  // Don't render card at all while loading with no data
  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg gradient-bg-subtle">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[220px]">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg gradient-bg-subtle">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[220px] text-foreground/40 text-sm gap-2">
            <p>{error}</p>
            <button
              onClick={() => fetchProgress(true)}
              className="text-primary text-xs underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.progress.length === 0) {
    return null;
  }

  const { progress, participants, goal, unit } = data;

  // Auto-adjust tick interval for long challenges
  const tickInterval = progress.length > 14
    ? Math.ceil(progress.length / 7) - 1
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg gradient-bg-subtle">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          Progress
          {loading && <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div {...handlers} className="select-none [&_*]:select-none [-webkit-tap-highlight-color:transparent] cursor-default">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={progress}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/30"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgb(var(--foreground) / 0.4)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fill: 'rgb(var(--foreground) / 0.4)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <ReferenceLine
              y={goal}
              stroke="rgb(var(--foreground) / 0.2)"
              strokeDasharray="6 4"
              label={{
                value: `Goal`,
                position: 'right',
                fill: 'rgb(var(--foreground) / 0.3)',
                fontSize: 10,
              }}
            />
            <Tooltip
              active={isHolding || undefined}
              content={(props) => {
                const p = stickyProps(props as { active?: boolean; payload?: unknown[]; label?: string });
                return <ChallengeTooltip active={p.active} payload={p.payload as ChallengeTooltipProps['payload']} label={p.label} unit={unit} />;
              }}
              wrapperStyle={tooltipVisibility(isHolding)}
              cursor={isHolding ? <HighlightCursor /> : false}
            />
            {participants.map((p) => (
              <Line
                key={p.userId}
                type="monotone"
                dataKey={p.userId}
                name={p.username}
                stroke={p.color}
                strokeWidth={2}
                strokeOpacity={isHolding ? 0.35 : 1}
                dot={false}
                activeDot={isHolding ? holdActiveDot(p.color) : false}
                style={holdTransition}
                animationDuration={400}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-foreground/60">{p.username}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
