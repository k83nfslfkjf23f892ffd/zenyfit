'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trophy, Medal } from 'lucide-react';
import { toast } from 'sonner';

type RankingType = 'xp' | 'pullups' | 'pushups' | 'dips' | 'running';

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

  useEffect(() => {
    if (user && firebaseUser) {
      fetchRankings(activeTab);
    }
  }, [user, firebaseUser, activeTab, fetchRankings]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
  };

  const getScoreLabel = (type: RankingType) => {
    if (type === 'xp') return 'XP';
    if (type === 'running') return 'km';
    return 'reps';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
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
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : rankings.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No rankings yet
                  </p>
                ) : (
                  rankings.map((ranking) => {
                    const isCurrentUser = ranking.id === user.id;
                    return (
                      <div
                        key={ranking.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          isCurrentUser ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex w-12 justify-center">
                          {getRankIcon(ranking.rank)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {ranking.username}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                              )}
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
