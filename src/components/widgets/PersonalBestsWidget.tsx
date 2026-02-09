'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { EXERCISE_INFO } from '@shared/constants';
import { getCache, setLocalCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';

interface ProfileStatsData {
  personalBests: Record<string, number>;
  consistencyScore: number;
  workoutDaysLast30: number;
}

const CACHE_TTL = CACHE_TTLS.profileStats;

export function PersonalBestsWidget() {
  const { firebaseUser } = useAuth();
  const [personalBests, setPersonalBests] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached) return cached.data.personalBests || {};
    }
    return {};
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
        setPersonalBests(cached.data.personalBests || {});
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
        setPersonalBests(result.personalBests || {});
        setLocalCache(CACHE_KEYS.profileStats, result);
      }
    } catch (error) {
      console.error('Error fetching personal bests:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, fetchData]);

  const displayExercises = ['pullups', 'pushups', 'dips', 'running', 'passive_dead_hang', 'active_dead_hang', 'flexed_arm_hang'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-amber-500/15">
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          Personal Bests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        ) : Object.keys(personalBests).length > 0 ? (
          Object.entries(personalBests)
            .filter(([type]) => displayExercises.includes(type))
            .map(([type, amount]) => {
              const exerciseInfo = EXERCISE_INFO[type];
              const label = exerciseInfo?.label || type;
              const unit = exerciseInfo?.unit || 'reps';
              return (
                <div key={type} className="flex items-center justify-between rounded-lg bg-surface border border-border p-3">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm font-bold gradient-text">
                    {amount} {unit}
                  </span>
                </div>
              );
            })
        ) : (
          <p className="text-sm text-foreground/40 text-center py-4">
            No personal bests yet. Log some workouts!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
