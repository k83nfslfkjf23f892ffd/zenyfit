'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { ExerciseRatioChart } from '@/components/charts/ExerciseRatioChart';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Don't block render for auth loading
  if (!loading && !user) {
    return null;
  }

  // Show minimal content while loading
  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const xpInLevel = getXPInCurrentLevel(user.xp, user.level);
  const xpNeeded = getXPNeededForNextLevel(user.level);
  const progressPercent = (xpInLevel / xpNeeded) * 100;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* User Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <CardDescription>Level {user.level}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{user.xp}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Level {user.level + 1}</span>
                <span className="text-muted-foreground">
                  {xpInLevel} / {xpNeeded} XP
                </span>
              </div>
              <Progress value={progressPercent} />
            </div>
          </CardContent>
        </Card>

        {/* Exercise Distribution Chart */}
        <ExerciseRatioChart totals={user.totals} />
      </div>
    </AppLayout>
  );
}
