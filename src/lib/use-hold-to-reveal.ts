import { useState, useCallback, useRef } from 'react';

/**
 * Hook for "hold to reveal" behavior on charts.
 * Returns isHolding state and event handlers to spread on a wrapper div.
 * Tooltip should be hidden when not holding, visible when holding.
 */
export function useHoldToReveal(delay = 150) {
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => setIsHolding(true), delay);
  }, [delay]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
  }, []);

  const handlers = {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };

  return { isHolding, handlers };
}

/** Style to apply to Recharts <Tooltip> wrapperStyle when using hold-to-reveal */
export function tooltipVisibility(isHolding: boolean): React.CSSProperties {
  return {
    opacity: isHolding ? 1 : 0,
    transition: 'opacity 0.15s ease',
    pointerEvents: isHolding ? 'auto' as const : 'none' as const,
  };
}
