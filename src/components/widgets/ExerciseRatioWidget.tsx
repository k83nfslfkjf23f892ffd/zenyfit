'use client';

import { memo } from 'react';
import { ExerciseRatioChart } from '@/components/charts/ExerciseRatioChart';

interface ExerciseRatioWidgetProps {
  totals: Record<string, number>;
}

export const ExerciseRatioWidget = memo(function ExerciseRatioWidget({ totals }: ExerciseRatioWidgetProps) {
  return <ExerciseRatioChart totals={totals} />;
});
