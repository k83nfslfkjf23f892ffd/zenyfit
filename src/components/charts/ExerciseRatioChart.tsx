'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  { key: 'pullups', name: 'Pull-ups', color: 'hsl(220, 70%, 50%)', unit: 'reps' },
  { key: 'pushups', name: 'Push-ups', color: 'hsl(160, 60%, 45%)', unit: 'reps' },
  { key: 'dips', name: 'Dips', color: 'hsl(30, 80%, 55%)', unit: 'reps' },
  { key: 'running', name: 'Running', color: 'hsl(340, 65%, 50%)', unit: 'km' },
];

export function ExerciseRatioChart({
  totals,
  title = 'Exercise Distribution',
}: ExerciseRatioChartProps) {
  const chartData = useMemo(() => {
    if (!totals) return [];

    return EXERCISE_CONFIG
      .map(config => ({
        name: config.name,
        value: totals[config.key as keyof typeof totals] || 0,
        color: config.color,
        unit: config.unit,
      }))
      .filter(e => e.value > 0);
  }, [totals]);

  const total = useMemo(() =>
    chartData.reduce((sum, e) => sum + e.value, 0),
    [chartData]
  );

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No workout data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-col items-center gap-4">
          {/* Chart */}
          <div className="relative h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const percentage = ((data.value / total) * 100).toFixed(1);
                      return (
                        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {data.value} {data.unit} ({percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{chartData.length}</span>
              <span className="text-xs text-muted-foreground">exercises</span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {chartData.map((entry) => {
              const percentage = ((entry.value / total) * 100).toFixed(0);
              return (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">
                    {entry.name}
                    <span className="text-muted-foreground ml-1">
                      {percentage}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
