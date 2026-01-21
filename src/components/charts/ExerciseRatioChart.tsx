'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface ExerciseRatioChartProps {
  totals: {
    pullups?: number;
    pushups?: number;
    dips?: number;
    running?: number;
  } | null;
  title?: string;
}

export function ExerciseRatioChart({
  totals,
  title = 'Exercise Distribution',
}: ExerciseRatioChartProps) {
  const [showChart, setShowChart] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const hasStartedRef = useRef(false);

  // Only show chart once data is available, animate once
  useEffect(() => {
    if (totals && !hasStartedRef.current) {
      const hasData = (totals.pullups || 0) + (totals.pushups || 0) + (totals.dips || 0) + (totals.running || 0) > 0;
      if (hasData) {
        hasStartedRef.current = true;
        // Small delay to ensure stable data
        const timer = setTimeout(() => {
          setShowChart(true);
          // Disable animation after it completes
          setTimeout(() => setAnimationDone(true), 900);
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [totals]);

  const chartData = useMemo(() => {
    if (!totals) return null;

    const exercises = [
      { name: 'Pull-ups', value: totals.pullups || 0, color: 'hsl(220, 70%, 50%)' },
      { name: 'Push-ups', value: totals.pushups || 0, color: 'hsl(160, 60%, 45%)' },
      { name: 'Dips', value: totals.dips || 0, color: 'hsl(30, 80%, 55%)' },
      { name: 'Running', value: totals.running || 0, color: 'hsl(340, 65%, 50%)' },
    ].filter(e => e.value > 0);

    if (exercises.length === 0) return null;

    return {
      labels: exercises.map(e => e.name),
      datasets: [
        {
          data: exercises.map(e => e.value),
          backgroundColor: exercises.map(e => e.color),
          borderColor: 'hsl(var(--background))',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [totals]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
          },
          color: 'hsl(var(--foreground))',
        },
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const value = context.raw as number;
            const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number;
            const percentage = ((value / total) * 100).toFixed(1);
            const unit = context.label === 'Running' ? 'km' : 'reps';
            return `${value} ${unit} (${percentage}%)`;
          },
        },
      },
    },
    animation: animationDone ? false : {
      animateRotate: true,
      animateScale: true,
      duration: 800,
      easing: 'easeOutQuart' as const,
    },
  }), [animationDone]);

  if (!chartData) {
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
      <CardContent>
        <div className="h-64">
          {showChart ? (
            <Doughnut data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
