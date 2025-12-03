import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { currentUser, exercises, challenges, customExercises } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Activity, Flame, TrendingUp, Zap, Wifi, WifiOff, Settings, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useThemeToggle } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import NotificationCenter from "@/components/NotificationCenter";
import { PushupIcon, DipsIcon } from "@/pages/LogPage";

const EXERCISE_ICONS = {
  "push-up": PushupIcon,
  "pull-up": ArrowUp,
  "dip": DipsIcon,
  "run": Activity,
};

// Color scheme for custom exercises - cycle through these colors
const CUSTOM_EXERCISE_COLORS = [
  { bg: "bg-red-500/10", text: "text-red-500", hex: "#ef4444" },
  { bg: "bg-amber-500/10", text: "text-amber-500", hex: "#f59e0b" },
  { bg: "bg-cyan-500/10", text: "text-cyan-500", hex: "#06b6d4" },
  { bg: "bg-violet-500/10", text: "text-violet-500", hex: "#a78bfa" },
  { bg: "bg-rose-500/10", text: "text-rose-500", hex: "#f43f5e" },
];

export default function HomePage() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarCustomizing, setIsAvatarCustomizing] = useState(false);
  const [isCustomizingHome, setIsCustomizingHome] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(currentUser.username);
  const [previousAvatarSeed, setPreviousAvatarSeed] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [showTodayActivity, setShowTodayActivity] = useState(true);
  const [showChallenges, setShowChallenges] = useState(true);
  const [showRecentLogs, setShowRecentLogs] = useState(true);
  const [sectionOrder, setSectionOrder] = useState(['today', 'challenges', 'logs']);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [customExercisesData, setCustomExercisesData] = useState<Array<{ name: string; unit: string; buttons: number[] }>>([]);
  const [visibleTiles, setVisibleTiles] = useState<Record<string, boolean>>({
    "pull-up": true,
    "push-up": true,
    "run": true,
    "dip": true,
  });
  const [tileOrder, setTileOrder] = useState<string[]>(["pull-up", "push-up", "run", "dip"]);
  const [draggedTile, setDraggedTile] = useState<string | null>(null);
  const [inviteCodes, setInviteCodes] = useState([
    { id: 1, code: "ZEN-5K9P-2X", createdAt: "2025-01-15", used: false },
    { id: 2, code: "FIT-7Q3M-8Y", createdAt: "2025-01-14", used: true },
  ]);
  const { currentTheme, setTheme } = useThemeToggle();
  const [, setLocation] = useLocation();

  // Load custom exercises and tile preferences from localStorage on mount
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

      // Initialize tile visibility and order with standard tiles + custom exercises
      const standardTiles = ["pull-up", "push-up", "run", "dip"];
      const customTileIds = customExData.map(ex => ex.name);
      const allTiles = [...standardTiles, ...customTileIds];

      // Load saved visibility or use defaults (all visible)
      const savedVisibility = localStorage.getItem("tileVisibility");
      let newVisibility: Record<string, boolean> = {};
      allTiles.forEach(tile => {
        newVisibility[tile] = true;
      });
      if (savedVisibility) {
        try {
          const saved = JSON.parse(savedVisibility);
          newVisibility = { ...newVisibility, ...saved };
        } catch (e) {
          console.error("Failed to parse tile visibility", e);
        }
      }
      setVisibleTiles(newVisibility);

      // Load saved order or use defaults (standard first, then custom)
      const savedOrder = localStorage.getItem("tileOrder");
      let newOrder: string[] = allTiles;
      
      if (savedOrder) {
        try {
          const saved = JSON.parse(savedOrder);
          // Merge saved order with new custom exercises to ensure custom exercises are included
          const customNotInSaved = allTiles.filter(tile => !saved.includes(tile));
          newOrder = [...saved, ...customNotInSaved];
        } catch (e) {
          newOrder = allTiles;
        }
      }
      
      setTileOrder(newOrder);
    };
    
    loadTileSettings();
    
    // Listen for storage changes
    window.addEventListener("storage", loadTileSettings);
    return () => window.removeEventListener("storage", loadTileSettings);
  }, []);

  const generateInviteCode = () => {
    if (inviteCodes.length >= 10) {
      toast({
        title: "Limit Reached",
        description: "You can only have a maximum of 10 invite codes.",
        variant: "destructive",
      });
      return;
    }
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part3 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const code = `${part1}-${part2}-${part3}`;
    
    const newCode = {
      id: Math.max(...inviteCodes.map(c => c.id), 0) + 1,
      code,
      createdAt: new Date().toISOString().split('T')[0],
      used: false,
    };
    
    setInviteCodes([newCode, ...inviteCodes]);
    toast({
      title: "Invite Code Generated!",
      description: `${code} is ready to share.`,
    });
  };

  const revokeInviteCode = (id: number) => {
    setInviteCodes(inviteCodes.filter(c => c.id !== id));
    toast({
      title: "Invite Code Revoked",
      description: "The code has been deleted.",
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `${code} copied to clipboard.`,
    });
  };

  const handleDragStart = (e: React.DragEvent, section: string) => {
    setDraggedItem(section);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSection: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetSection) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = sectionOrder.indexOf(draggedItem);
    const targetIndex = sectionOrder.indexOf(targetSection);
    
    const newOrder = [...sectionOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    setSectionOrder(newOrder);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleTileDragStart = (e: React.DragEvent, tileType: string) => {
    setDraggedTile(tileType);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTileDrop = (e: React.DragEvent, targetTile: string) => {
    e.preventDefault();
    if (!draggedTile || draggedTile === targetTile) {
      setDraggedTile(null);
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
  };

  const handleTileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
                  // Custom exercise
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
              {challenges.map(challenge => (
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
                          <span className="font-medium">{Math.round((challenge.participants[0].progress / challenge.goal) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${(challenge.participants[0].progress / challenge.goal) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              {exercises.map(log => {
                const IconComponent = EXERCISE_ICONS[log.type as keyof typeof EXERCISE_ICONS];
                return (
                <div key={log.id} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0 border-dashed border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                      log.type === 'push-up' ? 'bg-blue-100 text-blue-600' :
                      log.type === 'pull-up' ? 'bg-purple-100 text-purple-600' :
                      log.type === 'dip' ? 'bg-pink-100 text-pink-600' :
                      'bg-green-100 text-green-600'
                    )}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{log.type}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{log.amount} <span className="text-xs font-normal text-muted-foreground">{log.type === 'run' ? 'km' : 'reps'}</span></p>
                    {(!log.synced || !isOnline) && <p className="text-[10px] text-orange-400 flex items-center justify-end gap-1"><WifiOff size={8} /> Pending</p>}
                  </div>
                </div>
              );
              })}
            </div>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  const currentAvatarUrl = customAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

  const generateNewAvatar = () => {
    setPreviousAvatarSeed(avatarSeed);
    const randomSeed = `avatar-${Math.random().toString(36).substring(7)}`;
    setAvatarSeed(randomSeed);
    setCustomAvatarUrl(null);
    toast({
      title: "Avatar Generated!",
      description: "Your new avatar is ready.",
    });
  };

  const revertToPreviousAvatar = () => {
    if (previousAvatarSeed) {
      setAvatarSeed(previousAvatarSeed);
      setCustomAvatarUrl(null);
      toast({
        title: "Avatar Reverted",
        description: "Restored your previous avatar.",
      });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviousAvatarSeed(avatarSeed);
        setCustomAvatarUrl(reader.result as string);
        setIsAvatarCustomizing(false);
        toast({
          title: "Avatar Updated!",
          description: "Your custom avatar has been set.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved.",
    });
  };

  const handleSignOut = () => {
    setIsEditing(false);
    setLocation("/auth");
  };
  
  // Calculate daily stats (includes custom exercises for today)
  const todayLogs = exercises.filter(e => 
    new Date(e.timestamp).toDateString() === new Date().toDateString()
  );

  const todayCustomLogs = customExercises.filter(e =>
    new Date(e.timestamp).toDateString() === new Date().toDateString()
  );
  
  const dailyStats = {
    pushups: todayLogs.filter(e => e.type === "push-up").reduce((acc, curr) => acc + curr.amount, 0),
    pullups: todayLogs.filter(e => e.type === "pull-up").reduce((acc, curr) => acc + curr.amount, 0),
    dips: todayLogs.filter(e => e.type === "dip").reduce((acc, curr) => acc + curr.amount, 0),
    run: todayLogs.filter(e => e.type === "run").reduce((acc, curr) => acc + curr.amount, 0),
  };

  // Calculate custom exercise totals for today
  const customExerciseTotals: Record<string, number> = {};
  customExercisesData.forEach(ex => {
    customExerciseTotals[ex.name] = todayCustomLogs
      .filter(log => log.type === ex.name)
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
      {/* Header */}
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
              {currentUser.username}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, MMM do")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
           {/* Sync Status Toggle */}
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

      {/* Render sections in custom order */}
      {sectionOrder.map(sectionType => renderSection(sectionType))}

      {/* Customize Homepage Button */}
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
              <DialogDescription>Manage sections and activity tiles.</DialogDescription>
            </DialogHeader>
            
            {/* Section-level controls */}
            <div className="space-y-2 mt-4">
              <p className="text-xs font-semibold text-foreground mb-2">Sections</p>
              <p className="text-xs text-muted-foreground mb-3">Drag to reorder sections</p>
              {sectionOrder.map((section) => {
                let icon, label, checked, onChange;
                
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
                } else if (section === 'logs') {
                  icon = <TrendingUp className="text-gray-500" size={18} />;
                  label = "Recent Logs";
                  checked = showRecentLogs;
                  onChange = setShowRecentLogs;
                }

                return (
                  <div 
                    key={section} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, section)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, section)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-move transition-all",
                      draggedItem === section 
                        ? "bg-primary/20 opacity-50" 
                        : draggedItem 
                        ? "bg-muted/50 border-2 border-dashed border-primary/40"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-lg">⋮⋮</span>
                    <Label className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                      {icon}
                      {label}
                    </Label>
                    <Switch 
                      checked={checked}
                      onCheckedChange={onChange}
                    />
                  </div>
                );
              })}
            </div>

            {/* Tile-level controls */}
            <div className="space-y-2 mt-6 pt-4 border-t">
              <p className="text-xs font-semibold text-foreground mb-2">Today's Activity Tiles</p>
              <p className="text-xs text-muted-foreground mb-3">Drag to reorder, toggle to show/hide</p>
              {tileOrder.map((tileType, idx) => {
                let label = "";
                let icon = null;

                if (tileType === "pull-up") {
                  label = "Pull-ups";
                  icon = <ArrowUp size={18} className="text-purple-500" />;
                } else if (tileType === "push-up") {
                  label = "Push-ups";
                  icon = <span className="w-5 h-5 text-blue-500 flex items-center justify-center"><PushupIcon /></span>;
                } else if (tileType === "run") {
                  label = "Running";
                  icon = <Activity size={18} className="text-secondary" />;
                } else if (tileType === "dip") {
                  label = "Dips";
                  icon = <span className="w-5 h-5 text-pink-500 flex items-center justify-center"><DipsIcon /></span>;
                } else {
                  // Custom exercise - get its color based on index
                  const customIdx = customExercisesData.findIndex(ex => ex.name === tileType);
                  const colorScheme = CUSTOM_EXERCISE_COLORS[Math.max(0, customIdx) % CUSTOM_EXERCISE_COLORS.length];
                  label = tileType;
                  icon = <span className={`w-5 h-5 ${colorScheme.text} flex items-center justify-center`}>⚙</span>;
                }

                return (
                  <div
                    key={tileType}
                    draggable
                    onDragStart={(e) => handleTileDragStart(e, tileType)}
                    onDragOver={handleTileDragOver}
                    onDrop={(e) => handleTileDrop(e, tileType)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-move transition-all",
                      draggedTile === tileType 
                        ? "bg-primary/20 opacity-50" 
                        : draggedTile 
                        ? "bg-muted/50 border-2 border-dashed border-primary/40"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-lg">⋮⋮</span>
                    <Label className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                      {icon}
                      {label}
                    </Label>
                    <Switch 
                      checked={visibleTiles[tileType] ?? true}
                      onCheckedChange={() => handleTileVisibilityChange(tileType)}
                    />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, unit, color, bgColor }: { title: string, value: number, unit: string, color: string, bgColor: string }) {
  return (
    <div className={cn("rounded-2xl p-4 flex flex-col justify-between h-28 transition-transform hover:scale-[1.02]", bgColor)}>
      <span className={cn("font-semibold text-xs opacity-90", color)}>{title}</span>
      <div>
        <span className={cn("text-5xl font-black font-heading", color)}>{value}</span>
        <span className={cn("text-xs ml-1 opacity-70", color)}>{unit}</span>
      </div>
    </div>
  )
}
