'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCelebration } from '@/lib/celebration-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Undo2, X, ArrowUp, Circle, Minus, Trash2, Pencil } from 'lucide-react';
import { EXERCISE_INFO, XP_RATES, CALISTHENICS_PRESETS, CALISTHENICS_BASE_TYPES } from '@shared/constants';
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

interface RecentWorkout {
  id: string;
  type: string;
  amount: number;
  xpEarned: number;
  timestamp: number;
  customExerciseName?: string;
}

// Storage keys
const STORAGE_KEYS = {
  lastExercise: 'zenyfit_lastExercise',
  lastVariation: 'zenyfit_lastVariation',
  lastCustomExerciseId: 'zenyfit_lastCustomExerciseId',
  customExercises: 'zenyfit_customExercises',
  recentWorkouts: 'zenyfit_recentWorkouts',
  sessionTotal: 'zenyfit_sessionTotal',
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

// Time ago helper
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const remainingMinutes = minutes % 60;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) {
    if (remainingMinutes === 0) return `${hours}h ago`;
    return `${hours}h ${remainingMinutes}m ago`;
  }
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Exercise icons
const EXERCISE_ICONS: Record<string, React.ReactNode> = {
  pullups: <ArrowUp className="h-5 w-5" />,
  pushups: <Minus className="h-5 w-5 rotate-90" />,
  dips: <Circle className="h-5 w-5" />,
  muscleups: <ArrowUp className="h-5 w-5" />,
  running: <span className="text-lg">🏃</span>,
};

export default function LogPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const { showWorkoutComplete } = useCelebration();

  // Base exercise type
  const [selectedBaseType, setSelectedBaseType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.lastExercise) || 'pullups';
    }
    return 'pullups';
  });

  // Specific variation for calisthenics
  const [selectedVariation, setSelectedVariation] = useState<ExerciseType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.lastVariation);
      if (saved && EXERCISE_TYPES.includes(saved as ExerciseType)) {
        return saved as ExerciseType;
      }
    }
    return 'pullups';
  });

  const [selectedCustomExercise, setSelectedCustomExercise] = useState<CustomExercise | null>(null);

  // Session total (resets on page reload or after inactivity)
  const [sessionTotal, setSessionTotal] = useState(0);

  // Manual entry
  const [customAmount, setCustomAmount] = useState('');
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

  // Recent workouts (with cache)
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>(() => {
    if (typeof window !== 'undefined') {
      return getCached<RecentWorkout[]>(STORAGE_KEYS.recentWorkouts) || [];
    }
    return [];
  });
  const [loadingRecent, setLoadingRecent] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCached<RecentWorkout[]>(STORAGE_KEYS.recentWorkouts);
    }
    return true;
  });
  const [updatingRecent, setUpdatingRecent] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<RecentWorkout | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (setsRepsModal?.open || workoutToDelete) {
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
  }, [setsRepsModal, workoutToDelete]);

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
    // Reset session total when changing exercise type
    setSessionTotal(0);
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

  // Fetch recent workouts (cache-first)
  const fetchRecentWorkouts = useCallback(async (skipCache = false) => {
    // Try cache first
    if (!skipCache) {
      const cached = getCached<RecentWorkout[]>(STORAGE_KEYS.recentWorkouts);
      if (cached) {
        setRecentWorkouts(cached);
        setLoadingRecent(false);
        setUpdatingRecent(true);
        fetchRecentWorkouts(true);
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/workouts?limit=7', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const workouts = data.logs || [];
        setRecentWorkouts(workouts);
        setCache(STORAGE_KEYS.recentWorkouts, workouts);
      }
    } catch (error) {
      console.error('Error fetching recent workouts:', error);
    } finally {
      setLoadingRecent(false);
      setUpdatingRecent(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchRecentWorkouts();
    }
  }, [user, firebaseUser, fetchRecentWorkouts]);

  // Delete a workout (called after confirmation)
  const handleConfirmDelete = async () => {
    if (!workoutToDelete || deletingId) return;

    setDeletingId(workoutToDelete.id);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`/api/workouts/${workoutToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete');
        return;
      }

      // Remove from list
      setRecentWorkouts(prev => prev.filter(w => w.id !== workoutToDelete.id));
      toast.success(`Deleted (-${data.xpDeducted} XP)`);
      setWorkoutToDelete(null);
      setDeleteMode(false);
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  // Get unit label
  const getUnitLabel = () => {
    const activeExercise = getActiveExercise();
    if (activeExercise === 'custom' && selectedCustomExercise) {
      return selectedCustomExercise.unit;
    }
    return EXERCISE_INFO[activeExercise]?.unit || 'reps';
  };

  // Log workout function - supports multiple sets
  const logWorkout = async (logAmount: number, logSets: number = 1) => {
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
        sets: logSets,
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

      // Update session total with total amount (sets * amount)
      const totalAmount = data.totalAmount || logAmount;
      setSessionTotal(prev => prev + totalAmount);

      // Show celebration with total XP and sets info
      const exerciseName = activeExercise === 'custom' && selectedCustomExercise
        ? selectedCustomExercise.name
        : EXERCISE_INFO[activeExercise]?.label || activeExercise;
      showWorkoutComplete(data.xpEarned, exerciseName, totalAmount);

      // Set last workout for undo (only the last log)
      setLastWorkout({
        id: data.log.id,
        type: activeExercise,
        amount: logAmount,
        xpEarned: data.xpPerSet || data.xpEarned,
        customExerciseName: selectedCustomExercise?.name,
      });

      // Clear previous timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // Auto-dismiss undo after 10 seconds
      undoTimeoutRef.current = setTimeout(() => {
        setLastWorkout(null);
      }, 10000);

      setCustomAmount('');

      // Refresh recent workouts
      fetchRecentWorkouts();
    } catch (error) {
      console.error('Error logging workout:', error);
      toast.error('An error occurred');
    } finally {
      setLogging(false);
    }
  };

  // Handle custom amount submit
  const handleCustomSubmit = () => {
    const amountNum = parseFloat(customAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    logWorkout(amountNum);
  };

  // Quick add
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

  // Log sets x reps - creates individual logs for each set
  const handleLogSetsReps = () => {
    const setsNum = parseInt(sets);
    const repsNum = parseFloat(reps);
    if (isNaN(setsNum) || setsNum <= 0 || isNaN(repsNum) || repsNum <= 0) {
      toast.error('Please enter valid numbers');
      return;
    }
    logWorkout(repsNum, setsNum);
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

      // Update session total
      setSessionTotal(prev => Math.max(0, prev - lastWorkout.amount));

      toast.success(`Undone (-${data.xpDeducted} XP)`);
      setLastWorkout(null);
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

  // Don't block render for auth loading
  if (!loading && !user) {
    return null;
  }

  // Show minimal loading while user is being fetched
  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const activeExercise = getActiveExercise();
  const activeXpRate = XP_RATES[activeExercise] || 0;
  const exerciseLabel = EXERCISE_INFO[activeExercise]?.label || activeExercise;

  // Main exercise types for quick selection (icon only)
  const mainExercises = [
    { key: 'pullups', icon: <ArrowUp className="h-5 w-5" /> },
    { key: 'pushups', icon: <Minus className="h-5 w-5" /> },
    { key: 'dips', icon: <Circle className="h-5 w-5" /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3">
        {/* Exercise Type Selector */}
        <div className="space-y-2">
          {/* Main calisthenics + running (icon only, full width) */}
          <div className="flex gap-2">
            {mainExercises.map((ex) => (
              <Button
                key={ex.key}
                variant={selectedBaseType === ex.key ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedBaseType(ex.key);
                  setSelectedCustomExercise(null);
                }}
                className="h-12 flex-1"
              >
                {ex.icon}
              </Button>
            ))}
            <Button
              variant={selectedBaseType === 'running' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedBaseType('running');
                setSelectedCustomExercise(null);
              }}
              className="h-12 flex-1"
            >
              <span className="text-lg">🏃</span>
            </Button>
          </div>
        </div>

        {/* Main Logging Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Card Header */}
            <div className="px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    {EXERCISE_ICONS[selectedBaseType] || <ArrowUp className="h-4 w-4" />}
                  </div>
                  {/* Exercise name with variant dropdown */}
                  {isCalisthenics && CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.variations.length > 1 ? (
                    <select
                      value={selectedVariation}
                      onChange={(e) => setSelectedVariation(e.target.value as ExerciseType)}
                      className="font-semibold bg-muted/50 hover:bg-muted border border-border rounded-md px-2 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer text-foreground appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center]"
                    >
                      {CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.variations.map((variation) => (
                        <option key={variation} value={variation}>
                          {EXERCISE_INFO[variation]?.label || variation}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="font-semibold">{exerciseLabel}</div>
                  )}
                </div>
                {lastWorkout && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={undoing}
                    className="text-muted-foreground h-8 w-8"
                  >
                    {undoing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Undo2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Session Total Display */}
            <div className="py-4 text-center">
              <div className="text-5xl font-bold tracking-tight">
                {sessionTotal}
              </div>
              <div className="text-base text-muted-foreground">
                {getUnitLabel()}
                {activeXpRate > 0 && (
                  <span className="text-primary ml-2">
                    +{Math.round(sessionTotal * activeXpRate)} XP
                  </span>
                )}
              </div>
            </div>

            {/* Custom Input */}
            <div className="px-4 pb-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step={['running', 'swimming', 'sprinting', 'walking'].includes(selectedBaseType) ? '0.1' : '1'}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Custom"
                  className="flex-1 h-10 text-base"
                />
                <Button
                  onClick={handleCustomSubmit}
                  disabled={logging || !customAmount}
                  size="icon"
                  className="h-10 w-10"
                >
                  {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Quick Add Section */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Quick Add</span>
              </div>

              {/* Calisthenics 3-row layout */}
              {isCalisthenics ? (
                <div className="space-y-2.5">
                  {/* Row 1: 1, 3, 5, 7 */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {CALISTHENICS_PRESETS.row1.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        className="h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-2xl"
                        onClick={() => handleQuickAdd(preset)}
                        onMouseDown={() => handleLongPressStart(preset)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(preset)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={logging}
                      >
                        +{preset}
                      </Button>
                    ))}
                  </div>
                  {/* Row 2: 10, 15, 20, 25 */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {CALISTHENICS_PRESETS.row2.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        className="h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-2xl"
                        onClick={() => handleQuickAdd(preset)}
                        onMouseDown={() => handleLongPressStart(preset)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(preset)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={logging}
                      >
                        +{preset}
                      </Button>
                    ))}
                  </div>
                  {/* Row 3: 30, 50, 70, 100 */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {CALISTHENICS_PRESETS.row3.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        className="h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-2xl"
                        onClick={() => handleQuickAdd(preset)}
                        onMouseDown={() => handleLongPressStart(preset)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(preset)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={logging}
                      >
                        +{preset}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Non-calisthenics: cardio/team sports presets */
                <div className="grid grid-cols-4 gap-2.5">
                  {(selectedBaseType === 'running' ? [1, 3, 5, 10] :
                    selectedBaseType === 'walking' ? [1, 2, 3, 5] :
                    selectedBaseType === 'swimming' ? [0.5, 1, 2, 3] :
                    selectedBaseType === 'sprinting' ? [0.1, 0.2, 0.4, 0.5] :
                    [30, 45, 60, 90]).map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      className="h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-2xl"
                      onClick={() => handleQuickAdd(preset)}
                      disabled={logging}
                    >
                      +{preset}
                    </Button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Tap to log • Long press for sets
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Recent Logs</h3>
                {updatingRecent && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              {recentWorkouts.length > 0 && (
                <Button
                  variant={deleteMode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeleteMode(!deleteMode)}
                  className="h-8 px-2"
                >
                  {deleteMode ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Done
                    </>
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {loadingRecent ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No recent workouts
              </p>
            ) : (
              <div className="space-y-2">
                {deleteMode && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Tap a workout to delete it
                  </p>
                )}
                {recentWorkouts.map((workout) => {
                  const exerciseLabel = workout.customExerciseName || EXERCISE_INFO[workout.type]?.label || workout.type;
                  const unit = EXERCISE_INFO[workout.type]?.unit || 'reps';
                  const timeAgo = getTimeAgo(workout.timestamp);

                  return (
                    <div
                      key={workout.id}
                      onClick={deleteMode ? () => setWorkoutToDelete(workout) : undefined}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        deleteMode ? 'cursor-pointer hover:border-destructive hover:bg-destructive/5' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{exerciseLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {workout.amount} {unit} • +{workout.xpEarned} XP • {timeAgo}
                        </div>
                      </div>
                      {deleteMode && (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

      {/* Delete Confirmation Modal */}
      {workoutToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setWorkoutToDelete(null)}
        >
          <div
            className="bg-background border rounded-lg p-5 max-w-sm w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Delete Workout?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this workout?
            </p>

            <div className="rounded-lg border p-3 mb-4 bg-muted/30">
              <div className="font-medium">
                {workoutToDelete.customExerciseName || EXERCISE_INFO[workoutToDelete.type]?.label || workoutToDelete.type}
              </div>
              <div className="text-sm text-muted-foreground">
                {workoutToDelete.amount} {EXERCISE_INFO[workoutToDelete.type]?.unit || 'reps'} • +{workoutToDelete.xpEarned} XP
              </div>
            </div>

            <p className="text-xs text-destructive mb-4">
              This will deduct {workoutToDelete.xpEarned} XP from your total.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setWorkoutToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmDelete}
                disabled={deletingId === workoutToDelete.id}
              >
                {deletingId === workoutToDelete.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
