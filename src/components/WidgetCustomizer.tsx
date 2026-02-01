'use client';

import { useState, useEffect, useRef } from 'react';
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
import { GripVertical, X } from 'lucide-react';
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
  disabled?: boolean;
}

function SortableWidgetItem({ widgetId, isHidden, onToggle, disabled }: SortableWidgetItemProps) {
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
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isDragging ? 'shadow-lg z-50' : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
        disabled={disabled}
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
        disabled={disabled}
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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync localConfig when config prop changes
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-save function
  const saveConfig = async (configToSave: WidgetConfig) => {
    if (!userId || !firebaseUser) return;

    setSaving(true);
    try {
      const token = await firebaseUser.getIdToken();

      const response = await fetch(`/api/users/${userId}`, {
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
        return;
      }

      // Clear cache so fresh data loads on next visit
      localStorage.removeItem('zenyfit_user_cache');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Debounced save - waits 500ms after last change
  const debouncedSave = (newConfig: WidgetConfig) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveConfig(newConfig);
    }, 500);
  };

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
      const newOrder = arrayMove(localConfig.order, oldIndex, newIndex);
      const newConfig = { ...localConfig, order: newOrder };

      setLocalConfig(newConfig);
      debouncedSave(newConfig);
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
      const newConfig = { ...prev, hidden: newHidden };

      // Auto-save after toggle
      debouncedSave(newConfig);

      return newConfig;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 touch-none"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-background border rounded-t-lg sm:rounded-lg w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-lg overscroll-none touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div>
            <h3 className="text-lg font-semibold">Customize Dashboard</h3>
            {saving && <p className="text-xs text-muted-foreground">Saving...</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - scrollable */}
        <div
          className="p-4 flex-1 overflow-y-auto min-h-0 overscroll-contain"
          style={{
            overflowY: isDragging ? 'hidden' : 'auto',
            touchAction: isDragging ? 'none' : 'auto',
          }}
        >
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
                    disabled={saving}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

      </div>
    </div>
  );
}
