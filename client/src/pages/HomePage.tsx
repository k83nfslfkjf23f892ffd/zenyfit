import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Activity, Flame, TrendingUp, Zap, Wifi, WifiOff, Settings, ArrowUp, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useThemeToggle } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import NotificationCenter from "@/components/NotificationCenter";
import { PushupIcon, DipsIcon } from "@/pages/LogPage";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api";

const EXERCISE_ICONS = {
  "push-up": PushupIcon,
  "pull-up": ArrowUp,
  "dip": DipsIcon,
  "run": Activity,
};

const CUSTOM_EXERCISE_COLORS = [
  { bg: "bg-red-500/10", text: "text-red-500", hex: "#ef4444" },
  { bg: "bg-amber-500/10", text: "text-amber-500", hex: "#f59e0b" },
  { bg: "bg-cyan-500/10", text: "text-cyan-500", hex: "#06b6d4" },
  { bg: "bg-violet-500/10", text: "text-violet-500", hex: "#a78bfa" },
  { bg: "bg-rose-500/10", text: "text-rose-500", hex: "#f43f5e" },
];

interface ExerciseLog {
  id: string;
  exerciseType: string;
  amount: number;
  unit: string;
  xpGained: number;
  timestamp: number;
  isCustom?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  goal: number;
  startDate: number;
  endDate: number;
  participants: Array<{ userId: string; progress: number; avatar: string; username: string }>;
  participantIds: string[];
  isPublic: boolean;
  colors?: { from: string; to: string };
}

const HOLD_DELAY = 300;

export default function HomePage() {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isCustomizingHome, setIsCustomizingHome] = useState(false);
  const [showTodayActivity, setShowTodayActivity] = useState(true);
  const [showChallenges, setShowChallenges] = useState(true);
  const [showRecentLogs, setShowRecentLogs] = useState(true);
  const [sectionOrder, setSectionOrder] = useState(['today', 'challenges', 'logs']);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [readyToDragSection, setReadyToDragSection] = useState<string | null>(null);
  const [customExercisesData, setCustomExercisesData] = useState<Array<{ name: string; unit: string; buttons: number[] }>>([]);
  const [visibleTiles, setVisibleTiles] = useState<Record<string, boolean>>({
    "pull-up": true,
    "push-up": true,
    "run": true,
    "dip": true,
  });
  const [tileOrder, setTileOrder] = useState<string[]>(["pull-up", "push-up", "run", "dip"]);
  const [draggedTile, setDraggedTile] = useState<string | null>(null);
  const [readyToDragTile, setReadyToDragTile] = useState<string | null>(null);
  const { currentTheme } = useThemeToggle();
  const [, setLocation] = useLocation();
  
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingChallenges, setLoadingChallenges] = useState(true);

  const sectionHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tileHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const triggerHaptic = useCallback(() => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {}
    }
  }, []);

  const clearSectionHoldTimer = useCallback(() => {
    if (sectionHoldTimer.current) {
      clearTimeout(sectionHoldTimer.current);
      sectionHoldTimer.current = null;
    }
  }, []);

  const clearTileHoldTimer = useCallback(() => {
    if (tileHoldTimer.current) {
      clearTimeout(tileHoldTimer.current);
      tileHoldTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const fetchWorkoutLogs = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
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

    const fetchChallenges = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch(getApiUrl("/api/challenges"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.challenges) {
            const now = Date.now();
            const userChallenges = data.challenges.filter((c: Challenge) => {
              const isParticipant = c.participantIds?.includes(user.uid);
              const isActive = now >= c.startDate && now <= c.endDate;
              const myProgress = c.participants?.find(p => p.userId === user.uid)?.progress || 0;
              const isNotCompleted = myProgress < c.goal;
              return isParticipant && isActive && isNotCompleted;
            });
            setChallenges(userChallenges);
          }
        }
      } catch (err) {
        console.error("Failed to fetch challenges:", err);
      } finally {
        setLoadingChallenges(false);
      }
    };

    fetchWorkoutLogs();
    fetchChallenges();
  }, [user]);

  useEffect(() => {
    const loadTileSettings = () => {
      const saved = localStorage.getItem("customExercises");
      let customExData: Array<{ name: string; unit: string; buttons: number[] }> = [];
      if (saved) {
        try {
          customExData = JSON.parse(saved);
          setCustomExercisesData(customExData);
        } catch (e) {
          console.error("Failed to parse custom exercises", e);
        }
      }

      const standardTiles = ["pull-up", "push-up", "run", "dip"];
      const customTileIds = customExData.map(ex => ex.name);
      const allTiles = [...standardTiles, ...customTileIds];

      const savedVisibility = localStorage.getItem("tileVisibility");
      let newVisibility: Record<string, boolean> = {};
      allTiles.forEach(tile => {
        newVisibility[tile] = true;
      });
      if (savedVisibility) {
        try {
          const savedParsed = JSON.parse(savedVisibility);
          newVisibility = { ...newVisibility, ...savedParsed };
        } catch (e) {
          console.error("Failed to parse tile visibility", e);
        }
      }
      setVisibleTiles(newVisibility);

      const savedOrder = localStorage.getItem("tileOrder");
      let newOrder: string[] = allTiles;
      
      if (savedOrder) {
        try {
          const savedParsed = JSON.parse(savedOrder);
          const customNotInSaved = allTiles.filter(tile => !savedParsed.includes(tile));
          newOrder = [...savedParsed, ...customNotInSaved];
        } catch (e) {
          newOrder = allTiles;
        }
      }
      
      setTileOrder(newOrder);
    };
    
    loadTileSettings();
    
    window.addEventListener("storage", loadTileSettings);
    return () => window.removeEventListener("storage", loadTileSettings);
  }, []);

  useEffect(() => {
    return () => {
      clearSectionHoldTimer();
      clearTileHoldTimer();
    };
  }, [clearSectionHoldTimer, clearTileHoldTimer]);

  const handleSectionTouchStart = (section: string) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    clearSectionHoldTimer();
    sectionHoldTimer.current = setTimeout(() => {
      setReadyToDragSection(section);
      triggerHaptic();
    }, HOLD_DELAY);
  };

  const handleSectionTouchMove = (section: string) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touchStartPos.current && !readyToDragSection) {
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearSectionHoldTimer();
        touchStartPos.current = null;
      }
    }

    if (readyToDragSection === section || draggedSection === section) {
      if (!draggedSection) {
        setDraggedSection(section);
      }
      e.preventDefault();
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elemBelow) {
        const dropTarget = elemBelow.closest("[data-section-id]");
        if (dropTarget) {
          const targetId = dropTarget.getAttribute("data-section-id");
          if (targetId && targetId !== section) {
            const targetIndex = sectionOrder.indexOf(targetId);
            const currentIndex = sectionOrder.indexOf(section);
            if (targetIndex !== -1 && currentIndex !== -1 && targetIndex !== currentIndex) {
              const newOrder = [...sectionOrder];
              newOrder.splice(currentIndex, 1);
              newOrder.splice(targetIndex, 0, section);
              setSectionOrder(newOrder);
            }
          }
        }
      }
    }
  };

  const handleSectionTouchEnd = () => {
    clearSectionHoldTimer();
    setDraggedSection(null);
    setReadyToDragSection(null);
    touchStartPos.current = null;
  };

  const handleSectionMouseDown = (section: string) => () => {
    clearSectionHoldTimer();
    sectionHoldTimer.current = setTimeout(() => {
      setReadyToDragSection(section);
      triggerHaptic();
    }, HOLD_DELAY);
  };

  const handleSectionMouseUp = () => {
    clearSectionHoldTimer();
  };

  const handleSectionMouseLeave = () => {
    if (!draggedSection) {
      clearSectionHoldTimer();
      setReadyToDragSection(null);
    }
  };

  const handleSectionDragStart = (section: string) => (e: React.DragEvent) => {
    if (!readyToDragSection) {
      e.preventDefault();
      return;
    }
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData("text/plain", section);
  };

  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSectionDrop = (targetSection: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSection) {
      setDraggedSection(null);
      setReadyToDragSection(null);
      return;
    }

    const draggedIndex = sectionOrder.indexOf(draggedSection);
    const targetIndex = sectionOrder.indexOf(targetSection);
    
    const newOrder = [...sectionOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);
    
    setSectionOrder(newOrder);
    setDraggedSection(null);
    setReadyToDragSection(null);
  };

  const handleSectionDragEnd = () => {
    setDraggedSection(null);
    setReadyToDragSection(null);
    clearSectionHoldTimer();
  };

  const handleTileTouchStart = (tile: string) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    clearTileHoldTimer();
    tileHoldTimer.current = setTimeout(() => {
      setReadyToDragTile(tile);
      triggerHaptic();
    }, HOLD_DELAY);
  };

  const handleTileTouchMove = (tile: string) => (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touchStartPos.current && !readyToDragTile) {
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearTileHoldTimer();
        touchStartPos.current = null;
      }
    }

    if (readyToDragTile === tile || draggedTile === tile) {
      if (!draggedTile) {
        setDraggedTile(tile);
      }
      e.preventDefault();
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elemBelow) {
        const dropTarget = elemBelow.closest("[data-tile-id]");
        if (dropTarget) {
          const targetId = dropTarget.getAttribute("data-tile-id");
          if (targetId && targetId !== tile) {
            const targetIndex = tileOrder.indexOf(targetId);
            const currentIndex = tileOrder.indexOf(tile);
            if (targetIndex !== -1 && currentIndex !== -1 && targetIndex !== currentIndex) {
              const newOrder = [...tileOrder];
              newOrder.splice(currentIndex, 1);
              newOrder.splice(targetIndex, 0, tile);
              setTileOrder(newOrder);
              localStorage.setItem("tileOrder", JSON.stringify(newOrder));
            }
          }
        }
      }
    }
  };

  const handleTileTouchEnd = () => {
    clearTileHoldTimer();
    setDraggedTile(null);
    setReadyToDragTile(null);
    touchStartPos.current = null;
  };

  const handleTileMouseDown = (tile: string) => () => {
    clearTileHoldTimer();
    tileHoldTimer.current = setTimeout(() => {
      setReadyToDragTile(tile);
      triggerHaptic();
    }, HOLD_DELAY);
  };

  const handleTileMouseUp = () => {
    clearTileHoldTimer();
  };

  const handleTileMouseLeave = () => {
    if (!draggedTile) {
      clearTileHoldTimer();
      setReadyToDragTile(null);
    }
  };

  const handleTileDragStart = (tile: string) => (e: React.DragEvent) => {
    if (!readyToDragTile) {
      e.preventDefault();
      return;
    }
    setDraggedTile(tile);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData("text/plain", tile);
  };

  const handleTileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTileDrop = (targetTile: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTile || draggedTile === targetTile) {
      setDraggedTile(null);
      setReadyToDragTile(null);
      return;
    }

    const draggedIndex = tileOrder.indexOf(draggedTile);
    const targetIndex = tileOrder.indexOf(targetTile);
    
    const newOrder = [...tileOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTile);
    
    setTileOrder(newOrder);
    localStorage.setItem("tileOrder", JSON.stringify(newOrder));
    setDraggedTile(null);
    setReadyToDragTile(null);
  };

  const handleTileDragEnd = () => {
    setDraggedTile(null);
    setReadyToDragTile(null);
    clearTileHoldTimer();
  };

  const handleTileVisibilityChange = (tileType: string) => {
    const newVisibility = { ...visibleTiles, [tileType]: !visibleTiles[tileType] };
    setVisibleTiles(newVisibility);
    localStorage.setItem("tileVisibility", JSON.stringify(newVisibility));
  };

  const renderSection = (type: string) => {
    switch (type) {
      case 'today':
        return showTodayActivity ? (
          <section key="today" className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Flame className="text-accent fill-accent" size={20} />
              Today's Activity
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {tileOrder.map((tileType) => {
                if (!visibleTiles[tileType]) return null;

                if (tileType === "pull-up") {
                  return (
                    <StatCard 
                      key="pull-up"
                      title="Pull-ups" 
                      value={dailyStats.pullups} 
                      unit="reps" 
                      color="text-purple-500"
                      bgColor="bg-purple-500/10"
                    />
                  );
                } else if (tileType === "push-up") {
                  return (
                    <StatCard 
                      key="push-up"
                      title="Push-ups" 
                      value={dailyStats.pushups} 
                      unit="reps" 
                      color="text-blue-500"
                      bgColor="bg-blue-500/10"
                    />
                  );
                } else if (tileType === "run") {
                  return (
                    <StatCard 
                      key="run"
                      title="Running" 
                      value={dailyStats.run} 
                      unit="km" 
                      color="text-secondary"
                      bgColor="bg-secondary/10"
                    />
                  );
                } else if (tileType === "dip") {
                  return (
                    <StatCard 
                      key="dip"
                      title="Dips" 
                      value={dailyStats.dips} 
                      unit="reps" 
                      color="text-pink-500"
                      bgColor="bg-pink-500/10"
                    />
                  );
                } else {
                  const customEx = customExercisesData.find(ex => ex.name === tileType);
                  if (customEx) {
                    const customIdx = customExercisesData.indexOf(customEx);
                    const colorScheme = CUSTOM_EXERCISE_COLORS[customIdx % CUSTOM_EXERCISE_COLORS.length];
                    return (
                      <StatCard 
                        key={customEx.name}
                        title={customEx.name} 
                        value={customExerciseTotals[customEx.name] || 0} 
                        unit={customEx.unit} 
                        color={colorScheme.text}
                        bgColor={colorScheme.bg}
                      />
                    );
                  }
                }
                return null;
              })}
            </div>
          </section>
        ) : null;
      case 'challenges':
        return showChallenges ? (
          <section key="challenges" className="mb-8">
             <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Zap className="text-yellow-500 fill-yellow-500" size={20} />
                Active Challenges
              </h2>
            
            <div className="space-y-4">
              {loadingChallenges ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : challenges.length === 0 ? (
                <Card className="border-none shadow-sm dark:bg-zinc-900">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No active challenges. Create or join one!</p>
                  </CardContent>
                </Card>
              ) : (
                challenges.map(challenge => {
                  const myProgress = challenge.participants.find(p => p.userId === user?.uid);
                  const progressPercent = myProgress ? Math.round((myProgress.progress / challenge.goal) * 100) : 0;
                  return (
                    <Card key={challenge.id} className="overflow-hidden border-none shadow-sm dark:bg-zinc-900">
                      <CardContent className="p-0">
                        <div className="bg-card dark:bg-zinc-900 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{challenge.title}</h3>
                              <p className="text-xs text-muted-foreground">{challenge.description}</p>
                            </div>
                            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase">
                              {challenge.type}
                            </span>
                          </div>
                          
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{Math.min(progressPercent, 100)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        ) : null;
      case 'logs':
        return showRecentLogs ? (
          <section key="logs">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-gray-500" size={20} />
              Recent Logs
            </h2>
            <div className="bg-card dark:bg-zinc-900 rounded-2xl p-4 shadow-sm space-y-4">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : exerciseLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No workout logs yet. Start logging!</p>
              ) : (
                exerciseLogs.slice(0, 5).map(log => {
                  const IconComponent = EXERCISE_ICONS[log.exerciseType as keyof typeof EXERCISE_ICONS] || Activity;
                  return (
                    <div key={log.id} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0 border-dashed border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                          log.exerciseType === 'push-up' ? 'bg-blue-100 text-blue-600' :
                          log.exerciseType === 'pull-up' ? 'bg-purple-100 text-purple-600' :
                          log.exerciseType === 'dip' ? 'bg-pink-100 text-pink-600' :
                          'bg-green-100 text-green-600'
                        )}>
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{log.exerciseType.replace('-', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{log.amount} <span className="text-xs font-normal text-muted-foreground">{log.unit}</span></p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  const currentAvatarUrl = userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.username || 'user'}`;

  const todayLogs = exerciseLogs.filter(e => 
    new Date(e.timestamp).toDateString() === new Date().toDateString()
  );
  
  const dailyStats = {
    pushups: todayLogs.filter(e => e.exerciseType === "push-up").reduce((acc, curr) => acc + curr.amount, 0),
    pullups: todayLogs.filter(e => e.exerciseType === "pull-up").reduce((acc, curr) => acc + curr.amount, 0),
    dips: todayLogs.filter(e => e.exerciseType === "dip").reduce((acc, curr) => acc + curr.amount, 0),
    run: todayLogs.filter(e => e.exerciseType === "run").reduce((acc, curr) => acc + curr.amount, 0),
  };

  const customExerciseTotals: Record<string, number> = {};
  customExercisesData.forEach(ex => {
    customExerciseTotals[ex.name] = todayLogs
      .filter(log => log.exerciseType === ex.name && log.isCustom)
      .reduce((acc, curr) => acc + curr.amount, 0);
  });

  const toggleSync = () => {
    const newState = !isOnline;
    setIsOnline(newState);
    toast({
      title: newState ? "Back Online" : "Offline Mode Enabled",
      description: newState ? "Syncing data..." : "Data will be saved locally.",
      variant: newState ? "default" : "destructive",
    });
  };

  return (
    <Layout>
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/settings")}
            className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors flex-shrink-0 relative hover:scale-105"
          >
            <img src={currentAvatarUrl} alt="Profile" className="w-full h-full" />
          </button>
          <div>
            <h1 className="text-lg font-heading font-bold leading-tight">
              {userProfile?.username || user?.email?.split('@')[0] || 'User'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, MMM do")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleSync}
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors mr-2",
              isOnline ? "text-secondary bg-secondary/10" : "text-muted-foreground bg-muted"
            )}
          >
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="sr-only">{isOnline ? "Online" : "Offline"}</span>
          </button>
          
          <NotificationCenter />
        </div>
      </header>

      {sectionOrder.map(sectionType => renderSection(sectionType))}

      <div className="flex justify-center mt-8 mb-4">
        <Dialog open={isCustomizingHome} onOpenChange={setIsCustomizingHome}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
              <Settings size={16} />
              Customize
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customize Homepage</DialogTitle>
              <DialogDescription>Hold to drag and reorder sections and tiles.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 mt-4">
              <p className="text-xs font-semibold text-foreground mb-2">Sections</p>
              <p className="text-xs text-muted-foreground mb-3">Hold for 300ms then drag to reorder</p>
              {sectionOrder.map((section) => {
                let icon: React.ReactNode;
                let label: string;
                let checked: boolean;
                let onChange: (val: boolean) => void;
                
                if (section === 'today') {
                  icon = <Flame className="text-accent fill-accent" size={18} />;
                  label = "Today's Activity";
                  checked = showTodayActivity;
                  onChange = setShowTodayActivity;
                } else if (section === 'challenges') {
                  icon = <Zap className="text-yellow-500 fill-yellow-500" size={18} />;
                  label = "Active Challenges";
                  checked = showChallenges;
                  onChange = setShowChallenges;
                } else {
                  icon = <TrendingUp className="text-gray-500" size={18} />;
                  label = "Recent Logs";
                  checked = showRecentLogs;
                  onChange = setShowRecentLogs;
                }

                const isReady = readyToDragSection === section;
                const isDragging = draggedSection === section;

                return (
                  <div 
                    key={section}
                    data-section-id={section}
                    onTouchStart={handleSectionTouchStart(section)}
                    onTouchMove={handleSectionTouchMove(section)}
                    onTouchEnd={handleSectionTouchEnd}
                    onMouseDown={handleSectionMouseDown(section)}
                    onMouseUp={handleSectionMouseUp}
                    onMouseLeave={handleSectionMouseLeave}
                    draggable={isReady}
                    onDragStart={handleSectionDragStart(section)}
                    onDragOver={handleSectionDragOver}
                    onDrop={handleSectionDrop(section)}
                    onDragEnd={handleSectionDragEnd}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all select-none",
                      isDragging
                        ? "bg-primary/20 opacity-50 scale-[1.02] shadow-lg"
                        : isReady
                        ? "border-2 border-dashed border-primary bg-primary/5 cursor-grab"
                        : draggedSection
                        ? "bg-muted/50 border-2 border-dashed border-primary/40"
                        : "bg-muted/30 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <GripVertical size={16} className="text-muted-foreground flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                      {icon}
                      <Label className="cursor-inherit">{label}</Label>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(val) => onChange(val)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 mt-6">
              <p className="text-xs font-semibold text-foreground mb-2">Activity Tiles</p>
              <p className="text-xs text-muted-foreground mb-3">Hold for 300ms then drag to reorder</p>
              <div className="space-y-2">
                {tileOrder.map((tileType) => {
                  let label = tileType.charAt(0).toUpperCase() + tileType.slice(1).replace('-', ' ');
                  const customEx = customExercisesData.find(ex => ex.name === tileType);
                  if (customEx) {
                    label = customEx.name;
                  }

                  const isReady = readyToDragTile === tileType;
                  const isDragging = draggedTile === tileType;

                  return (
                    <div 
                      key={tileType}
                      data-tile-id={tileType}
                      onTouchStart={handleTileTouchStart(tileType)}
                      onTouchMove={handleTileTouchMove(tileType)}
                      onTouchEnd={handleTileTouchEnd}
                      onMouseDown={handleTileMouseDown(tileType)}
                      onMouseUp={handleTileMouseUp}
                      onMouseLeave={handleTileMouseLeave}
                      draggable={isReady}
                      onDragStart={handleTileDragStart(tileType)}
                      onDragOver={handleTileDragOver}
                      onDrop={handleTileDrop(tileType)}
                      onDragEnd={handleTileDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all select-none",
                        isDragging
                          ? "bg-primary/20 opacity-50 scale-[1.02] shadow-lg"
                          : isReady
                          ? "border-2 border-dashed border-primary bg-primary/5 cursor-grab"
                          : draggedTile
                          ? "bg-muted/50 border-2 border-dashed border-primary/40"
                          : "bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      )}
                    >
                      <GripVertical size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="cursor-inherit">{label}</Label>
                      </div>
                      <Switch
                        checked={visibleTiles[tileType] ?? true}
                        onCheckedChange={() => handleTileVisibilityChange(tileType)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, unit, color, bgColor }: { 
  title: string; 
  value: number; 
  unit: string; 
  color: string; 
  bgColor: string;
}) {
  return (
    <Card className="border-none shadow-md dark:bg-zinc-900 overflow-hidden">
      <CardContent className="p-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bgColor)}>
          <Activity className={color} size={20} />
        </div>
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className={cn("text-2xl font-bold", color)}>
          {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}
