'use client';

import { useState, useEffect } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, X, RotateCcw, Loader2 } from 'lucide-react';
import { DEFAULT_WIDGET_CONFIG, getWidgetDefinition } from '@/lib/widgets';
import { toast } from 'sonner';
import type { User as FirebaseUser } from 'firebase/auth';

interface WidgetConfig {
  order: string[];
  hidden: string[];
}

interface WidgetCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WidgetConfig;
  firebaseUser: FirebaseUser | null;
  userId: string;
}

interface SortableWidgetItemProps {
  widgetId: string;
  isHidden: boolean;
  onToggle: () => void;
}

function SortableWidgetItem({ widgetId, isHidden, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const widget = getWidgetDefinition(widgetId);
  if (!widget) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isDragging ? 'shadow-lg z-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Widget info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{widget.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {widget.description}
        </div>
      </div>

      {/* Toggle */}
      <Switch
        checked={!isHidden}
        onCheckedChange={onToggle}
      />
    </div>
  );
}

export function WidgetCustomizer({
  open,
  onOpenChange,
  config,
  firebaseUser,
  userId,
}: WidgetCustomizerProps) {
  // Ensure config has valid structure
  const safeConfig: WidgetConfig = {
    order: config?.order ?? DEFAULT_WIDGET_CONFIG.order,
    hidden: config?.hidden ?? [],
  };

  const [localConfig, setLocalConfig] = useState<WidgetConfig>(safeConfig);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync localConfig when config prop changes (e.g., after save and reload)
  useEffect(() => {
    setLocalConfig({
      order: config?.order ?? DEFAULT_WIDGET_CONFIG.order,
      hidden: config?.hidden ?? [],
    });
  }, [config]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms hold before drag starts on touch
        tolerance: 8, // 8px movement allowed during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!open) return null;

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localConfig.order.indexOf(active.id as string);
      const newIndex = localConfig.order.indexOf(over.id as string);

      setLocalConfig({
        ...localConfig,
        order: arrayMove(localConfig.order, oldIndex, newIndex),
      });
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  const toggleWidget = (widgetId: string) => {
    setLocalConfig(prev => {
      const isHidden = prev.hidden.includes(widgetId);
      const newHidden = isHidden
        ? prev.hidden.filter((id) => id !== widgetId)
        : [...prev.hidden, widgetId];
      return { ...prev, hidden: newHidden };
    });
  };

  const resetToDefault = () => {
    setLocalConfig(DEFAULT_WIDGET_CONFIG);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (!userId) {
        toast.error('User ID not found');
        return;
      }

      const token = await firebaseUser?.getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const payload = { dashboardWidgets: localConfig };
      console.log('Saving to userId:', userId);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Response:', response.status, data);

      if (!response.ok) {
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success(`Saved! Hidden: ${localConfig.hidden.length} widgets`);
      // Clear user cache so fresh data is loaded
      localStorage.removeItem('zenyfit_user_cache');
      onOpenChange(false);
      // Small delay to ensure Firestore has synced before reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-background border rounded-t-lg sm:rounded-lg w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - fixed */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">Customize Dashboard</h3>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - scrollable */}
        <div
          className="p-4 flex-1 overflow-y-auto min-h-0"
          style={{
            overflowY: isDragging ? 'hidden' : 'auto',
            touchAction: isDragging ? 'none' : 'auto',
          }}
        >
          <p className="text-sm text-muted-foreground mb-4">
            Toggle to show/hide widgets
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={localConfig.order}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localConfig.order.map((widgetId) => (
                  <SortableWidgetItem
                    key={widgetId}
                    widgetId={widgetId}
                    isHidden={localConfig.hidden.includes(widgetId)}
                    onToggle={() => toggleWidget(widgetId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer - fixed at bottom */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
