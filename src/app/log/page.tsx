'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCelebration } from '@/lib/celebration-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Undo2, X, ArrowUp, Circle, Minus, Trash2, Pencil } from 'lucide-react';
import { EXERCISE_INFO, XP_RATES, CALISTHENICS_PRESETS, HANG_PRESETS, CALISTHENICS_BASE_TYPES, formatSecondsAsMinutes } from '@shared/constants';
import { EXERCISE_TYPES } from '@shared/schema';
import { invalidateWorkoutCaches } from '@/lib/client-cache';
import { queueWorkout } from '@/lib/offline-queue';

type ExerciseType = typeof EXERCISE_TYPES[number];
type BaseExerciseType = keyof typeof CALISTHENICS_BASE_TYPES;

interface LastWorkout {
  id: string;
  type: string;
  amount: number;
  xpEarned: number;
}

interface RecentWorkout {
  id: string;
  type: string;
  amount: number;
  xpEarned: number;
  timestamp: number;
}

// Storage keys
const STORAGE_KEYS = {
  lastExercise: 'zenyfit_lastExercise',
  lastVariation: 'zenyfit_lastVariation',
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

  // Session total per exercise type (persisted to sessionStorage)
  const [sessionTotal, setSessionTotal] = useState(0);

  // Debounce ref for quick add buttons
  const lastQuickAddRef = useRef<number>(0);
  const DEBOUNCE_MS = 300;

  // Helper to get session storage key for exercise type
  const getSessionStorageKey = (exerciseType: string) => `${STORAGE_KEYS.sessionTotal}_${exerciseType}`;

  // Manual entry
  const [customAmount, setCustomAmount] = useState('');
  const [logging, setLogging] = useState(false);

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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current selection is calisthenics
  const isCalisthenics = selectedBaseType in CALISTHENICS_BASE_TYPES;
  const isHangType = selectedBaseType === 'hangs';

  // Get the actual exercise type to log
  const getActiveExercise = (): ExerciseType => {
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

  // Load cached data on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    // Load session total for current exercise
    const key = getSessionStorageKey(selectedBaseType);
    const saved = sessionStorage.getItem(key);
    if (saved) {
      setSessionTotal(parseInt(saved, 10));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save selections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.lastExercise, selectedBaseType);
    localStorage.setItem(STORAGE_KEYS.lastVariation, selectedVariation);
  }, [selectedBaseType, selectedVariation]);

  // When base type changes, update variation to match and restore session total
  useEffect(() => {
    if (isCalisthenics) {
      const baseConfig = CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType];
      if (baseConfig && !(baseConfig.variations as readonly string[]).includes(selectedVariation)) {
        setSelectedVariation(baseConfig.variations[0] as ExerciseType);
      }
    }
    // Restore session total for this exercise type from sessionStorage
    const key = getSessionStorageKey(selectedBaseType);
    const saved = sessionStorage.getItem(key);
    setSessionTotal(saved ? parseInt(saved, 10) : 0);
  }, [selectedBaseType, isCalisthenics, selectedVariation]);

  // Persist session total to sessionStorage when it changes
  useEffect(() => {
    const key = getSessionStorageKey(selectedBaseType);
    sessionStorage.setItem(key, sessionTotal.toString());
  }, [sessionTotal, selectedBaseType]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Fetch recent workouts (cache-first) with 10s timeout for background updates
  const fetchRecentWorkouts = useCallback(async (skipCache = false) => {
    // Try cache first
    if (!skipCache) {
      const cached = getCached<RecentWorkout[]>(STORAGE_KEYS.recentWorkouts);
      if (cached) {
        setRecentWorkouts(cached);
        setLoadingRecent(false);
        setUpdatingRecent(true);
        // Set timeout to clear updating state if fetch hangs
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => setUpdatingRecent(false), 10000);
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
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
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

      // Remove from list and update session total
      setRecentWorkouts(prev => prev.filter(w => w.id !== workoutToDelete.id));
      setSessionTotal(prev => Math.max(0, prev - workoutToDelete.amount));
      invalidateWorkoutCaches();
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
    return EXERCISE_INFO[activeExercise]?.unit || 'reps';
  };

  // Log workout function - supports multiple sets
  const logWorkout = async (logAmount: number, logSets: number = 1) => {
    if (logAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const activeExercise = getActiveExercise();

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
      const exerciseName = EXERCISE_INFO[activeExercise]?.label || activeExercise;
      showWorkoutComplete(data.xpEarned, exerciseName, totalAmount);

      // Set last workout for undo (only the last log)
      setLastWorkout({
        id: data.log.id,
        type: activeExercise,
        amount: logAmount,
        xpEarned: data.xpPerSet || data.xpEarned,
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

      // Invalidate dashboard caches so next visit fetches fresh data
      invalidateWorkoutCaches();

      // Refresh recent workouts
      fetchRecentWorkouts();
    } catch (error) {
      // Detect network errors — queue for offline sync
      if (!navigator.onLine || (error instanceof TypeError && error.message.includes('fetch'))) {
        try {
          await queueWorkout({ type: activeExercise, amount: logAmount, sets: logSets });
          const totalAmount = logAmount * logSets;
          setSessionTotal(prev => prev + totalAmount);
          setCustomAmount('');
          toast.info('Saved offline — will sync when connected');
        } catch (queueError) {
          console.error('Failed to queue offline workout:', queueError);
          toast.error('Failed to save workout');
        }
      } else {
        console.error('Error logging workout:', error);
        toast.error('An error occurred');
      }
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

  // Quick add with debouncing to prevent duplicate API calls
  const handleQuickAdd = (preset: number) => {
    const now = Date.now();
    if (now - lastQuickAddRef.current < DEBOUNCE_MS) {
      return; // Ignore rapid clicks
    }
    lastQuickAddRef.current = now;
    logWorkout(preset);
  };

  // Long press handlers for sets x reps
  const handleLongPressStart = (preset: number) => {
    longPressTimerRef.current = setTimeout(() => {
      setReps(preset.toString());
      setSetsRepsModal({ preset, open: true });
    }, 800);
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
      invalidateWorkoutCaches();
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

  const activeExercise = getActiveExercise();
  const activeXpRate = useMemo(() => XP_RATES[activeExercise] || 0, [activeExercise]);
  const exerciseLabel = useMemo(() => EXERCISE_INFO[activeExercise]?.label || activeExercise, [activeExercise]);

  // Don't block render for auth loading
  if (!loading && !user) {
    return null;
  }

  // Show minimal loading while user is being fetched
  if (!user) {
    return null;
  }

  // Main exercise types for quick selection (icon only)
  const mainExercises = [
    { key: 'pullups', icon: <ArrowUp className="h-5 w-5" /> },
    { key: 'pushups', icon: <Minus className="h-5 w-5" /> },
    { key: 'dips', icon: <Circle className="h-5 w-5" /> },
    { key: 'hangs', icon: <span className="text-lg">✊</span> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3">
        {/* Exercise Type Selector */}
        <div className="flex gap-2">
          {mainExercises.map((ex) => (
            <button
              key={ex.key}
              onClick={() => setSelectedBaseType(ex.key)}
              className={`h-12 flex-1 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.97] ${
                selectedBaseType === ex.key
                  ? 'gradient-bg text-white glow-sm'
                  : 'bg-surface border border-border text-foreground/60'
              }`}
            >
              {ex.icon}
            </button>
          ))}
          <button
            onClick={() => setSelectedBaseType('running')}
            className={`h-12 flex-1 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.97] ${
              selectedBaseType === 'running'
                ? 'gradient-bg text-white glow-sm'
                : 'bg-surface border border-border text-foreground/60'
            }`}
          >
            <span className="text-lg">🏃</span>
          </button>
        </div>

        {/* Main Logging Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Card Header */}
            <div className="px-4 py-2 border-b border-border/30">
              <div className="flex items-center justify-between gap-2">
                {/* Exercise name with variant dropdown */}
                {isCalisthenics && CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.variations.length > 1 ? (
                  <select
                    value={selectedVariation}
                    onChange={(e) => setSelectedVariation(e.target.value as ExerciseType)}
                    className="flex-1 font-semibold bg-surface border border-border rounded-lg px-2 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer text-foreground appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] transition-all duration-200"
                  >
                    {CALISTHENICS_BASE_TYPES[selectedBaseType as BaseExerciseType]?.variations.map((variation) => (
                      <option key={variation} value={variation}>
                        {EXERCISE_INFO[variation]?.label || variation}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex-1 font-semibold">{exerciseLabel}</div>
                )}
                {lastWorkout && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={undoing}
                    className="text-foreground/40 h-8 w-8 shrink-0"
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
            <div className="py-6 text-center">
              <div className="text-5xl font-bold tracking-tight gradient-text">
                {sessionTotal}
              </div>
              <div className="text-sm text-foreground/50 mt-1">
                {getUnitLabel()}
                {isHangType && sessionTotal >= 60 && (
                  <span className="text-foreground/30 ml-1">({formatSecondsAsMinutes(sessionTotal)})</span>
                )}
                {activeXpRate > 0 && (
                  <span className="text-primary ml-2 font-medium">
                    +{Math.round(sessionTotal * activeXpRate)} XP
                  </span>
                )}
              </div>
              {sessionTotal > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionTotal(0);
                    toast.success('Session cleared');
                  }}
                  className="mt-1 text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                  Clear session
                </button>
              )}
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
                  className="flex-1 h-12 text-lg"
                />
                <Button
                  onClick={handleCustomSubmit}
                  disabled={logging || !customAmount}
                  className="h-12 px-5"
                >
                  {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log'}
                </Button>
              </div>
            </div>

            {/* Quick Add Section */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-center mb-2">
                <span className="text-xs font-medium text-foreground/40">Quick Add</span>
              </div>

              {/* Calisthenics 3-row layout */}
              {isCalisthenics ? (
                <div className="space-y-2.5">
                  {(() => {
                    const presets = isHangType ? HANG_PRESETS : CALISTHENICS_PRESETS;
                    return (
                      <>
                        {/* Row 1 */}
                        <div className="grid grid-cols-4 gap-2.5">
                          {presets.row1.map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              variant="secondary"
                              className="h-12 text-base font-semibold rounded-xl"
                              onClick={() => handleQuickAdd(preset)}
                              onMouseDown={() => handleLongPressStart(preset)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(preset)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchMove={handleLongPressEnd}
                              disabled={logging}
                            >
                              +{preset}{isHangType ? 's' : ''}
                            </Button>
                          ))}
                        </div>
                        {/* Row 2 */}
                        <div className="grid grid-cols-4 gap-2.5">
                          {presets.row2.map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              variant="secondary"
                              className="h-12 text-base font-semibold rounded-xl"
                              onClick={() => handleQuickAdd(preset)}
                              onMouseDown={() => handleLongPressStart(preset)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(preset)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchMove={handleLongPressEnd}
                              disabled={logging}
                            >
                              +{preset}{isHangType ? 's' : ''}
                            </Button>
                          ))}
                        </div>
                        {/* Row 3 */}
                        <div className="grid grid-cols-4 gap-2.5">
                          {presets.row3.map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              variant="secondary"
                              className="h-12 text-base font-semibold rounded-xl"
                              onClick={() => handleQuickAdd(preset)}
                              onMouseDown={() => handleLongPressStart(preset)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(preset)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchMove={handleLongPressEnd}
                              disabled={logging}
                            >
                              +{preset}{isHangType ? 's' : ''}
                            </Button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
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
                      variant="secondary"
                      className="h-12 text-base font-semibold rounded-xl"
                      onClick={() => handleQuickAdd(preset)}
                      disabled={logging}
                    >
                      +{preset}
                    </Button>
                  ))}
                </div>
              )}

              <p className="text-xs text-foreground/30 mt-2 text-center">
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
                  <Loader2 className="h-3 w-3 animate-spin text-foreground/40" />
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
                <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
              </div>
            ) : recentWorkouts.length === 0 ? (
              <p className="text-sm text-foreground/40 text-center py-6">
                No recent workouts
              </p>
            ) : (
              <div className="space-y-2">
                {deleteMode && (
                  <p className="text-xs text-foreground/40 mb-2">
                    Tap a workout to delete it
                  </p>
                )}
                {recentWorkouts.map((workout) => {
                  const exerciseLabel = EXERCISE_INFO[workout.type]?.label || workout.type;
                  const unit = EXERCISE_INFO[workout.type]?.unit || 'reps';
                  const timeAgo = getTimeAgo(workout.timestamp);

                  return (
                    <div
                      key={workout.id}
                      onClick={deleteMode ? () => setWorkoutToDelete(workout) : undefined}
                      className={`flex items-center justify-between rounded-xl bg-surface border border-border p-3 transition-all duration-200 ${
                        deleteMode ? 'cursor-pointer hover:border-destructive active:scale-[0.98]' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{exerciseLabel}</div>
                        <div className="text-xs text-foreground/40">
                          {workout.amount} {unit} • +{workout.xpEarned} XP • {timeAgo}
                        </div>
                      </div>
                      {deleteMode && (
                        <Trash2 className="h-4 w-4 text-foreground/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sets Modal */}
      {setsRepsModal?.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSetsRepsModal(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Log Sets</h3>
            <p className="text-sm text-foreground/50 mb-5">
              {reps} {getUnitLabel()} per set
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl text-lg"
                onClick={() => setSets(String(Math.max(1, (parseInt(sets) || 1) - 1)))}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <div className="text-4xl font-bold w-16 text-center gradient-text">
                {parseInt(sets) || 1}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl text-lg"
                onClick={() => setSets(String((parseInt(sets) || 1) + 1))}
              >
                <Plus className="h-5 w-5" />
              </Button>
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
                Log {parseInt(sets) || 1} × {reps} {getUnitLabel()}
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
            className="bg-surface border border-border rounded-2xl p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Delete Workout?</h3>
            <p className="text-sm text-foreground/50 mb-4">
              Are you sure you want to delete this workout?
            </p>

            <div className="rounded-xl bg-surface/50 border border-border/50 p-3 mb-4">
              <div className="font-medium">
                {EXERCISE_INFO[workoutToDelete.type]?.label || workoutToDelete.type}
              </div>
              <div className="text-sm text-foreground/50">
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
