'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface XPData {
  date: string;
  xp: number;
}

export function XPHistoryWidget() {
  const { user, firebaseUser } = useAuth();
  const [data, setData] = useState<XPData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/leaderboard/trend?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.xpHistory) {
          setData(result.xpHistory);
        }
      }
    } catch (error) {
      console.error('Error fetching XP history:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user?.id]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchData();
    }
  }, [user, firebaseUser, fetchData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>XP History</CardTitle>
          <CardDescription>Your XP progress over time</CardDescription>
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
          <CardTitle>XP History</CardTitle>
          <CardDescription>Your XP progress over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No XP history data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>XP History</CardTitle>
        <CardDescription>Your XP progress over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="xp"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
