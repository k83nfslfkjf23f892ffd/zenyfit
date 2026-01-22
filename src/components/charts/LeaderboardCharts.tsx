'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { User, Users, Dumbbell } from 'lucide-react';
import { EXERCISE_INFO } from '@shared/constants';

// Colors for different exercises
const EXERCISE_COLORS: Record<string, string> = {
  pushups: 'hsl(var(--primary))',
  pullups: 'hsl(var(--chart-2))',
  dips: 'hsl(var(--chart-3))',
  muscleups: 'hsl(var(--chart-4))',
  chinups: 'hsl(var(--chart-5))',
};

const DEFAULT_COLOR = 'hsl(var(--primary))';

interface ChartData {
  scope: 'personal' | 'community';
  range: 'daily' | 'weekly' | 'monthly';
  exerciseTotals: Array<{ type: string; name: string; reps: number }>;
  repsOverTime: Array<Record<string, string | number>>;
  activity: Array<{ period: string; reps: number; workouts: number }>;
  topExercises: string[];
  summary: {
    totalReps: number;
    totalWorkouts: number;
    periodLabel: string;
  };
}

interface LeaderboardChartsProps {
  firebaseUser: { getIdToken: () => Promise<string> } | null;
}

const CACHE_KEY = 'zenyfit_chart_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(scope: string, range: string): ChartData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const key = `${scope}_${range}`;
    const entry = data[key];

    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setCachedData(scope: string, range: string, data: ChartData) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const existing = cached ? JSON.parse(cached) : {};
    const key = `${scope}_${range}`;

    existing[key] = {
      data,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore cache errors
  }
}

export function LeaderboardCharts({ firebaseUser }: LeaderboardChartsProps) {
  const [scope, setScope] = useState<'personal' | 'community'>('personal');
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (newScope: string, newRange: string, skipCache = false) => {
    // Try cache first (unless skipCache is true)
    if (!skipCache) {
      const cached = getCachedData(newScope, newRange);
      if (cached) {
        setData(cached);
        // Still fetch fresh data in background
        fetchStats(newScope, newRange, true);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `/api/leaderboard/stats?scope=${newScope}&range=${newRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const newData = await response.json();
        setData(newData);
        setCachedData(newScope, newRange, newData);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (!getCachedData(newScope, newRange)) {
          setError(errorData.details || errorData.error || 'Failed to load');
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      if (!getCachedData(scope, range)) {
        setError('Network error');
      }
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, scope, range]);

  // Initial load - try cache first
  useEffect(() => {
    if (firebaseUser) {
      const cached = getCachedData(scope, range);
      if (cached) {
        setData(cached);
      }
      fetchStats(scope, range);
    }
  }, [firebaseUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when scope or range changes
  useEffect(() => {
    if (firebaseUser) {
      fetchStats(scope, range);
    }
  }, [scope, range, firebaseUser, fetchStats]);

  const handleScopeChange = (newScope: string) => {
    setScope(newScope as 'personal' | 'community');
  };

  const handleRangeChange = (newRange: string) => {
    setRange(newRange as 'daily' | 'weekly' | 'monthly');
  };

  // Format period label for display
  const formatPeriod = (period: string) => {
    if (period.includes(':')) {
      return period; // Hour format
    }
    const date = new Date(period);
    if (range === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  if (error && !data) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchStats(scope, range, true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5" />
            Calisthenics
          </CardTitle>
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Updating...
            </span>
          )}
        </div>

        {/* Scope Tabs */}
        <Tabs value={scope} onValueChange={handleScopeChange} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="personal" className="text-xs gap-1">
              <User className="h-3 w-3" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Community
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Range Tabs */}
        <Tabs value={range} onValueChange={handleRangeChange} className="mt-2">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {data.summary.totalReps.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                reps {data.summary.periodLabel}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-2xl font-bold">
                {data.summary.totalWorkouts}
              </div>
              <div className="text-xs text-muted-foreground">
                workouts {data.summary.periodLabel}
              </div>
            </div>
          </div>
        )}

        {/* Reps Over Time Chart */}
        {data && data.activity.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Reps Over Time</h4>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.activity}>
                <defs>
                  <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={formatPeriod}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [value.toLocaleString() + ' reps', 'Total']}
                  labelFormatter={formatPeriod}
                />
                <Area
                  type="monotone"
                  dataKey="reps"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#repsGradient)"
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Exercise Breakdown Chart */}
        {data && data.exerciseTotals.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">By Exercise</h4>
            <ResponsiveContainer width="100%" height={Math.max(150, data.exerciseTotals.length * 32)}>
              <BarChart data={data.exerciseTotals.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [value.toLocaleString() + ' reps', 'Total']}
                />
                <Bar
                  dataKey="reps"
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--primary))"
                  animationDuration={400}
                >
                  {data.exerciseTotals.slice(0, 6).map((entry) => (
                    <rect
                      key={entry.type}
                      fill={EXERCISE_COLORS[entry.type] || DEFAULT_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Empty state */}
        {data && data.exerciseTotals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Dumbbell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No calisthenics logged {data.summary.periodLabel}</p>
            <p className="text-xs mt-1">
              {scope === 'personal' ? 'Log some reps to see your progress!' : 'Be the first to log some reps!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Keep the old export for backwards compatibility during transition
export default LeaderboardCharts;
