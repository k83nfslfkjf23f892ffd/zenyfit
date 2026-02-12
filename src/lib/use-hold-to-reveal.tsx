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
    style: { touchAction: 'none' } as React.CSSProperties,
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

/**
 * No-op cursor — we rely solely on activeDot to highlight the touched point.
 * Kept as a named export so existing imports don't break.
 */
export function HighlightCursor() {
  return null;
}

/** Cursor config for Bar charts when holding — highlights the active bar area */
export const barHighlightCursor = { fill: 'rgb(var(--foreground) / 0.06)', rx: 6 };

/** Active dot style for Line/Area charts when holding */
export function holdActiveDot(color: string) {
  return { r: 4, fill: color, stroke: 'rgb(var(--background))', strokeWidth: 2 };
}

/** Smooth transition style for SVG chart elements */
export const holdTransition: React.CSSProperties = {
  transition: 'stroke-opacity 0.2s ease, fill-opacity 0.2s ease',
};
