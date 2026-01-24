'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trophy, Loader2, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { getAvatarDisplayUrl } from '@/lib/avatar';
import { EXERCISE_INFO } from '@shared/constants';

// Dynamic import to avoid SSR issues with Recharts
const LeaderboardCharts = dynamic(
  () =>
    import('@/components/charts/LeaderboardCharts').then(
      (mod) => mod.LeaderboardCharts
    ),
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

// Cache
const RANKINGS_CACHE_KEY = 'zenyfit_rankings_cache';
const CACHE_TTL = 2 * 60 * 1000;

function getCachedRankings(type: string): Ranking[] | null {
  try {
    const cached = localStorage.getItem(RANKINGS_CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached);
    const entry = data[type];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.rankings;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCachedRankings(type: string, rankings: Ranking[]) {
  try {
    const cached = localStorage.getItem(RANKINGS_CACHE_KEY);
    const existing = cached ? JSON.parse(cached) : {};
    existing[type] = { rankings, timestamp: Date.now() };
    localStorage.setItem(RANKINGS_CACHE_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<RankingType>('xp');
  const [rankings, setRankings] = useState<Ranking[]>(() => {
    if (typeof window !== 'undefined') {
      return getCachedRankings('xp') || [];
    }
    return [];
  });
  const [loadingRankings, setLoadingRankings] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCachedRankings('xp');
    }
    return true;
  });
  const [updating, setUpdating] = useState(false);
  const [showXpInfo, setShowXpInfo] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchRankings = useCallback(
    async (type: RankingType, skipCache = false) => {
      if (!skipCache) {
        const cached = getCachedRankings(type);
        if (cached) {
          setRankings(cached);
          setLoadingRankings(false);
          setUpdating(true);
          fetchRankings(type, true);
          return;
        }
      }

      if (!skipCache) setLoadingRankings(true);

      try {
        const token = await firebaseUser?.getIdToken();
        if (!token) return;

        const url =
          type === 'xp'
            ? '/api/leaderboard'
            : `/api/leaderboard?type=${type}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const newRankings = data.rankings || [];
          setRankings(newRankings);
          setCachedRankings(type, newRankings);
        } else if (!getCachedRankings(type)) {
          toast.error('Failed to load leaderboard');
        }
      } catch (err) {
        console.error(err);
        if (!getCachedRankings(type)) {
          toast.error('An error occurred');
        }
      } finally {
        setLoadingRankings(false);
        setUpdating(false);
      }
    },
    [firebaseUser]
  );

  useEffect(() => {
    if (user && firebaseUser) {
      fetchRankings(activeTab);
    }
  }, [user, firebaseUser, activeTab, fetchRankings]);

  if (!loading && !user) return null;

  const getScoreLabel = (type: RankingType) => {
    if (type === 'xp') return 'XP';
    return EXERCISE_INFO[type]?.unit ?? 'reps';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <LeaderboardCharts firebaseUser={firebaseUser} />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Leaderboard
                <button
                  type="button"
                  onClick={() => setShowXpInfo(true)}
                  className="text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              </CardTitle>
              {updating && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Updating...
                </span>
              )}
            </div>
            <CardDescription>
              Compete with other users and climb the ranks
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as RankingType)}
            >
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
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : rankings.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No rankings yet
                  </p>
                ) : (
                  rankings.map((ranking) => {
                    const isCurrentUser =
                      user && ranking.id === user.id;
                    const avatarUrl = getAvatarDisplayUrl(
                      ranking.avatar,
                      ranking.username
                    );

                    return (
                      <div
                        key={ranking.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          isCurrentUser
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarUrl}
                            alt={ranking.username}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="font-semibold truncate">
                            {ranking.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Level {ranking.level}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {Math.floor(
                              ranking.score
                            ).toLocaleString()}
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

      {showXpInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowXpInfo(false)}
        >
          <div
            className="bg-background border rounded-lg p-5 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">How XP Works</h3>
              <button onClick={() => setShowXpInfo(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <Button
              className="w-full mt-4"
              onClick={() => setShowXpInfo(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
