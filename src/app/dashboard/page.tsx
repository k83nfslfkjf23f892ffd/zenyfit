'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil } from 'lucide-react';
import { DEFAULT_WIDGET_CONFIG, getVisibleWidgets } from '@/lib/widgets';
import {
  UserHeaderWidget,
  StatsGridWidget,
  ExerciseRatioWidget,
  WeeklyActivityWidget,
  ConsistencyWidget,
  PersonalBestsWidget,
  ExerciseTotalsWidget,
  XPHistoryWidget,
  ActiveChallengesWidget,
} from '@/components/widgets';
import { WidgetCustomizer } from '@/components/WidgetCustomizer';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Don't block render for auth loading
  if (!loading && !user) {
    return null;
  }

  // Show minimal content while loading
  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Get widget configuration from user or use defaults
  const widgetConfig = user.dashboardWidgets || DEFAULT_WIDGET_CONFIG;
  const visibleWidgets = getVisibleWidgets(widgetConfig);

  // Render a widget by ID
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'user-header':
        return <UserHeaderWidget key={widgetId} user={user} />;
      case 'stats-grid':
        return <StatsGridWidget key={widgetId} />;
      case 'exercise-ratio':
        return <ExerciseRatioWidget key={widgetId} totals={user.totals} />;
      case 'weekly-activity':
        return <WeeklyActivityWidget key={widgetId} />;
      case 'consistency':
        return <ConsistencyWidget key={widgetId} />;
      case 'personal-bests':
        return <PersonalBestsWidget key={widgetId} />;
      case 'exercise-totals':
        return <ExerciseTotalsWidget key={widgetId} totals={user.totals} />;
      case 'xp-history':
        return <XPHistoryWidget key={widgetId} />;
      case 'active-challenges':
        return <ActiveChallengesWidget key={widgetId} />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Customize button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomizerOpen(true)}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Render visible widgets in order */}
        {visibleWidgets.map((widgetId) => renderWidget(widgetId))}
      </div>

      {/* Widget Customizer Modal */}
      <WidgetCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        config={widgetConfig}
        firebaseUser={firebaseUser}
        userId={user.id}
      />
    </AppLayout>
  );
}
