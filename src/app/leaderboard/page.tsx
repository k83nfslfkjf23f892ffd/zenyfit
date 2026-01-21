'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { LeaderboardSkeleton, Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';
import { getAvatarDisplayUrl } from '@/lib/avatar';
import { EXERCISE_INFO } from '@shared/constants';

// Dynamic import to avoid SSR issues with Recharts
const LeaderboardCharts = dynamic(
  () => import('@/components/charts/LeaderboardCharts').then(mod => mod.LeaderboardCharts),
  { ssr: false }
);

type RankingType = 'xp' | string;

interface Ranking {
  rank: number;
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  score: number;
}

interface ChartStats {
  xpTrends: Array<{ date: string; [key: string]: string | number }>;
  distribution: Array<{ name: string; type: string; count: number; xp: number; category: string }>;
  heatmap: Array<{ date: string; count: number; xp: number }>;
  rankings: Array<{ rank: number; username: string; xp: number; level: number; weeklyXp: number }>;
  categoryTotals: { calisthenics: number; cardio: number; team_sports: number };
  topUsers: Array<{ id: string; username: string }>;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<RankingType>('xp');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [chartStats, setChartStats] = useState<ChartStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch chart stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsError(null);
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        setStatsError('Authentication required');
        return;
      }

      const response = await fetch('/api/leaderboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChartStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stats API error:', response.status, errorData);
        setStatsError(errorData.error || 'Failed to load charts');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError('Network error');
    } finally {
      setLoadingStats(false);
    }
  }, [firebaseUser]);

  const fetchRankings = useCallback(async (type: RankingType) => {
    setLoadingRankings(true);

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const url = type === 'xp'
        ? '/api/leaderboard'
        : `/api/leaderboard?type=${type}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRankings(data.rankings || []);
      } else {
        toast.error('Failed to load leaderboard');
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      toast.error('An error occurred');
    } finally {
      setLoadingRankings(false);
    }
  }, [firebaseUser]);

  // Fetch rankings when tab changes
  useEffect(() => {
    if (user && firebaseUser) {
      fetchRankings(activeTab);
    }
  }, [user, firebaseUser, activeTab, fetchRankings]);

  // Fetch stats only once on mount
  useEffect(() => {
    if (user && firebaseUser) {
      fetchStats();
    }
  }, [user, firebaseUser, fetchStats]);

  if (loading) {
    return (
      <AppLayout>
        <LeaderboardSkeleton />
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  const getScoreLabel = (type: RankingType) => {
    if (type === 'xp') return 'XP';
    const info = EXERCISE_INFO[type];
    if (info) return info.unit;
    return 'reps';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Overview Charts */}
        {!loadingStats && chartStats && (
          <LeaderboardCharts
            xpTrends={chartStats.xpTrends}
            distribution={chartStats.distribution}
            heatmap={chartStats.heatmap}
            rankings={chartStats.rankings}
            categoryTotals={chartStats.categoryTotals}
            topUsers={chartStats.topUsers}
          />
        )}
        {loadingStats && (
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        )}
        {!loadingStats && statsError && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Overview</CardTitle>
              <CardDescription>Community activity and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p className="text-sm">{statsError}</p>
                <button
                  onClick={() => {
                    setLoadingStats(true);
                    fetchStats();
                  }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Leaderboard
            </CardTitle>
            <CardDescription>
              Compete with other users and climb the ranks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RankingType)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="xp">All</TabsTrigger>
                <TabsTrigger value="pullups">Pull</TabsTrigger>
                <TabsTrigger value="pushups">Push</TabsTrigger>
                <TabsTrigger value="dips">Dips</TabsTrigger>
                <TabsTrigger value="running">Run</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4 space-y-3">
                {loadingRankings ? (
                  <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                        <Skeleton className="h-6 w-12" />
                        <SkeletonAvatar className="h-12 w-12" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-5 w-16 ml-auto" />
                          <Skeleton className="h-3 w-8 ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : rankings.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No rankings yet
                  </p>
                ) : (
                  rankings.map((ranking) => {
                    const isCurrentUser = ranking.id === user.id;
                    const avatarUrl = getAvatarDisplayUrl(ranking.avatar, ranking.username);
                    return (
                      <div
                        key={ranking.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          isCurrentUser ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className="h-12 w-12 overflow-hidden rounded-full bg-muted flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarUrl}
                            alt={ranking.username}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">
                              {ranking.username}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Level {ranking.level}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {Math.floor(ranking.score).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getScoreLabel(activeTab)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
