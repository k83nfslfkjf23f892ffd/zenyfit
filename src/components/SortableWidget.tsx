'use client';

import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, EyeOff, Plus } from 'lucide-react';

interface SortableWidgetProps {
  widgetId: string;
  isEditMode: boolean;
  isHidden: boolean;
  onToggleVisibility: (widgetId: string) => void;
  children: ReactNode;
}

export function SortableWidget({
  widgetId,
  isEditMode,
  isHidden,
  onToggleVisibility,
  children,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50 scale-[1.02]' : ''} ${isEditMode ? 'ring-1 ring-primary/20 rounded-xl' : ''}`}
    >
      {/* Edit mode overlay controls */}
      {isEditMode && (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-1 pt-1">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="touch-none p-2.5 rounded-lg bg-background/60 backdrop-blur-sm cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5 text-foreground/40" />
          </button>

          {/* Hide/Show toggle */}
          <button
            onClick={() => onToggleVisibility(widgetId)}
            className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm"
          >
            {isHidden ? (
              <Plus className="h-5 w-5 text-primary" />
            ) : (
              <EyeOff className="h-5 w-5 text-foreground/40" />
            )}
          </button>
        </div>
      )}

      {/* Widget content */}
      <div className={isHidden && isEditMode ? 'opacity-30 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
