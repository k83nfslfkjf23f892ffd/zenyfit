'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { getCache, setLocalCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useHoldToReveal, tooltipVisibility, holdTransition, useStickyTooltip } from '@/lib/use-hold-to-reveal';

interface DayData {
  day: string;
  workouts: number;
  xp: number;
}

interface ProfileStatsData {
  personalBests: Record<string, number>;
  consistencyScore: number;
  workoutDaysLast30: number;
  weeklyActivity?: DayData[];
}

const CACHE_TTL = CACHE_TTLS.profileStats;

export function WeeklyActivityWidget() {
  const { isHolding, handlers, lastTooltipRef } = useHoldToReveal();
  const stickyProps = useStickyTooltip(lastTooltipRef, isHolding);
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<DayData[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached?.data.weeklyActivity) return cached.data.weeklyActivity;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      return !cached?.data.weeklyActivity;
    }
    return true;
  });

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached) {
        if (cached.data.weeklyActivity) {
          setData(cached.data.weeklyActivity);
        }
        setLoading(false);
        if (cached.isStale) {
          fetchData(true);
        }
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/profile/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.weeklyActivity) {
          setData(result.weeklyActivity);
        }
        setLocalCache(CACHE_KEYS.profileStats, result);
      }
    } catch (error) {
      console.error('Error fetching weekly activity:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, fetchData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-end gap-3 px-2 pb-6">
            {[40, 65, 30, 80, 55, 45, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-border/20 animate-pulse" style={{ height: `${h}%` }} />
                <div className="h-3 w-6 rounded bg-border/20 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-foreground/40 text-sm">
            No activity data for this week
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div {...handlers}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barCategoryGap="25%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'rgb(var(--foreground) / 0.4)' }}
            />
            <YAxis hide />
            <Tooltip
              cursor={false}
              content={(props) => {
                const p = stickyProps(props as { active?: boolean; payload?: unknown[]; label?: string });
                if (!p.active || !p.payload || (p.payload as Array<{ value: number }>).length === 0) return null;
                const entry = (p.payload as Array<{ value: number }>)[0];
                return (
                  <div className="bg-surface rounded-xl px-3 py-2 shadow-lg border border-border text-xs text-foreground">
                    <p className="text-foreground/40 mb-0.5">{p.label}</p>
                    <p className="font-medium">{entry.value} workouts</p>
                  </div>
                );
              }}
              wrapperStyle={tooltipVisibility(isHolding)}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--gradient-from))" />
                <stop offset="100%" stopColor="rgb(var(--gradient-to))" />
              </linearGradient>
            </defs>
            <Bar
              dataKey="workouts"
              fill="url(#barGradient)"
              fillOpacity={isHolding ? 0.3 : 1}
              activeBar={isHolding ? { fillOpacity: 1 } : false}
              radius={[6, 6, 0, 0]}
              style={holdTransition}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
