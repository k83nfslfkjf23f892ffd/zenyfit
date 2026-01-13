'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCelebration } from '@/lib/celebration-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Dumbbell, Loader2 } from 'lucide-react';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { DashboardSkeleton, Skeleton } from '@/components/ui/skeleton';

type ExerciseType = 'pullups' | 'pushups' | 'dips' | 'running';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const { showWorkoutComplete } = useCelebration();

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('pullups');
  const [amount, setAmount] = useState('');
  const [logging, setLogging] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<Array<{
    id: string;
    type: string;
    amount: number;
    xpEarned: number;
    timestamp: number;
  }>>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

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

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLogging(true);

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedExercise,
          amount: amountNum,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to log workout');
        return;
      }

      // Show workout celebration animation
      showWorkoutComplete(data.xpEarned, selectedExercise, amountNum);

      toast.success(
        `+${data.xpEarned} XP earned!${data.leveledUp ? ' Level up! 🎉' : ''}`
      );

      // Reset form
      setAmount('');

      // Refresh workouts list
      fetchRecentWorkouts();
    } catch (error) {
      console.error('Error logging workout:', error);
      toast.error('An error occurred');
    } finally {
      setLogging(false);
    }
  };

  const quickAmounts: Record<ExerciseType, number[]> = {
    pullups: [5, 10, 15, 20],
    pushups: [10, 25, 50, 100],
    dips: [5, 10, 15, 20],
    running: [1, 3, 5, 10],
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

        {/* Workout Logger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Log Workout
            </CardTitle>
            <CardDescription>Track your progress and earn XP</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogWorkout} className="space-y-4">
              {/* Exercise Type Selector */}
              <div className="space-y-2">
                <Label>Exercise</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pullups', 'pushups', 'dips', 'running'] as ExerciseType[]).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      onClick={() => setSelectedExercise(type)}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount ({selectedExercise === 'running' ? 'km' : 'reps'})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step={selectedExercise === 'running' ? '0.1' : '1'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Label>Quick Add</Label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts[selectedExercise].map((qty) => (
                    <Button
                      key={qty}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(qty.toString())}
                    >
                      {qty}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={logging}>
                {logging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {logging ? 'Logging...' : 'Log Workout'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
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
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium capitalize">{workout.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {workout.amount} {workout.type === 'running' ? 'km' : 'reps'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">
                        +{workout.xpEarned} XP
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(workout.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
