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
      {/* Entire toolbar is the drag handle for reliable touch */}
      {/* touch-action:none as inline style to guarantee browser doesn't scroll */}
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="flex items-center justify-between px-2 py-2 rounded-t-xl bg-primary/10 border-b border-primary/20 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Hide/Show toggle — stops propagation so it doesn't trigger drag */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => onToggleVisibility(widgetId)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-primary/10 active:bg-primary/20"
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

        {/* Drag indicator */}
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-5 w-5 text-foreground/50" />
          <span className="text-xs font-medium text-foreground/50">Drag</span>
        </div>
      </div>

      {/* Widget content */}
      <div className={isHidden ? 'opacity-30 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
