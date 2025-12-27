import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";
import { Trophy, Award, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  progress: number;
  total: number;
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadAchievements();
  }, [user]);

  const loadAchievements = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/achievements"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error("Load achievements error:", error);
      toast({
        title: "Failed to load achievements",
        description: "Could not load achievements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "milestones", label: "Milestones" },
    { id: "xp", label: "XP" },
    { id: "levels", label: "Levels" },
    { id: "streaks", label: "Streaks" },
    { id: "exercises", label: "Exercises" },
    { id: "social", label: "Social" },
    { id: "challenges", label: "Challenges" },
  ];

  const filteredAchievements = filter === "all"
    ? achievements
    : achievements.filter(a => a.category === filter);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
    const progressPercentage = achievement.total > 0
      ? Math.round((achievement.progress / achievement.total) * 100)
      : 0;

    return (
      <Card
        className={cn(
          "border-none shadow-md transition-all",
          achievement.unlocked
            ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
            : "bg-muted/30"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "text-4xl p-2 rounded-full transition-all",
                achievement.unlocked
                  ? "scale-110 animate-pulse"
                  : "opacity-30 grayscale"
              )}
            >
              {achievement.unlocked ? achievement.icon : <Lock size={32} className="text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={cn(
                    "font-bold text-sm",
                    achievement.unlocked
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {achievement.name}
                </h3>
                {achievement.unlocked && (
                  <Trophy size={14} className="text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {achievement.description}
              </p>
              {!achievement.unlocked && achievement.progress > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {achievement.progress}/{achievement.total}
                    </span>
                    <span className="font-semibold text-primary">
                      {progressPercentage}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-1.5" />
                </div>
              )}
              {achievement.unlocked && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                  <Award size={12} />
                  Unlocked
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading achievements...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Achievements</h1>
          <p className="text-xs text-muted-foreground">Track your progress and unlock rewards</p>
        </div>

        {/* Overall Progress */}
        <Card className="border-none shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Overall Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {unlockedCount} of {totalCount} achievements unlocked
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold font-heading text-primary">
                  {completionPercentage}%
                </div>
              </div>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full grid grid-cols-4 md:grid-cols-8">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-3 mt-4">
              {filteredAchievements.length > 0 ? (
                <div className="space-y-3">
                  {/* Unlocked achievements first */}
                  {filteredAchievements
                    .filter(a => a.unlocked)
                    .map(achievement => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}

                  {/* Then locked achievements */}
                  {filteredAchievements
                    .filter(a => !a.unlocked)
                    .map(achievement => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}
                </div>
              ) : (
                <Card className="border-none shadow-md">
                  <CardContent className="p-8 text-center">
                    <Trophy size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No achievements in this category
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
