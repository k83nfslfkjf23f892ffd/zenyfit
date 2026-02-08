'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_WIDGET_CONFIG, getVisibleWidgets, getHiddenWidgets } from '@/lib/widgets';
import { listContainerVariants, listItemVariants } from '@/lib/animations';
import { WidgetErrorBoundary } from '@/components/ErrorBoundary';
import { SortableWidget } from '@/components/SortableWidget';
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

interface WidgetConfig {
  order: string[];
  hidden: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [localConfig, setLocalConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync localConfig from user data (skip while editing to avoid overwrite)
  useEffect(() => {
    if (editMode) return;
    const config = user?.dashboardWidgets || DEFAULT_WIDGET_CONFIG;
    setLocalConfig({
      order: config.order ?? DEFAULT_WIDGET_CONFIG.order,
      hidden: config.hidden ?? [],
    });
  }, [user?.dashboardWidgets, editMode]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // dnd-kit sensors (same config as previous WidgetCustomizer)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Save config to server
  const saveConfig = async (configToSave: WidgetConfig) => {
    if (!user?.id || !firebaseUser) return;
    setSaving(true);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dashboardWidgets: configToSave }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to save');
      } else {
        localStorage.removeItem('zenyfit_user_cache');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Debounced save (500ms)
  const debouncedSave = (newConfig: WidgetConfig) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveConfig(newConfig), 500);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localConfig.order.indexOf(active.id as string);
      const newIndex = localConfig.order.indexOf(over.id as string);
      const newOrder = arrayMove(localConfig.order, oldIndex, newIndex);
      const newConfig = { ...localConfig, order: newOrder };
      setLocalConfig(newConfig);
      debouncedSave(newConfig);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setLocalConfig(prev => {
      const isHidden = prev.hidden.includes(widgetId);
      const newHidden = isHidden
        ? prev.hidden.filter(id => id !== widgetId)
        : [...prev.hidden, widgetId];
      const newConfig = { ...prev, hidden: newHidden };
      debouncedSave(newConfig);
      return newConfig;
    });
  };

  if (!loading && !user) return null;

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
        </div>
      </AppLayout>
    );
  }

  const visibleWidgets = getVisibleWidgets(localConfig);
  const hiddenWidgets = editMode ? getHiddenWidgets(localConfig) : [];

  const renderWidget = (widgetId: string) => {
    const widget = (() => {
      switch (widgetId) {
        case 'user-header':
          return <UserHeaderWidget user={user} />;
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
        case 'reps-history':
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
      {saving && (
        <div className="text-center text-xs text-foreground/40 mb-2 animate-pulse">Saving...</div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={localConfig.order} strategy={verticalListSortingStrategy}>
          <motion.div
            className="space-y-5"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Visible widgets */}
            {visibleWidgets.map((widgetId) => (
              <motion.div key={widgetId} variants={listItemVariants}>
                <SortableWidget
                  widgetId={widgetId}
                  isEditMode={editMode}
                  isHidden={false}
                  onToggleVisibility={toggleWidget}
                >
                  {renderWidget(widgetId)}
                </SortableWidget>
              </motion.div>
            ))}

            {/* Hidden widgets (edit mode only) */}
            {editMode && hiddenWidgets.length > 0 && (
              <>
                <div className="text-xs text-foreground/30 uppercase tracking-wider pt-2">
                  Hidden
                </div>
                {hiddenWidgets.map((widgetId) => (
                  <motion.div key={widgetId} variants={listItemVariants}>
                    <SortableWidget
                      widgetId={widgetId}
                      isEditMode={true}
                      isHidden={true}
                      onToggleVisibility={toggleWidget}
                    >
                      {renderWidget(widgetId)}
                    </SortableWidget>
                  </motion.div>
                ))}
              </>
            )}
          </motion.div>
        </SortableContext>
      </DndContext>

      {/* FAB: Pencil (enter edit) / Check (exit edit) */}
      <button
        type="button"
        onClick={() => setEditMode(!editMode)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 h-9 w-9 flex items-center justify-center rounded-full glass text-foreground/40 hover:text-foreground/60 transition-colors"
      >
        {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
      </button>
    </AppLayout>
  );
}
