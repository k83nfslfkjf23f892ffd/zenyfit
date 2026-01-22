'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCelebration } from '@/lib/celebration-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, Plus, Undo2, X, Info, ChevronDown } from 'lucide-react';
import { EXERCISE_INFO, XP_RATES, CALISTHENICS_PRESETS, CALISTHENICS_BASE_TYPES } from '@shared/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { EXERCISE_TYPES } from '@shared/schema';

type ExerciseType = typeof EXERCISE_TYPES[number];
type BaseExerciseType = keyof typeof CALISTHENICS_BASE_TYPES;

interface CustomExercise {
  id: string;
  name: string;
  unit: string;
  quickActions: number[];
}

interface LastWorkout {
  id: string;
  type: string;
  amount: number;
  xpEarned: number;
  customExerciseName?: string;
}

// Storage keys
const STORAGE_KEYS = {
  lastExercise: 'zenyfit_lastExercise',
  lastVariation: 'zenyfit_lastVariation',
  expandedCategories: 'zenyfit_expandedCategories',
  lastCustomExerciseId: 'zenyfit_lastCustomExerciseId',
  customExercises: 'zenyfit_customExercises',
  recentWorkouts: 'zenyfit_recentWorkouts',
};

// Cache helpers
function getCached<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore errors
  }
  return null;
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore errors
  }
}

export default function LogPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const { showWorkoutComplete } = useCelebration();

  // Base exercise type (pushups, pullups, dips, muscleups) or cardio/team sport
  const [selectedBaseType, setSelectedBaseType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.lastExercise) || 'pushups';
    }
    return 'pushups';
  });

  // Specific variation for calisthenics
  const [selectedVariation, setSelectedVariation] = useState<ExerciseType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.lastVariation);
      if (saved && EXERCISE_TYPES.includes(saved as ExerciseType)) {
        return saved as ExerciseType;
      }
    }
    return 'pushups';
  });

  // Expanded category state (persisted)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.expandedCategories);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return { calisthenics: true, cardio: false, team_sports: false, custom: false };
  });

  const [selectedCustomExercise, setSelectedCustomExercise] = useState<CustomExercise | null>(null);

  // Manual entry
  const [amount, setAmount] = useState('');
  const [logging, setLogging] = useState(false);

  // Custom exercises (with cache)
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>(() => {
    if (typeof window !== 'undefined') {
      return getCached<CustomExercise[]>(STORAGE_KEYS.customExercises) || [];
    }
    return [];
  });
  const [loadingCustomExercises, setLoadingCustomExercises] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCached<CustomExercise[]>(STORAGE_KEYS.customExercises);
    }
    return true;
  });

  // Undo functionality
  const [lastWorkout, setLastWorkout] = useState<LastWorkout | null>(null);
  const [undoing, setUndoing] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sets x Reps modal
  const [setsRepsModal, setSetsRepsModal] = useState<{ preset: number; open: boolean } | null>(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('');

  // XP Info modal
  const [showXpInfo, setShowXpInfo] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recent Activity state (with cache)
  type RecentWorkout = {
    id: string;
    type: string;
    amount: number;
    xpEarned: number;
    timestamp: number;
    customExerciseName?: string;
    customExerciseUnit?: string;
  };
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>(() => {
    if (typeof window !== 'undefined') {
      return getCached<RecentWorkout[]>(STORAGE_KEYS.recentWorkouts) || [];
    }
    return [];
  });
  const [loadingWorkouts, setLoadingWorkouts] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCached<RecentWorkout[]>(STORAGE_KEYS.recentWorkouts);
    }
    return true;
  });
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [deleteLongPressTimer, setDeleteLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Check if current selection is calisthenics
  const isCalisthenics = selectedBaseType in CALISTHENICS_BASE_TYPES;

  // Get the actual exercise type to log
  const getActiveExercise = (): ExerciseType => {
    if (selectedBaseType === 'custom') return 'custom';
    if (isCalisthenics) return selectedVariation;
    return selectedBaseType as ExerciseType;
  };

  // Lock scroll when dialogs are open
  useEffect(() => {
    if (workoutToDelete || setsRepsModal?.open || showXpInfo) {
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
  }, [workoutToDelete, setsRepsModal, showXpInfo]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Save selections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.lastExercise, selectedBaseType);
    localStorage.setItem(STORAGE_KEYS.lastVariation, selectedVariation);
    if (selectedBaseType === 'custom' && selectedCustomExercise) {
      localStorage.setItem(STORAGE_KEYS.lastCustomExerciseId, selectedCustomExercise.id);
    }
  }, [selectedBaseType, selectedVariation, selectedCustomExercise]);

  // Save expanded categories to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.expandedCategories, JSON.stringify(expandedCategories));
  }, [expandedCategories]);

  // Restore custom exercise selection after loading
  useEffect(() => {
    if (!loadingCustomExercises && customExercises.length > 0 && selectedBaseType === 'custom') {
      const lastId = localStorage.getItem(STORAGE_KEYS.lastCustomExerciseId);
      if (lastId) {
        const found = customExercises.find(e => e.id === lastId);
        if (found) {
          setSelectedCustomExercise(found);
        }
      }
    }
  }, [loadingCustomExercises, customExercises, selectedBaseType]);

  // When base type changes, update variation to match
  useEffect(() => {
    if (isCalisthenics) {
      const baseConfig = CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType];
      if (baseConfig && !(baseConfig.variations as readonly string[]).includes(selectedVariation)) {
        setSelectedVariation(baseConfig.variations[0] as ExerciseType);
      }
    }
  }, [selectedBaseType, isCalisthenics, selectedVariation]);

  // Clear undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const fetchCustomExercises = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/exercises/custom', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        const exercises = data.exercises || [];
        setCustomExercises(exercises);
        setCache(STORAGE_KEYS.customExercises, exercises);
      }
    } catch (error) {
      console.error('Error fetching custom exercises:', error);
    } finally {
      setLoadingCustomExercises(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchCustomExercises();
    }
  }, [user, firebaseUser, fetchCustomExercises]);

  // Fetch recent workouts
  const fetchRecentWorkouts = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/workouts?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const workouts = data.logs || [];
        setRecentWorkouts(workouts);
        setCache(STORAGE_KEYS.recentWorkouts, workouts);
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

  // Get unit label
  const getUnitLabel = () => {
    const activeExercise = getActiveExercise();
    if (activeExercise === 'custom' && selectedCustomExercise) {
      return selectedCustomExercise.unit;
    }
    return EXERCISE_INFO[activeExercise]?.unit || 'reps';
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Log workout function
  const logWorkout = async (logAmount: number) => {
    if (logAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const activeExercise = getActiveExercise();
    if (activeExercise === 'custom' && !selectedCustomExercise) {
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
        type: activeExercise,
        amount: logAmount,
      };

      if (activeExercise === 'custom' && selectedCustomExercise) {
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

      // Show celebration
      const exerciseName = activeExercise === 'custom' && selectedCustomExercise
        ? selectedCustomExercise.name
        : EXERCISE_INFO[activeExercise]?.label || activeExercise;
      showWorkoutComplete(data.xpEarned, exerciseName, logAmount);

      // Set last workout for undo
      setLastWorkout({
        id: data.log.id,
        type: activeExercise,
        amount: logAmount,
        xpEarned: data.xpEarned,
        customExerciseName: selectedCustomExercise?.name,
      });

      // Clear previous timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // Auto-dismiss undo banner after 10 seconds
      undoTimeoutRef.current = setTimeout(() => {
        setLastWorkout(null);
      }, 10000);

      // Refresh recent workouts
      fetchRecentWorkouts();
      setAmount('');
    } catch (error) {
      console.error('Error logging workout:', error);
      toast.error('An error occurred');
    } finally {
      setLogging(false);
    }
  };

  // Handle manual entry submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    logWorkout(amountNum);
  };

  // Quick add one-tap logging
  const handleQuickAdd = (preset: number) => {
    logWorkout(preset);
  };

  // Long press handlers for sets x reps
  const handleLongPressStart = (preset: number) => {
    longPressTimerRef.current = setTimeout(() => {
      setReps(preset.toString());
      setSetsRepsModal({ preset, open: true });
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Log sets x reps
  const handleLogSetsReps = () => {
    const setsNum = parseInt(sets);
    const repsNum = parseFloat(reps);
    if (isNaN(setsNum) || setsNum <= 0 || isNaN(repsNum) || repsNum <= 0) {
      toast.error('Please enter valid numbers');
      return;
    }
    const total = setsNum * repsNum;
    logWorkout(total);
    setSetsRepsModal(null);
    setSets('3');
    setReps('');
  };

  // Undo last workout
  const handleUndo = async () => {
    if (!lastWorkout || undoing) return;

    setUndoing(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/workouts/${lastWorkout.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to undo');
        return;
      }

      toast.success(`Undone (-${data.xpDeducted} XP)`);
      setLastWorkout(null);
      fetchRecentWorkouts();
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error undoing workout:', error);
      toast.error('An error occurred');
    } finally {
      setUndoing(false);
    }
  };

  // Delete workout from history
  const handleDeleteWorkout = async (workoutId: string) => {
    if (deleting) return;

    setDeleting(true);
    setWorkoutToDelete(null);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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
      setDeleting(false);
    }
  };

  // Long press handlers for workout deletion
  const handleDeleteLongPressStart = (workoutId: string) => {
    const timer = setTimeout(() => {
      setWorkoutToDelete(workoutId);
    }, 500);
    setDeleteLongPressTimer(timer);
  };

  const handleDeleteLongPressEnd = () => {
    if (deleteLongPressTimer) {
      clearTimeout(deleteLongPressTimer);
      setDeleteLongPressTimer(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  const activeExercise = getActiveExercise();
  const activeXpRate = XP_RATES[activeExercise] || 0;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Undo Banner */}
        {lastWorkout && (
          <div className="bg-muted border rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="text-sm">
              <span className="font-medium">Logged: </span>
              {lastWorkout.amount} {lastWorkout.type === 'custom' ? lastWorkout.customExerciseName : EXERCISE_INFO[lastWorkout.type]?.label || lastWorkout.type}
              <span className="text-primary ml-1">(+{lastWorkout.xpEarned} XP)</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoing}
              className="ml-2"
            >
              {undoing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-1" />
                  Undo
                </>
              )}
            </Button>
          </div>
        )}

        {/* Sticky Quick Add Section */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-1.5">
                    Quick Add
                    <button
                      type="button"
                      onClick={() => setShowXpInfo(true)}
                      className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {EXERCISE_INFO[activeExercise]?.label || activeExercise} • {activeXpRate} XP/{getUnitLabel()}
                  </CardDescription>
                </div>
              </div>

              {/* Variation selector for calisthenics */}
              {isCalisthenics && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.variations.map((variation) => (
                    <Button
                      key={variation}
                      type="button"
                      variant={selectedVariation === variation ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedVariation(variation as ExerciseType)}
                      className="text-xs h-7 px-2"
                    >
                      {EXERCISE_INFO[variation]?.label.replace(` ${CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.label}`, '').replace(CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.label, 'Standard') || variation}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Calisthenics 3-row layout */}
              {isCalisthenics ? (
                <div className="space-y-2">
                  {/* Row 1: 1, 3, 5, 10 */}
                  <div className="grid grid-cols-4 gap-2">
                    {CALISTHENICS_PRESETS.row1.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        className="h-12 text-lg font-semibold"
                        onClick={() => handleQuickAdd(preset)}
                        onMouseDown={() => handleLongPressStart(preset)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(preset)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={logging}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  {/* Row 2: 15, 20, 25 (centered) */}
                  <div className="flex justify-center gap-2">
                    {CALISTHENICS_PRESETS.row2.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        className="h-12 text-lg font-semibold w-20"
                        onClick={() => handleQuickAdd(preset)}
                        onMouseDown={() => handleLongPressStart(preset)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(preset)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={logging}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  {/* Row 3: 30, 50, 70, 100 */}
                  <div className="grid grid-cols-4 gap-2">
                    {CALISTHENICS_PRESETS.row3.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        className="h-12 text-lg font-semibold"
                        onClick={() => handleQuickAdd(preset)}
                        onMouseDown={() => handleLongPressStart(preset)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(preset)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={logging}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Non-calisthenics: cardio/team sports presets */
                <div className="grid grid-cols-4 gap-2">
                  {(selectedBaseType === 'running' ? [1, 3, 5, 10] :
                    selectedBaseType === 'walking' ? [1, 2, 3, 5] :
                    selectedBaseType === 'swimming' ? [0.5, 1, 2, 3] :
                    selectedBaseType === 'sprinting' ? [0.1, 0.2, 0.4, 0.5] :
                    [30, 45, 60, 90]).map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      className="h-12 text-lg font-semibold"
                      onClick={() => handleQuickAdd(preset)}
                      disabled={logging}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Tap to log instantly. Long press for sets.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Exercise Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Exercise Type</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                asChild
                className="h-7 text-xs"
              >
                <Link href="/dashboard/custom-exercise">
                  <Plus className="h-3 w-3 mr-1" />
                  Custom
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Calisthenics Category */}
            <Collapsible open={expandedCategories.calisthenics} onOpenChange={() => toggleCategory('calisthenics')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium text-sm">💪 Calisthenics</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategories.calisthenics ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(CALISTHENICS_BASE_TYPES) as BaseExerciseType[]).map((baseType) => (
                    <Button
                      key={baseType}
                      type="button"
                      variant={selectedBaseType === baseType ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedBaseType(baseType);
                        setSelectedCustomExercise(null);
                      }}
                      className="text-xs px-1.5 h-10"
                    >
                      {CALISTHENICS_BASE_TYPES[baseType].label}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Cardio Category */}
            <Collapsible open={expandedCategories.cardio} onOpenChange={() => toggleCategory('cardio')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium text-sm">🏃 Cardio</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategories.cardio ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {(['running', 'walking', 'swimming', 'sprinting'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedBaseType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedBaseType(type);
                        setSelectedCustomExercise(null);
                      }}
                      className="text-xs px-1.5 h-10"
                    >
                      {EXERCISE_INFO[type]?.label || type}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Team Sports Category */}
            <Collapsible open={expandedCategories.team_sports} onOpenChange={() => toggleCategory('team_sports')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium text-sm">⚽ Team Sports</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategories.team_sports ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['volleyball', 'basketball', 'soccer'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedBaseType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedBaseType(type);
                        setSelectedCustomExercise(null);
                      }}
                      className="text-xs px-1.5 h-10"
                    >
                      {EXERCISE_INFO[type]?.label || type}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Custom Exercises Category */}
            {!loadingCustomExercises && customExercises.length > 0 && (
              <Collapsible open={expandedCategories.custom} onOpenChange={() => toggleCategory('custom')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-sm">⭐ Custom</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategories.custom ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {customExercises.map((exercise) => (
                      <Button
                        key={exercise.id}
                        type="button"
                        variant={
                          selectedBaseType === 'custom' && selectedCustomExercise?.id === exercise.id
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedBaseType('custom');
                          setSelectedCustomExercise(exercise);
                        }}
                        className="truncate text-xs px-1.5 h-10"
                      >
                        {exercise.name}
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Manual Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="number"
                step={['running', 'swimming', 'sprinting', 'walking'].includes(selectedBaseType) ? '0.1' : '1'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${getUnitLabel()}`}
                className="flex-1"
              />
              <Button type="submit" disabled={logging || !amount}>
                {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log'}
              </Button>
            </form>
            {selectedBaseType === 'custom' && (
              <p className="text-xs text-muted-foreground mt-2">
                Custom exercises don&apos;t earn XP (tracking only)
              </p>
            )}
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
                    onMouseDown={() => handleDeleteLongPressStart(workout.id)}
                    onMouseUp={handleDeleteLongPressEnd}
                    onMouseLeave={handleDeleteLongPressEnd}
                    onTouchStart={() => handleDeleteLongPressStart(workout.id)}
                    onTouchEnd={handleDeleteLongPressEnd}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {workout.type === 'custom' ? workout.customExerciseName || 'Custom' : EXERCISE_INFO[workout.type]?.label || workout.type}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workout.amount} {workout.type === 'custom' ? (workout.customExerciseUnit || 'reps') : EXERCISE_INFO[workout.type]?.unit || 'reps'}
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
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sets x Reps Modal */}
      {setsRepsModal?.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSetsRepsModal(null)}
        >
          <div
            className="bg-background border rounded-lg p-6 mx-4 max-w-sm w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Log Sets</h3>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-center">
                <Label className="text-xs text-muted-foreground">Sets</Label>
                <Input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="w-20 text-center text-xl font-bold"
                  min="1"
                />
              </div>
              <span className="text-2xl font-bold text-muted-foreground mt-5">×</span>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground">{getUnitLabel()}</Label>
                <Input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-20 text-center text-xl font-bold"
                  min="1"
                />
              </div>
              <span className="text-2xl font-bold text-muted-foreground mt-5">=</span>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground">Total</Label>
                <div className="w-20 h-10 flex items-center justify-center text-xl font-bold text-primary">
                  {(parseInt(sets) || 0) * (parseFloat(reps) || 0)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSetsRepsModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleLogSetsReps}
                disabled={logging}
              >
                {logging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Log {(parseInt(sets) || 0) * (parseFloat(reps) || 0)} {getUnitLabel()}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* XP Info Modal */}
      {showXpInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowXpInfo(false)}
        >
          <div
            className="bg-background border rounded-lg p-5 max-w-md w-full shadow-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">How XP Works</h3>
              <button
                type="button"
                onClick={() => setShowXpInfo(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                XP is calculated based on <strong>biomechanical difficulty</strong> — how hard each exercise is on your body.
              </p>

              <div>
                <h4 className="font-medium mb-2">Calisthenics (per rep)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Knee Push-ups</span><span className="text-primary">2 XP</span></div>
                  <div className="flex justify-between"><span>Push-ups</span><span className="text-primary">3 XP</span></div>
                  <div className="flex justify-between"><span>Diamond Push-ups</span><span className="text-primary">4 XP</span></div>
                  <div className="flex justify-between"><span>Archer Push-ups</span><span className="text-primary">5 XP</span></div>
                  <div className="flex justify-between"><span>Pull-ups</span><span className="text-primary">6 XP</span></div>
                  <div className="flex justify-between"><span>Dips</span><span className="text-primary">6 XP</span></div>
                  <div className="flex justify-between"><span>Ring Dips</span><span className="text-primary">7 XP</span></div>
                  <div className="flex justify-between"><span>L-sit Pull-ups</span><span className="text-primary">8 XP</span></div>
                  <div className="flex justify-between"><span>Muscle-ups</span><span className="text-primary">11 XP</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Cardio (per km)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Walking</span><span className="text-primary">18 XP</span></div>
                  <div className="flex justify-between"><span>Running</span><span className="text-primary">30 XP</span></div>
                  <div className="flex justify-between"><span>Swimming</span><span className="text-primary">40 XP</span></div>
                  <div className="flex justify-between"><span>Sprinting</span><span className="text-primary">50 XP</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Team Sports (per minute)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Volleyball</span><span className="text-primary">2 XP</span></div>
                  <div className="flex justify-between"><span>Basketball</span><span className="text-primary">2 XP</span></div>
                  <div className="flex justify-between"><span>Soccer</span><span className="text-primary">2 XP</span></div>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              onClick={() => setShowXpInfo(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
