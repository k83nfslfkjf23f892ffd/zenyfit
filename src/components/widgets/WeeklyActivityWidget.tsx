'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DayData {
  day: string;
  workouts: number;
  xp: number;
}

export function WeeklyActivityWidget() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/profile/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.weeklyActivity) {
          setData(result.weeklyActivity);
        }
      }
    } catch (error) {
      console.error('Error fetching weekly activity:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, fetchData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
          <CardDescription>Your workout activity this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
          <CardDescription>Your workout activity this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No activity data for this week
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity</CardTitle>
        <CardDescription>Your workout activity this week</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="workouts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
