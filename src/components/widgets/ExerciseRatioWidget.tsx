'use client';

import { ExerciseRatioChart } from '@/components/charts/ExerciseRatioChart';

interface ExerciseRatioWidgetProps {
  totals: Record<string, number>;
}

export function ExerciseRatioWidget({ totals }: ExerciseRatioWidgetProps) {
  return <ExerciseRatioChart totals={totals} />;
}
