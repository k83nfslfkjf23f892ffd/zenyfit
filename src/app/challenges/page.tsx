'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, Clock, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EXERCISE_INFO } from '@shared/constants';
import { listContainerVariants, listItemVariants } from '@/lib/animations';
import { getNestedCache, setNestedCache, CACHE_KEYS } from '@/lib/client-cache';

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

const CACHE_TTL = 5 * 60 * 1000;

export default function ChallengesPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getNestedCache<Challenge[]>(CACHE_KEYS.challenges, 'my', CACHE_TTL);
      return cached?.data || [];
    }
    return [];
  });
  const [loadingChallenges, setLoadingChallenges] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getNestedCache<Challenge[]>(CACHE_KEYS.challenges, 'my', CACHE_TTL);
    }
    return true;
  });
  const [updating, setUpdating] = useState(false);
  const [, setTick] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Real-time timer update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchChallenges = useCallback(async (filter: 'my' | 'public', skipCache = false) => {
    // Try cache first
    if (!skipCache) {
      const cached = getNestedCache<Challenge[]>(CACHE_KEYS.challenges, filter, CACHE_TTL);
      if (cached) {
        setChallenges(cached.data);
        setLoadingChallenges(false);
        if (cached.isStale) {
          setUpdating(true);
          if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = setTimeout(() => setUpdating(false), 10000);
          fetchChallenges(filter, true);
        }
        return;
      }
    }

    if (!skipCache) {
      setLoadingChallenges(true);
    }

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
        const newChallenges = data.challenges || [];
        setChallenges(newChallenges);
        setNestedCache(CACHE_KEYS.challenges, filter, newChallenges);
      } else if (!getNestedCache<Challenge[]>(CACHE_KEYS.challenges, filter, CACHE_TTL)) {
        toast.error('Failed to load challenges');
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
      if (!getNestedCache<Challenge[]>(CACHE_KEYS.challenges, filter, CACHE_TTL)) {
        toast.error('An error occurred');
      }
    } finally {
      setLoadingChallenges(false);
      setUpdating(false);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchChallenges(activeTab);
    }
  }, [user, firebaseUser, activeTab, fetchChallenges]);

  const getTimeRemaining = (endDate: number) => {
    const now = Date.now();
    const remaining = endDate - now;
    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, ended: false };
  };

  const formatTimeRemaining = (endDate: number) => {
    const { days, hours, minutes, seconds, ended } = getTimeRemaining(endDate);
    if (ended) return 'Ended';

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  const getUserProgress = (challenge: Challenge) => {
    const participant = challenge.participants.find((p) => p.userId === user?.id);
    return participant?.progress || 0;
  };

  // Don't block render for auth loading - show cached content immediately
  if (!loading && !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold gradient-text">Challenges</h1>
              {updating && (
                <span className="text-xs text-foreground/30 animate-pulse">
                  Updating...
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/50">Compete and push your limits</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/challenges/create">
              <Plus className="mr-1.5 h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'my' | 'public')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my">My Challenges</TabsTrigger>
            <TabsTrigger value="public">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loadingChallenges ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
              </div>
            ) : challenges.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 p-3 rounded-2xl gradient-bg-subtle w-fit">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-foreground/40">
                  {activeTab === 'my'
                    ? 'No active challenges. Create one or join a public challenge!'
                    : 'No public challenges available right now.'}
                </p>
              </div>
            ) : (
              <motion.div
                className="space-y-3"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
                key={activeTab}
              >
                {challenges.map((challenge) => {
                  const timeRemaining = formatTimeRemaining(challenge.endDate);
                  const userProgress = getUserProgress(challenge);
                  const progressPercent = (userProgress / challenge.goal) * 100;
                  const isParticipant = user ? challenge.participantIds.includes(user.id) : false;

                  return (
                    <motion.div key={challenge.id} variants={listItemVariants}>
                      <Link href={`/challenges/${challenge.id}`}>
                        <div className="glass rounded-xl p-4 space-y-3 transition-all active:scale-[0.98]">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{challenge.title}</h3>
                              {challenge.description && (
                                <p className="text-xs text-foreground/40 mt-0.5 truncate">
                                  {challenge.description}
                                </p>
                              )}
                            </div>
                            {challenge.isPublic && (
                              <Badge variant="secondary" className="ml-2 shrink-0">Public</Badge>
                            )}
                          </div>

                          {/* Challenge Info */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-foreground/60">
                              <Target className="h-3.5 w-3.5" />
                              <span>{EXERCISE_INFO[challenge.type]?.label || challenge.type}</span>
                            </div>
                            <div className="flex items-center gap-1 text-foreground/40">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="font-mono text-xs">
                                {timeRemaining}
                              </span>
                            </div>
                          </div>

                          {/* Progress (if participant) */}
                          {isParticipant && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-foreground/50">Progress</span>
                                <span className="font-medium gradient-text">
                                  {Math.floor(userProgress)} / {challenge.goal}
                                </span>
                              </div>
                              <Progress value={progressPercent} glow />
                            </div>
                          )}

                          {/* Participants */}
                          <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                            <Users className="h-3.5 w-3.5" />
                            <span>{challenge.participants.length} participants</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
