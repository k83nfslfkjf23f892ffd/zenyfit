'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { getAvatarDisplayUrl } from '@/lib/avatar';
import { EXERCISE_INFO } from '@shared/constants';
import { getNestedCache, setNestedCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';

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

const CACHE_TTL = CACHE_TTLS.rankings;


export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<RankingType>('xp');
  const [rankings, setRankings] = useState<Ranking[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getNestedCache<Ranking[]>(CACHE_KEYS.rankings, 'xp', CACHE_TTL);
      return cached?.data || [];
    }
    return [];
  });
  const [loadingRankings, setLoadingRankings] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getNestedCache<Ranking[]>(CACHE_KEYS.rankings, 'xp', CACHE_TTL);
    }
    return true;
  });
  const [updating, setUpdating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchRankings = useCallback(
    async (type: RankingType, skipCache = false) => {
      if (!skipCache) {
        const cached = getNestedCache<Ranking[]>(CACHE_KEYS.rankings, type, CACHE_TTL);
        if (cached) {
          setRankings(cached.data);
          setLoadingRankings(false);
          if (cached.isStale) {
            setUpdating(true);
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = setTimeout(() => setUpdating(false), 10000);
            fetchRankings(type, true);
          }
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
          setNestedCache(CACHE_KEYS.rankings, type, newRankings);
        } else if (!getNestedCache<Ranking[]>(CACHE_KEYS.rankings, type, CACHE_TTL)) {
          toast.error('Failed to load leaderboard');
        }
      } catch (error) {
        console.error(error);
        if (!getNestedCache<Ranking[]>(CACHE_KEYS.rankings, type, CACHE_TTL)) {
          toast.error(error instanceof TypeError ? 'Network error — check your connection' : 'Failed to load leaderboard');
        }
      } finally {
        setLoadingRankings(false);
        setUpdating(false);
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
      }
    },
    [firebaseUser]
  );

  useEffect(() => {
    if (user && firebaseUser) {
      fetchRankings(activeTab);
    }
  }, [user, firebaseUser, activeTab, fetchRankings]);

  if (!loading && !user) {
    return null;
  }

  const getScoreLabel = (type: RankingType) => {
    if (type === 'xp') return 'XP';
    return EXERCISE_INFO[type]?.unit ?? 'reps';
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold gradient-text">Leaderboard</h1>
            <button
              type="button"
              onClick={() => router.push('/leaderboard/xp-info')}
              className="p-1 text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {updating && (
            <span className="text-xs text-foreground/30 animate-pulse">
              Updating...
            </span>
          )}
        </div>

        <LeaderboardCharts firebaseUser={firebaseUser} />

        {/* Rankings */}
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

          <TabsContent value={activeTab}>
            {loadingRankings ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3 bg-surface/50 border border-border/50">
                    <div className="h-10 w-10 rounded-full bg-border/20 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-24 rounded bg-border/20 animate-pulse" />
                      <div className="h-3 w-12 rounded bg-border/20 animate-pulse" />
                    </div>
                    <div className="text-right space-y-1.5">
                      <div className="h-4 w-16 rounded bg-border/20 animate-pulse" />
                      <div className="h-3 w-8 rounded bg-border/20 animate-pulse ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <p className="py-12 text-center text-sm text-foreground/40">
                No rankings yet
              </p>
            ) : (
              <div className="space-y-2">
                {rankings.map((ranking) => {
                  const isCurrentUser = user ? ranking.id === user.id : false;
                  const avatarUrl = getAvatarDisplayUrl(ranking.avatar, ranking.username);
                  return (
                    <div
                      key={ranking.id}
                      className={`flex items-center gap-3 rounded-xl p-3 ${
                        isCurrentUser
                          ? 'bg-surface/80 border border-border glow-sm'
                          : 'bg-surface/50 border border-border/50'
                      }`}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-border/20">
                        <Image
                          src={avatarUrl}
                          alt={ranking.username}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          unoptimized={!avatarUrl.includes('dicebear.com')}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {ranking.username}
                        </div>
                        <div className="text-xs text-foreground/40">
                          Lv. {ranking.level}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-sm">
                          {Math.floor(ranking.score).toLocaleString()}
                        </div>
                        <div className="text-xs text-foreground/40">
                          {getScoreLabel(activeTab)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
