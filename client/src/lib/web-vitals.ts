import * as Sentry from "@sentry/react";
import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from "web-vitals";

/**
 * Reports Web Vitals metrics to Sentry for performance monitoring
 */
export function reportWebVitals() {
  const sendToSentry = (metric: Metric) => {
    // Only send metrics in production when Sentry is configured
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      // Send metric as a measurement to Sentry
      Sentry.setMeasurement(metric.name, metric.value, metric.rating);

      // Also log to console in development for visibility
      if (import.meta.env.DEV) {
        console.log(`[Web Vitals] ${metric.name}:`, metric.value, `(${metric.rating})`);
      }
    }
  };

  // Core Web Vitals
  onCLS(sendToSentry); // Cumulative Layout Shift
  onINP(sendToSentry); // Interaction to Next Paint (replaces FID)
  onLCP(sendToSentry); // Largest Contentful Paint

  // Additional metrics
  onFCP(sendToSentry); // First Contentful Paint
  onTTFB(sendToSentry); // Time to First Byte
}
