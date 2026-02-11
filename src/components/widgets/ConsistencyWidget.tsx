'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCache, setLocalCache, CACHE_KEYS, CACHE_TTLS } from '@/lib/client-cache';

interface ProfileStatsData {
  personalBests: Record<string, number>;
  consistencyScore: number;
  workoutDaysLast30: number;
  activityMap?: Record<string, number>;
}

interface HeatmapData {
  activityMap: Record<string, number>;
  totalWorkouts: number;
  activeDays: number;
}

const CACHE_TTL = CACHE_TTLS.profileStats;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0) return 'bg-foreground/[0.06]';
  // Normalize against the month's peak to get 4 GitHub-style intensity levels
  const ratio = count / Math.max(maxCount, 1);
  if (ratio <= 0.25) return 'bg-primary/20';
  if (ratio <= 0.5) return 'bg-primary/40';
  if (ratio <= 0.75) return 'bg-primary/65';
  return 'bg-primary/90';
}

function buildMonthGrid(activityMap: Record<string, number>) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(today).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() returns 0=Sun, we want 0=Mon
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  const cells: { day: number | null; count: number; isToday: boolean; dateStr: string }[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, count: 0, isToday: false, dateStr: '' });
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      count: activityMap[dateStr] || 0,
      isToday: dateStr === todayStr,
      dateStr,
    });
  }

  return { cells, monthName, year };
}

function extractHeatmapData(stats: ProfileStatsData): HeatmapData {
  const activityMap = stats.activityMap || {};
  const totalWorkouts = Object.values(activityMap).reduce((sum, c) => sum + c, 0);
  const activeDays = Object.keys(activityMap).length;
  return { activityMap, totalWorkouts, activeDays };
}

export function ConsistencyWidget() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<HeatmapData | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached) return extractHeatmapData(cached.data);
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
    }
    return true;
  });

  const fetchData = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCache<ProfileStatsData>(CACHE_KEYS.profileStats, CACHE_TTL);
      if (cached) {
        setData(extractHeatmapData(cached.data));
        setLoading(false);
        if (cached.isStale) {
          fetchData(true);
        }
        return;
      }
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/profile/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setData(extractHeatmapData(result));
        setLocalCache(CACHE_KEYS.profileStats, result);
      }
    } catch (error) {
      console.error('Error fetching consistency:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, fetchData]);

  const grid = useMemo(() => {
    return buildMonthGrid(data?.activityMap || {});
  }, [data?.activityMap]);

  const maxCount = useMemo(() => {
    if (!data?.activityMap) return 1;
    const counts = Object.values(data.activityMap);
    return counts.length > 0 ? Math.max(...counts) : 1;
  }, [data?.activityMap]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            Activity
          </div>
          <span className="text-xs font-normal text-foreground/50">
            {grid.monthName} {grid.year}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        ) : data ? (
          <div className="space-y-2.5">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="text-[10px] text-foreground/40 text-center">
                  {label}
                </div>
              ))}
            </div>
            {/* Heatmap grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {grid.cells.map((cell, i) => (
                <div key={i} className="aspect-square flex items-center justify-center">
                  {cell.day !== null ? (
                    <div
                      className={`w-full h-full rounded-lg flex items-center justify-center text-[10px] ${getIntensityClass(cell.count, maxCount)} ${
                        cell.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
                      }`}
                    >
                      <span className={cell.count > 0 ? 'text-foreground/70 font-medium' : 'text-foreground/30'}>
                        {cell.day}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {/* Legend + Summary */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-foreground/50">
                {data.activeDays} days active &middot; {data.totalWorkouts} workouts
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-foreground/40">Less</span>
                <div className="w-3 h-3 rounded bg-foreground/[0.06]" />
                <div className="w-3 h-3 rounded bg-primary/20" />
                <div className="w-3 h-3 rounded bg-primary/40" />
                <div className="w-3 h-3 rounded bg-primary/65" />
                <div className="w-3 h-3 rounded bg-primary/90" />
                <span className="text-[10px] text-foreground/40">More</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/40">Unable to load data</p>
        )}
      </CardContent>
    </Card>
  );
}
