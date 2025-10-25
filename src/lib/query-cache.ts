/**
 * In-Memory Query Cache for Database Results
 *
 * Simple LRU cache with TTL for frequently accessed data.
 * Reduces database load and improves API response times.
 *
 * Usage:
 *   const cached = queryCache.get('key')
 *   if (cached) return cached
 *
 *   const data = await fetchFromDatabase()
 *   queryCache.set('key', data, 60) // 60 second TTL
 *   return data
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>>
  private maxSize: number
  private cleanupIntervalMs: number
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(maxSize = 1000, cleanupIntervalMs = 60000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.cleanupIntervalMs = cleanupIntervalMs
    this.startCleanup()
  }

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cache value with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    const expiresAt = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { data, expiresAt })
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Delete all cache entries matching a pattern
   */
  deletePattern(pattern: RegExp): number {
    let deleted = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }
    return deleted
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys())
    }
  }

  /**
   * Cleanup expired entries periodically
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`)
      }
    }, this.cleanupIntervalMs)

    // Prevent the timer from keeping the process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * Stop cleanup timer (for testing or graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// Singleton instance
export const queryCache = new QueryCache()

// Predefined cache keys and TTLs
export const CACHE_KEYS = {
  SAVED_EVENTS: (userId: string) => `saved-events:${userId}`,
  USER_REMINDERS: (userId: string) => `reminders:${userId}`,
  USER_PREFERENCES: (userId: string) => `preferences:${userId}`,
  EVENT_DETAILS: (eventId: string) => `event:${eventId}`,
  CATEGORY_EVENTS: (category: string, offset: number) => `events:${category}:${offset}`,
} as const

export const CACHE_TTL = {
  SAVED_EVENTS: 30,        // 30 seconds - frequently updated
  USER_REMINDERS: 60,      // 1 minute
  USER_PREFERENCES: 300,   // 5 minutes - rarely changes
  EVENT_DETAILS: 120,      // 2 minutes
  CATEGORY_EVENTS: 60,     // 1 minute
} as const

/**
 * Helper function to wrap database queries with caching
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = queryCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch from database
  const data = await fetchFn()

  // Store in cache
  queryCache.set(key, data, ttlSeconds)

  return data
}

/**
 * Invalidate cache entries for a specific resource
 */
export function invalidateCache(pattern: string | RegExp): void {
  if (typeof pattern === 'string') {
    queryCache.delete(pattern)
  } else {
    queryCache.deletePattern(pattern)
  }
}

// Export for testing and monitoring
export default queryCache
