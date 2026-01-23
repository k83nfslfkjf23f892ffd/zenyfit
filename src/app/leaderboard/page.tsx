'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Loader2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAvatarDisplayUrl } from '@/lib/avatar';
import { EXERCISE_INFO, XP_RATES, EXERCISE_CATEGORIES } from '@shared/constants';

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

// Cache for rankings
const RANKINGS_CACHE_KEY = 'zenyfit_rankings_cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
    // Ignore cache errors
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
    // Ignore cache errors
  }
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<RankingType>('xp');
  const [rankings, setRankings] = useState<Ranking[]>(() => {
    // Load cached rankings on initial render
    if (typeof window !== 'undefined') {
      return getCachedRankings('xp') || [];
    }
    return [];
  });
  const [loadingRankings, setLoadingRankings] = useState(() => {
    // If we have cached data, don't show loading
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

  const fetchRankings = useCallback(async (type: RankingType, skipCache = false) => {
    // Try cache first (unless skipCache)
    if (!skipCache) {
      const cached = getCachedRankings(type);
      if (cached) {
        setRankings(cached);
        setLoadingRankings(false);
        // Fetch fresh in background
        setUpdating(true);
        fetchRankings(type, true);
        return;
      }
    }

    if (!skipCache) {
      setLoadingRankings(true);
    }

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
        const newRankings = data.rankings || [];
        setRankings(newRankings);
        setCachedRankings(type, newRankings);
      } else if (!getCachedRankings(type)) {
        toast.error('Failed to load leaderboard');
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      if (!getCachedRankings(type)) {
        toast.error('An error occurred');
      }
    } finally {
      setLoadingRankings(false);
      setUpdating(false);
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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
        {/* Calisthenics Charts */}
        <LeaderboardCharts firebaseUser={firebaseUser} />

        {/* Rankings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Leaderboard
                <button
                  type="button"
                  onClick={() => setShowXpInfo(true)}
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
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
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

      {/* XP Info Modal */}
      {showXpInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowXpInfo(false)}
        >
          <div
            className="bg-background border rounded-lg p-5 max-w-md w-full shadow-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">How XP Works</h3>
              <button
                type="button"
                onClick={() => setShowXpInfo(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Methodology explanation */}
              <div className="space-y-2">
                <h4 className="font-medium">How We Calculate XP</h4>
                <p className="text-xs text-muted-foreground">
                  XP values are based on scientific measurements of exercise difficulty:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>Calisthenics:</strong> Body weight percentage moved per rep. Push-ups move ~64% of your body weight, pull-ups move 100%.</li>
                  <li><strong>Cardio:</strong> MET values (metabolic equivalent) and calories burned per km. Running burns ~70 kcal/km at 8-9 MET.</li>
                  <li><strong>Team Sports:</strong> Average MET for intermittent activity with rest periods.</li>
                </ul>
              </div>

              {/* Calisthenics */}
              <div className="pt-2 border-t">
                <h4 className="font-medium mb-1">Calisthenics (per rep)</h4>
                <p className="text-xs text-muted-foreground mb-2">Based on % body weight lifted and range of motion</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {EXERCISE_CATEGORIES.calisthenics.exercises
                    .filter(type => XP_RATES[type] > 0)
                    .sort((a, b) => XP_RATES[a] - XP_RATES[b])
                    .map(type => (
                      <div key={type} className="flex justify-between">
                        <span>{EXERCISE_INFO[type]?.label || type}</span>
                        <span className="text-primary">{XP_RATES[type]} XP</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Cardio */}
              <div className="pt-2 border-t">
                <h4 className="font-medium mb-1">Cardio (per km)</h4>
                <p className="text-xs text-muted-foreground mb-2">Based on MET values and energy expenditure</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {EXERCISE_CATEGORIES.cardio.exercises
                    .filter(type => XP_RATES[type] > 0)
                    .sort((a, b) => XP_RATES[a] - XP_RATES[b])
                    .map(type => (
                      <div key={type} className="flex justify-between">
                        <span>{EXERCISE_INFO[type]?.label || type}</span>
                        <span className="text-primary">{XP_RATES[type]} XP</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Team Sports */}
              <div className="pt-2 border-t">
                <h4 className="font-medium mb-1">Team Sports (per minute)</h4>
                <p className="text-xs text-muted-foreground mb-2">Based on average MET for game activity</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {EXERCISE_CATEGORIES.team_sports.exercises
                    .filter(type => XP_RATES[type] > 0)
                    .sort((a, b) => XP_RATES[a] - XP_RATES[b])
                    .map(type => (
                      <div key={type} className="flex justify-between">
                        <span>{EXERCISE_INFO[type]?.label || type}</span>
                        <span className="text-primary">{XP_RATES[type]} XP</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <h4 className="font-medium mb-2">Leaderboard Rankings</h4>
                <p className="text-xs text-muted-foreground">
                  <strong>All:</strong> Ranked by total XP earned across all exercises.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Exercise tabs:</strong> Ranked by total reps/km for that specific exercise.
                </p>
              </div>
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
