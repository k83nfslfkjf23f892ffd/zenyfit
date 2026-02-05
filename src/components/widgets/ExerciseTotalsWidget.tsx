'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber } from '@/components/AnimatedNumber';

interface ExerciseTotalsWidgetProps {
  totals: Record<string, number>;
}

const exercises = [
  { key: 'pullups', label: 'Pull-ups', unit: '' },
  { key: 'pushups', label: 'Push-ups', unit: '' },
  { key: 'dips', label: 'Dips', unit: '' },
  { key: 'running', label: 'Running', unit: ' km' },
];

export function ExerciseTotalsWidget({ totals }: ExerciseTotalsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exercise Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {exercises.map(({ key, label, unit }) => (
          <div key={key} className="flex items-center justify-between rounded-lg glass p-3">
            <span className="text-sm text-foreground/70">{label}</span>
            <span className="text-sm font-bold"><AnimatedNumber value={totals[key] || 0} />{unit}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
