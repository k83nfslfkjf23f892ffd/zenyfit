'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Info } from 'lucide-react';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { DashboardSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [reverting, setReverting] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<Array<{
    id: string;
    type: string;
    amount: number;
    xpEarned: number;
    timestamp: number;
    customExerciseName?: string;
    customExerciseUnit?: string;
  }>>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  // Delete workout confirmation state
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Lock scroll when delete dialog is open
  useEffect(() => {
    if (workoutToDelete) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [workoutToDelete]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchRecentWorkouts = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/workouts?limit=5', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentWorkouts(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoadingWorkouts(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchRecentWorkouts();
    }
  }, [user, firebaseUser, fetchRecentWorkouts]);

  const handleDeleteWorkout = async (workoutId: string) => {
    if (reverting) return;

    setReverting(true);
    setWorkoutToDelete(null);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete workout');
        return;
      }

      toast.success(`Workout deleted (-${data.xpDeducted} XP)`);
      fetchRecentWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('An error occurred');
    } finally {
      setReverting(false);
    }
  };

  // Long press handlers for workout deletion
  const handleLongPressStart = (workoutId: string) => {
    const timer = setTimeout(() => {
      setWorkoutToDelete(workoutId);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  if (!user) {
    return null;
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Activity
              <span className="group relative inline-flex">
                <Info className="h-4 w-4 text-muted-foreground/60" />
                <span className="absolute left-1/2 -translate-x-1/2 top-7 w-max max-w-[200px] text-xs text-center bg-foreground text-background rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-lg scale-95 group-hover:scale-100">
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                  Long press to delete
                </span>
              </span>
            </CardTitle>
            <CardDescription>Your last 5 workouts</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWorkouts ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-4 w-16 ml-auto" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentWorkouts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No workouts yet. Start logging!
              </p>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer select-none active:bg-muted/50 transition-colors"
                    onMouseDown={() => handleLongPressStart(workout.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(workout.id)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {workout.type === 'custom' ? workout.customExerciseName || 'Custom' : workout.type}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workout.amount} {workout.type === 'custom' ? (workout.customExerciseUnit || 'reps') : (workout.type === 'running' ? 'km' : 'reps')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-primary">
                        +{workout.xpEarned} XP
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(workout.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Workout Confirmation Dialog */}
      {workoutToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overscroll-none"
          style={{ touchAction: 'none' }}
          onClick={() => setWorkoutToDelete(null)}
        >
          <div className="bg-background border rounded-lg p-6 mx-4 max-w-sm w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Workout?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will remove the workout and deduct the XP earned. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setWorkoutToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteWorkout(workoutToDelete)}
                disabled={reverting}
              >
                {reverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
