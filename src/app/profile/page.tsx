'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/ui/progress';
import { Settings, Award, Activity, Calendar, TrendingUp, Loader2, Trophy, Flame } from 'lucide-react';
import { EXERCISE_INFO, getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { listContainerVariants, listItemVariants } from '@/lib/animations';

const CACHE_KEY = 'zenyfit_profile_stats';
const CACHE_TTL = 5 * 60 * 1000;

interface Stats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  totalXP: number;
  thisWeekXP: number;
  achievementsCount: number;
}

interface ProfileStats {
  personalBests: Record<string, number>;
  consistencyScore: number;
  workoutDaysLast30: number;
}

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

const statItems = [
  { key: 'totalWorkouts', label: 'Workouts', icon: Activity },
  { key: 'thisWeekWorkouts', label: 'This Week', icon: Calendar },
  { key: 'thisWeekXP', label: 'Week XP', icon: TrendingUp, highlight: true },
  { key: 'achievementsCount', label: 'Achievements', icon: Award },
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window !== 'undefined') {
      return getCachedStats() || {
        totalWorkouts: 0, thisWeekWorkouts: 0, totalXP: 0, thisWeekXP: 0, achievementsCount: 0,
      };
    }
    return { totalWorkouts: 0, thisWeekWorkouts: 0, totalXP: 0, thisWeekXP: 0, achievementsCount: 0 };
  });
  const [loadingStats, setLoadingStats] = useState(() => {
    if (typeof window !== 'undefined') return !getCachedStats();
    return true;
  });
  const [updating, setUpdating] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [loadingProfileStats, setLoadingProfileStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const fetchStats = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCachedStats();
      if (cached) {
        setStats(cached);
        setLoadingStats(false);
        setUpdating(true);
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

      if (trendResponse.ok) trendData = await trendResponse.json();
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        achievementsCount = achievementsData.unlockedAchievements?.length || 0;
      }

      const newStats = {
        totalWorkouts: trendData.totalWorkouts || 0,
        thisWeekWorkouts: trendData.totalWorkouts || 0,
        totalXP: trendData.totalXp || 0,
        thisWeekXP: trendData.totalXp || 0,
        achievementsCount,
      };

      setStats(newStats);
      setCachedStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
      setUpdating(false);
    }
  }, [firebaseUser, user?.id]);

  useEffect(() => {
    if (user && firebaseUser) fetchStats();
  }, [user, firebaseUser, fetchStats]);

  const fetchProfileStats = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/profile/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileStats(data);
      }
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoadingProfileStats(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) fetchProfileStats();
  }, [user, firebaseUser, fetchProfileStats]);

  if (!loading && !user) return null;

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
        </div>
      </AppLayout>
    );
  }

  const xpInLevel = getXPInCurrentLevel(user.xp, user.level);
  const xpNeeded = getXPNeededForNextLevel(user.level);
  const progressPercent = (xpInLevel / xpNeeded) * 100;

  return (
    <AppLayout>
      <motion.div
        className="space-y-5"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Header */}
        <motion.div className="flex items-center justify-between" variants={listItemVariants}>
          <div className="flex items-center gap-4">
            <ProgressRing value={progressPercent} size={72} strokeWidth={3}>
              <div className="text-center">
                <div className="text-lg font-bold gradient-text">{user.level}</div>
              </div>
            </ProgressRing>
            <div>
              <h1 className="text-xl font-bold">{user.username}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="default">Lv. {user.level}</Badge>
                {updating && (
                  <span className="text-xs text-foreground/30 animate-pulse">Updating...</span>
                )}
              </div>
              <div className="text-xs text-foreground/50 mt-1">
                {user.xp.toLocaleString()} XP total
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile/settings">
              <Settings className="h-5 w-5 text-foreground/40" />
            </Link>
          </Button>
        </motion.div>

        {/* XP Progress */}
        <motion.div className="space-y-1.5" variants={listItemVariants}>
          <div className="flex justify-between text-xs text-foreground/50">
            <span>Level {user.level + 1}</span>
            <span>{xpInLevel} / {xpNeeded} XP</span>
          </div>
          <Progress value={progressPercent} glow />
        </motion.div>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-2 gap-3" variants={listItemVariants}>
          {statItems.map((item) => {
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
                {loadingStats ? (
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
        </motion.div>

        {/* Consistency Score */}
        <motion.div variants={listItemVariants}>
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
            {loadingProfileStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
              </div>
            ) : profileStats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold gradient-text">{profileStats.consistencyScore}%</span>
                  <span className="text-xs text-foreground/50">
                    {profileStats.workoutDaysLast30} days active
                  </span>
                </div>
                <Progress value={profileStats.consistencyScore} glow />
              </div>
            ) : (
              <p className="text-sm text-foreground/40">Unable to load data</p>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Personal Bests */}
        <motion.div variants={listItemVariants}>
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
            {loadingProfileStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
              </div>
            ) : profileStats && Object.keys(profileStats.personalBests).length > 0 ? (
              Object.entries(profileStats.personalBests)
                .filter(([type]) => ['pullups', 'pushups', 'dips', 'running'].includes(type))
                .map(([type, amount]) => {
                  const exerciseInfo = EXERCISE_INFO[type];
                  const label = exerciseInfo?.label || type;
                  const unit = exerciseInfo?.unit || 'reps';
                  return (
                    <div key={type} className="flex items-center justify-between rounded-xl glass p-3">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm font-bold gradient-text">{amount} {unit}</span>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-foreground/40 text-center py-4">
                No personal bests yet
              </p>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Exercise Totals */}
        <motion.div variants={listItemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exercise Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Pull-ups', value: user.totals.pullups, unit: '' },
              { label: 'Push-ups', value: user.totals.pushups, unit: '' },
              { label: 'Dips', value: user.totals.dips, unit: '' },
              { label: 'Running', value: user.totals.running, unit: ' km' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex items-center justify-between rounded-xl glass p-3">
                <span className="text-sm text-foreground/70">{label}</span>
                <span className="text-sm font-bold">{value}{unit}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
