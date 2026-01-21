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
import { Loader2, Plus, Pencil, Check, Undo2, GripVertical, X, RotateCcw, Info, ChevronDown } from 'lucide-react';
import { DEFAULT_QUICK_ADD_PRESETS, EXERCISE_INFO, XP_RATES } from '@shared/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { EXERCISE_TYPES } from '@shared/schema';

type ExerciseType = typeof EXERCISE_TYPES[number];

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

export default function LogPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const { showWorkoutComplete } = useCelebration();

  // Exercise selection (restore from localStorage)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastExercise');
      if (saved && EXERCISE_TYPES.includes(saved as ExerciseType)) {
        return saved as ExerciseType;
      }
    }
    return 'pushups';
  });

  // Expanded category state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    calisthenics: true,
    cardio: false,
    team_sports: false,
    custom: false,
  });
  const [selectedCustomExercise, setSelectedCustomExercise] = useState<CustomExercise | null>(null);
  const [lastCustomExerciseId, setLastCustomExerciseId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastCustomExerciseId');
    }
    return null;
  });

  // Manual entry
  const [amount, setAmount] = useState('');
  const [logging, setLogging] = useState(false);

  // Custom exercises
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [loadingCustomExercises, setLoadingCustomExercises] = useState(true);

  // Undo functionality
  const [lastWorkout, setLastWorkout] = useState<LastWorkout | null>(null);
  const [undoing, setUndoing] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit mode for presets
  const [editMode, setEditMode] = useState(false);
  const [newPresetValue, setNewPresetValue] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);

  // Sets x Reps modal (long press)
  const [setsRepsModal, setSetsRepsModal] = useState<{ preset: number; open: boolean } | null>(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('');

  // XP Info modal
  const [showXpInfo, setShowXpInfo] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // User presets from Firestore
  const [userPresets, setUserPresets] = useState<Record<string, number[]> | null>(null);
  const [savingPresets, setSavingPresets] = useState(false);

  // Touch drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggedValue, setDraggedValue] = useState<number | null>(null);
  const presetRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Recent Activity state
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
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [deleteLongPressTimer, setDeleteLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Save selected exercise to localStorage
  useEffect(() => {
    localStorage.setItem('lastExercise', selectedExercise);
    if (selectedExercise === 'custom' && selectedCustomExercise) {
      localStorage.setItem('lastCustomExerciseId', selectedCustomExercise.id);
    }
  }, [selectedExercise, selectedCustomExercise]);

  // Restore custom exercise selection after loading
  useEffect(() => {
    if (!loadingCustomExercises && customExercises.length > 0 && selectedExercise === 'custom' && lastCustomExerciseId) {
      const found = customExercises.find(e => e.id === lastCustomExerciseId);
      if (found) {
        setSelectedCustomExercise(found);
      } else {
        // Custom exercise no longer exists, fall back to pullups
        setSelectedExercise('pullups');
      }
      setLastCustomExerciseId(null);
    }
  }, [loadingCustomExercises, customExercises, selectedExercise, lastCustomExerciseId]);

  // Load user presets from user object
  useEffect(() => {
    if (user) {
      const presets = (user as { quickAddPresets?: Record<string, number[]> }).quickAddPresets;
      setUserPresets(presets || null);
    }
  }, [user]);

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCustomExercises(data.exercises || []);
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

  // Get presets for current exercise
  const getPresets = useCallback(() => {
    const exerciseKey = selectedExercise === 'custom' && selectedCustomExercise
      ? selectedCustomExercise.id
      : selectedExercise;

    // Check user presets first
    if (userPresets && userPresets[exerciseKey]) {
      return userPresets[exerciseKey];
    }

    // For custom exercises, use their quickActions
    if (selectedExercise === 'custom' && selectedCustomExercise) {
      return selectedCustomExercise.quickActions.length > 0
        ? selectedCustomExercise.quickActions
        : [5, 10, 15, 20];
    }

    // Fall back to defaults
    return DEFAULT_QUICK_ADD_PRESETS[selectedExercise] || [5, 10, 15, 20];
  }, [selectedExercise, selectedCustomExercise, userPresets]);

  // Get unit label
  const getUnitLabel = () => {
    if (selectedExercise === 'custom' && selectedCustomExercise) {
      return selectedCustomExercise.unit;
    }
    return EXERCISE_INFO[selectedExercise]?.unit || 'reps';
  };

  // Get exercise display name
  const getExerciseName = (type: ExerciseType) => {
    return EXERCISE_INFO[type]?.label || type;
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
        amount: logAmount,
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

      // Show celebration
      const exerciseName = selectedExercise === 'custom' && selectedCustomExercise
        ? selectedCustomExercise.name
        : selectedExercise;
      showWorkoutComplete(data.xpEarned, exerciseName, logAmount);

      // Set last workout for undo
      setLastWorkout({
        id: data.log.id,
        type: selectedExercise,
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

      // Reset manual entry
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
    if (editMode) return;
    logWorkout(preset);
  };

  // Long press handlers for sets x reps
  const handleLongPressStart = (preset: number) => {
    if (editMode) return;
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  // Save presets to user profile
  const savePresets = async (newPresets: Record<string, number[]>) => {
    setSavingPresets(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token || !user) return;

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quickAddPresets: newPresets }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to save presets');
        return;
      }

      setUserPresets(newPresets);
      toast.success('Presets saved');
    } catch (error) {
      console.error('Error saving presets:', error);
      toast.error('An error occurred');
    } finally {
      setSavingPresets(false);
    }
  };

  // Add a new preset
  const handleAddPreset = () => {
    const value = parseFloat(newPresetValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter a positive number');
      return;
    }

    const currentPresets = getPresets();
    if (currentPresets.includes(value)) {
      toast.error('Preset already exists');
      return;
    }
    if (currentPresets.length >= 8) {
      toast.error('Maximum 8 presets allowed');
      return;
    }

    const exerciseKey = selectedExercise === 'custom' && selectedCustomExercise
      ? selectedCustomExercise.id
      : selectedExercise;

    const newPresets = {
      ...userPresets,
      [exerciseKey]: [...currentPresets, value],
    };

    savePresets(newPresets);
    setNewPresetValue('');
    setShowAddPreset(false);
  };

  // Remove a preset
  const handleRemovePreset = (presetToRemove: number) => {
    const currentPresets = getPresets();
    if (currentPresets.length <= 1) {
      toast.error('Must have at least one preset');
      return;
    }

    const exerciseKey = selectedExercise === 'custom' && selectedCustomExercise
      ? selectedCustomExercise.id
      : selectedExercise;

    const newPresets = {
      ...userPresets,
      [exerciseKey]: currentPresets.filter(p => p !== presetToRemove),
    };

    savePresets(newPresets);
  };

  // Reset presets to defaults
  const handleResetToDefaults = () => {
    const exerciseKey = selectedExercise === 'custom' && selectedCustomExercise
      ? selectedCustomExercise.id
      : selectedExercise;

    // For custom exercises, remove user preset to fall back to quickActions
    if (selectedExercise === 'custom') {
      if (selectedCustomExercise) {
        const newPresets = { ...userPresets };
        delete newPresets[exerciseKey];
        savePresets(newPresets);
      }
      return;
    }

    // For standard exercises, remove user preset to fall back to defaults
    const newPresets = { ...userPresets };
    delete newPresets[exerciseKey];
    savePresets(newPresets);
  };

  // Touch drag handlers - insert between elements
  const handleTouchStart = (index: number, e: React.TouchEvent, value: number) => {
    if (!editMode) return;
    const touch = e.touches[0];
    setDraggedIndex(index);
    setDraggedValue(value);
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || !editMode) return;
    e.preventDefault();

    const touch = e.touches[0];
    setDragPosition({ x: touch.clientX, y: touch.clientY });

    const elements = presetRefs.current;
    let newInsertIndex: number | null = null;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        // Check if touch is within vertical bounds of this row
        if (touch.clientY >= rect.top - 20 && touch.clientY <= rect.bottom + 20) {
          // Determine insert position based on touch X relative to element center
          if (touch.clientX < centerX) {
            // Insert before this element
            newInsertIndex = i;
          } else {
            // Insert after this element
            newInsertIndex = i + 1;
          }
          break;
        }
      }
    }

    setDragOverIndex(newInsertIndex);
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      // Calculate actual insert position accounting for removed item
      let insertAt = dragOverIndex;
      if (draggedIndex < dragOverIndex) {
        insertAt -= 1;
      }

      if (insertAt !== draggedIndex) {
        const currentPresets = getPresets();
        const newOrder = [...currentPresets];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(insertAt, 0, removed);

        const exerciseKey = selectedExercise === 'custom' && selectedCustomExercise
          ? selectedCustomExercise.id
          : selectedExercise;

        const newPresets = {
          ...userPresets,
          [exerciseKey]: newOrder,
        };

        savePresets(newPresets);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
    setDraggedValue(null);
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

  const presets = getPresets();

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Undo Banner */}
        {lastWorkout && (
          <div className="bg-muted border rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="text-sm">
              <span className="font-medium">Logged: </span>
              {lastWorkout.amount} {lastWorkout.type === 'custom' ? lastWorkout.customExerciseName : lastWorkout.type}
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

        {/* Exercise Selector - Expandable Categories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-1.5">
                  Exercise
                  <button
                    type="button"
                    onClick={() => setShowXpInfo(true)}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </CardTitle>
                <CardDescription className="text-xs">
                  {getExerciseName(selectedExercise)} • {XP_RATES[selectedExercise] || 0} XP/{getUnitLabel()}
                </CardDescription>
              </div>
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
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Push-up variations */}
                  {(['pushups', 'knee_pushups', 'incline_pushups', 'decline_pushups', 'diamond_pushups', 'archer_pushups', 'onearm_pushups'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedExercise(type);
                        setSelectedCustomExercise(null);
                        setEditMode(false);
                        setExpandedCategories(prev => ({ ...prev, calisthenics: true }));
                      }}
                      className="text-xs px-1.5 h-8 truncate"
                    >
                      {EXERCISE_INFO[type]?.label.replace(' Push-ups', '').replace('Push-ups', 'Standard') || type}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {/* Pull-up variations */}
                  {(['pullups', 'assisted_pullups', 'chinups', 'wide_pullups', 'lsit_pullups', 'australian_pullups'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedExercise(type);
                        setSelectedCustomExercise(null);
                        setEditMode(false);
                      }}
                      className="text-xs px-1.5 h-8 truncate"
                    >
                      {EXERCISE_INFO[type]?.label.replace(' Pull-ups', '').replace('Pull-ups', 'Standard') || type}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {/* Dips and advanced */}
                  {(['dips', 'bench_dips', 'ring_dips', 'muscleups'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedExercise(type);
                        setSelectedCustomExercise(null);
                        setEditMode(false);
                      }}
                      className="text-xs px-1.5 h-8 truncate"
                    >
                      {EXERCISE_INFO[type]?.label.replace(' Dips', '').replace('Dips', 'Standard') || type}
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
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedExercise(type);
                        setSelectedCustomExercise(null);
                        setEditMode(false);
                        setExpandedCategories(prev => ({ ...prev, cardio: true }));
                      }}
                      className="text-xs px-1.5 h-8"
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
                      variant={selectedExercise === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedExercise(type);
                        setSelectedCustomExercise(null);
                        setEditMode(false);
                        setExpandedCategories(prev => ({ ...prev, team_sports: true }));
                      }}
                      className="text-xs px-1.5 h-8"
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
                          selectedExercise === 'custom' && selectedCustomExercise?.id === exercise.id
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedExercise('custom');
                          setSelectedCustomExercise(exercise);
                          setEditMode(false);
                        }}
                        className="truncate text-xs px-1.5 h-8"
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

        {/* Quick Add */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Quick Add</CardTitle>
              <div className="flex items-center gap-1">
                {editMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToDefaults}
                    disabled={savingPresets}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Defaults
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="h-7 text-xs"
                >
                  {editMode ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Done
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
            {!editMode ? (
              <p className="text-xs text-muted-foreground">
                Tap to log instantly. Long press for sets.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Drag to reorder. Tap X to remove.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div
              className="grid grid-cols-4 gap-2"
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {presets.map((preset, index) => {
                // Calculate if this element should shift for insertion
                const shouldShiftRight = draggedIndex !== null && dragOverIndex !== null && dragOverIndex <= index && draggedIndex !== index;
                const shouldShiftLeft = draggedIndex !== null && dragOverIndex !== null && dragOverIndex === presets.length && index === presets.length - 1 && draggedIndex !== index;

                return (
                <div
                  key={preset}
                  ref={(el) => { presetRefs.current[index] = el; }}
                  className={`relative transition-all duration-150 ${
                    draggedIndex === index ? 'opacity-0' : ''
                  }`}
                  style={{
                    transform: shouldShiftRight && dragOverIndex === index
                      ? 'translateX(8px)'
                      : shouldShiftLeft
                        ? 'translateX(-8px)'
                        : 'none',
                  }}
                >
                  {/* Insertion indicator - show line before this element when dragOverIndex matches */}
                  {draggedIndex !== null && dragOverIndex === index && draggedIndex !== index && (
                    <div className="absolute -left-2 top-1 bottom-1 w-1 bg-primary rounded-full z-10" />
                  )}
                  {/* Insertion indicator - show line after this element (only for last item when inserting at end) */}
                  {draggedIndex !== null && dragOverIndex === presets.length && index === presets.length - 1 && draggedIndex !== index && (
                    <div className="absolute -right-2 top-1 bottom-1 w-1 bg-primary rounded-full z-10" />
                  )}
                  <Button
                    type="button"
                    variant={draggedIndex === index ? 'default' : 'outline'}
                    className={`w-full h-12 text-lg font-semibold transition-all ${
                      editMode ? 'pl-7' : ''
                    } ${
                      editMode && draggedIndex === null ? 'border-dashed' : ''
                    }`}
                    onClick={() => !editMode && handleQuickAdd(preset)}
                    onMouseDown={() => !editMode && handleLongPressStart(preset)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={(e) => {
                      if (editMode) {
                        handleTouchStart(index, e, preset);
                      } else {
                        handleLongPressStart(preset);
                      }
                    }}
                    onTouchEnd={() => !editMode && handleLongPressEnd()}
                    disabled={logging || savingPresets}
                  >
                    {editMode && (
                      <GripVertical className={`h-4 w-4 absolute left-1.5 ${
                        draggedIndex === index ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`} />
                    )}
                    {preset}
                  </Button>
                  {editMode && draggedIndex === null && (
                    <button
                      type="button"
                      onClick={() => handleRemovePreset(preset)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
              })}

              {/* Add preset button in edit mode */}
              {editMode && presets.length < 8 && (
                showAddPreset ? (
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      value={newPresetValue}
                      onChange={(e) => setNewPresetValue(e.target.value)}
                      placeholder="Value"
                      className="h-12 text-center"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddPreset();
                        if (e.key === 'Escape') setShowAddPreset(false);
                      }}
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-dashed"
                    onClick={() => setShowAddPreset(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )
              )}
            </div>

            {showAddPreset && editMode && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleAddPreset} disabled={savingPresets}>
                  {savingPresets ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddPreset(false)}>
                  Cancel
                </Button>
              </div>
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
                step={selectedExercise === 'running' ? '0.1' : '1'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${getUnitLabel()}`}
                className="flex-1"
              />
              <Button type="submit" disabled={logging || !amount}>
                {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log'}
              </Button>
            </form>
            {selectedExercise === 'custom' && (
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
                  step={selectedExercise === 'running' ? '0.1' : '1'}
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

      {/* Floating drag indicator */}
      {dragPosition && draggedValue !== null && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-xl text-xl font-bold animate-pulse">
            {draggedValue}
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
                <p className="text-xs text-muted-foreground mb-2">
                  Based on body weight percentage lifted and muscle activation.
                </p>
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
                <p className="text-xs text-muted-foreground mb-2">
                  Based on MET values and energy expenditure.
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Walking</span><span className="text-primary">18 XP</span></div>
                  <div className="flex justify-between"><span>Running</span><span className="text-primary">30 XP</span></div>
                  <div className="flex justify-between"><span>Swimming</span><span className="text-primary">40 XP</span></div>
                  <div className="flex justify-between"><span>Sprinting</span><span className="text-primary">50 XP</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Team Sports (per minute)</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Based on average intensity during play.
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Volleyball</span><span className="text-primary">2 XP</span></div>
                  <div className="flex justify-between"><span>Basketball</span><span className="text-primary">2 XP</span></div>
                  <div className="flex justify-between"><span>Soccer</span><span className="text-primary">2 XP</span></div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Why this approach?</strong> The same relative effort (e.g., 100% of YOUR body weight for pull-ups) earns the same XP regardless of your actual weight. Volume naturally balances strength — stronger athletes do more reps.
                </p>
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
