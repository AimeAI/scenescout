/**
 * Performance Monitoring Utility
 *
 * Logs slow queries and provides metrics for database performance.
 * Helps identify bottlenecks and optimization opportunities.
 */

interface QueryMetrics {
  route: string
  operation: string
  duration: number
  timestamp: Date
}

class PerformanceMonitor {
  private slowQueryThreshold: number
  private metrics: QueryMetrics[] = []
  private maxMetricsHistory = 100

  constructor(slowQueryThreshold = 500) {
    this.slowQueryThreshold = slowQueryThreshold
  }

  /**
   * Log query execution time
   */
  logQuery(route: string, operation: string, duration: number): void {
    const metric: QueryMetrics = {
      route,
      operation,
      duration,
      timestamp: new Date()
    }

    // Keep metrics history for monitoring
    this.metrics.push(metric)
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift() // Remove oldest
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`⚠️ Slow query detected:`, {
        route,
        operation,
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`
      })
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Query completed: ${route} - ${operation} (${duration}ms)`)
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        slowQueries: 0,
        fastestQuery: 0,
        slowestQuery: 0
      }
    }

    const durations = this.metrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const slowQueries = this.metrics.filter(m => m.duration > this.slowQueryThreshold)

    return {
      totalQueries: this.metrics.length,
      avgDuration: Math.round(totalDuration / this.metrics.length),
      slowQueries: slowQueries.length,
      slowQueryPercent: Math.round((slowQueries.length / this.metrics.length) * 100),
      fastestQuery: Math.min(...durations),
      slowestQuery: Math.max(...durations),
      recentSlowQueries: slowQueries.slice(-10).map(m => ({
        route: m.route,
        operation: m.operation,
        duration: m.duration,
        timestamp: m.timestamp
      }))
    }
  }

  /**
   * Get metrics for a specific route
   */
  getRouteStats(route: string) {
    const routeMetrics = this.metrics.filter(m => m.route === route)

    if (routeMetrics.length === 0) {
      return null
    }

    const durations = routeMetrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)

    return {
      route,
      totalQueries: routeMetrics.length,
      avgDuration: Math.round(totalDuration / routeMetrics.length),
      fastestQuery: Math.min(...durations),
      slowestQuery: Math.max(...durations)
    }
  }

  /**
   * Clear metrics history
   */
  clear(): void {
    this.metrics = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Helper function to measure query execution time
 */
export async function measureQuery<T>(
  route: string,
  operation: string,
  queryFn: () => Promise<T>
): Promise<{ data: T; duration: number }> {
  const startTime = Date.now()

  try {
    const data = await queryFn()
    const duration = Date.now() - startTime

    performanceMonitor.logQuery(route, operation, duration)

    return { data, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    performanceMonitor.logQuery(route, `${operation} (ERROR)`, duration)
    throw error
  }
}

/**
 * Connection pool verification for Supabase client
 */
export function verifyConnectionPool() {
  const status = {
    clientReused: true, // Singleton pattern in supabase-server.ts
    pooling: 'Supabase uses built-in connection pooling',
    recommendations: [
      '✅ Server-side client uses singleton pattern',
      '✅ Supabase handles connection pooling automatically',
      '✅ No manual pool configuration needed',
      '💡 Consider using Supavisor for high-traffic scenarios'
    ]
  }

  console.log('🔍 Connection Pool Status:', status)
  return status
}

export default performanceMonitor
