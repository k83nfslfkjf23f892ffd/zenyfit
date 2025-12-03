import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { currentUser, exercises, customExercises } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, TooltipProps } from "recharts";
import { Zap, TrendingUp, Activity, Plus, X, Award, Info, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PushupIcon, DipsIcon } from "@/pages/LogPage";

export default function YourStatsPage() {
  const { toast } = useToast();
  const [customExercisesData, setCustomExercisesData] = useState<Array<{ name: string; unit: string; buttons: number[] }>>([]);

  // Load custom exercises from localStorage on mount and listen for changes
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
    
    // Listen for storage changes from other tabs/pages
    window.addEventListener("storage", loadCustomExercises);
    return () => window.removeEventListener("storage", loadCustomExercises);
  }, []);

  const [milestones, setMilestones] = useState([
    { id: 1, name: "100 Pull-ups", target: 100, current: 70, icon: "🎯" },
    { id: 2, name: "500 Push-ups", target: 500, current: 0, icon: "💪" },
    { id: 3, name: "50km Running", target: 50, current: 5.2, icon: "🏃" },
    { id: 4, name: "7-Day Streak", target: 7, current: 3, icon: "🔥" },
  ]);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneTarget, setNewMilestoneTarget] = useState("");

  const handleAddMilestone = () => {
    if (newMilestoneName.trim() && newMilestoneTarget) {
      const newMilestone = {
        id: Math.max(...milestones.map(m => m.id), 0) + 1,
        name: newMilestoneName,
        target: parseFloat(newMilestoneTarget),
        current: 0,
        icon: "⭐",
      };
      setMilestones([...milestones, newMilestone]);
      setNewMilestoneName("");
      setNewMilestoneTarget("");
      setIsAddingMilestone(false);
      toast({
        title: "Milestone Created!",
        description: `${newMilestoneName} has been added.`,
      });
    }
  };

  const handleRemoveMilestone = (id: number) => {
    setMilestones(milestones.filter(m => m.id !== id));
    toast({
      title: "Milestone Removed",
      description: "Milestone has been deleted.",
    });
  };

  // Calculate exercise distribution including custom exercises
  const exerciseCounts = exercises.reduce((acc, ex) => {
    const existing = acc.find(e => e.name === ex.type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: ex.type.replace('-', ' ').toUpperCase(), value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Add custom exercise counts from mockData
  customExercisesData.forEach(customEx => {
    const count = customExercises.filter(e => e.type === customEx.name).length;
    // Show all custom exercises, even if count is 0
    exerciseCounts.push({ name: customEx.name.toUpperCase(), value: count || 0 });
  });

  // Color scheme for custom exercises - cycle through these colors
  const CUSTOM_COLORS = [
    '#ef4444', // red
    '#f59e0b', // amber
    '#06b6d4', // cyan
    '#a78bfa', // violet
    '#f43f5e', // rose
  ];

  const getColorByExerciseType = (exerciseType: string): string => {
    const type = exerciseType.toLowerCase().replace(' ', '-');
    switch(type) {
      case 'pull-up': return '#a855f7'; // purple
      case 'push-up': return '#3b82f6'; // blue
      case 'run': return '#10b981'; // green
      case 'dip': return '#ec4899'; // pink
      default: {
        // For custom exercises, find their index and assign color
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

  // Calculate personal bests
  const personalBests = [
    {
      name: "Pull-ups",
      best: Math.max(...exercises.filter(e => e.type === 'pull-up').map(e => e.amount), 0),
      unit: "reps",
      icon: "🎯",
      color: "text-purple-500"
    },
    {
      name: "Push-ups",
      best: Math.max(...exercises.filter(e => e.type === 'push-up').map(e => e.amount), 0),
      unit: "reps",
      icon: "💪",
      color: "text-blue-500"
    },
    {
      name: "Running",
      best: Math.max(...exercises.filter(e => e.type === 'run').map(e => e.amount), 0),
      unit: "km",
      icon: "🏃",
      color: "text-green-500"
    },
    {
      name: "Dips",
      best: Math.max(...exercises.filter(e => e.type === 'dip').map(e => e.amount), 0),
      unit: "reps",
      icon: "🏋️",
      color: "text-pink-500"
    },
  ];

  const consistencyScore = 85;
  const workoutDays = 6;
  const totalDays = 7;

  const getExerciseIcon = (exerciseType: string) => {
    const type = exerciseType.toLowerCase().replace(' ', '-');
    const iconMap = {
      'pull-up': <ArrowUp size={20} />,
      'push-up': <PushupIcon size={20} />,
      'dip': <DipsIcon size={20} />,
      'run': <Activity size={20} />,
    };
    return iconMap[type as keyof typeof iconMap] || null;
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
        // For custom exercises, find their index and assign color
        const customIdx = customExercisesData.findIndex(ex => ex.name.toUpperCase() === exerciseType);
        return customColorStyles[customIdx >= 0 ? customIdx % customColorStyles.length : 0];
      }
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-heading font-bold mb-6">Your Stats</h1>

      {/* Exercise Distribution */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Activity size={20} className="text-primary" />
          Exercise Distribution
        </h2>
        <Card className="border-none shadow-md dark:bg-zinc-900 overflow-hidden">
          <CardContent className="pt-2 px-4 pb-4">
            {exerciseCounts.length > 0 ? (
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
                  {(() => {
                    // Calculate total reps per exercise type (standard + custom)
                    const repsByExercise = exercises.reduce((acc, ex) => {
                      const key = ex.type.replace('-', ' ').toUpperCase();
                      acc[key] = (acc[key] || 0) + ex.amount;
                      return acc;
                    }, {} as Record<string, number>);

                    // Add custom exercises
                    customExercisesData.forEach(customEx => {
                      const total = customExercises.reduce((sum, log) => {
                        if (log.type === customEx.name) return sum + log.amount;
                        return sum;
                      }, 0);
                      if (total > 0) {
                        repsByExercise[customEx.name.toUpperCase()] = total;
                      }
                    });

                    const totalReps = Object.values(repsByExercise).reduce((sum, reps) => sum + reps, 0);
                    
                    return exerciseCounts.map((item, index) => {
                      const reps = repsByExercise[item.name] || 0;
                      const percentage = Math.round((reps / totalReps) * 100);
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
                                {reps} rep{reps !== 1 ? 's' : ''} 
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
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                No workout data yet
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Milestones */}
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
            const progress = Math.min(100, Math.round((milestone.current / milestone.target) * 100));
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
                    <p className="text-xs text-muted-foreground">{progress}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Personal Bests */}
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

      {/* Consistency Score */}
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
              <p className="text-sm text-green-500">+5% compared to last week</p>
            </div>
          </CardContent>
        </Card>
      </section>


    </Layout>
  );
}
