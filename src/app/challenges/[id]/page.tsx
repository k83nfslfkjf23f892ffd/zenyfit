'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getAvatarDisplayUrl } from '@/lib/avatar';
import { EXERCISE_INFO } from '@shared/constants';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  goal: number;
  startDate: number;
  endDate: number;
  isPublic: boolean;
  participants: Array<{ userId: string; username: string; avatar: string; progress: number }>;
  participantIds: string[];
  createdBy: string;
}

// Cache helpers
const CACHE_KEY_PREFIX = 'zenyfit_challenge_';
const CACHE_TTL = 5 * 60 * 1000; // 5 min — challenges need freshness for timers

function getCachedChallenge(id: string): Challenge | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + id);
    if (!cached) return null;
    const data = JSON.parse(cached);
    if (data && Date.now() - data.timestamp < CACHE_TTL) {
      return data.challenge;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function setCachedChallenge(id: string, challenge: Challenge) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + id, JSON.stringify({ challenge, timestamp: Date.now() }));
  } catch {
    // Ignore errors
  }
}

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const [challengeId, setChallengeId] = useState<string>('');
  const [challenge, setChallenge] = useState<Challenge | null>(() => {
    // Can't access challengeId yet, will be set in useEffect
    return null;
  });
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => {
      setChallengeId(p.id);
      // Load cached data immediately
      const cached = getCachedChallenge(p.id);
      if (cached) {
        setChallenge(cached);
        setLoadingChallenge(false);
      }
    });
  }, [params]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchChallenge = useCallback(async (skipCache = false) => {
    // Try cache first
    if (!skipCache) {
      const cached = getCachedChallenge(challengeId);
      if (cached) {
        setChallenge(cached);
        setLoadingChallenge(false);
        setUpdating(true);
        fetchChallenge(true);
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/challenges/${challengeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChallenge(data.challenge);
        setCachedChallenge(challengeId, data.challenge);
      } else if (!getCachedChallenge(challengeId)) {
        toast.error('Challenge not found');
        router.push('/challenges');
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
      if (!getCachedChallenge(challengeId)) {
        toast.error('An error occurred');
      }
    } finally {
      setLoadingChallenge(false);
      setUpdating(false);
    }
  }, [firebaseUser, challengeId, router]);

  useEffect(() => {
    if (user && firebaseUser && challengeId) {
      fetchChallenge();
    }
  }, [user, firebaseUser, challengeId, fetchChallenge]);

  const handleJoin = async () => {
    if (!challenge || !challenge.isPublic) return;

    setJoining(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/challenges/${challenge.id}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Successfully joined challenge!');
        fetchChallenge(); // Refresh
      } else {
        toast.error(data.error || 'Failed to join challenge');
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast.error('An error occurred');
    } finally {
      setJoining(false);
    }
  };

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChallenge();
    setRefreshing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 5) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 5 && !refreshing) {
      const touchY = e.touches[0].clientY;
      const distance = Math.max(0, Math.min(80, touchY - touchStartY.current));
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 60 && !refreshing) {
      handleRefresh();
    }
    setPullDistance(0);
  };

  // Don't block render for auth loading - show cached content immediately
  if (!loading && !user) {
    return null;
  }

  // Show loading only if no cached data
  if (loadingChallenge && !challenge) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return null;
  }

  const daysRemaining = Math.ceil((challenge.endDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isParticipant = user ? challenge.participantIds.includes(user.id) : false;
  const sortedParticipants = [...challenge.participants].sort((a, b) => b.progress - a.progress);

  return (
    <AppLayout>
      <div
        ref={containerRef}
        className="space-y-5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex justify-center items-center py-2"
            style={{ height: refreshing ? 40 : Math.min(pullDistance, 60) }}
          >
            <div
              className={`rounded-full border-2 p-1 transition-colors ${
                pullDistance >= 60 || refreshing
                  ? 'border-primary text-primary'
                  : 'border-foreground/10 text-foreground/30'
              }`}
            >
              <Loader2
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
                style={{
                  opacity: refreshing ? 1 : Math.min(pullDistance / 40, 1),
                  transform: refreshing ? 'none' : `rotate(${pullDistance * 4}deg)`
                }}
              />
            </div>
          </div>
        )}

        {/* Back button */}
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 text-foreground/40" />
        </Button>

        {/* Challenge Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  {challenge.title}
                  {updating && (
                    <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
                  )}
                </CardTitle>
                {challenge.description && (
                  <p className="text-sm text-foreground/50 mt-1">{challenge.description}</p>
                )}
              </div>
              {challenge.isPublic && (
                <Badge variant="secondary">Public</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-surface border border-border rounded-xl p-3">
                <div className="text-sm font-bold gradient-text">{EXERCISE_INFO[challenge.type]?.label || challenge.type}</div>
                <div className="text-xs text-foreground/40 mt-0.5">Exercise</div>
              </div>
              <div className="text-center bg-surface border border-border rounded-xl p-3">
                <div className="text-sm font-bold">
                  {challenge.goal} {EXERCISE_INFO[challenge.type]?.unit || 'reps'}
                </div>
                <div className="text-xs text-foreground/40 mt-0.5">Goal</div>
              </div>
              <div className="text-center bg-surface border border-border rounded-xl p-3">
                <div className="text-sm font-bold">
                  {daysRemaining > 0 ? `${daysRemaining}d` : 'Ended'}
                </div>
                <div className="text-xs text-foreground/40 mt-0.5">Remaining</div>
              </div>
            </div>

            {!isParticipant && challenge.isPublic && daysRemaining > 0 && (
              <Button onClick={handleJoin} disabled={joining} className="w-full">
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {joining ? 'Joining...' : 'Join Challenge'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Participants Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-amber-500/15">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              Participants
              <span className="text-xs text-foreground/40 font-normal ml-auto">
                {challenge.participants.length} competing
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedParticipants.map((participant) => {
              const progressPercent = (participant.progress / challenge.goal) * 100;
              const isCurrentUser = user ? participant.userId === user.id : false;
              return (
                <div
                  key={participant.userId}
                  className={`rounded-xl p-3 ${
                    isCurrentUser
                      ? 'bg-surface/80 border border-border glow-sm'
                      : 'bg-surface/50 border border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* Avatar */}
                    <div className="h-8 w-8 overflow-hidden rounded-full flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getAvatarDisplayUrl(participant.avatar, participant.username)}
                        alt={participant.username}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Name */}
                    <span className="font-medium text-sm flex-1 truncate">
                      {participant.username}
                    </span>

                    {/* Score */}
                    <span className="font-bold text-sm">
                      {Math.floor(participant.progress)} / {challenge.goal}
                    </span>
                  </div>
                  <Progress value={progressPercent} glow={isCurrentUser} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
