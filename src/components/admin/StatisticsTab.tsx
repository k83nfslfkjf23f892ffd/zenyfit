'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserGrowthChart } from '@/components/charts';

interface Stats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalWorkouts: number;
    totalXp: number;
    totalChallenges: number;
    activeChallenges: number;
    totalInviteCodes: number;
    usedInviteCodes: number;
    totalCustomExercises: number;
    activeUsersLast7Days: number;
  };
  growth: {
    signupsByDay: Record<string, number>;
    workoutsByDay: Record<string, number>;
    xpByDay: Record<string, number>;
  };
  topUsers: Array<{
    id: string;
    username: string;
    level: number;
    xp: number;
    avatar?: string;
  }>;
}

export function StatisticsTab() {
  const { firebaseUser } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  const { overview, growth, topUsers } = stats;

  // Transform growth data for chart
  const userGrowthData = Object.entries(growth.signupsByDay || {}).map(([date, users]) => ({
    date,
    users,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{overview.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {overview.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Workouts</CardDescription>
            <CardTitle className="text-3xl">{overview.totalWorkouts.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {overview.activeUsersLast7Days} users active (7d)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total XP</CardDescription>
            <CardTitle className="text-3xl">{overview.totalXp.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Challenges</CardDescription>
            <CardTitle className="text-3xl">{overview.totalChallenges}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {overview.activeChallenges} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Invite Codes</CardDescription>
            <CardTitle className="text-3xl">{overview.totalInviteCodes}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {overview.usedInviteCodes} used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Custom Exercises</CardDescription>
            <CardTitle className="text-3xl">{overview.totalCustomExercises}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              User-created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Users by XP</CardTitle>
          <CardDescription>Leaderboard of highest-ranked users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers.map((user, index) => (
              <div key={user.id} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 text-center">
                  {index === 0 ? (
                    <span className="text-2xl">🥇</span>
                  ) : index === 1 ? (
                    <span className="text-2xl">🥈</span>
                  ) : index === 2 ? (
                    <span className="text-2xl">🥉</span>
                  ) : (
                    <span className="text-muted-foreground font-semibold">#{index + 1}</span>
                  )}
                </div>
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground">Level {user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{user.xp.toLocaleString()} XP</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Growth Chart */}
      <UserGrowthChart
        data={userGrowthData}
        title="User Growth (Last 30 Days)"
        description="Platform user signups over time"
      />
    </div>
  );
}
