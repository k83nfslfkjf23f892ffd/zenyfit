'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Settings, LogOut, Award, Activity, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOutUser, firebaseUser } = useAuth();

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    totalXP: 0,
    thisWeekXP: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      // Fetch activity trend to calculate stats
      const response = await fetch(`/api/leaderboard/trend?userId=${user?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalWorkouts: data.totalWorkouts || 0,
          thisWeekWorkouts: data.totalWorkouts || 0, // Last 7 days
          totalXP: data.totalXp || 0,
          thisWeekXP: data.totalXp || 0, // Last 7 days
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [firebaseUser, user?.id]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchStats();
    }
  }, [user, firebaseUser, fetchStats]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <ProfileSkeleton />
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">{user.username}</CardTitle>
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
                <Skeleton className="h-9 w-16" />
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
                <Skeleton className="h-9 w-16" />
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
                <Skeleton className="h-9 w-16" />
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
              <div className="text-3xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

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

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
