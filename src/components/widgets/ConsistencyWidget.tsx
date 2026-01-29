'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ConsistencyData {
  consistencyScore: number;
  workoutDaysLast30: number;
}

export function ConsistencyWidget() {
  const { firebaseUser } = useAuth();
  const [data, setData] = useState<ConsistencyData | null>(null);
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
        setData({
          consistencyScore: result.consistencyScore || 0,
          workoutDaysLast30: result.workoutDaysLast30 || 0,
        });
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Consistency Score
        </CardTitle>
        <CardDescription>Based on workout frequency (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold text-primary">{data.consistencyScore}%</span>
              <span className="text-sm text-muted-foreground">
                {data.workoutDaysLast30} days active
              </span>
            </div>
            <Progress value={data.consistencyScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {data.consistencyScore >= 80
                ? "You're on fire! Keep it up!"
                : data.consistencyScore >= 50
                  ? 'Good consistency! Try to hit 4+ days per week.'
                  : data.consistencyScore >= 25
                    ? 'Building momentum. Stay consistent!'
                    : 'Start logging workouts to build your streak!'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load consistency data</p>
        )}
      </CardContent>
    </Card>
  );
}
