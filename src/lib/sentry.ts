import * as Sentry from "@sentry/nextjs";
import type { User } from "@supabase/supabase-js";

/**
 * Error severity levels
 */
export type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

/**
 * Custom error context
 */
export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  page?: string;
  action?: string;
  component?: string;
  apiRoute?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  name: string;
  value: number;
  unit?: "ms" | "bytes" | "count";
  tags?: Record<string, string>;
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: User | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.email?.split("@")[0],
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Set custom tags for filtering errors
 */
export function setTags(tags: Record<string, string>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Set custom context data
 */
export function setContext(name: string, context: ErrorContext) {
  Sentry.setContext(name, context);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category: category || "custom",
    level: level || "info",
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error | unknown,
  context?: ErrorContext,
  level?: ErrorSeverity
) {
  // Add context if provided
  if (context) {
    Sentry.withScope((scope) => {
      // Set level
      if (level) {
        scope.setLevel(level);
      }

      // Set tags for filtering
      if (context.page) {
        scope.setTag("page", context.page);
      }
      if (context.component) {
        scope.setTag("component", context.component);
      }
      if (context.apiRoute) {
        scope.setTag("api_route", context.apiRoute);
      }
      if (context.statusCode) {
        scope.setTag("status_code", String(context.statusCode));
      }

      // Set context data
      scope.setContext("custom", context);

      // Capture the error
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture message (for warnings and info)
 */
export function captureMessage(
  message: string,
  level?: ErrorSeverity,
  context?: ErrorContext
) {
  if (context) {
    Sentry.withScope((scope) => {
      if (level) {
        scope.setLevel(level);
      }
      scope.setContext("custom", context);
      Sentry.captureMessage(message);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Track API performance
 */
export function trackApiPerformance(
  route: string,
  method: string,
  duration: number,
  statusCode: number
) {
  const transaction = Sentry.startInactiveSpan({
    name: `API ${method} ${route}`,
    op: "http.server",
  });

  if (transaction) {
    transaction.setTag("http.method", method);
    transaction.setTag("http.status_code", String(statusCode));
    transaction.setData("duration", duration);
    transaction.finish();
  }

  // Add breadcrumb for API calls
  addBreadcrumb(
    `API ${method} ${route}`,
    "api",
    statusCode >= 400 ? "error" : "info",
    {
      route,
      method,
      duration,
      statusCode,
    }
  );
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  queryName: string,
  duration: number,
  success: boolean
) {
  const transaction = Sentry.startInactiveSpan({
    name: `DB ${queryName}`,
    op: "db.query",
  });

  if (transaction) {
    transaction.setTag("db.query", queryName);
    transaction.setData("duration", duration);
    transaction.setData("success", success);
    transaction.finish();
  }

  // Capture slow queries
  if (duration > 1000) {
    captureMessage(
      `Slow database query: ${queryName} took ${duration}ms`,
      "warning",
      {
        component: "database",
        action: queryName,
        statusCode: success ? 200 : 500,
      }
    );
  }
}

/**
 * Track custom performance metrics
 */
export function trackPerformance(metrics: PerformanceMetrics) {
  Sentry.metrics.gauge(metrics.name, metrics.value, {
    unit: metrics.unit,
    tags: metrics.tags,
  });
}

/**
 * Track page load performance
 */
export function trackPageLoad(pageName: string, loadTime: number) {
  trackPerformance({
    name: "page.load.time",
    value: loadTime,
    unit: "ms",
    tags: {
      page: pageName,
    },
  });

  addBreadcrumb(`Page loaded: ${pageName}`, "navigation", "info", {
    loadTime,
    page: pageName,
  });
}

/**
 * Track Web Vitals
 */
export function trackWebVital(metric: {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
}) {
  trackPerformance({
    name: `web-vital.${metric.name.toLowerCase()}`,
    value: metric.value,
    unit: "ms",
    tags: {
      rating: metric.rating,
    },
  });

  // Report poor metrics
  if (metric.rating === "poor") {
    captureMessage(
      `Poor Web Vital: ${metric.name} = ${metric.value}ms`,
      "warning",
      {
        component: "web-vitals",
        action: metric.name,
      }
    );
  }
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, context, "error");
      throw error;
    }
  }) as T;
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  tags?: Record<string, string>
) {
  const transaction = Sentry.startInactiveSpan({
    name,
    op,
  });

  if (transaction && tags) {
    Object.entries(tags).forEach(([key, value]) => {
      transaction.setTag(key, value);
    });
  }

  return transaction;
}

/**
 * Monitor API route wrapper
 */
export function withApiMonitoring<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const transaction = startTransaction(`API ${routeName}`, "http.server", {
      route: routeName,
    });

    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;

      trackApiPerformance(
        routeName,
        "POST",
        duration,
        result?.status || 200
      );

      if (transaction) {
        transaction.finish();
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      captureException(error, {
        apiRoute: routeName,
        statusCode: 500,
      });

      trackApiPerformance(routeName, "POST", duration, 500);

      if (transaction) {
        transaction.finish();
      }

      throw error;
    }
  }) as T;
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN;
}
