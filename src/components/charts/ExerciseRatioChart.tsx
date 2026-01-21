'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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

const COLORS = [
  'hsl(220, 70%, 50%)',  // Pull-ups - blue
  'hsl(160, 60%, 45%)',  // Push-ups - green
  'hsl(30, 80%, 55%)',   // Dips - orange
  'hsl(340, 65%, 50%)',  // Running - pink
];

export function ExerciseRatioChart({
  totals,
  title = 'Exercise Distribution',
}: ExerciseRatioChartProps) {
  const chartData = useMemo(() => {
    if (!totals) return [];

    const exercises = [
      { name: 'Pull-ups', value: totals.pullups || 0, unit: 'reps' },
      { name: 'Push-ups', value: totals.pushups || 0, unit: 'reps' },
      { name: 'Dips', value: totals.dips || 0, unit: 'reps' },
      { name: 'Running', value: totals.running || 0, unit: 'km' },
    ].filter(e => e.value > 0);

    return exercises;
  }, [totals]);

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

  const total = chartData.reduce((sum, e) => sum + e.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[['Pull-ups', 'Push-ups', 'Dips', 'Running'].indexOf(entry.name)]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percentage = ((data.value / total) * 100).toFixed(1);
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 shadow-md">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value} {data.unit} ({percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
