'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { EXERCISE_INFO, XP_RATES, EXERCISE_CATEGORIES } from '@shared/constants';

export default function XPInfoPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">How XP Works</h1>
        </div>

        {/* Methodology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              How We Calculate XP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              XP values are based on scientific measurements of exercise difficulty:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-4 list-disc">
              <li>
                <strong>Calisthenics:</strong> Body weight percentage moved per rep.
                Push-ups move ~64% of your body weight, pull-ups move 100%.
              </li>
              <li>
                <strong>Cardio:</strong> MET values (metabolic equivalent) and calories
                burned per km. Running burns ~70 kcal/km at 8-9 MET.
              </li>
              <li>
                <strong>Team Sports:</strong> Average MET for intermittent activity
                with rest periods.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Calisthenics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calisthenics</CardTitle>
            <p className="text-sm text-muted-foreground">Per rep - based on % body weight and range of motion</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {EXERCISE_CATEGORIES.calisthenics.exercises
                .filter(type => XP_RATES[type] > 0)
                .sort((a, b) => XP_RATES[a] - XP_RATES[b])
                .map(type => (
                  <div key={type} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm">{EXERCISE_INFO[type]?.label || type}</span>
                    <span className="text-sm font-medium text-primary">{XP_RATES[type]} XP</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Cardio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cardio</CardTitle>
            <p className="text-sm text-muted-foreground">Per km - based on MET values and energy expenditure</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {EXERCISE_CATEGORIES.cardio.exercises
                .filter(type => XP_RATES[type] > 0)
                .sort((a, b) => XP_RATES[a] - XP_RATES[b])
                .map(type => (
                  <div key={type} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm">{EXERCISE_INFO[type]?.label || type}</span>
                    <span className="text-sm font-medium text-primary">{XP_RATES[type]} XP</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Sports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Sports</CardTitle>
            <p className="text-sm text-muted-foreground">Per minute - based on average MET for game activity</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {EXERCISE_CATEGORIES.team_sports.exercises
                .filter(type => XP_RATES[type] > 0)
                .sort((a, b) => XP_RATES[a] - XP_RATES[b])
                .map(type => (
                  <div key={type} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm">{EXERCISE_INFO[type]?.label || type}</span>
                    <span className="text-sm font-medium text-primary">{XP_RATES[type]} XP</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leaderboard Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>All:</strong> Ranked by total XP earned across all exercises.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Exercise tabs:</strong> Ranked by total reps/km for that specific exercise.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
