'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getNestedCache, setNestedCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';

interface Challenge {
  id: string;
  title: string;
  goal: number;
  progress: number;
  endDate: number;
}

interface ChallengesResponse {
  challenges: Array<{
    id: string;
    title: string;
    goal: number;
    participants: Array<{ userId: string; progress: number }>;
    participantIds: string[];
    endDate: number;
  }>;
}

const CACHE_TTL = CACHE_TTLS.challenges;

export function ActiveChallengesWidget() {
  const { user, firebaseUser } = useAuth();

  const extractChallenges = useCallback((data: ChallengesResponse): Challenge[] => {
    const now = Date.now();
    return (data.challenges || [])
      .filter((c) => c.endDate > now && c.participantIds?.includes(user?.id || ''))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: c.title,
        goal: c.goal,
        progress: c.participants?.find((p) => p.userId === user?.id)?.progress || 0,
        endDate: c.endDate,
      }));
  }, [user?.id]);

  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getNestedCache<ChallengesResponse>(CACHE_KEYS.challenges, 'my', CACHE_TTL);
      if (cached) return extractChallenges(cached.data);
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getNestedCache<ChallengesResponse>(CACHE_KEYS.challenges, 'my', CACHE_TTL);
    }
    return true;
  });

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getNestedCache<ChallengesResponse>(CACHE_KEYS.challenges, 'my', CACHE_TTL);
      if (cached) {
        setChallenges(extractChallenges(cached.data));
        setLoading(false);
        if (cached.isStale) {
          fetchData(true);
        }
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/challenges', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setChallenges(extractChallenges(result));
        setNestedCache(CACHE_KEYS.challenges, 'my', result);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, extractChallenges]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchData();
    }
  }, [user, firebaseUser, fetchData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-blue-500/15">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            Active Challenges
          </CardTitle>
          <Link href="/challenges" className="text-xs text-foreground/50 flex items-center hover:text-primary transition-colors">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        ) : challenges.length > 0 ? (
          challenges.map((challenge) => {
            const progressPercent = Math.min((challenge.progress / challenge.goal) * 100, 100);
            const daysLeft = Math.ceil((challenge.endDate - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="block rounded-xl bg-surface border border-border p-3 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{challenge.title}</span>
                  <span className="text-xs text-foreground/40">{daysLeft}d left</span>
                </div>
                <Progress value={progressPercent} />
                <div className="flex justify-between mt-1.5 text-xs text-foreground/40">
                  <span>{challenge.progress} / {challenge.goal}</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-foreground/40 text-center py-4">
            No active challenges. Join one to compete!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
