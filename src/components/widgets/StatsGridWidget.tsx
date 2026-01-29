'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Calendar, TrendingUp, Award, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Stats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  thisWeekXP: number;
  achievementsCount: number;
}

const CACHE_KEY = 'zenyfit_stats_grid';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCachedStats(): Stats | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached);
    if (data && Date.now() - data.timestamp < CACHE_TTL) {
      return data.stats;
    }
  } catch {
    return null;
  }
  return null;
}

function setCachedStats(stats: Stats) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ stats, timestamp: Date.now() }));
  } catch {
    // Ignore
  }
}

export function StatsGridWidget() {
  const { user, firebaseUser } = useAuth();
  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window !== 'undefined') {
      return getCachedStats() || {
        totalWorkouts: 0,
        thisWeekWorkouts: 0,
        thisWeekXP: 0,
        achievementsCount: 0,
      };
    }
    return { totalWorkouts: 0, thisWeekWorkouts: 0, thisWeekXP: 0, achievementsCount: 0 };
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCachedStats();
    }
    return true;
  });

  const fetchStats = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCachedStats();
      if (cached) {
        setStats(cached);
        setLoading(false);
        fetchStats(true);
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const [trendResponse, achievementsResponse] = await Promise.all([
        fetch(`/api/leaderboard/trend?userId=${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/achievements', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let trendData = { totalWorkouts: 0, totalXp: 0 };
      let achievementsCount = 0;

      if (trendResponse.ok) {
        trendData = await trendResponse.json();
      }

      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        achievementsCount = achievementsData.unlockedAchievements?.length || 0;
      }

      const newStats = {
        totalWorkouts: trendData.totalWorkouts || 0,
        thisWeekWorkouts: trendData.totalWorkouts || 0,
        thisWeekXP: trendData.totalXp || 0,
        achievementsCount,
      };

      setStats(newStats);
      setCachedStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user?.id]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchStats();
    }
  }, [user, firebaseUser, fetchStats]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Workouts</span>
          </div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-3xl font-bold">{stats.totalWorkouts}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">This Week</span>
          </div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-3xl font-bold">{stats.thisWeekWorkouts}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Week XP</span>
          </div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-3xl font-bold text-primary">{stats.thisWeekXP}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Achievements</span>
          </div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-3xl font-bold">{stats.achievementsCount}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
