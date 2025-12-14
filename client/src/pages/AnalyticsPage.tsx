import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3, Calendar, Target, Flame, Award } from "lucide-react";

type ExerciseLog = {
  id: string;
  exerciseType: string;
  amount: number;
  timestamp: number;
  xpGained: number;
  unit?: string;
};

type DailyStats = {
  date: string;
  xp: number;
  workouts: number;
  volume: number;
};

type ExerciseBreakdown = {
  type: string;
  count: number;
  total: number;
};

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function AnalyticsPage() {
  const { user, userProfile } = useAuth();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    loadWorkoutLogs();
  }, [user]);

  const loadWorkoutLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl("/api/workouts"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Load logs error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs by time range
  const getFilteredLogs = () => {
    if (timeRange === "all") return logs;

    const now = Date.now();
    const ranges = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    return logs.filter(log => log.timestamp >= cutoff);
  };

  const filteredLogs = getFilteredLogs();

  // Calculate daily stats for trend charts
  const getDailyStats = (): DailyStats[] => {
    const dailyMap = new Map<string, DailyStats>();

    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      const existing = dailyMap.get(date) || { date, xp: 0, workouts: 0, volume: 0 };

      dailyMap.set(date, {
        date,
        xp: existing.xp + (log.xpGained || 0),
        workouts: existing.workouts + 1,
        volume: existing.volume + log.amount,
      });
    });

    return Array.from(dailyMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Calculate exercise type breakdown
  const getExerciseBreakdown = (): ExerciseBreakdown[] => {
    const breakdownMap = new Map<string, ExerciseBreakdown>();

    filteredLogs.forEach(log => {
      const existing = breakdownMap.get(log.exerciseType) || {
        type: log.exerciseType,
        count: 0,
        total: 0,
      };

      breakdownMap.set(log.exerciseType, {
        type: log.exerciseType,
        count: existing.count + 1,
        total: existing.total + log.amount,
      });
    });

    return Array.from(breakdownMap.values()).sort((a, b) => b.total - a.total);
  };

  // Calculate weekly aggregates
  const getWeeklyStats = () => {
    const weeklyMap = new Map<string, { week: string; total: number }>();

    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString();

      const existing = weeklyMap.get(weekKey) || { week: weekKey, total: 0 };
      weeklyMap.set(weekKey, {
        week: weekKey,
        total: existing.total + (log.xpGained || 0),
      });
    });

    return Array.from(weeklyMap.values()).sort((a, b) =>
      new Date(a.week).getTime() - new Date(b.week).getTime()
    );
  };

  // Calculate key metrics
  const totalWorkouts = filteredLogs.length;
  const totalXP = filteredLogs.reduce((sum, log) => sum + (log.xpGained || 0), 0);
  const avgWorkoutsPerDay = totalWorkouts / Math.max(1, getDailyStats().length);
  const currentStreak = calculateStreak();

  function calculateStreak(): number {
    if (filteredLogs.length === 0) return 0;

    const sortedLogs = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = today.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const workoutDates = new Set(
      sortedLogs.map(log => {
        const d = new Date(log.timestamp);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    while (workoutDates.has(currentDate)) {
      streak++;
      currentDate -= dayMs;
    }

    return streak;
  }

  const dailyStats = getDailyStats();
  const exerciseBreakdown = getExerciseBreakdown();
  const weeklyStats = getWeeklyStats();

  const StatCard = ({ icon: Icon, title, value, subtitle }: any) => (
    <Card className="border-none shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-heading">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Analytics</h1>
            <p className="text-xs text-muted-foreground">Track your progress and insights</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={BarChart3}
            title="Total Workouts"
            value={totalWorkouts}
            subtitle={`${avgWorkoutsPerDay.toFixed(1)}/day avg`}
          />
          <StatCard
            icon={TrendingUp}
            title="Total XP"
            value={totalXP.toLocaleString()}
          />
          <StatCard
            icon={Flame}
            title="Current Streak"
            value={`${currentStreak} day${currentStreak !== 1 ? 's' : ''}`}
          />
          <StatCard
            icon={Award}
            title="Level"
            value={userProfile?.level || 1}
            subtitle={`${userProfile?.xp.toLocaleString() || 0} XP`}
          />
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
          </TabsList>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            {dailyStats.length > 0 ? (
              <>
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">XP Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={dailyStats}>
                        <defs>
                          <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="xp"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill="url(#xpGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">Workout Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="volume"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No workout data for this time range
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            {exerciseBreakdown.length > 0 ? (
              <>
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">Exercise Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={exerciseBreakdown}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={(entry) => entry.type}
                        >
                          {exerciseBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">Exercise Totals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {exerciseBreakdown.map((item, idx) => (
                        <div key={item.type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-sm font-medium capitalize">{item.type}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{item.total.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{item.count} workouts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <Target size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No exercise data for this time range
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Weekly Tab */}
          <TabsContent value="weekly" className="space-y-4">
            {weeklyStats.length > 0 ? (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Weekly XP Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-md">
                <CardContent className="p-8 text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No weekly data for this time range
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
