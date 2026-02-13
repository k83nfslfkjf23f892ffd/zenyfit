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
import { getNestedCache, setNestedCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';
import { useHoldToReveal, tooltipVisibility, HighlightCursor, holdActiveDot, holdTransition, useStickyTooltip } from '@/lib/use-hold-to-reveal';

// Colors for different exercises - using theme colors with opacity variants
const EXERCISE_COLORS: Record<string, string> = {
  pushups: 'rgb(var(--primary))',
  pullups: 'rgb(var(--secondary))',
  dips: 'rgb(var(--accent))',
  muscleups: 'rgb(var(--primary) / 0.7)',
  chinups: 'rgb(var(--secondary) / 0.7)',
  passive_dead_hang: 'rgb(var(--accent) / 0.7)',
  active_dead_hang: 'rgb(var(--primary) / 0.5)',
  flexed_arm_hang: 'rgb(var(--secondary) / 0.5)',
};

const DEFAULT_COLOR = 'rgb(var(--primary))';

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

const CACHE_TTL = CACHE_TTLS.chartData;

function getSavedFilters(): { scope: 'personal' | 'community'; range: 'daily' | 'weekly' | 'monthly' } {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.chartFilters);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        scope: parsed.scope || 'personal',
        range: parsed.range || 'weekly',
      };
    }
  } catch {
    // Ignore errors
  }
  return { scope: 'personal', range: 'weekly' };
}

function saveFilters(scope: string, range: string) {
  try {
    localStorage.setItem(CACHE_KEYS.chartFilters, JSON.stringify({ scope, range }));
  } catch {
    // Ignore errors
  }
}

// Custom tooltip component to avoid default Recharts styling
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  formatter?: (period: string) => string;
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-surface rounded-lg px-3 py-2 shadow-lg border border-border">
      <p className="text-xs text-foreground/40 mb-1">
        {formatter ? formatter(label || '') : label}
      </p>
      <p className="text-sm font-medium text-foreground">
        {payload[0].value.toLocaleString()} reps
      </p>
    </div>
  );
}

function getCachedData(scope: string, range: string) {
  return getNestedCache<ChartData>(CACHE_KEYS.chartData, `${scope}_${range}`, CACHE_TTL);
}

function setCachedData(scope: string, range: string, data: ChartData) {
  setNestedCache(CACHE_KEYS.chartData, `${scope}_${range}`, data);
}

export function LeaderboardCharts({ firebaseUser }: LeaderboardChartsProps) {
  const { isHolding: isHoldingArea, handlers: areaHandlers, lastTooltipRef: areaTooltipRef } = useHoldToReveal();
  const { isHolding: isHoldingBar, handlers: barHandlers, lastTooltipRef: barTooltipRef } = useHoldToReveal();
  const stickyAreaProps = useStickyTooltip(areaTooltipRef, isHoldingArea);
  const stickyBarProps = useStickyTooltip(barTooltipRef, isHoldingBar);
  const [scope, setScope] = useState<'personal' | 'community'>(() => {
    if (typeof window !== 'undefined') {
      return getSavedFilters().scope;
    }
    return 'personal';
  });
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>(() => {
    if (typeof window !== 'undefined') {
      return getSavedFilters().range;
    }
    return 'weekly';
  });
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (newScope: string, newRange: string, skipCache = false) => {
    // Try cache first (unless skipCache is true)
    if (!skipCache) {
      const cached = getCachedData(newScope, newRange);
      if (cached) {
        setData(cached.data);
        // Only background fetch when stale
        if (cached.isStale) {
          fetchStats(newScope, newRange, true);
        }
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
        setData(cached.data);
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
    saveFilters(newScope, range);
  };

  const handleRangeChange = (newRange: string) => {
    setRange(newRange as 'daily' | 'weekly' | 'monthly');
    saveFilters(scope, newRange);
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
          <div className="flex flex-col items-center justify-center text-foreground/40">
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
    <div className="space-y-5">
      {/* Controls tile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg gradient-bg-subtle">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              Calisthenics
            </CardTitle>
            {loading && (
              <span className="text-xs text-foreground/40 animate-pulse">
                Updating...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {/* Scope Tabs */}
          <Tabs value={scope} onValueChange={handleScopeChange}>
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
          <Tabs value={range} onValueChange={handleRangeChange}>
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary Stats tile */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold gradient-text">
                {data.summary.totalReps.toLocaleString()}
              </div>
              <div className="text-xs text-foreground/40">
                reps {data.summary.periodLabel}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">
                {data.summary.totalWorkouts}
              </div>
              <div className="text-xs text-foreground/40">
                workouts {data.summary.periodLabel}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reps Over Time tile */}
      {data && data.activity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reps Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div {...areaHandlers}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.activity}>
                  <defs>
                    <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'rgb(var(--foreground) / 0.4)', fontSize: 10 }}
                    tickFormatter={formatPeriod}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgb(var(--foreground) / 0.4)', fontSize: 10 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip content={(props) => {
                    const p = stickyAreaProps(props as { active?: boolean; payload?: unknown[]; label?: string });
                    return <CustomTooltip active={p.active} payload={p.payload as CustomTooltipProps['payload']} label={p.label} formatter={formatPeriod} />;
                  }} wrapperStyle={tooltipVisibility(isHoldingArea)} cursor={isHoldingArea ? <HighlightCursor /> : false} />
                  <Area
                    type="monotone"
                    dataKey="reps"
                    stroke="rgb(var(--primary))"
                    strokeWidth={2}
                    strokeOpacity={isHoldingArea ? 0.4 : 1}
                    fill="url(#repsGradient)"
                    fillOpacity={isHoldingArea ? 0.4 : 1}
                    activeDot={isHoldingArea ? holdActiveDot('rgb(var(--primary))') : false}
                    style={holdTransition}
                    animationDuration={400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Breakdown tile */}
      {data && data.exerciseTotals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <div {...barHandlers}>
              <ResponsiveContainer width="100%" height={Math.max(150, data.exerciseTotals.slice(0, 6).length * 32)}>
                <BarChart data={data.exerciseTotals.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgb(var(--foreground) / 0.4)', fontSize: 10 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'rgb(var(--foreground) / 0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip content={(props) => {
                    const p = stickyBarProps(props as { active?: boolean; payload?: unknown[]; label?: string });
                    return <CustomTooltip active={p.active} payload={p.payload as CustomTooltipProps['payload']} label={p.label} />;
                  }} wrapperStyle={tooltipVisibility(isHoldingBar)} cursor={false} />
                  <Bar
                    dataKey="reps"
                    radius={[0, 4, 4, 0]}
                    fill="rgb(var(--primary))"
                    fillOpacity={isHoldingBar ? 0.3 : 1}
                    activeBar={isHoldingBar ? { fillOpacity: 1 } : false}
                    style={holdTransition}
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
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data && data.exerciseTotals.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-foreground/40">
              <Dumbbell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No calisthenics logged {data.summary.periodLabel}</p>
              <p className="text-xs mt-1">
                {scope === 'personal' ? 'Log some reps to see your progress!' : 'Be the first to log some reps!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Keep the old export for backwards compatibility during transition
export default LeaderboardCharts;
