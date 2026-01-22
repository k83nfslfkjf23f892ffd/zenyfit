'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface ExerciseRatioChartProps {
  totals: {
    pullups?: number;
    pushups?: number;
    dips?: number;
    running?: number;
  } | null;
  title?: string;
}

const EXERCISE_CONFIG = [
  { key: 'pullups', name: 'Pull-ups', color: 'hsl(var(--chart-1))', unit: 'reps' },
  { key: 'pushups', name: 'Push-ups', color: 'hsl(var(--chart-2))', unit: 'reps' },
  { key: 'dips', name: 'Dips', color: 'hsl(var(--chart-3))', unit: 'reps' },
];

export function ExerciseRatioChart({
  totals,
  title = 'Calisthenics Distribution',
}: ExerciseRatioChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = EXERCISE_CONFIG
    .map(config => ({
      name: config.name,
      value: totals?.[config.key as keyof typeof totals] || 0,
      color: config.color,
      unit: config.unit,
    }))
    .filter(e => e.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No workout data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const activeData = activeIndex !== null ? data[activeIndex] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                animationDuration={400}
                onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? 'hsl(var(--foreground))' : 'transparent'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    style={{
                      filter: activeIndex !== null && activeIndex !== index ? 'opacity(0.5)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text - shows selected or total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              {activeData ? (
                <>
                  <div className="text-2xl font-bold">{activeData.value}</div>
                  <div className="text-xs text-muted-foreground">{activeData.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {((activeData.value / total) * 100).toFixed(0)}%
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </>
              )}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
