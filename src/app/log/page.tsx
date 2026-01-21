'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCelebration } from '@/lib/celebration-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, Plus, Pencil, Check, Undo2, GripVertical, X, RotateCcw } from 'lucide-react';
import { DEFAULT_QUICK_ADD_PRESETS } from '@shared/constants';
import { Skeleton } from '@/components/ui/skeleton';

type ExerciseType = 'pullups' | 'pushups' | 'dips' | 'running' | 'custom';

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
      if (saved && ['pullups', 'pushups', 'dips', 'running', 'custom'].includes(saved)) {
        return saved as ExerciseType;
      }
    }
    return 'pullups';
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
    return selectedExercise === 'running' ? 'km' : 'reps';
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

        {/* Exercise Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Exercise</CardTitle>
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
          <CardContent className="space-y-3">
            {/* Standard Exercises */}
            <div className="grid grid-cols-4 gap-2">
              {(['pullups', 'pushups', 'dips', 'running'] as const).map((type) => (
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
                  className="capitalize text-xs px-2"
                >
                  {type}
                </Button>
              ))}
            </div>

            {/* Custom Exercises */}
            {!loadingCustomExercises && customExercises.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
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
                    className="truncate text-xs"
                  >
                    {exercise.name}
                  </Button>
                ))}
              </div>
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
    </AppLayout>
  );
}
