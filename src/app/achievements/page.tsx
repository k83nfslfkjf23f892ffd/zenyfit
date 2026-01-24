'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Award, Lock } from 'lucide-react';
import { ACHIEVEMENTS, type Achievement } from '@shared/achievements';

type Category = 'workout' | 'progress' | 'challenge' | 'social';

const ACHIEVEMENTS_CACHE_KEY = 'zenyfit_achievements';

function getCachedAchievements(): string[] | null {
  try {
    const cached = localStorage.getItem(ACHIEVEMENTS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore errors
  }
  return null;
}

function setCachedAchievements(ids: string[]) {
  try {
    localStorage.setItem(ACHIEVEMENTS_CACHE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore errors
  }
}

export default function AchievementsPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return getCachedAchievements() || [];
    }
    return [];
  });
  const [loadingAchievements, setLoadingAchievements] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCachedAchievements();
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
      const cached = getCachedAchievements();
      if (cached) {
        setUnlockedIds(cached);
        setLoadingAchievements(false);
        setUpdating(true);
        fetchAchievements(true);
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
        setCachedAchievements(ids);
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8" />
            Achievements
            {updating && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
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
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                              {!isUnlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
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
