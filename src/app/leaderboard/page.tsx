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

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<RankingType>('xp');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
        {/* Calisthenics Charts - handles its own data fetching and caching */}
        <LeaderboardCharts firebaseUser={firebaseUser} />

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
