'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { EXERCISE_INFO } from '@shared/constants';

export function PersonalBestsWidget() {
  const { firebaseUser } = useAuth();
  const [personalBests, setPersonalBests] = useState<Record<string, number>>({});
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
        setPersonalBests(result.personalBests || {});
      }
    } catch (error) {
      console.error('Error fetching personal bests:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      fetchData();
    }
  }, [firebaseUser, fetchData]);

  const displayExercises = ['pullups', 'pushups', 'dips', 'running'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Personal Bests
        </CardTitle>
        <CardDescription>Your highest single-workout records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(personalBests).length > 0 ? (
          Object.entries(personalBests)
            .filter(([type]) => displayExercises.includes(type))
            .map(([type, amount]) => {
              const exerciseInfo = EXERCISE_INFO[type];
              const label = exerciseInfo?.label || type;
              const unit = exerciseInfo?.unit || 'reps';
              return (
                <div key={type} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{label}</span>
                  <span className="text-lg font-bold text-primary">
                    {amount} {unit}
                  </span>
                </div>
              );
            })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No personal bests yet. Log some workouts!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
