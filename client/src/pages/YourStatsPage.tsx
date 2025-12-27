import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, TooltipProps } from "recharts";
import { Zap, TrendingUp, Activity, Plus, X, Award, ArrowUp, Loader2, BarChart3, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PushupIcon, DipsIcon } from "@/pages/LogPage";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExerciseLog } from "@shared/types";

export default function YourStatsPage() {
  const { user, userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [customExercisesData, setCustomExercisesData] = useState<Array<{ name: string; unit: string; buttons: number[] }>>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<number>(30); // days

  useEffect(() => {
    const loadCustomExercises = () => {
      const saved = localStorage.getItem("customExercises");
      if (saved) {
        try {
          setCustomExercisesData(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse custom exercises", e);
        }
      }
    };
    
    loadCustomExercises();
    
    window.addEventListener("storage", loadCustomExercises);
    return () => window.removeEventListener("storage", loadCustomExercises);
  }, []);

  useEffect(() => {
    const fetchWorkoutLogs = async () => {
      if (!user) {
        setLoadingLogs(false);
        return;
      }
      
      try {
        const token = await user.getIdToken(true);
        const response = await fetch(getApiUrl("/api/workouts"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.logs) {
            setExerciseLogs(data.logs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch workout logs:", err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchWorkoutLogs();
  }, [user]);

  const defaultMilestones = [
    { id: 1, name: "100 Pull-ups", target: 100, icon: "🎯" },
    { id: 2, name: "500 Push-ups", target: 500, icon: "💪" },
    { id: 3, name: "50km Running", target: 50, icon: "🏃" },
    { id: 4, name: "7-Day Streak", target: 7, icon: "🔥" },
  ];
  const [milestones, setMilestones] = useState(userProfile?.milestones || defaultMilestones);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneTarget, setNewMilestoneTarget] = useState("");
  const [savingMilestones, setSavingMilestones] = useState(false);

  // Sync milestones from userProfile when it updates
  useEffect(() => {
    if (userProfile?.milestones) {
      setMilestones(userProfile.milestones);
    }
  }, [userProfile?.milestones]);

  const saveMilestonesToBackend = async (updatedMilestones: typeof milestones) => {
    if (!user) return;

    setSavingMilestones(true);
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch(getApiUrl("/api/users"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, milestones: updatedMilestones }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save milestones");
      }
    } catch (error) {
      console.error("Error saving milestones:", error);
      toast({
        title: "Error",
        description: "Failed to save milestones",
        variant: "destructive",
      });
    } finally {
      setSavingMilestones(false);
    }
  };

  const handleAddMilestone = async () => {
    if (newMilestoneName.trim() && newMilestoneTarget) {
      const newMilestone = {
        id: Math.max(...milestones.map(m => m.id), 0) + 1,
        name: newMilestoneName,
        target: parseFloat(newMilestoneTarget),
        icon: "⭐",
      };
      const updatedMilestones = [...milestones, newMilestone];
      setMilestones(updatedMilestones);
      setNewMilestoneName("");
      setNewMilestoneTarget("");
      setIsAddingMilestone(false);

      await saveMilestonesToBackend(updatedMilestones);

      toast({
        title: "Milestone Created!",
        description: `${newMilestoneName} has been added.`,
      });
    }
  };

  const handleRemoveMilestone = async (id: number) => {
    const updatedMilestones = milestones.filter(m => m.id !== id);
    setMilestones(updatedMilestones);

    await saveMilestonesToBackend(updatedMilestones);

    toast({
      title: "Milestone Removed",
      description: "Milestone has been deleted.",
    });
  };

  // Filter exercise logs based on type and date range
  const filteredLogs = exerciseLogs.filter(log => {
    // Filter by type
    if (filterType !== "all" && log.exerciseType !== filterType) {
      return false;
    }

    // Filter by date range
    const cutoffDate = Date.now() - (filterDateRange * 24 * 60 * 60 * 1000);
    if (log.timestamp < cutoffDate) {
      return false;
    }

    return true;
  });

  const exerciseCounts = filteredLogs.reduce((acc, ex) => {
    const typeName = ex.exerciseType.replace('-', ' ').toUpperCase();
    const existing = acc.find(e => e.name === typeName);
    if (existing) {
      existing.value += 1;
      existing.totalAmount += ex.amount;
    } else {
      acc.push({ name: typeName, value: 1, totalAmount: ex.amount });
    }
    return acc;
  }, [] as { name: string; value: number; totalAmount: number }[]);

  const CUSTOM_COLORS = [
    '#ef4444',
    '#f59e0b',
    '#06b6d4',
    '#a78bfa',
    '#f43f5e',
  ];

  const getColorByExerciseType = (exerciseType: string): string => {
    const type = exerciseType.toLowerCase().replace(' ', '-');
    switch(type) {
      case 'pull-up': return '#a855f7';
      case 'push-up': return '#3b82f6';
      case 'run': return '#10b981';
      case 'dip': return '#ec4899';
      default: {
        const customIdx = customExercisesData.findIndex(ex => ex.name.toUpperCase() === exerciseType);
        return CUSTOM_COLORS[customIdx >= 0 ? customIdx % CUSTOM_COLORS.length : 0];
      }
    }
  };

  const COLORS = exerciseCounts.map(item => getColorByExerciseType(item.name));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-black/90 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
          <p className="text-white font-bold text-sm">{entry.name}</p>
          <p className="text-gray-300 text-xs mt-1">{entry.value} logs</p>
        </div>
      );
    }
    return null;
  };

  const personalBests = [
    {
      name: "Pull-ups",
      best: Math.max(...exerciseLogs.filter(e => e.exerciseType === 'pull-up').map(e => e.amount), 0),
      unit: "reps",
      icon: "🎯",
      color: "text-purple-500"
    },
    {
      name: "Push-ups",
      best: Math.max(...exerciseLogs.filter(e => e.exerciseType === 'push-up').map(e => e.amount), 0),
      unit: "reps",
      icon: "💪",
      color: "text-blue-500"
    },
    {
      name: "Running",
      best: Math.max(...exerciseLogs.filter(e => e.exerciseType === 'run').map(e => e.amount), 0),
      unit: "km",
      icon: "🏃",
      color: "text-green-500"
    },
    {
      name: "Dips",
      best: Math.max(...exerciseLogs.filter(e => e.exerciseType === 'dip').map(e => e.amount), 0),
      unit: "reps",
      icon: "🏋️",
      color: "text-pink-500"
    },
  ];

  const calculateMilestoneProgress = (milestone: typeof milestones[0]) => {
    const name = milestone.name.toLowerCase();
    let current = 0;
    
    if (name.includes('pull-up') || name.includes('pullup')) {
      current = userProfile?.totalPullups || exerciseLogs.filter(e => e.exerciseType === 'pull-up').reduce((sum, e) => sum + e.amount, 0);
    } else if (name.includes('push-up') || name.includes('pushup')) {
      current = userProfile?.totalPushups || exerciseLogs.filter(e => e.exerciseType === 'push-up').reduce((sum, e) => sum + e.amount, 0);
    } else if (name.includes('dip')) {
      current = userProfile?.totalDips || exerciseLogs.filter(e => e.exerciseType === 'dip').reduce((sum, e) => sum + e.amount, 0);
    } else if (name.includes('run') || name.includes('km')) {
      current = userProfile?.totalRunningKm || exerciseLogs.filter(e => e.exerciseType === 'run').reduce((sum, e) => sum + e.amount, 0);
    } else if (name.includes('streak')) {
      const dates = new Set(exerciseLogs.map(l => new Date(l.timestamp).toDateString()));
      current = dates.size;
    }
    
    return current;
  };

  const last7DaysLogs = exerciseLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return logDate >= sevenDaysAgo;
  });
  
  const uniqueDays = new Set(last7DaysLogs.map(l => new Date(l.timestamp).toDateString()));
  const workoutDays = uniqueDays.size;
  const totalDays = 7;
  const consistencyScore = Math.round((workoutDays / totalDays) * 100);

  const getExerciseIcon = (exerciseType: string) => {
    const type = exerciseType.toLowerCase().replace(' ', '-');
    const iconMap: Record<string, JSX.Element> = {
      'pull-up': <ArrowUp size={20} />,
      'push-up': <PushupIcon size={20} />,
      'dip': <DipsIcon size={20} />,
      'run': <Activity size={20} />,
    };
    return iconMap[type] || null;
  };

  const getColorStyles = (exerciseType: string) => {
    const type = exerciseType.toLowerCase().replace(' ', '-');
    const customColorStyles = [
      { bgColor: 'bg-red-500/10', textColor: 'text-red-500' },
      { bgColor: 'bg-amber-500/10', textColor: 'text-amber-500' },
      { bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-500' },
      { bgColor: 'bg-violet-500/10', textColor: 'text-violet-500' },
      { bgColor: 'bg-rose-500/10', textColor: 'text-rose-500' },
    ];
    
    switch(type) {
      case 'pull-up': return { bgColor: 'bg-purple-500/10', textColor: 'text-purple-500' };
      case 'push-up': return { bgColor: 'bg-blue-500/10', textColor: 'text-blue-500' };
      case 'dip': return { bgColor: 'bg-pink-500/10', textColor: 'text-pink-500' };
      case 'run': return { bgColor: 'bg-green-500/10', textColor: 'text-green-500' };
      default: {
        const customIdx = customExercisesData.findIndex(ex => ex.name.toUpperCase() === exerciseType);
        return customColorStyles[customIdx >= 0 ? customIdx % customColorStyles.length : 0];
      }
    }
  };

  const totalReps = exerciseCounts.reduce((sum, item) => sum + item.totalAmount, 0);

  // Get unique exercise types for filter
  const exerciseTypes = ["all", ...Array.from(new Set(exerciseLogs.map(log => log.exerciseType)))];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold">Your Stats</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/achievements')}
            className="gap-2"
          >
            <Trophy size={16} />
            Badges
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/analytics')}
            className="gap-2"
          >
            <BarChart3 size={16} />
            Charts
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="border-none shadow-sm dark:bg-zinc-900 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Exercise Type</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                {exerciseTypes.map(type => (
                  <option key={type} value={type}>
                    {type === "all" ? "All Exercises" : type.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Time Range</Label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
                <option value={36500}>All time</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filteredLogs.length} of {exerciseLogs.length} workouts
          </p>
        </CardContent>
      </Card>

      <section className="mb-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Activity size={20} className="text-primary" />
          Exercise Distribution
        </h2>
        <Card className="border-none shadow-md dark:bg-zinc-900 overflow-hidden">
          <CardContent className="pt-2 px-4 pb-4">
            {loadingLogs ? (
              <div className="flex flex-col lg:flex-row gap-6 p-6">
                <div className="flex-1 flex items-center justify-center">
                  <Skeleton className="w-64 h-64 rounded-full" />
                </div>
                <div className="flex-1 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ) : exerciseCounts.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1" style={{ pointerEvents: 'none' }}>
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie
                        data={exerciseCounts}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {exerciseCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-4">
                  {exerciseCounts.map((item, index) => {
                    const percentage = totalReps > 0 ? Math.round((item.totalAmount / totalReps) * 100) : 0;
                    const colorStyles = getColorStyles(item.name);
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorStyles.bgColor} ${colorStyles.textColor}`}
                          >
                            {getExerciseIcon(item.name)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.totalAmount} {item.name.toLowerCase().includes('run') ? 'km' : 'reps'}
                              <span className="mx-1">•</span>
                              {percentage}%
                            </p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percentage}%`, backgroundColor: COLORS[index] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                No workout data yet. Start logging!
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap size={20} className="text-accent" />
            Milestones
          </h2>
          <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1">
                <Plus size={16} /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Create New Milestone</DialogTitle>
                <DialogDescription>Set a new fitness goal to track.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Milestone Name</Label>
                  <Input 
                    placeholder="e.g., 200 Dips"
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Input 
                    type="number"
                    placeholder="e.g., 200"
                    value={newMilestoneTarget}
                    onChange={(e) => setNewMilestoneTarget(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddMilestone}
                  className="w-full"
                >
                  Create Milestone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {milestones.map((milestone) => {
            const current = calculateMilestoneProgress(milestone);
            const progress = Math.min(100, Math.round((current / milestone.target) * 100));
            return (
              <Card key={milestone.id} className="border-none shadow-sm dark:bg-zinc-900 relative group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{milestone.icon}</span>
                      <h3 className="font-semibold text-sm">{milestone.name}</h3>
                    </div>
                    <button
                      onClick={() => handleRemoveMilestone(milestone.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{current} / {milestone.target} ({progress}%)</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Award size={20} className="text-accent" />
          Personal Bests
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {personalBests.map((pb) => (
            <Card key={pb.name} className="border-none shadow-sm dark:bg-zinc-900">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pb.icon}</span>
                  <h3 className="font-semibold text-sm">{pb.name}</h3>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${pb.color}`}>{pb.best}</p>
                  <p className="text-xs text-muted-foreground">{pb.unit}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-primary" />
          Consistency Score
        </h2>
        <Card className="border-none shadow-md dark:bg-zinc-900">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-primary">{consistencyScore}%</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">You've worked out {workoutDays} out of {totalDays} days this week</p>
              <p className="text-sm text-muted-foreground">Keep up the great work!</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
