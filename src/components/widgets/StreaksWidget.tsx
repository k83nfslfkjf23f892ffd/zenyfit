'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function getMotivationalText(streak: number): string {
  if (streak === 0) return 'Log a workout to start your streak!';
  if (streak === 1) return 'Great start! Keep it going tomorrow.';
  if (streak < 3) return 'Building momentum!';
  if (streak < 7) return 'On a roll! Keep pushing.';
  if (streak < 14) return 'Impressive consistency!';
  if (streak < 30) return 'Unstoppable! Almost a month.';
  return 'Legendary dedication!';
}

export function StreaksWidget() {
  const { user, firebaseUser } = useAuth();
  const [streakData, setStreakData] = useState<{
    currentStreak: number;
    longestStreak: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/profile/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setStreakData({
          currentStreak: result.currentStreak || 0,
          longestStreak: result.longestStreak || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching streaks:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    // Try to read from user doc first (already loaded via onSnapshot)
    if (user?.currentStreak !== undefined) {
      setStreakData({
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
      });
      setLoading(false);
      return;
    }

    // Fallback: fetch from API to trigger migration
    if (firebaseUser) {
      fetchStreaks();
    }
  }, [user?.currentStreak, user?.longestStreak, firebaseUser, fetchStreaks]);

  const current = streakData?.currentStreak ?? 0;
  const longest = streakData?.longestStreak ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-orange-500/15">
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          Workout Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-border/20 animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-8 rounded bg-border/20 animate-pulse" />
                <div className="h-3 w-12 rounded bg-border/20 animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-border/20 animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-6 rounded bg-border/20 animate-pulse" />
                <div className="h-3 w-8 rounded bg-border/20 animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Current streak - prominent */}
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold tabular-nums text-foreground">
                {current}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-foreground/50 font-medium leading-tight">day{current !== 1 ? 's' : ''}</span>
                <span className="text-xs text-foreground/40 leading-tight">current</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-border" />

            {/* Longest streak */}
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-foreground/30" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold tabular-nums text-foreground/70">{longest}</span>
                <span className="text-xs text-foreground/40 leading-tight">best</span>
              </div>
            </div>

            {/* Motivational text */}
            <div className="flex-1 text-right">
              <span className="text-xs text-foreground/40 italic">
                {getMotivationalText(current)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
