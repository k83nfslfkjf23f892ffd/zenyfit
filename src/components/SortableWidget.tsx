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

  if (!isEditMode) {
    return <div ref={setNodeRef}>{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl ring-2 ring-primary/30 ${isDragging ? 'z-50 scale-[1.02] ring-primary/60' : ''}`}
    >
      {/* Edit mode toolbar */}
      <div className="flex items-center justify-between px-2 py-2 rounded-t-xl bg-primary/10 border-b border-primary/20">
        {/* Hide/Show toggle */}
        <button
          onClick={() => onToggleVisibility(widgetId)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-primary/10"
        >
          {isHidden ? (
            <>
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Show</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 text-foreground/50" />
              <span className="text-xs font-medium text-foreground/50">Hide</span>
            </>
          )}
        </button>

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-primary/10 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-foreground/50" />
          <span className="text-xs font-medium text-foreground/50">Drag</span>
        </button>
      </div>

      {/* Widget content */}
      <div className={isHidden ? 'opacity-30 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
