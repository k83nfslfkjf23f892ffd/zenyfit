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
import Link from 'next/link';
import { Dumbbell, Loader2, Undo2, Plus, Trash2 } from 'lucide-react';
import { getXPInCurrentLevel, getXPNeededForNextLevel } from '@shared/constants';
import { DashboardSkeleton, Skeleton } from '@/components/ui/skeleton';

type ExerciseType = 'pullups' | 'pushups' | 'dips' | 'running' | 'custom';

interface CustomExercise {
  id: string;
  name: string;
  unit: string;
  quickActions: number[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const { showWorkoutComplete } = useCelebration();

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('pullups');
  const [selectedCustomExercise, setSelectedCustomExercise] = useState<CustomExercise | null>(null);
  const [amount, setAmount] = useState('');
  const [logging, setLogging] = useState(false);
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

  // Custom exercises state
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [loadingCustomExercises, setLoadingCustomExercises] = useState(true);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

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

  const fetchCustomExercises = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/exercises/custom', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomExercises(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching custom exercises:', error);
    } finally {
      setLoadingCustomExercises(false);
    }
  }, [firebaseUser]);

  const handleDeleteCustomExercise = async (exerciseId: string) => {
    setDeletingExerciseId(exerciseId);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/exercises/custom/${exerciseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete exercise');
        return;
      }

      toast.success('Exercise deleted');

      // If this exercise was selected, reset selection
      if (selectedCustomExercise?.id === exerciseId) {
        setSelectedExercise('pullups');
        setSelectedCustomExercise(null);
      }

      fetchCustomExercises();
    } catch (error) {
      console.error('Error deleting custom exercise:', error);
      toast.error('An error occurred');
    } finally {
      setDeletingExerciseId(null);
    }
  };

  useEffect(() => {
    if (user && firebaseUser) {
      fetchRecentWorkouts();
      fetchCustomExercises();
    }
  }, [user, firebaseUser, fetchRecentWorkouts, fetchCustomExercises]);

  const handleRevertWorkout = async (workoutId: string) => {
    if (reverting) return;

    setReverting(true);
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
        toast.error(data.error || 'Failed to revert workout');
        return;
      }

      toast.success(`Workout reverted (-${data.xpDeducted} XP)`);
      fetchRecentWorkouts();
    } catch (error) {
      console.error('Error reverting workout:', error);
      toast.error('An error occurred');
    } finally {
      setReverting(false);
    }
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate custom exercise selection
    if (selectedExercise === 'custom' && !selectedCustomExercise) {
      toast.error('Please select a custom exercise');
      return;
    }

    setLogging(true);

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const body: Record<string, unknown> = {
        type: selectedExercise,
        amount: amountNum,
      };

      if (selectedExercise === 'custom' && selectedCustomExercise) {
        body.customExerciseId = selectedCustomExercise.id;
      }

      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to log workout');
        return;
      }

      // Show workout celebration animation
      const exerciseName = selectedExercise === 'custom' && selectedCustomExercise
        ? selectedCustomExercise.name
        : selectedExercise;
      showWorkoutComplete(data.xpEarned, exerciseName, amountNum);

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

  const standardQuickAmounts: Record<string, number[]> = {
    pullups: [5, 10, 15, 20],
    pushups: [10, 25, 50, 100],
    dips: [5, 10, 15, 20],
    running: [1, 3, 5, 10],
  };

  // Get quick amounts for current selection
  const getQuickAmounts = () => {
    if (selectedExercise === 'custom' && selectedCustomExercise) {
      return selectedCustomExercise.quickActions.length > 0
        ? selectedCustomExercise.quickActions
        : [5, 10, 15, 20];
    }
    return standardQuickAmounts[selectedExercise] || [5, 10, 15, 20];
  };

  // Get unit label for current selection
  const getUnitLabel = () => {
    if (selectedExercise === 'custom' && selectedCustomExercise) {
      return selectedCustomExercise.unit;
    }
    return selectedExercise === 'running' ? 'km' : 'reps';
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
              {/* Standard Exercise Type Selector */}
              <div className="space-y-2">
                <Label>Exercise</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pullups', 'pushups', 'dips', 'running'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedExercise(type);
                        setSelectedCustomExercise(null);
                      }}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Exercises Section */}
              {!loadingCustomExercises && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Exercises</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 text-xs"
                    >
                      <Link href="/dashboard/custom-exercise">
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Link>
                    </Button>
                  </div>
                  {customExercises.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {customExercises.map((exercise) => (
                        <div key={exercise.id} className="relative group">
                          <Button
                            type="button"
                            variant={
                              selectedExercise === 'custom' && selectedCustomExercise?.id === exercise.id
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() => {
                              setSelectedExercise('custom');
                              setSelectedCustomExercise(exercise);
                            }}
                            className="w-full truncate pr-8"
                          >
                            {exercise.name}
                          </Button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomExercise(exercise.id);
                            }}
                            disabled={deletingExerciseId === exercise.id}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                          >
                            {deletingExerciseId === exercise.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No custom exercises yet. Create one to track any activity!
                    </p>
                  )}
                  {selectedExercise === 'custom' && (
                    <p className="text-xs text-muted-foreground">
                      Custom exercises don&apos;t earn XP (tracking only)
                    </p>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount ({getUnitLabel()})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step={selectedExercise === 'running' || (selectedExercise === 'custom' && selectedCustomExercise?.unit === 'km') ? '0.1' : '1'}
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
                  {getQuickAmounts().map((qty) => (
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
              <Button
                type="submit"
                className="w-full"
                disabled={logging || (selectedExercise === 'custom' && !selectedCustomExercise)}
              >
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
                {recentWorkouts.map((workout, index) => (
                  <div
                    key={workout.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    {/* Revert button on the left (only for most recent) */}
                    {index === 0 ? (
                      <button
                        onClick={() => handleRevertWorkout(workout.id)}
                        disabled={reverting}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        title="Undo this workout"
                      >
                        {reverting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <div className="w-10" />
                    )}

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

    </AppLayout>
  );
}
