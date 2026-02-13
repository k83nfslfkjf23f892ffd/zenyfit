'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { formatSecondsAsMinutes } from '@shared/constants';

interface ExerciseTotalsWidgetProps {
  totals: Record<string, number>;
}

const exercises = [
  { key: 'pullups', label: 'Pull-ups', unit: '' },
  { key: 'pushups', label: 'Push-ups', unit: '' },
  { key: 'dips', label: 'Dips', unit: '' },
  { key: 'running', label: 'Running', unit: ' km' },
];

export const ExerciseTotalsWidget = memo(function ExerciseTotalsWidget({ totals }: ExerciseTotalsWidgetProps) {
  const hangSeconds = (totals.passive_dead_hang || 0) + (totals.active_dead_hang || 0) + (totals.flexed_arm_hang || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exercise Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {exercises.map(({ key, label, unit }) => (
          <div key={key} className="flex items-center justify-between rounded-lg bg-surface border border-border p-3">
            <span className="text-sm text-foreground/70">{label}</span>
            <span className="text-sm font-bold"><AnimatedNumber value={totals[key] || 0} />{unit}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-surface border border-border p-3">
          <span className="text-sm text-foreground/70">Hangs</span>
          <span className="text-sm font-bold">{formatSecondsAsMinutes(hangSeconds)}</span>
        </div>
      </CardContent>
    </Card>
  );
});
