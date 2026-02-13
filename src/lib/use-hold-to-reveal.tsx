import { useState, useCallback, useRef } from 'react';

/**
 * Hook for "hold to reveal" behavior on charts.
 * Returns isHolding state and event handlers to spread on a wrapper div.
 * Tooltip should be hidden when not holding, visible when holding.
 */
export function useHoldToReveal() {
  const [isHolding, setIsHolding] = useState(false);
  // Keep track of the last tooltip props so tooltip persists when finger slides outside chart
  const lastTooltipRef = useRef<{ active: boolean; payload: unknown[]; label: string } | null>(null);

  const stop = useCallback(() => {
    setIsHolding(false);
    lastTooltipRef.current = null;
  }, []);

  const start = useCallback(() => {
    setIsHolding(true);
    // Listen globally so lifting finger outside the chart still dismisses
    const onUp = () => {
      stop();
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [stop]);

  const handlers = {
    onPointerDown: start,
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
    style: { touchAction: 'none' } as React.CSSProperties,
  };

  return { isHolding, handlers, lastTooltipRef };
}

/** Style to apply to Recharts <Tooltip> wrapperStyle when using hold-to-reveal */
export function tooltipVisibility(isHolding: boolean): React.CSSProperties {
  return {
    opacity: isHolding ? 1 : 0,
    visibility: isHolding ? 'visible' as const : undefined,
    transition: 'none',
    pointerEvents: isHolding ? 'auto' as const : 'none' as const,
  };
}

/**
 * Thin vertical line cursor at the active data point.
 */
export function HighlightCursor({ points, height }: { points?: Array<{ x: number }>; height?: number }) {
  if (!points?.[0]) return null;
  const { x } = points[0];
  return (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={height || 0}
      stroke="rgb(var(--foreground))"
      strokeOpacity={0.2}
      strokeWidth={1}
    />
  );
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

/**
 * Creates a "sticky" tooltip that remembers the last data when the finger
 * slides outside the chart area but is still held down.
 */
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function useStickyTooltip<P extends { active?: boolean; payload?: unknown[]; label?: string }>(
  lastTooltipRef: React.MutableRefObject<{ active: boolean; payload: unknown[]; label: string } | null>,
  isHolding: boolean,
) {
  const prevLabelRef = useRef<string | null>(null);

  return (props: P): P => {
    // Save last active tooltip data
    if (props.active && props.payload && props.payload.length > 0) {
      lastTooltipRef.current = {
        active: true,
        payload: props.payload,
        label: props.label || '',
      };
    }

    // Haptic feedback when active data point changes
    const currentLabel = lastTooltipRef.current?.label ?? null;
    if (isHolding && currentLabel !== null && prevLabelRef.current !== null && currentLabel !== prevLabelRef.current) {
      if (canVibrate) navigator.vibrate(1);
    }
    prevLabelRef.current = currentLabel;

    // If holding but Recharts says inactive, use last known data
    if (isHolding && !props.active && lastTooltipRef.current) {
      return {
        ...props,
        active: true,
        payload: lastTooltipRef.current.payload,
        label: lastTooltipRef.current.label,
      } as P;
    }

    return props;
  };
}
