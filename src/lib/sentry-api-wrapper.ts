import { NextRequest, NextResponse } from "next/server";
import {
  captureException,
  setContext,
  trackApiPerformance,
  addBreadcrumb,
} from "./sentry";

/**
 * API Response type
 */
type ApiResponse<T = any> = NextResponse<T>;

/**
 * API Handler function type
 */
type ApiHandler<T = any> = (
  req: NextRequest,
  context?: any
) => Promise<ApiResponse<T>>;

/**
 * Wrapper for API routes with Sentry monitoring
 * Automatically tracks performance, errors, and adds context
 *
 * @example
 * export const GET = withSentryApi(async (req) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * }, 'events/list');
 */
export function withSentryApi<T = any>(
  handler: ApiHandler<T>,
  routeName: string
): ApiHandler<T> {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    const method = req.method;

    // Add breadcrumb for API request
    addBreadcrumb(`API Request: ${method} ${routeName}`, "api", "info", {
      method,
      route: routeName,
      url: req.url,
    });

    try {
      // Execute the handler
      const response = await handler(req, context);
      const duration = Date.now() - startTime;
      const statusCode = response.status;

      // Track performance
      trackApiPerformance(routeName, method, duration, statusCode);

      // Warn on slow requests
      if (duration > 3000) {
        addBreadcrumb(
          `Slow API request: ${routeName} took ${duration}ms`,
          "performance",
          "warning",
          { duration, route: routeName }
        );
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Set context for the error
      setContext("api", {
        route: routeName,
        method,
        duration,
        url: req.url,
      });

      // Capture the error
      captureException(
        error,
        {
          apiRoute: routeName,
          statusCode: 500,
          action: method,
        },
        "error"
      );

      // Track failed performance
      trackApiPerformance(routeName, method, duration, 500);

      // Return error response
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : "Unknown error"
              : "An unexpected error occurred",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper for database operations with performance tracking
 *
 * @example
 * const events = await withDatabaseMonitoring(
 *   'fetch_events',
 *   async () => {
 *     return await supabase.from('events').select('*');
 *   }
 * );
 */
export async function withDatabaseMonitoring<T>(
  queryName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    // Add breadcrumb for database query
    addBreadcrumb(`Database Query: ${queryName}`, "db", "info", {
      queryName,
      duration,
      success: true,
    });

    // Warn on slow queries
    if (duration > 1000) {
      addBreadcrumb(
        `Slow database query: ${queryName} took ${duration}ms`,
        "performance",
        "warning",
        { duration, queryName }
      );
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Capture database error
    captureException(
      error,
      {
        component: "database",
        action: queryName,
        statusCode: 500,
      },
      "error"
    );

    addBreadcrumb(`Database Error: ${queryName}`, "db", "error", {
      queryName,
      duration,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

/**
 * Wrapper for external API calls with monitoring
 *
 * @example
 * const response = await withExternalApiMonitoring(
 *   'ticketmaster',
 *   async () => {
 *     return await fetch('https://api.ticketmaster.com/...');
 *   }
 * );
 */
export async function withExternalApiMonitoring<T>(
  apiName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    addBreadcrumb(`External API Call: ${apiName}`, "http", "info", {
      apiName,
      duration,
      success: true,
    });

    // Warn on slow external API calls
    if (duration > 5000) {
      addBreadcrumb(
        `Slow external API call: ${apiName} took ${duration}ms`,
        "performance",
        "warning",
        { duration, apiName }
      );
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    captureException(
      error,
      {
        component: "external-api",
        action: apiName,
        statusCode: 500,
      },
      "error"
    );

    addBreadcrumb(`External API Error: ${apiName}`, "http", "error", {
      apiName,
      duration,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
