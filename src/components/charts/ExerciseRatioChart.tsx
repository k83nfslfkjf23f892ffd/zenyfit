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

const CHART_COLORS = [
  'rgb(var(--chart-1))',
  'rgb(var(--chart-2))',
  'rgb(var(--chart-3))',
];

const EXERCISE_CONFIG = [
  { key: 'pullups', name: 'Pull-ups', unit: 'reps' },
  { key: 'pushups', name: 'Push-ups', unit: 'reps' },
  { key: 'dips', name: 'Dips', unit: 'reps' },
];

export function ExerciseRatioChart({
  totals,
  title = 'Calisthenics Distribution',
}: ExerciseRatioChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = EXERCISE_CONFIG
    .map((config, index) => ({
      name: config.name,
      value: totals?.[config.key as keyof typeof totals] || 0,
      color: CHART_COLORS[index] || CHART_COLORS[0],
      unit: config.unit,
    }))
    .filter(e => e.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-foreground/40 text-sm">
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
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                animationDuration={400}
                onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                    strokeWidth={0}
                    style={{
                      filter: activeIndex !== null && activeIndex !== index ? 'opacity(0.4)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              {activeData ? (
                <>
                  <div className="text-2xl font-bold">{activeData.value}</div>
                  <div className="text-xs text-foreground/50">{activeData.name}</div>
                  <div className="text-xs text-foreground/40">
                    {((activeData.value / total) * 100).toFixed(0)}%
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                  <div className="text-xs text-foreground/50">Total</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-2">
          {data.map((item, index) => (
            <button
              key={item.name}
              className="flex items-center gap-1.5 text-xs"
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-foreground/60">{item.name}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
