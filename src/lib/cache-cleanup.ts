/**
 * Cache Cleanup Utility
 * Automatically removes expired events from cache
 */

import { isEventPast } from './date-utils'

export interface CachedEvent {
  id: string
  date: string
  time?: string
  [key: string]: any
}

export interface CacheCleanupConfig {
  /** Remove events this many hours after they've passed */
  gracePeriodHours: number
  /** Maximum cache size (number of events) */
  maxCacheSize: number
  /** Clean cache this often (milliseconds) */
  cleanupIntervalMs: number
}

const DEFAULT_CONFIG: CacheCleanupConfig = {
  gracePeriodHours: 24, // Keep events for 24 hours after they've passed
  maxCacheSize: 1000,
  cleanupIntervalMs: 60 * 60 * 1000, // Clean every hour
}

/**
 * Clean expired events from a cache
 */
export function cleanExpiredEvents<T extends CachedEvent>(
  events: T[],
  config: Partial<CacheCleanupConfig> = {}
): T[] {
  const conf = { ...DEFAULT_CONFIG, ...config }

  // Filter out past events
  const upcomingEvents = events.filter(event => {
    // Skip events without dates (keep them)
    if (!event.date) {
      return true
    }

    // Check if event is past
    const isPast = isEventPast(event.date, event.time)

    // If not past, keep it
    if (!isPast) {
      return true
    }

    // If past, check grace period
    const eventDate = new Date(`${event.date}T${event.time || '23:59:59'}`)
    const hoursSincePast = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60)

    // Keep if within grace period
    return hoursSincePast < conf.gracePeriodHours
  })

  // Enforce max cache size (keep newest events)
  if (upcomingEvents.length > conf.maxCacheSize) {
    return upcomingEvents
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`)
        const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`)
        return dateA.getTime() - dateB.getTime() // Sort by date ascending
      })
      .slice(0, conf.maxCacheSize)
  }

  return upcomingEvents
}

/**
 * Cache Map with automatic cleanup
 */
export class AutoCleanupCache<K, V extends CachedEvent> {
  private cache = new Map<K, V[]>()
  private cleanupTimer: NodeJS.Timeout | null = null
  private config: CacheCleanupConfig

  constructor(config: Partial<CacheCleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startAutoCleanup()
  }

  /**
   * Set events in cache
   */
  set(key: K, events: V[]): void {
    const cleanedEvents = cleanExpiredEvents(events, this.config)
    this.cache.set(key, cleanedEvents)
  }

  /**
   * Get events from cache (automatically cleaned)
   */
  get(key: K): V[] | undefined {
    const events = this.cache.get(key)
    if (!events) {
      return undefined
    }

    // Clean on retrieval
    const cleanedEvents = cleanExpiredEvents(events, this.config)

    // Update cache with cleaned events
    if (cleanedEvents.length !== events.length) {
      this.cache.set(key, cleanedEvents)
    }

    return cleanedEvents
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * Delete a cache entry
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get total number of cached events
   */
  getTotalEvents(): number {
    let total = 0
    this.cache.forEach(events => {
      total += events.length
    })
    return total
  }

  /**
   * Manually trigger cleanup
   */
  cleanup(): number {
    let removedCount = 0
    const keysToDelete: K[] = []

    this.cache.forEach((events, key) => {
      const originalCount = events.length
      const cleanedEvents = cleanExpiredEvents(events, this.config)

      if (cleanedEvents.length === 0) {
        // Remove empty entries
        keysToDelete.push(key)
        removedCount += originalCount
      } else if (cleanedEvents.length !== originalCount) {
        // Update with cleaned events
        this.cache.set(key, cleanedEvents)
        removedCount += (originalCount - cleanedEvents.length)
      }
    })

    // Delete empty entries
    keysToDelete.forEach(key => this.cache.delete(key))

    if (removedCount > 0) {
      console.log(`🧹 Cache cleanup: Removed ${removedCount} expired events`)
    }

    return removedCount
  }

  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupIntervalMs)

    // Don't prevent Node from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number
    totalEvents: number
    upcomingEvents: number
    expiredEvents: number
  } {
    let upcomingEvents = 0
    let expiredEvents = 0

    this.cache.forEach(events => {
      events.forEach(event => {
        if (event.date && isEventPast(event.date, event.time)) {
          expiredEvents++
        } else {
          upcomingEvents++
        }
      })
    })

    return {
      entries: this.cache.size,
      totalEvents: upcomingEvents + expiredEvents,
      upcomingEvents,
      expiredEvents,
    }
  }

  /**
   * Destroy cache and stop cleanup
   */
  destroy(): void {
    this.stopAutoCleanup()
    this.clear()
  }
}

/**
 * Create a cache with automatic cleanup
 */
export function createAutoCleanupCache<K, V extends CachedEvent>(
  config: Partial<CacheCleanupConfig> = {}
): AutoCleanupCache<K, V> {
  return new AutoCleanupCache<K, V>(config)
}
