'use client';

import { trackWebVital } from './sentry';

/**
 * Report Web Vitals to Sentry
 * This tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB
 *
 * Usage in app/layout.tsx:
 * import { reportWebVitals } from '@/lib/web-vitals';
 *
 * export function reportWebVitals(metric) {
 *   // Metrics will be automatically sent to Sentry
 * }
 */

type Metric = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
};

/**
 * Thresholds for Web Vitals ratings
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

/**
 * Get rating based on thresholds
 */
function getRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report metric to Sentry
 */
export function reportWebVitals(metric: Metric) {
  // Only track in production or if explicitly enabled
  if (
    process.env.NODE_ENV !== 'production' &&
    !process.env.NEXT_PUBLIC_TRACK_WEB_VITALS
  ) {
    return;
  }

  const rating = metric.rating || getRating(metric.name, metric.value);

  // Track in Sentry
  trackWebVital({
    name: metric.name,
    value: metric.value,
    rating,
    delta: metric.delta,
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: metric.value,
      rating,
      delta: metric.delta,
    });
  }
}

/**
 * Performance observer for custom metrics
 */
export function observePerformance() {
  if (typeof window === 'undefined') return;

  // Observe long tasks (tasks taking >50ms)
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`Long task detected: ${entry.duration}ms`);

            // Track long tasks
            trackWebVital({
              name: 'LONG_TASK',
              value: entry.duration,
              rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
              delta: entry.duration,
            });
          }
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // PerformanceObserver might not support 'longtask'
      console.warn('Long task observation not supported');
    }

    // Observe resource loading times
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;

          // Track slow resources (>1s)
          if (resource.duration > 1000) {
            console.warn(
              `Slow resource: ${resource.name} took ${resource.duration}ms`
            );
          }

          // Track large resources (>500KB)
          if (resource.transferSize && resource.transferSize > 500000) {
            console.warn(
              `Large resource: ${resource.name} is ${Math.round(
                resource.transferSize / 1024
              )}KB`
            );
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource observation not supported');
    }
  }
}

/**
 * Track page load performance
 */
export function trackPagePerformance(pageName: string) {
  if (typeof window === 'undefined') return;

  // Use Navigation Timing API
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigationEntries = performance.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];

    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0];

      // Track various timing metrics
      const metrics = {
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        ttfb: nav.responseStart - nav.requestStart,
        download: nav.responseEnd - nav.responseStart,
        domInteractive: nav.domInteractive - nav.fetchStart,
        domComplete: nav.domComplete - nav.fetchStart,
        loadComplete: nav.loadEventEnd - nav.fetchStart,
      };

      // Log metrics
      console.log(`[Page Performance] ${pageName}:`, metrics);

      // Track in Sentry if any metric is concerning
      if (metrics.ttfb > 1000) {
        trackWebVital({
          name: 'TTFB',
          value: metrics.ttfb,
          rating: getRating('TTFB', metrics.ttfb),
          delta: metrics.ttfb,
        });
      }
    }
  }
}
