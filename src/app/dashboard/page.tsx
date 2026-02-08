'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { DEFAULT_WIDGET_CONFIG, getVisibleWidgets } from '@/lib/widgets';
import { listContainerVariants, listItemVariants } from '@/lib/animations';
import { WidgetErrorBoundary } from '@/components/ErrorBoundary';
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

  if (!loading && !user) {
    return null;
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
        </div>
      </AppLayout>
    );
  }

  const widgetConfig = user.dashboardWidgets || DEFAULT_WIDGET_CONFIG;
  const visibleWidgets = getVisibleWidgets(widgetConfig);

  const renderWidget = (widgetId: string) => {
    const widget = (() => {
      switch (widgetId) {
        case 'user-header':
          return <UserHeaderWidget user={user} onCustomize={() => setCustomizerOpen(true)} />;
        case 'stats-grid':
          return <StatsGridWidget />;
        case 'exercise-ratio':
          return <ExerciseRatioWidget totals={user.totals} />;
        case 'weekly-activity':
          return <WeeklyActivityWidget />;
        case 'consistency':
          return <ConsistencyWidget />;
        case 'personal-bests':
          return <PersonalBestsWidget />;
        case 'exercise-totals':
          return <ExerciseTotalsWidget totals={user.totals} />;
        case 'xp-history':
          return <XPHistoryWidget />;
        case 'active-challenges':
          return <ActiveChallengesWidget />;
        default:
          return null;
      }
    })();

    if (!widget) return null;

    return (
      <WidgetErrorBoundary key={widgetId}>
        {widget}
      </WidgetErrorBoundary>
    );
  };

  return (
    <AppLayout>
      <motion.div
        className="space-y-5"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Render visible widgets in order */}
        {visibleWidgets.map((widgetId) => (
          <motion.div key={widgetId} variants={listItemVariants}>
            {renderWidget(widgetId)}
          </motion.div>
        ))}
      </motion.div>

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
