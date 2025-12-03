import { useState, useRef, useCallback, useEffect } from "react";

export interface PressAndDragOptions<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  getItemId: (item: T) => string;
  holdDelay?: number;
  enableHaptics?: boolean;
}

export interface PressAndDragResult<T> {
  draggedId: string | null;
  readyToDrag: string | null;
  getItemProps: (item: T) => {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  isDragging: boolean;
}

export function usePressAndDrag<T>({
  items,
  onReorder,
  getItemId,
  holdDelay = 300,
  enableHaptics = true,
}: PressAndDragOptions<T>): PressAndDragResult<T> {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [readyToDrag, setReadyToDrag] = useState<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartIndexRef = useRef<number>(-1);

  const triggerHaptic = useCallback(() => {
    if (enableHaptics && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
      }
    }
  }, [enableHaptics]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (item: T) => (e: React.TouchEvent) => {
      const id = getItemId(item);
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      clearHoldTimer();

      holdTimerRef.current = setTimeout(() => {
        setReadyToDrag(id);
        triggerHaptic();
      }, holdDelay);
    },
    [getItemId, holdDelay, clearHoldTimer, triggerHaptic]
  );

  const handleTouchMove = useCallback(
    (item: T) => (e: React.TouchEvent) => {
      const id = getItemId(item);
      const touch = e.touches[0];

      if (touchStartPosRef.current && !readyToDrag) {
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          clearHoldTimer();
          touchStartPosRef.current = null;
        }
      }

      if (readyToDrag === id || draggedId === id) {
        if (!draggedId) {
          setDraggedId(id);
          dragStartIndexRef.current = items.findIndex((i) => getItemId(i) === id);
        }
        e.preventDefault();

        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elemBelow) {
          const dropTarget = elemBelow.closest("[data-drag-id]");
          if (dropTarget) {
            const targetId = dropTarget.getAttribute("data-drag-id");
            if (targetId && targetId !== id) {
              const targetIndex = items.findIndex((i) => getItemId(i) === targetId);
              const currentIndex = items.findIndex((i) => getItemId(i) === id);
              if (targetIndex !== -1 && currentIndex !== -1 && targetIndex !== currentIndex) {
                const newItems = [...items];
                newItems.splice(currentIndex, 1);
                newItems.splice(targetIndex, 0, items[currentIndex]);
                onReorder(newItems);
              }
            }
          }
        }
      }
    },
    [items, getItemId, readyToDrag, draggedId, clearHoldTimer, onReorder]
  );

  const handleTouchEnd = useCallback(() => {
    clearHoldTimer();
    setDraggedId(null);
    setReadyToDrag(null);
    touchStartPosRef.current = null;
    dragStartIndexRef.current = -1;
  }, [clearHoldTimer]);

  const handleMouseDown = useCallback(
    (item: T) => (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const id = getItemId(item);
      clearHoldTimer();

      holdTimerRef.current = setTimeout(() => {
        setReadyToDrag(id);
        triggerHaptic();
      }, holdDelay);
    },
    [getItemId, holdDelay, clearHoldTimer, triggerHaptic]
  );

  const handleMouseUp = useCallback(() => {
    clearHoldTimer();
  }, [clearHoldTimer]);

  const handleMouseLeave = useCallback(() => {
    if (!draggedId) {
      clearHoldTimer();
      setReadyToDrag(null);
    }
  }, [draggedId, clearHoldTimer]);

  const handleDragStart = useCallback(
    (item: T) => (e: React.DragEvent) => {
      const id = getItemId(item);
      if (!readyToDrag) {
        e.preventDefault();
        return;
      }
      setDraggedId(id);
      dragStartIndexRef.current = items.findIndex((i) => getItemId(i) === id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    [items, getItemId, readyToDrag]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (item: T) => (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedId) return;

      const targetId = getItemId(item);
      if (targetId === draggedId) {
        setDraggedId(null);
        setReadyToDrag(null);
        return;
      }

      const draggedIndex = items.findIndex((i) => getItemId(i) === draggedId);
      const targetIndex = items.findIndex((i) => getItemId(i) === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newItems = [...items];
        newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, items[draggedIndex]);
        onReorder(newItems);
      }

      setDraggedId(null);
      setReadyToDrag(null);
    },
    [items, getItemId, draggedId, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setReadyToDrag(null);
    clearHoldTimer();
  }, [clearHoldTimer]);

  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, [clearHoldTimer]);

  const getItemProps = useCallback(
    (item: T) => ({
      onTouchStart: handleTouchStart(item),
      onTouchMove: handleTouchMove(item),
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown(item),
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      draggable: readyToDrag === getItemId(item),
      onDragStart: handleDragStart(item),
      onDragOver: handleDragOver,
      onDrop: handleDrop(item),
      onDragEnd: handleDragEnd,
    }),
    [
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseDown,
      handleMouseUp,
      handleMouseLeave,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      readyToDrag,
      getItemId,
    ]
  );

  return {
    draggedId,
    readyToDrag,
    getItemProps,
    isDragging: !!draggedId,
  };
}
