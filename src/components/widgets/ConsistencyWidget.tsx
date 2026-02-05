'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AnimatedNumber } from '@/components/AnimatedNumber';

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
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-orange-500/15">
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          Consistency
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold gradient-text"><AnimatedNumber value={data.consistencyScore} />%</span>
              <span className="text-xs text-foreground/50">
                {data.workoutDaysLast30} days active
              </span>
            </div>
            <Progress value={data.consistencyScore} glow />
            <p className="text-xs text-foreground/40">
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
          <p className="text-sm text-foreground/40">Unable to load data</p>
        )}
      </CardContent>
    </Card>
  );
}
