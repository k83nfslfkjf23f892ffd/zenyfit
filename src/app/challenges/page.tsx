'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target, Plus, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ChallengesSkeleton, Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  goal: number;
  startDate: number;
  endDate: number;
  isPublic: boolean;
  participants: Array<{ userId: string; username: string; progress: number }>;
  participantIds: string[];
}

export default function ChallengesPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchChallenges = useCallback(async (filter: 'my' | 'public') => {
    setLoadingChallenges(true);

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/challenges?filter=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      } else {
        toast.error('Failed to load challenges');
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('An error occurred');
    } finally {
      setLoadingChallenges(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchChallenges(activeTab);
    }
  }, [user, firebaseUser, activeTab, fetchChallenges]);

  const getDaysRemaining = (endDate: number) => {
    const now = Date.now();
    const remaining = endDate - now;
    const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUserProgress = (challenge: Challenge) => {
    const participant = challenge.participants.find((p) => p.userId === user?.id);
    return participant?.progress || 0;
  };

  if (loading) {
    return (
      <AppLayout>
        <ChallengesSkeleton />
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Challenges</h1>
            <p className="text-muted-foreground">Compete and push your limits</p>
          </div>
          <Button asChild>
            <Link href="/challenges/create">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'my' | 'public')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my">My Challenges</TabsTrigger>
            <TabsTrigger value="public">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {loadingChallenges ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-full max-w-xs" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[...Array(3)].map((_, j) => (
                              <SkeletonAvatar key={j} className="h-6 w-6 border-2 border-background" />
                            ))}
                          </div>
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : challenges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'my'
                      ? 'No active challenges. Create one or join a public challenge!'
                      : 'No public challenges available right now.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              challenges.map((challenge) => {
                const daysRemaining = getDaysRemaining(challenge.endDate);
                const userProgress = getUserProgress(challenge);
                const progressPercent = (userProgress / challenge.goal) * 100;
                const isParticipant = challenge.participantIds.includes(user.id);

                return (
                  <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle>{challenge.title}</CardTitle>
                            {challenge.description && (
                              <CardDescription className="mt-1">
                                {challenge.description}
                              </CardDescription>
                            )}
                          </div>
                          {challenge.isPublic && (
                            <span className="text-xs rounded-full bg-primary/10 px-2 py-1 text-primary">
                              Public
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Challenge Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{challenge.type}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {daysRemaining > 0 ? `${daysRemaining}d left` : 'Ended'}
                            </span>
                          </div>
                        </div>

                        {/* Progress (if participant) */}
                        {isParticipant && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Your Progress</span>
                              <span className="text-muted-foreground">
                                {Math.floor(userProgress)} / {challenge.goal}
                              </span>
                            </div>
                            <Progress value={progressPercent} />
                          </div>
                        )}

                        {/* Participants */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{challenge.participants.length} participants</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
