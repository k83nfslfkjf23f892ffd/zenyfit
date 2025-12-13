import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, List, ChartLine, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface RankingUser {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  level: number;
  xp: number;
  isMe?: boolean;
}

export default function LeaderboardPage() {
  return (
    <Layout>
      <h1 className="text-2xl font-heading font-bold mb-6">Global Rankings</h1>
      <GlobalLeaderboard />
    </Layout>
  );
}

function GlobalLeaderboard() {
  const { user } = useAuth();
  const [type, setType] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(getApiUrl(`/api/leaderboard?type=${type}&limit=20`));
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.rankings) {
          const rankingsWithMe = data.rankings.map((r: RankingUser) => ({
            ...r,
            isMe: user?.uid === r.userId,
          }));
          setRankings(rankingsWithMe);
        } else {
          setRankings([]);
          if (!data.success) {
            setError(data.error || "Failed to load rankings");
          }
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        setError(err instanceof Error ? err.message : "Failed to connect to server");
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [type, user?.uid]);

  // Load saved view mode from localStorage on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem("leaderboardViewMode") as "list" | "chart" | null;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("leaderboardViewMode", viewMode);
  }, [viewMode]);

  const [trendData, setTrendData] = useState<Array<{ date: string; you: number; top: number }>>([]);

  useEffect(() => {
    const fetchTrendData = async () => {
      if (!user) return;
      
      try {
        const token = await user.getIdToken(true);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        
        const [workoutsResponse, trendResponse] = await Promise.all([
          fetch(getApiUrl("/api/workouts?days=7"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(getApiUrl("/api/leaderboard-trend"))
        ]);
        
        const dailyTotals: Record<string, number> = {};
        const topAvgTotals: Record<string, number> = {};
        
        if (workoutsResponse.ok) {
          const data = await workoutsResponse.json();
          if (data.success && data.logs) {
            data.logs.forEach((log: { amount: number; timestamp: number }) => {
              const date = new Date(log.timestamp);
              const dayName = dayNames[date.getDay()];
              dailyTotals[dayName] = (dailyTotals[dayName] || 0) + log.amount;
            });
          }
        }
        
        if (trendResponse.ok) {
          const trendDataRes = await trendResponse.json();
          if (trendDataRes.success && trendDataRes.trendData) {
            trendDataRes.trendData.forEach((item: { date: string; topAvg: number }) => {
              topAvgTotals[item.date] = item.topAvg;
            });
          }
        }
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayName = dayNames[d.getDay()];
          last7Days.push({
            date: dayName,
            you: dailyTotals[dayName] || 0,
            top: topAvgTotals[dayName] || 0,
          });
        }
        
        setTrendData(last7Days);
      } catch (err) {
        console.error("Failed to fetch trend data:", err);
      }
    };

    fetchTrendData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3 justify-center pb-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px] h-10 text-sm font-medium">
             <SelectValue placeholder="Filter by exercise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exercises</SelectItem>
            <SelectItem value="push-up">Push-ups</SelectItem>
            <SelectItem value="pull-up">Pull-ups</SelectItem>
            <SelectItem value="dip">Dips</SelectItem>
            <SelectItem value="run">Running</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggleable Chart Section */}
      {viewMode === "list" ? (
        <Card className="border-none shadow-xl bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-slate-900 dark:text-zinc-100">Quick Comparison</CardTitle>
              <div className="bg-slate-400 dark:bg-muted p-1 rounded-lg flex cursor-pointer" onClick={() => setViewMode(viewMode === "list" ? "chart" : "list")}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-6 w-8 px-0 rounded-md", viewMode === "list" && "bg-slate-300 dark:bg-zinc-700 shadow-sm text-primary")}
                  onClick={() => setViewMode("list")}
                >
                  <List size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-6 w-8 px-0 rounded-md", viewMode === "chart" && "bg-slate-300 dark:bg-zinc-700 shadow-sm text-primary")}
                  onClick={() => setViewMode("chart")}
                >
                  <ChartLine size={14} />
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">Current leaderboard standings</p>
          </CardHeader>
          <CardContent className="p-4">
             <div className="h-[200px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={rankings} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                   <XAxis 
                     dataKey="username" 
                     tick={{ fontSize: 10, fill: '#64748b' }} 
                     tickLine={false}
                     axisLine={false}
                     interval={0}
                   />
                   <YAxis 
                     tick={{ fontSize: 10, fill: '#64748b' }} 
                     tickLine={false}
                     axisLine={false}
                   />
                   <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                     itemStyle={{ color: '#1e293b' }}
                   />
                   <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                     {rankings.map((entry, index) => (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={entry.isMe ? '#6C5CE7' : '#52525b'} 
                       />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-xl bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
               <div>
                 <CardTitle className="text-lg font-medium text-slate-900 dark:text-zinc-100">Performance Trend</CardTitle>
                 <p className="text-xs text-zinc-400 mt-1">Total volume for the last 7 days</p>
               </div>
               <div className="flex gap-4 items-center">
                 <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <span className="w-2 h-2 rounded-full bg-primary"></span> You
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <span className="w-2 h-2 rounded-full bg-zinc-600"></span> Top 10 Avg
                    </span>
                 </div>
                 <div className="bg-slate-400 dark:bg-muted p-1 rounded-lg flex cursor-pointer" onClick={() => setViewMode(viewMode === "list" ? "chart" : "list")}>
                   <Button
                     variant="ghost"
                     size="sm"
                     className={cn("h-6 w-8 px-0 rounded-md", viewMode === "list" && "bg-slate-300 dark:bg-zinc-700 shadow-sm text-primary")}
                     onClick={() => setViewMode("list")}
                   >
                     <List size={14} />
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     className={cn("h-6 w-8 px-0 rounded-md", viewMode === "chart" && "bg-slate-300 dark:bg-zinc-700 shadow-sm text-primary")}
                     onClick={() => setViewMode("chart")}
                   >
                     <ChartLine size={14} />
                   </Button>
                 </div>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={trendData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.8}/>
                       <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorTop" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#52525b" stopOpacity={0.8}/>
                       <stop offset="95%" stopColor="#52525b" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                     itemStyle={{ color: '#e4e4e7' }}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="top" 
                     stroke="#52525b" 
                     fillOpacity={1} 
                     fill="url(#colorTop)" 
                     strokeWidth={2}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="you" 
                     stroke="#6C5CE7" 
                     fillOpacity={1} 
                     fill="url(#colorYou)" 
                     strokeWidth={3}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-between px-6 pb-4 pt-2 text-xs text-zinc-500 font-medium">
                {trendData.map((d, i) => (
                  <span key={i}>{d.date}</span>
                ))}
             </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking List - Always visible now */}
      <Card className="border-none shadow-sm dark:bg-zinc-900">
        <CardContent className="p-0">
           <div className="bg-primary/5 dark:bg-zinc-800 p-4 flex items-center justify-between border-b border-primary/10 dark:border-zinc-700">
              <div className="flex items-center gap-2 text-primary dark:text-white font-semibold">
                <Globe size={18} />
                Global Rankings
              </div>
              <span className="text-xs text-muted-foreground dark:text-zinc-400 bg-muted dark:bg-zinc-800 px-2 py-1 rounded">
                {rankings.length > 0 ? `Top ${rankings.length}` : "Loading..."}
              </span>
           </div>
           {loading ? (
             <div className="flex items-center justify-center p-8">
               <Loader2 className="w-6 h-6 animate-spin text-primary" />
             </div>
           ) : error ? (
             <div className="p-8 text-center">
               <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
               <p className="text-destructive font-medium">Failed to load rankings</p>
               <p className="text-sm text-muted-foreground mt-1">{error}</p>
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="mt-4"
                 onClick={() => window.location.reload()}
               >
                 Try Again
               </Button>
             </div>
           ) : rankings.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">
               <p>No rankings yet. Be the first to log a workout!</p>
             </div>
           ) : (
             <div className="divide-y">
               {rankings.map((rankUser) => (
                 <div key={rankUser.rank} className={cn(
                   "flex items-center justify-between p-4 hover:bg-muted/20 dark:hover:bg-zinc-800/50 transition-colors border-b dark:border-zinc-700 last:border-0",
                   rankUser.isMe && "bg-gradient-to-r from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10"
                 )}>
                   <div className="flex items-center gap-4">
                     <div className={cn(
                       "w-6 text-center font-bold",
                       rankUser.rank === 1 ? "text-yellow-500" :
                       rankUser.rank === 2 ? "text-gray-400" :
                       rankUser.rank === 3 ? "text-amber-600" : "text-muted-foreground dark:text-zinc-400"
                     )}>
                       {rankUser.rank}
                     </div>
                     <div className="relative">
                       <img src={rankUser.avatar} className="w-10 h-10 rounded-full bg-muted dark:bg-zinc-800" />
                     </div>
                     <div>
                       <p className={cn("font-medium text-sm dark:text-white font-semibold", rankUser.isMe && "text-primary")}>
                         {rankUser.username}
                       </p>
                       <p className="text-[10px] text-muted-foreground dark:text-zinc-400 capitalize">Level {rankUser.level || 1}</p>
                     </div>
                   </div>
                   <div className="text-right">
                      <span className={cn("font-heading font-bold block", rankUser.isMe ? "text-primary text-lg" : "dark:text-white")}>{rankUser.score}</span>
                      <span className="text-[10px] text-muted-foreground dark:text-zinc-400 uppercase">{type === "run" ? "km" : "XP"}</span>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
