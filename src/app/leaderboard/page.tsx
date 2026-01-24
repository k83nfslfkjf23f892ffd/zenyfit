'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image'; // Fixed: Replaced img with Next.js Image
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Loader2, Info, X } from 'lucide-react'; // Fixed: Added X
import { Button } from '@/components/ui/button';       // Fixed: Added Button
// Removed unused 'toast' import to fix ESLint warning
import { getAvatarDisplayUrl } from '@/lib/avatar';
import { EXERCISE_INFO } from '@shared/constants';

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
    return null;
  }
  return null;
}

function setCachedRankings(type: string, rankings: Ranking[]) {
  try {
    const cached = localStorage.getItem(RANKINGS_CACHE_KEY);
    const existing = cached ? JSON.parse(cached) : {};
    existing[type] = { rankings, timestamp: Date.now() };
    localStorage.setItem(RANKINGS_CACHE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  
  // State
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<RankingType>('xp');
  const [rankings, setRankings] = useState<Ranking[]>(() => {
    if (typeof window !== 'undefined') return getCachedRankings('xp') || [];
    return [];
  });
  const [loadingRankings, setLoadingRankings] = useState(() => {
    if (typeof window !== 'undefined') return !getCachedRankings('xp');
    return true;
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const fetchRankings = useCallback(async (type: RankingType, skipCache = false) => {
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
      const url = type === 'xp' ? '/api/leaderboard' : `/api/leaderboard?type=${type}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const newRankings = data.rankings || [];
        setRankings(newRankings);
        setCachedRankings(type, newRankings);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingRankings(false);
      setUpdating(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) fetchRankings(activeTab);
  }, [user, firebaseUser, activeTab, fetchRankings]);

  if (!loading && !user) return null;

  const getScoreLabel = (type: RankingType) => {
    if (type === 'xp') return 'XP';
    const info = EXERCISE_INFO[type];
    return info ? info.unit : 'reps';
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
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </CardTitle>
              {updating && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
            </div>
            <CardDescription>Compete with other users and climb the ranks</CardDescription>
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
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : rankings.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No rankings yet</p>
                ) : (
                  rankings.map((ranking) => {
                    const isCurrentUser = user ? ranking.id === user.id : false;
                    const avatarUrl = getAvatarDisplayUrl(ranking.avatar, ranking.username);
                    return (
                      <div key={ranking.id} className={`flex items-center gap-3 rounded-lg border p-3 ${isCurrentUser ? 'border-primary bg-primary/5' : ''}`}>
                        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted flex-shrink-0">
                          <Image 
                            src={avatarUrl} 
                            alt={ranking.username} 
                            fill
                            className="object-cover" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{ranking.username}</div>
                          <div className="text-xs text-muted-foreground">Level {ranking.level}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{Math.floor(ranking.score).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{getScoreLabel(activeTab)}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowXpInfo(false)}>
          <div className="bg-background border rounded-lg p-5 max-w-md w-full shadow-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">How XP Works</h3>
              <button type="button" onClick={() => setShowXpInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">XP is based on <strong>biomechanical difficulty</strong>.</p>
              <div>
                <h4 className="font-medium mb-2">Calisthenics (per rep)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Push-ups</span><span className="text-primary">3 XP</span></div>
                  <div className="flex justify-between"><span>Pull-ups</span><span className="text-primary">6 XP</span></div>
                  <div className="flex justify-between"><span>Muscle-ups</span><span className="text-primary">11 XP</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Cardio (per km)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Running</span><span className="text-primary">30 XP</span></div>
                </div>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => setShowXpInfo(false)}>Got it</Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
