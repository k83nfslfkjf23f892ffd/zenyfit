'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
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
import { Loader2, Pencil, Check, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_WIDGET_CONFIG, WIDGET_DEFINITIONS, getVisibleWidgets, getWidgetDefinition } from '@/lib/widgets';
// listContainerVariants/listItemVariants removed — stagger variants caused
// invisible widgets when the visible list changed mid-animation.
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
  // Reconcile: ensure all valid widget IDs are in the order array
  useEffect(() => {
    if (editMode) return;
    const config = user?.dashboardWidgets || DEFAULT_WIDGET_CONFIG;
    const savedOrder = config.order ?? DEFAULT_WIDGET_CONFIG.order;
    const savedHidden = config.hidden ?? [];
    const allValidIds = WIDGET_DEFINITIONS.map(w => w.id);
    const missingIds = allValidIds.filter(id => !savedOrder.includes(id));
    setLocalConfig({
      order: [...savedOrder, ...missingIds],
      hidden: savedHidden.filter(id => allValidIds.includes(id)),
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

  // Delay-based activation: hold 200ms to start drag, allowing normal scrolling.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
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

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
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
      let newHidden: string[];
      let newOrder: string[];
      if (isHidden) {
        // Unhiding: remove from hidden, keep position
        newHidden = prev.hidden.filter(id => id !== widgetId);
        newOrder = prev.order;
      } else {
        // Hiding: add to hidden, move to end of order
        newHidden = [...prev.hidden, widgetId];
        newOrder = [...prev.order.filter(id => id !== widgetId), widgetId];
      }
      const newConfig = { order: newOrder, hidden: newHidden };
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

  const renderWidget = (widgetId: string) => {
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
  };

  return (
    <AppLayout>
      {saving && (
        <div className="text-center text-xs text-foreground/40 mb-2 animate-pulse">Saving...</div>
      )}

      {editMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localConfig.order} strategy={verticalListSortingStrategy}>
            <div className="space-y-5">
              {localConfig.order.map((widgetId, index) => {
                const isHidden = localConfig.hidden.includes(widgetId);
                const prevId = index > 0 ? localConfig.order[index - 1] : null;
                const showSeparator = isHidden && (prevId === null || !localConfig.hidden.includes(prevId));
                return (
                  <div key={widgetId}>
                    {showSeparator && (
                      <div className="flex items-center gap-3 py-1 mb-5">
                        <div className="h-px flex-1 bg-border/50" />
                        <span className="text-xs text-foreground/30 font-medium">Hidden</span>
                        <div className="h-px flex-1 bg-border/50" />
                      </div>
                    )}
                    <SortableWidget
                      widgetId={widgetId}
                      isEditMode={true}
                      isHidden={isHidden}
                      onToggleVisibility={toggleWidget}
                    >
                      <WidgetErrorBoundary>
                        {renderWidget(widgetId)}
                      </WidgetErrorBoundary>
                    </SortableWidget>
                  </div>
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <div className="rounded-xl ring-2 ring-primary/60 shadow-lg bg-background">
                <div className="flex items-center justify-between px-2 py-2 rounded-t-xl bg-primary/10 border-b border-primary/20 select-none">
                  <span className="text-xs font-medium text-foreground/50 px-2">
                    {getWidgetDefinition(activeId)?.name || activeId}
                  </span>
                  <GripVertical className="h-5 w-5 text-foreground/50" />
                </div>
                {!localConfig.hidden.includes(activeId) ? (
                  <div className="pointer-events-none">
                    <WidgetErrorBoundary>
                      {renderWidget(activeId)}
                    </WidgetErrorBoundary>
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-foreground/40">
                    {getWidgetDefinition(activeId)?.name || activeId}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-5">
          {visibleWidgets.map((widgetId) => (
            <motion.div
              key={widgetId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <WidgetErrorBoundary>
                {renderWidget(widgetId)}
              </WidgetErrorBoundary>
            </motion.div>
          ))}
        </div>
      )}

      {editMode ? (
        /* Fixed button when in edit mode so user can always tap Done */
        <button
          type="button"
          onClick={() => setEditMode(false)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
        >
          <Check className="h-4 w-4" />
        </button>
      ) : (
        /* Inline button at bottom of page to enter edit mode */
        <button
          type="button"
          onClick={() => setEditMode(true)}
          className="flex items-center justify-center gap-1.5 mx-auto mt-6 px-4 py-2 rounded-full text-xs text-foreground/30 hover:text-foreground/50 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          <span>Edit dashboard</span>
        </button>
      )}
    </AppLayout>
  );
}
