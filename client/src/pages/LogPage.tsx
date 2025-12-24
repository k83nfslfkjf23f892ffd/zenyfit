import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseInstances } from "@/lib/firebase";
import { getApiUrl } from "@/lib/api";
import { useLocation } from "wouter";
import { ArrowUp, Activity, Plus, Zap, Edit2, X, RotateCcw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const PushupIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* Head - detailed profile facing left */}
    <ellipse cx="6" cy="6" rx="3.5" ry="4" fill="none"/>
    
    {/* Forehead curve */}
    <path d="M 3 5 Q 2.5 4 3.5 3 Q 5 2 7 3" fill="none"/>
    
    {/* Facial features - eye */}
    <path d="M 7 5 Q 7.5 4.5 8 5" fill="none"/>
    
    {/* Nose line */}
    <path d="M 8.5 6 L 9 7" fill="none"/>
    
    {/* Mouth curved smile */}
    <path d="M 8 8 Q 7.5 8.5 6.5 8.5" fill="none"/>
    
    {/* Chin detail */}
    <path d="M 6 9 Q 5 9 4.5 8.5" fill="none"/>
    
    {/* Neck to shoulders */}
    <path d="M 8 9 Q 9.5 9.5 11 10" fill="none"/>
    
    {/* Left arm - shoulder to elbow */}
    <path d="M 11 10 Q 8 11 5 13" fill="none" strokeWidth="1.3"/>
    
    {/* Left forearm - elbow to hand */}
    <path d="M 5 13 Q 3 14 2 16" fill="none" strokeWidth="1.3"/>
    
    {/* Left hand with fingers */}
    <path d="M 2 16 Q 1.5 17 2 17.5 M 1 16 Q 0.8 17 1.2 17.5 M 3 16 Q 3.5 17 3.8 17.5" fill="none"/>
    
    {/* Chest/shoulders - upper back line */}
    <path d="M 11 10 Q 22 8 38 10" fill="none" strokeWidth="1.3"/>
    
    {/* Torso - center line showing abs */}
    <path d="M 11 11 Q 22 11.5 38 13" fill="none"/>
    
    {/* Ribs/muscle detail - left side */}
    <path d="M 14 11 Q 14.5 12 14 12.5" fill="none" strokeWidth="0.8"/>
    <path d="M 17 11.3 Q 17.5 12 17 12.5" fill="none" strokeWidth="0.8"/>
    
    {/* Hip/waist line */}
    <path d="M 11 11.5 Q 22 12.5 38 14" fill="none"/>
    
    {/* Right shoulder - upper arm */}
    <path d="M 38 10 Q 43 9 45 9.5" fill="none" strokeWidth="1.3"/>
    
    {/* Right forearm - elbow to hand */}
    <path d="M 45 9.5 Q 47 11 48 14" fill="none" strokeWidth="1.3"/>
    
    {/* Right hand with fingers */}
    <path d="M 48 14 Q 48.5 15 48 15.5 M 47 14 Q 47.2 15 46.8 15.5 M 46 14 Q 45.5 15 45.2 15.5" fill="none"/>
    
    {/* Left leg - hip to knee */}
    <path d="M 18 12 Q 16 16 14 20" fill="none" strokeWidth="1.2"/>
    
    {/* Left calf - knee to foot */}
    <path d="M 14 20 Q 13 24 12 27" fill="none" strokeWidth="1.2"/>
    
    {/* Left foot with toes */}
    <path d="M 12 27 L 11 28.5 M 12 27 L 12.5 28.5 M 12 27 L 13 28.5" fill="none"/>
    
    {/* Right leg - hip to knee */}
    <path d="M 32 13 Q 35 17 37 21" fill="none" strokeWidth="1.2"/>
    
    {/* Right calf - knee to foot */}
    <path d="M 37 21 Q 39 24 41 27" fill="none" strokeWidth="1.2"/>
    
    {/* Right foot with toes */}
    <path d="M 41 27 L 40 28.5 M 41 27 L 41.5 28.5 M 41 27 L 42 28.5" fill="none"/>
  </svg>
);

export const DipsIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    {/* Left support leg - vertical */}
    <line x1="5" y1="10" x2="5" y2="22" stroke="currentColor" strokeWidth="2.5"/>
    
    {/* Right support leg - vertical */}
    <line x1="19" y1="10" x2="19" y2="22" stroke="currentColor" strokeWidth="2.5"/>
    
    {/* Horizontal bar */}
    <rect x="4" y="9" width="16" height="2.5" rx="1" fill="currentColor"/>
    
    {/* Head - side profile */}
    <circle cx="14" cy="3" r="1.8" fill="currentColor"/>
    
    {/* Torso - side view, positioned higher above bar */}
    <rect x="12.5" y="5.5" width="2" height="6" rx="0.5" fill="currentColor"/>
    
    {/* Upper arm (shoulder to elbow) - bent at 90 degrees, higher up */}
    <line x1="12.5" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    
    {/* Forearm (elbow to bar grip) - bent upward at 90 degrees */}
    <line x1="8" y1="6" x2="8" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    
    {/* Hand on bar */}
    <circle cx="8" cy="11" r="0.7" fill="currentColor"/>
    
    {/* Upper leg (hip to knee) - connected to body */}
    <line x1="13.5" y1="11.5" x2="12" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Lower leg (knee to foot) - angled upward */}
    <line x1="12" y1="17.5" x2="13" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Foot - angled upward */}
    <path d="M 13 20 L 14.5 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
  </svg>
);

const EXERCISE_TYPES = [
  { id: "pull-up", label: "Pull-ups", icon: ArrowUp },
  { id: "push-up", label: "Push-ups", icon: PushupIcon },
  { id: "run", label: "Running", icon: Activity },
  { id: "dip", label: "Dips", icon: DipsIcon },
] as const;

type StandardExerciseType = "push-up" | "pull-up" | "dip" | "run";

function isStandardExerciseType(type: string): type is StandardExerciseType {
  return ["push-up", "pull-up", "dip", "run"].includes(type);
}

export default function LogPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { workoutNotification, levelUpNotification } = useNotifications();
  const { user, refreshProfile } = useAuth();
  const [type, setType] = useState<"push-up" | "pull-up" | "dip" | "run">("push-up");
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExercises, setCustomExercises] = useState<Array<{ name: string; unit: string; buttons: number[] }>>([]);
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmExercise, setDeleteConfirmExercise] = useState<string | null>(null);
  const [customUnit, setCustomUnit] = useState("reps");
  const [customButtons, setCustomButtons] = useState<number[]>([10, 20, 50, 100]);
  const [isCustomButtonEdit, setIsCustomButtonEdit] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [lastEntry, setLastEntry] = useState<{ exercise: string; amount: number; logId: string } | null>(null);
  const [addedUnits, setAddedUnits] = useState<string[]>([]);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);

  const predefinedUnits = ["reps", "km", "miles", "seconds", "meters", "minutes"];
  const allUnits = [...predefinedUnits, ...addedUnits];

  // Listen for service worker messages about synced workouts
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'WORKOUT_SYNCED' && event.data?.success) {
          toast({
            title: "Workout Synced!",
            description: "Your offline workout has been synced successfully.",
          });
          // Refresh profile to show updated XP
          refreshProfile();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, [toast, refreshProfile]);

  // Load saved exercise type and custom exercises on mount
  useEffect(() => {
    const savedType = localStorage.getItem("lastExerciseType");
    const savedCustom = localStorage.getItem("lastCustomExercise");

    // Load custom exercises from localStorage (don't overwrite them!)
    const saved = localStorage.getItem("customExercises");
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        setCustomExercises(loaded);
        
        // If a custom exercise was previously selected, restore its settings
        if (savedCustom) {
          setSelectedCustom(savedCustom);
          const exercise = loaded.find((ex: any) => ex.name === savedCustom);
          if (exercise) {
            setCustomUnit(exercise.unit);
            setCustomButtons(exercise.buttons);
          }
        }
      } catch (e) {
        console.error("Failed to load custom exercises", e);
      }
    } else if (savedType && isStandardExerciseType(savedType)) {
      setType(savedType);
    }
  }, []);

  const handleTypeChange = (newType: string) => {
    if (isStandardExerciseType(newType)) {
      setType(newType);
      localStorage.setItem("lastExerciseType", newType);
      localStorage.removeItem("lastCustomExercise");
      setSelectedCustom(null);
      setCustomUnit("reps");
      setCustomButtons([10, 20, 50, 100]);
    } else {
      setSelectedCustom(newType);
      localStorage.setItem("lastCustomExercise", newType);
      // Load the exercise details
      const exercise = customExercises.find(ex => ex.name === newType);
      if (exercise) {
        setCustomUnit(exercise.unit);
        setCustomButtons(exercise.buttons);
      }
    }
    setAmount(0);
  };

  // Updated limits based on requirements
  const limits = {
    "push-up": 50000,
    "pull-up": 50000,
    "dip": 50000,
    "run": 200 // km
  };

  const handleSubmit = async (e: React.FormEvent | undefined, amountToLog?: number) => {
    e?.preventDefault();
    
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please sign in to log workouts.",
        variant: "destructive"
      });
      return;
    }
    
    let finalAmount = amountToLog !== undefined ? amountToLog : amount;
    
    if (finalAmount <= 0) return;
    
    const exerciseName = selectedCustom || (isCustomMode ? customExerciseName : type);
    const isCustomExercise = !!selectedCustom || isCustomMode;
    const unit = isCustomExercise ? customUnit : (type === "run" ? "km" : "reps");
    
    if (isCustomMode && !customExerciseName.trim()) {
      toast({
        title: "Exercise name required",
        description: "Please enter a name for your custom exercise.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isCustomExercise && finalAmount > limits[type]) {
      toast({
        title: "Limit Exceeded",
        description: `The maximum limit for ${type} is ${limits[type]} per entry.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { auth } = getFirebaseInstances();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }
      
      const idToken = await auth.currentUser.getIdToken(true);
      
      const response = await fetch(getApiUrl("/api/workouts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          exerciseType: exerciseName,
          amount: finalAmount,
          unit,
          isCustom: isCustomExercise,
        }),
      });
      
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to log workout");
      }

      // Handle offline queued workouts
      if (result.queued) {
        toast({
          title: "Workout Queued",
          description: `${finalAmount} ${unit} of ${exerciseName} saved offline. Will sync when online.`,
        });

        // Show notification for offline workout
        workoutNotification(exerciseName, finalAmount);

        // Reset form for offline workouts
        if (isCustomMode) {
          setCustomExerciseName("");
          setIsCustomMode(false);
          setSelectedCustom(null);
        }
        setAmount(0);
        setIsSubmitting(false);
        return;
      }

      // Online workout logging - refresh profile and show XP
      await refreshProfile();

      const xpMessage = result.leveledUp
        ? `+${result.xpGained} XP! You leveled up to Level ${result.newLevel}!`
        : `+${result.xpGained} XP`;

      toast({
        title: "Workout Logged!",
        description: `${finalAmount} ${unit} of ${exerciseName}. ${xpMessage}`,
      });

      // Show notifications
      workoutNotification(exerciseName, finalAmount);

      // Show level-up notification if user leveled up
      if (result.leveledUp) {
        levelUpNotification(result.newLevel, result.xpGained);
      }

      // Store last entry for revert (with logId from API response)
      if (result.logId) {
        setLastEntry({ exercise: exerciseName, amount: finalAmount, logId: result.logId });
      }
      
      if (isCustomMode) {
        setCustomExerciseName("");
        setIsCustomMode(false);
        setSelectedCustom(null);
      }
      
      // Reset form
      setAmount(0);
      
    } catch (error: any) {
      console.error("Log workout error:", error);
      toast({
        title: "Failed to log workout",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-4">
          {isCustomMode && (
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                setCustomExerciseName("");
                setCustomUnit("reps");
                setCustomButtons([10, 20, 50, 100]);
                setIsCustomButtonEdit(false);
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Go back"
            >
              <ArrowLeft size={20} className="text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-heading font-bold">Log Activity</h1>
            <p className="text-xs text-muted-foreground">Record your progress, crush your goals.</p>
          </div>
        </div>

      <div className="w-full max-w-sm mx-auto space-y-6">

          <Card className="border-none shadow-xl">
            <CardContent className="p-6 relative">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Exercise Type Selection Block */}
                <div className="space-y-3 relative">
                  {!isCustomMode && (
                    <div className="flex items-center justify-end gap-2 -mt-3">
                      {customExercises.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:scale-125 transition-transform hover:bg-muted/80"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(true);
                          setAmount(0);
                          setCustomExerciseName("");
                        }}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-125 transition-transform"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                  {isEditMode && !isCustomMode ? (
                    <div className="space-y-2">
                      {customExercises.map((customEx) => (
                        <div key={customEx.name}>
                          {editingExercise === customEx.name ? (
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-10 text-sm"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingName.trim() && editingName !== customEx.name) {
                                    const updated = customExercises.map(ex => 
                                      ex.name === customEx.name ? { ...ex, name: editingName.trim() } : ex
                                    );
                                    setCustomExercises(updated);
                                    localStorage.setItem("customExercises", JSON.stringify(updated));
                                    toast({
                                      title: "Renamed!",
                                      description: `${customEx.name} → ${editingName.trim()}`,
                                    });
                                  }
                                  setEditingExercise(null);
                                  setEditingName("");
                                }}
                                className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExercise(null);
                                  setEditingName("");
                                }}
                                className="px-3 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/80"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExercise(customEx.name);
                                  setEditingName(customEx.name);
                                }}
                                className="text-sm font-semibold text-left hover:text-primary transition-colors cursor-text flex-1"
                              >
                                {customEx.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmExercise(customEx.name)}
                                className="text-destructive hover:text-destructive/80 ml-2"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setEditingExercise(null);
                          setEditingName("");
                        }}
                        className="w-full p-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Done
                      </button>
                    </div>
                  ) : !isCustomMode ? (
                    <div className="grid grid-cols-4 gap-2">
                      {EXERCISE_TYPES.map((exercise) => {
                        const Icon = exercise.icon;
                        const isActive = selectedCustom === null && type === exercise.id;
                        return (
                          <button
                            key={exercise.id}
                            type="button"
                            onClick={() => handleTypeChange(exercise.id)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon size={24} />
                            <span className="text-xs font-semibold text-center leading-tight">{exercise.label}</span>
                          </button>
                        );
                      })}
                      {customExercises.map((customEx) => {
                        const isActive = selectedCustom === customEx.name;
                        return (
                          <button
                            key={customEx.name}
                            type="button"
                            onClick={() => handleTypeChange(customEx.name)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all min-h-[90px] w-full",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Zap size={24} />
                            <span className="text-xs font-semibold text-center leading-snug break-all line-clamp-2 px-1">{customEx.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-6 pt-2">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">Create Exercise</h3>
                        <p className="text-xs text-muted-foreground">Define your custom workout</p>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground block">Exercise Name</label>
                        <Input
                          type="text"
                          value={customExerciseName}
                          onChange={(e) => setCustomExerciseName(e.target.value)}
                          placeholder="e.g., Handstand, Planks, Rowing..."
                          className="h-12 text-sm border-2 focus:border-primary transition-colors"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground block">Unit of Measurement</label>
                        <div className="flex flex-wrap gap-2">
                          {allUnits.map((unit) => {
                            const isCustom = addedUnits.includes(unit);
                            return (
                              <div key={unit} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => setCustomUnit(unit)}
                                  className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    customUnit === unit
                                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  )}
                                >
                                  {unit}
                                </button>
                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddedUnits(addedUnits.filter(u => u !== unit));
                                      if (customUnit === unit) {
                                        setCustomUnit("reps");
                                      }
                                    }}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:shadow-lg"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Create custom unit..."
                            className="h-11 text-sm border-2 focus:border-primary transition-colors flex-1"
                            id="customUnitInput"
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                const newUnit = e.target.value.trim();
                                setAddedUnits([...addedUnits, newUnit]);
                                setCustomUnit(newUnit);
                                e.target.value = "";
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                const newUnit = e.currentTarget.value.trim();
                                setAddedUnits([...addedUnits, newUnit]);
                                setCustomUnit(newUnit);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("customUnitInput") as HTMLInputElement;
                              if (input && input.value.trim()) {
                                const newUnit = input.value.trim();
                                setAddedUnits([...addedUnits, newUnit]);
                                setCustomUnit(newUnit);
                                input.value = "";
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-foreground">Quick Buttons</label>
                          <button
                            type="button"
                            onClick={() => setIsCustomButtonEdit(!isCustomButtonEdit)}
                            className={cn(
                              "text-xs font-semibold transition-colors px-3 py-1 rounded-md",
                              isCustomButtonEdit
                                ? "bg-primary/10 text-primary"
                                : "text-primary hover:bg-primary/5"
                            )}
                          >
                            {isCustomButtonEdit ? "Done" : "Edit"}
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          {customButtons.map((btn, idx) => (
                            <div
                              key={idx}
                              draggable
                              onDragStart={() => setDraggedIdx(idx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (draggedIdx !== null && draggedIdx !== idx) {
                                  const newButtons = [...customButtons];
                                  const [draggedItem] = newButtons.splice(draggedIdx, 1);
                                  newButtons.splice(idx, 0, draggedItem);
                                  setCustomButtons(newButtons);
                                  setDraggedIdx(null);
                                }
                              }}
                              className={cn(
                                "relative group transition-all duration-200 cursor-move",
                                isCustomButtonEdit && draggedIdx === idx ? "opacity-50 scale-95" : ""
                              )}
                            >
                              {isCustomButtonEdit ? (
                                <Input
                                  type="number"
                                  value={btn}
                                  onChange={(e) => {
                                    const newButtons = [...customButtons];
                                    newButtons[idx] = parseFloat(e.target.value) || 0;
                                    setCustomButtons(newButtons);
                                  }}
                                  className="h-14 text-center text-sm font-bold border-2 focus:border-primary transition-colors"
                                />
                              ) : (
                                <div className="bg-gradient-to-br from-muted/80 to-muted text-muted-foreground text-sm font-bold p-3 rounded-lg text-center h-14 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                                  {btn}
                                </div>
                              )}
                              {isCustomButtonEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newButtons = customButtons.filter((_, i) => i !== idx);
                                    setCustomButtons(newButtons);
                                  }}
                                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:shadow-lg"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {isCustomButtonEdit && (
                          <button
                            type="button"
                            onClick={() => setCustomButtons([...customButtons, 0])}
                            className="w-full py-2.5 text-sm font-semibold border-2 border-dashed border-primary/40 text-primary rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            + Add Button
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (customExerciseName.trim()) {
                            setCustomExercises((prev) => {
                              const updated = [...prev, { name: customExerciseName.trim(), unit: customUnit, buttons: customButtons }];
                              localStorage.setItem("customExercises", JSON.stringify(updated));
                              return updated;
                            });
                            const exerciseName = customExerciseName;
                            setCustomExerciseName("");
                            setCustomUnit("reps");
                            setCustomButtons([10, 20, 50, 100]);
                            setIsCustomMode(false);
                            setAmount(0);
                            toast({
                              title: "Exercise Added!",
                              description: `${exerciseName} has been added to your exercises.`,
                            });
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-lg transition-all bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 font-semibold text-sm"
                      >
                        <Plus size={18} />
                        Add Exercise Type
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Current amount display */}
                {!isCustomMode && (
                  <div className="flex justify-between items-baseline pt-4">
                    <label className="text-sm font-medium text-muted-foreground">
                      {selectedCustom ? 'Amount' : type === 'run' ? 'Distance' : 'Repetitions'}
                    </label>
                    <span className="text-2xl font-bold font-heading text-primary">
                      {amount} <span className="text-sm font-normal text-muted-foreground">{selectedCustom ? customUnit : type === 'run' ? 'km' : 'reps'}</span>
                    </span>
                  </div>
                )}

                {/* 2. Quick Add Buttons */}
                {!isCustomMode && (
                  <div className="grid grid-cols-4 gap-2">
                    {!selectedCustom ? (
                      <>
                        {[1, 3, 5, 10, 15, 20, 25, 30, 50, 70, 100].map(val => (
                          <Button
                            key={val}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubmit(undefined, val)} // Instant logging
                            className={cn(amount === val ? "border-primary text-primary bg-primary/5" : "")}
                            disabled={isSubmitting}
                          >
                            {val}
                          </Button>
                        ))}
                        {type === 'run' && [3, 5, 10, 15].map(val => (
                          <Button
                            key={val}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubmit(undefined, val)} // Instant logging
                            className={cn(amount === val ? "border-primary text-primary bg-primary/5" : "")}
                            disabled={isSubmitting}
                          >
                            {val}
                          </Button>
                        ))}
                      </>
                    ) : (
                      customButtons.map(val => (
                        <Button
                          key={val}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmit(undefined, val)} // Instant logging
                          className={cn(amount === val ? "border-primary text-primary bg-primary/5" : "")}
                          disabled={isSubmitting}
                        >
                          {val}
                        </Button>
                      ))
                    )}
                  </div>
                )}

                {/* 3. Slider */}
                {!isCustomMode && (
                  <div className="space-y-4">
                    <Slider
                      value={[amount]}
                      max={100}
                      step={1}
                      onValueChange={(v) => {
                        setAmount(v[0]);
                      }}
                      className="py-4"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* 4. Log Workout Button */}
                {!isCustomMode && (
                  <div className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/20"
                      disabled={amount <= 0 || isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : "Log Workout"}
                    </Button>
                    {lastEntry && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 text-sm gap-2"
                        onClick={() => setRevertConfirmOpen(true)}
                      >
                        <RotateCcw size={16} />
                        Revert Last ({lastEntry.amount} {lastEntry.exercise})
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

        <Dialog open={deleteConfirmExercise !== null} onOpenChange={(open) => !open && setDeleteConfirmExercise(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Exercise?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteConfirmExercise}"</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmExercise(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmExercise) {
                    const updated = customExercises.filter(ex => ex.name !== deleteConfirmExercise);
                    setCustomExercises(updated);
                    localStorage.setItem("customExercises", JSON.stringify(updated));
                    toast({
                      title: "Deleted",
                      description: `${deleteConfirmExercise} has been removed.`,
                    });
                    setDeleteConfirmExercise(null);
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Revert Workout?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <span className="font-semibold text-foreground">{lastEntry?.amount} {lastEntry?.exercise}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRevertConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (!lastEntry) return;

                  try {
                    const { auth } = getFirebaseInstances();
                    if (!auth?.currentUser) {
                      throw new Error("Not authenticated");
                    }

                    const idToken = await auth.currentUser.getIdToken(true);

                    const response = await fetch(getApiUrl("/api/workouts"), {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        idToken,
                        logId: lastEntry.logId,
                      }),
                    });

                    const result = await response.json();

                    if (!result.success) {
                      throw new Error(result.error || "Failed to revert workout");
                    }

                    // Refresh profile to get updated XP/level
                    await refreshProfile();

                    toast({
                      title: "Entry Reverted",
                      description: `Removed ${lastEntry.amount} of ${lastEntry.exercise}. -${result.xpLost} XP`,
                    });

                    setLastEntry(null);
                    setRevertConfirmOpen(false);
                  } catch (error) {
                    console.error("Revert error:", error);
                    toast({
                      title: "Revert Failed",
                      description: error instanceof Error ? error.message : "Could not revert workout",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Revert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </Layout>
  );
}
