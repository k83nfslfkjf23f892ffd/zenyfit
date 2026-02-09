'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCache, setLocalCache, CACHE_TTLS } from '@/lib/client-cache';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RepsDay {
  period: string;
  total: number;
}

interface StatsData {
  repsOverTime: RepsDay[];
  summary: { totalReps: number };
}

const CACHE_KEY = 'zenyfit_reps_history';
const CACHE_TTL = CACHE_TTLS.chartData;

export function XPHistoryWidget() {
  const { user, firebaseUser } = useAuth();
  const [data, setData] = useState<RepsDay[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<StatsData>(CACHE_KEY, CACHE_TTL);
      if (cached?.data.repsOverTime) return cached.data.repsOverTime;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCache<StatsData>(CACHE_KEY, CACHE_TTL);
    }
    return true;
  });

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCache<StatsData>(CACHE_KEY, CACHE_TTL);
      if (cached) {
        setData(cached.data.repsOverTime || []);
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

      const response = await fetch('/api/leaderboard/stats?scope=personal&range=weekly', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const repsOverTime: RepsDay[] = (result.repsOverTime || []).map((d: RepsDay) => ({
          period: d.period,
          total: d.total,
        }));
        setData(repsOverTime);
        setLocalCache(CACHE_KEY, { repsOverTime, summary: result.summary });
      }
    } catch (error) {
      console.error('Error fetching reps data:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchData();
    }
  }, [user, firebaseUser, fetchData]);

  const formatDay = (period: string) => {
    try {
      const date = new Date(period + 'T00:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return period;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              <Dumbbell className="h-4 w-4 text-blue-400" />
            </div>
            Reps This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              <Dumbbell className="h-4 w-4 text-blue-400" />
            </div>
            Reps This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-foreground/40 text-sm">
            No rep data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-blue-500/15">
            <Dumbbell className="h-4 w-4 text-blue-400" />
          </div>
          Reps This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--gradient-from))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(var(--gradient-to))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tickFormatter={formatDay}
              tick={{ fontSize: 11, fill: 'rgb(var(--foreground) / 0.4)' }}
            />
            <YAxis hide />
            <Tooltip
              labelFormatter={formatDay}
              formatter={(value: number) => [`${value} reps`, 'Total']}
              contentStyle={{
                backgroundColor: 'rgb(var(--surface))',
                border: '1px solid rgb(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'rgb(var(--foreground))',
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="rgb(var(--primary))"
              strokeWidth={2}
              fill="url(#repsGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
