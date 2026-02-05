'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { EXERCISE_INFO, XP_RATES } from '@shared/constants';
import { useState } from 'react';

// Detailed explanations for each exercise
const EXERCISE_DETAILS: Record<string, { reason: string; example: { amount: number; unit: string } }> = {
  // Push-up variations
  pushups: {
    reason: 'Baseline calisthenics movement. Moves ~64% of your body weight through a full range of motion.',
    example: { amount: 10, unit: 'reps' },
  },
  knee_pushups: {
    reason: 'Reduced load (~49% body weight) due to knees on ground shortening the lever arm.',
    example: { amount: 15, unit: 'reps' },
  },
  incline_pushups: {
    reason: 'Hands elevated reduces load to ~40-55% body weight depending on incline angle.',
    example: { amount: 15, unit: 'reps' },
  },
  decline_pushups: {
    reason: 'Feet elevated increases load to ~75% body weight, putting more stress on shoulders.',
    example: { amount: 10, unit: 'reps' },
  },
  diamond_pushups: {
    reason: 'Narrow hand position increases tricep demand significantly compared to standard push-ups.',
    example: { amount: 10, unit: 'reps' },
  },
  archer_pushups: {
    reason: 'Asymmetric loading shifts most weight to one arm while the other assists, building toward one-arm.',
    example: { amount: 8, unit: 'reps' },
  },
  onearm_pushups: {
    reason: 'Near full body weight on a single arm. Requires significant core stability and pressing strength.',
    example: { amount: 5, unit: 'reps' },
  },

  // Pull-up variations
  pullups: {
    reason: 'Full 100% body weight moved vertically. One of the most effective upper body exercises.',
    example: { amount: 10, unit: 'reps' },
  },
  assisted_pullups: {
    reason: 'Band or machine assistance reduces effective load to ~50-70% body weight.',
    example: { amount: 10, unit: 'reps' },
  },
  chinups: {
    reason: 'Supinated grip gives biceps mechanical advantage, making it slightly easier than pull-ups.',
    example: { amount: 10, unit: 'reps' },
  },
  wide_pullups: {
    reason: 'Wide grip reduces lat mechanical advantage, requiring more strength for the same movement.',
    example: { amount: 8, unit: 'reps' },
  },
  lsit_pullups: {
    reason: 'Holding legs in L-position adds significant core demand throughout the pull.',
    example: { amount: 6, unit: 'reps' },
  },
  australian_pullups: {
    reason: 'Horizontal row position moves ~40-60% body weight. Good progression toward full pull-ups.',
    example: { amount: 15, unit: 'reps' },
  },

  // Dip variations
  dips: {
    reason: 'Moves ~95% body weight through full range of motion. Excellent for chest and triceps.',
    example: { amount: 10, unit: 'reps' },
  },
  bench_dips: {
    reason: 'Feet on ground reduces load to ~40-50% body weight. Beginner-friendly dip variation.',
    example: { amount: 15, unit: 'reps' },
  },
  ring_dips: {
    reason: 'Unstable rings require additional stabilization muscles, increasing overall difficulty.',
    example: { amount: 8, unit: 'reps' },
  },

  // Advanced
  muscleups: {
    reason: 'Combines a pull-up, transition phase, and partial dip into one movement. Elite skill.',
    example: { amount: 3, unit: 'reps' },
  },

  // Cardio
  running: {
    reason: '8-9 MET activity burning ~70 kcal/km. Baseline for cardio XP calculations.',
    example: { amount: 5, unit: 'km' },
  },
  walking: {
    reason: '~3-4 MET activity burning ~55 kcal/km. About 0.6x the intensity of running.',
    example: { amount: 3, unit: 'km' },
  },
  swimming: {
    reason: 'Water resistance makes it harder than running. Burns more calories per distance.',
    example: { amount: 1, unit: 'km' },
  },
  sprinting: {
    reason: 'Very high intensity (10+ MET). Maximum effort bursts demand significantly more energy.',
    example: { amount: 0.4, unit: 'km' },
  },

  // Team Sports
  volleyball: {
    reason: '8.0 MET intermittent activity with rest periods between plays.',
    example: { amount: 60, unit: 'min' },
  },
  basketball: {
    reason: 'Similar MET to volleyball with running, jumping, and rest periods.',
    example: { amount: 60, unit: 'min' },
  },
  soccer: {
    reason: 'More continuous running than volleyball, similar average intensity.',
    example: { amount: 60, unit: 'min' },
  },
};

interface ExerciseRowProps {
  type: string;
  xpRate: number;
  details?: { reason: string; example: { amount: number; unit: string } };
  unit: string;
}

function ExerciseRow({ type, xpRate, details, unit }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const label = EXERCISE_INFO[type]?.label || type;

  return (
    <div className="border-b last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-white/[0.05] transition-colors px-1 -mx-1 rounded"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-foreground/50" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-foreground/50" />
          )}
        </div>
        <span className="text-sm font-semibold text-primary">{xpRate} XP/{unit}</span>
      </button>

      {expanded && details && (
        <div className="pb-3">
          <p className="text-xs text-foreground/50 leading-relaxed">
            {details.reason}
          </p>
        </div>
      )}
    </div>
  );
}

export default function XPInfoPage() {
  const router = useRouter();

  // Group exercises by category
  const pushupVariations = ['pushups', 'knee_pushups', 'incline_pushups', 'decline_pushups', 'diamond_pushups', 'archer_pushups', 'onearm_pushups'];
  const pullupVariations = ['australian_pullups', 'assisted_pullups', 'chinups', 'pullups', 'wide_pullups', 'lsit_pullups'];
  const dipVariations = ['bench_dips', 'dips', 'ring_dips'];
  const advanced = ['muscleups'];
  const cardio = ['walking', 'running', 'swimming', 'sprinting'];
  const teamSports = ['volleyball', 'basketball', 'soccer'];

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-foreground/40" />
          </Button>
          <h1 className="text-xl font-bold">How XP Works</h1>
        </div>

        {/* Methodology */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              XP Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground/50">
              XP = Amount × Rate
            </p>
            <p className="text-xs text-foreground/50">
              XP rates are based on average biomechanics and may not reflect individual differences in strength, body proportions, or training background.
            </p>
            <p className="text-xs text-foreground/50">
              Tap any exercise below to see the detailed reasoning.
            </p>
          </CardContent>
        </Card>

        {/* Push-up Variations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Push-up Variations</CardTitle>
            <p className="text-xs text-foreground/50">Based on % body weight moved per rep</p>
          </CardHeader>
          <CardContent>
            {pushupVariations.map(type => (
              <ExerciseRow
                key={type}
                type={type}
                xpRate={XP_RATES[type]}
                details={EXERCISE_DETAILS[type]}
                unit="rep"
              />
            ))}
          </CardContent>
        </Card>

        {/* Pull-up Variations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pull-up Variations</CardTitle>
            <p className="text-xs text-foreground/50">Based on % body weight and grip difficulty</p>
          </CardHeader>
          <CardContent>
            {pullupVariations.map(type => (
              <ExerciseRow
                key={type}
                type={type}
                xpRate={XP_RATES[type]}
                details={EXERCISE_DETAILS[type]}
                unit="rep"
              />
            ))}
          </CardContent>
        </Card>

        {/* Dip Variations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dip Variations</CardTitle>
            <p className="text-xs text-foreground/50">Based on % body weight and stability</p>
          </CardHeader>
          <CardContent>
            {dipVariations.map(type => (
              <ExerciseRow
                key={type}
                type={type}
                xpRate={XP_RATES[type]}
                details={EXERCISE_DETAILS[type]}
                unit="rep"
              />
            ))}
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Advanced</CardTitle>
            <p className="text-xs text-foreground/50">Elite movements combining multiple exercises</p>
          </CardHeader>
          <CardContent>
            {advanced.map(type => (
              <ExerciseRow
                key={type}
                type={type}
                xpRate={XP_RATES[type]}
                details={EXERCISE_DETAILS[type]}
                unit="rep"
              />
            ))}
          </CardContent>
        </Card>

        {/* Cardio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cardio</CardTitle>
            <p className="text-xs text-foreground/50">Based on MET values and calories burned per km</p>
          </CardHeader>
          <CardContent>
            {cardio.map(type => (
              <ExerciseRow
                key={type}
                type={type}
                xpRate={XP_RATES[type]}
                details={EXERCISE_DETAILS[type]}
                unit="km"
              />
            ))}
          </CardContent>
        </Card>

        {/* Team Sports */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team Sports</CardTitle>
            <p className="text-xs text-foreground/50">Based on average MET for game activity</p>
          </CardHeader>
          <CardContent>
            {teamSports.map(type => (
              <ExerciseRow
                key={type}
                type={type}
                xpRate={XP_RATES[type]}
                details={EXERCISE_DETAILS[type]}
                unit="min"
              />
            ))}
          </CardContent>
        </Card>

        {/* Leaderboard Rankings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leaderboard Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground/50">
              <strong>All:</strong> Ranked by total XP earned across all exercises.
            </p>
            <p className="text-sm text-foreground/50">
              <strong>Exercise tabs:</strong> Ranked by total reps/km for that specific exercise.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
