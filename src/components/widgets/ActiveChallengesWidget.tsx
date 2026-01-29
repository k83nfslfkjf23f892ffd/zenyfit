'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Challenge {
  id: string;
  title: string;
  goal: number;
  progress: number;
  endDate: number;
}

export function ActiveChallengesWidget() {
  const { user, firebaseUser } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/challenges', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        // Filter for active challenges the user is participating in
        const now = Date.now();
        const activeChallenges = (result.challenges || [])
          .filter((c: { endDate: number; participantIds: string[] }) =>
            c.endDate > now && c.participantIds?.includes(user?.id || '')
          )
          .slice(0, 3) // Show max 3
          .map((c: { id: string; title: string; goal: number; participants: { userId: string; progress: number }[]; endDate: number }) => ({
            id: c.id,
            title: c.title,
            goal: c.goal,
            progress: c.participants?.find((p: { userId: string }) => p.userId === user?.id)?.progress || 0,
            endDate: c.endDate,
          }));
        setChallenges(activeChallenges);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user?.id]);

  useEffect(() => {
    if (user && firebaseUser) {
      fetchData();
    }
  }, [user, firebaseUser, fetchData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Active Challenges
            </CardTitle>
            <CardDescription>Your current challenge progress</CardDescription>
          </div>
          <Link href="/challenges" className="text-sm text-primary hover:underline flex items-center">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : challenges.length > 0 ? (
          challenges.map((challenge) => {
            const progressPercent = Math.min((challenge.progress / challenge.goal) * 100, 100);
            const daysLeft = Math.ceil((challenge.endDate - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{challenge.title}</span>
                  <span className="text-xs text-muted-foreground">{daysLeft}d left</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{challenge.progress} / {challenge.goal}</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active challenges. Join one to compete!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
