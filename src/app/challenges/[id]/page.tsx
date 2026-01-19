'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ChallengeDetailSkeleton } from '@/components/ui/skeleton';

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);

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

  const handleInvite = async () => {
    if (!inviteUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setInviting(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/challenges/${challengeId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: inviteUsername.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Invitation sent!');
        setShowInviteModal(false);
        setInviteUsername('');
      } else {
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('An error occurred');
    } finally {
      setInviting(false);
    }
  };

  if (loading || loadingChallenge) {
    return (
      <AppLayout>
        <ChallengeDetailSkeleton />
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
      <div className="space-y-6">
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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Participants
                </CardTitle>
                <CardDescription>{challenge.participants.length} competing</CardDescription>
              </div>
              {isParticipant && daysRemaining > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedParticipants.map((participant, index) => {
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
                      <span className="text-sm font-semibold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">
                        {participant.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invite to Challenge</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInviteModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Invite someone to join &quot;{challenge.title}&quot;
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteUsername">Username</Label>
                <Input
                  id="inviteUsername"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Enter username"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInvite();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteUsername.trim()}
                  className="flex-1"
                >
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
