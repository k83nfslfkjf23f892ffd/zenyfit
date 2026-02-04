'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Award, Activity, Calendar, TrendingUp, Loader2, Trophy, Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { EXERCISE_INFO } from '@shared/constants';

// Cache helpers
const CACHE_KEY = 'zenyfit_profile_stats';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    // Ignore errors
  }
  return null;
}

function setCachedStats(stats: Stats) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ stats, timestamp: Date.now() }));
  } catch {
    // Ignore errors
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window !== 'undefined') {
      return getCachedStats() || {
        totalWorkouts: 0,
        thisWeekWorkouts: 0,
        totalXP: 0,
        thisWeekXP: 0,
        achievementsCount: 0,
      };
    }
    return {
      totalWorkouts: 0,
      thisWeekWorkouts: 0,
      totalXP: 0,
      thisWeekXP: 0,
      achievementsCount: 0,
    };
  });
  const [loadingStats, setLoadingStats] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCachedStats();
    }
    return true;
  });
  const [updating, setUpdating] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [loadingProfileStats, setLoadingProfileStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchStats = useCallback(async (skipCache = false) => {
    // Try cache first
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

      // Fetch activity trend and achievements in parallel
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
    if (user && firebaseUser) {
      fetchStats();
    }
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
    if (user && firebaseUser) {
      fetchProfileStats();
    }
  }, [user, firebaseUser, fetchProfileStats]);

  // Don't block render for auth loading - show cached content immediately
  if (!loading && !user) {
    return null;
  }

  // Show minimal content while user is loading (no cached user data available)
  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{user.username}</CardTitle>
                  {updating && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      Updating...
                    </span>
                  )}
                </div>
                <CardDescription className="text-lg mt-1">
                  Level {user.level} • {user.xp.toLocaleString()} XP
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Workouts</span>
              </div>
              {loadingStats ? (
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
              {loadingStats ? (
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
              {loadingStats ? (
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
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold">{stats.achievementsCount}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Consistency Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Consistency Score
            </CardTitle>
            <CardDescription>Based on workout frequency (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProfileStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : profileStats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-primary">{profileStats.consistencyScore}%</span>
                  <span className="text-sm text-muted-foreground">
                    {profileStats.workoutDaysLast30} days active
                  </span>
                </div>
                <Progress value={profileStats.consistencyScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {profileStats.consistencyScore >= 80 ? "You're on fire! Keep it up!" :
                   profileStats.consistencyScore >= 50 ? "Good consistency! Try to hit 4+ days per week." :
                   profileStats.consistencyScore >= 25 ? "Building momentum. Stay consistent!" :
                   "Start logging workouts to build your streak!"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load consistency data</p>
            )}
          </CardContent>
        </Card>

        {/* Personal Bests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Personal Bests
            </CardTitle>
            <CardDescription>Your highest single-workout records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProfileStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : profileStats && Object.keys(profileStats.personalBests).length > 0 ? (
              Object.entries(profileStats.personalBests)
                .filter(([type]) => ['pullups', 'pushups', 'dips', 'running'].includes(type))
                .map(([type, amount]) => {
                  const exerciseInfo = EXERCISE_INFO[type];
                  const label = exerciseInfo?.label || type;
                  const unit = exerciseInfo?.unit || 'reps';
                  return (
                    <div key={type} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="font-medium">{label}</span>
                      <span className="text-lg font-bold text-primary">
                        {amount} {unit}
                      </span>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No personal bests yet. Log some workouts!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Exercise Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Exercise Totals</CardTitle>
            <CardDescription>Lifetime statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">Pull-ups</span>
              <span className="text-lg font-bold">{user.totals.pullups}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">Push-ups</span>
              <span className="text-lg font-bold">{user.totals.pushups}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">Dips</span>
              <span className="text-lg font-bold">{user.totals.dips}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">Running</span>
              <span className="text-lg font-bold">{user.totals.running} km</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
