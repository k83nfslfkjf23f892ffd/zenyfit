'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCache, setLocalCache, CACHE_KEYS } from '@/lib/client-cache';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface XPData {
  date: string;
  xp: number;
}

interface TrendData {
  trend: Array<{ date: string; workouts: number; xp: number }>;
  totalWorkouts: number;
  totalXp: number;
  xpHistory?: XPData[];
}

const CACHE_TTL = 5 * 60 * 1000;

export function XPHistoryWidget() {
  const { user, firebaseUser } = useAuth();
  const [data, setData] = useState<XPData[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<TrendData>(CACHE_KEYS.trend, CACHE_TTL);
      if (cached?.data.xpHistory) return cached.data.xpHistory;
      if (cached?.data.trend) return cached.data.trend.map(d => ({ date: d.date, xp: d.xp }));
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<TrendData>(CACHE_KEYS.trend, CACHE_TTL);
      return !cached?.data.xpHistory && !cached?.data.trend;
    }
    return true;
  });

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCache<TrendData>(CACHE_KEYS.trend, CACHE_TTL);
      if (cached) {
        if (cached.data.xpHistory) {
          setData(cached.data.xpHistory);
        } else if (cached.data.trend) {
          setData(cached.data.trend.map(d => ({ date: d.date, xp: d.xp })));
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

      const response = await fetch(`/api/leaderboard/trend?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const xpHistory = result.trend?.map((d: { date: string; xp: number }) => ({
          date: d.date,
          xp: d.xp,
        })) || [];
        setData(xpHistory);
        setLocalCache(CACHE_KEYS.trend, { ...result, xpHistory });
      }
    } catch (error) {
      console.error('Error fetching XP history:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user?.id]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchData();
    }
  }, [user, firebaseUser, fetchData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">XP History</CardTitle>
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
          <CardTitle className="text-base">XP History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-foreground/40 text-sm">
            No XP history data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">XP History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--gradient-from))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(var(--gradient-to))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'rgb(var(--foreground) / 0.4)' }}
            />
            <YAxis hide />
            <Tooltip
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
              dataKey="xp"
              stroke="rgb(var(--primary))"
              strokeWidth={2}
              fill="url(#xpGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
