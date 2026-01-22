'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { getAvatarDisplayUrl } from '@/lib/avatar';

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

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [joining, setJoining] = useState(false);
  const [challengeId, setChallengeId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => setChallengeId(p.id));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchChallenge = useCallback(async () => {
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
      } else {
        toast.error('Challenge not found');
        router.push('/challenges');
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
      toast.error('An error occurred');
    } finally {
      setLoadingChallenge(false);
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
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !refreshing) {
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

  if (loading || loadingChallenge) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!user || !challenge) {
    return null;
  }

  const daysRemaining = Math.ceil((challenge.endDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isParticipant = challenge.participantIds.includes(user.id);
  const sortedParticipants = [...challenge.participants].sort((a, b) => b.progress - a.progress);

  return (
    <AppLayout>
      <div
        ref={containerRef}
        className="space-y-6"
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
                  : 'border-muted-foreground/30 text-muted-foreground/50'
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

        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>

        {/* Challenge Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{challenge.title}</CardTitle>
                {challenge.description && (
                  <CardDescription className="mt-2">{challenge.description}</CardDescription>
                )}
              </div>
              {challenge.isPublic && (
                <span className="text-xs rounded-full bg-primary/10 px-3 py-1 text-primary">
                  Public
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold capitalize">{challenge.type}</div>
                <div className="text-xs text-muted-foreground">Exercise</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {challenge.goal} {challenge.type === 'running' ? 'km' : 'reps'}
                </div>
                <div className="text-xs text-muted-foreground">Goal</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {daysRemaining > 0 ? `${daysRemaining}d` : 'Ended'}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Participants
            </CardTitle>
            <CardDescription>{challenge.participants.length} competing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedParticipants.map((participant) => {
              const progressPercent = (participant.progress / challenge.goal) * 100;
              const isCurrentUser = participant.userId === user.id;

              return (
                <div
                  key={participant.userId}
                  className={`rounded-lg border p-3 ${
                    isCurrentUser ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-muted flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getAvatarDisplayUrl(participant.avatar, participant.username)}
                          alt={participant.username}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="font-medium">
                        {participant.username}
                      </span>
                    </div>
                    <span className="font-bold text-primary">
                      {Math.floor(participant.progress)} / {challenge.goal}
                    </span>
                  </div>
                  <Progress value={progressPercent} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
