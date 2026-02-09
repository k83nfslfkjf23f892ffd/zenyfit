'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { getCache, setLocalCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';

interface ProfileStatsData {
  personalBests: Record<string, number>;
  consistencyScore: number;
  workoutDaysLast30: number;
}

interface ConsistencyData {
  consistencyScore: number;
  workoutDaysLast30: number;
}

const CACHE_TTL = CACHE_TTLS.profileStats;

export function ConsistencyWidget() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<ConsistencyData | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached) {
        return {
          consistencyScore: cached.data.consistencyScore || 0,
          workoutDaysLast30: cached.data.workoutDaysLast30 || 0,
        };
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
    }
    return true;
  });

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached) {
        setData({
          consistencyScore: cached.data.consistencyScore || 0,
          workoutDaysLast30: cached.data.workoutDaysLast30 || 0,
        });
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
        setData({
          consistencyScore: result.consistencyScore || 0,
          workoutDaysLast30: result.workoutDaysLast30 || 0,
        });
        setLocalCache(CACHE_KEYS.profileStats, result);
      }
    } catch (error) {
      console.error('Error fetching consistency:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, fetchData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-orange-500/15">
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          Consistency
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold gradient-text"><AnimatedNumber value={data.consistencyScore} />%</span>
              <span className="text-xs text-foreground/50">
                {data.workoutDaysLast30} days active
              </span>
            </div>
            <Progress value={data.consistencyScore} glow />
            <p className="text-xs text-foreground/40">
              {data.consistencyScore >= 80
                ? "You're on fire! Keep it up!"
                : data.consistencyScore >= 50
                  ? 'Good consistency! Try to hit 4+ days per week.'
                  : data.consistencyScore >= 25
                    ? 'Building momentum. Stay consistent!'
                    : 'Start logging workouts to build your streak!'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-foreground/40">Unable to load data</p>
        )}
      </CardContent>
    </Card>
  );
}
