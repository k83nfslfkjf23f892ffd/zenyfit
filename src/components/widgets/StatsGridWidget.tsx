'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Calendar, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AnimatedNumber } from '@/components/AnimatedNumber';

interface Stats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  thisWeekXP: number;
  achievementsCount: number;
}

const CACHE_KEY = 'zenyfit_stats_grid';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

const statCards = [
  { key: 'totalWorkouts', label: 'Total Workouts', icon: Activity },
  { key: 'thisWeekWorkouts', label: 'This Week', icon: Calendar },
  { key: 'thisWeekXP', label: 'Week XP', icon: TrendingUp, highlight: true },
  { key: 'achievementsCount', label: 'Achievements', icon: Award },
] as const;

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
    <div className="grid grid-cols-2 gap-3">
      {statCards.map((item) => {
        const { key, label, icon: Icon } = item;
        const highlight = 'highlight' in item && item.highlight;
        return (
        <Card key={key}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg gradient-bg-subtle">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-foreground/50">{label}</span>
            </div>
            {loading ? (
              <div className="h-8 w-16 rounded-lg bg-border/20 animate-pulse" />
            ) : (
              <div className={`text-2xl font-bold ${highlight ? 'gradient-text' : ''}`}>
                <AnimatedNumber value={stats[key]} />
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
