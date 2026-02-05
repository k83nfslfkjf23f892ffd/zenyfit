'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock } from 'lucide-react';
import { ACHIEVEMENTS, type Achievement } from '@shared/achievements';
import { getCache, setLocalCache, CACHE_KEYS } from '@/lib/client-cache';

type Category = 'workout' | 'progress' | 'challenge' | 'social';

const CACHE_TTL = 5 * 60 * 1000;

export default function AchievementsPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<string[]>(CACHE_KEYS.achievements, CACHE_TTL);
      return cached?.data || [];
    }
    return [];
  });
  const [loadingAchievements, setLoadingAchievements] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCache<string[]>(CACHE_KEYS.achievements, CACHE_TTL);
    }
    return true;
  });
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<Category>('workout');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchAchievements = useCallback(async (skipCache = false) => {
    // Try cache first
    if (!skipCache) {
      const cached = getCache<string[]>(CACHE_KEYS.achievements, CACHE_TTL);
      if (cached) {
        setUnlockedIds(cached.data);
        setLoadingAchievements(false);
        if (cached.isStale) {
          setUpdating(true);
          fetchAchievements(true);
        }
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/achievements', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const ids = data.unlockedAchievements || [];
        setUnlockedIds(ids);
        setLocalCache(CACHE_KEYS.achievements, ids);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoadingAchievements(false);
      setUpdating(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchAchievements();
    }
  }, [user, firebaseUser, fetchAchievements]);

  // Don't block render for auth loading - show cached content immediately
  if (!loading && !user) {
    return null;
  }

  const categorizedAchievements: Record<Category, Achievement[]> = {
    workout: ACHIEVEMENTS.filter((a) => a.category === 'workout'),
    progress: ACHIEVEMENTS.filter((a) => a.category === 'progress'),
    challenge: ACHIEVEMENTS.filter((a) => a.category === 'challenge'),
    social: ACHIEVEMENTS.filter((a) => a.category === 'social'),
  };

  const totalUnlocked = unlockedIds.length;
  const totalAchievements = ACHIEVEMENTS.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Achievements
            {updating && (
              <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
            )}
          </h1>
          <p className="text-sm text-foreground/50 mt-0.5">
            {totalUnlocked} / {totalAchievements} unlocked
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workout">Workout</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="challenge">Challenge</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          {(['workout', 'progress', 'challenge', 'social'] as Category[]).map((category) => (
            <TabsContent key={category} value={category} className="mt-6 space-y-4">
              {loadingAchievements ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
                </div>
              ) : (
                categorizedAchievements[category].map((achievement) => {
                  const isUnlocked = unlockedIds.includes(achievement.id);

                  return (
                    <Card
                      key={achievement.id}
                      className={isUnlocked ? '' : 'opacity-50'}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{isUnlocked ? achievement.icon : '🔒'}</div>
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              {achievement.title}
                              {!isUnlocked && <Lock className="h-4 w-4 text-foreground/40" />}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {achievement.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
