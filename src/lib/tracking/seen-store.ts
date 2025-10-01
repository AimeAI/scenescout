/**
 * Seen Store - Track viewed events to prevent repetitive surfacing
 *
 * Features:
 * - 14-day TTL (configurable)
 * - Automatic cleanup of expired entries
 * - localStorage-based (client-side only)
 * - Feature-flagged
 */

export interface SeenEvent {
  eventId: string
  seenAt: number
  source: 'view' | 'click' | 'detail'
}

const STORAGE_KEY = 'sceneScout_seenEvents'
const MAX_SEEN_EVENTS = 2000 // Prevent localStorage overflow

// Config from env
const CONFIG = {
  enabled: process.env.NEXT_PUBLIC_FEATURE_SEEN_STORE === 'true',
  ttlDays: parseInt(process.env.NEXT_PUBLIC_SEEN_STORE_TTL_DAYS || '14'),
}

/**
 * Check if seen store is enabled and we're in browser
 */
export function isSeenStoreEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return CONFIG.enabled
}

/**
 * Mark an event as seen
 */
export function markEventAsSeen(
  eventId: string,
  source: SeenEvent['source'] = 'view'
): void {
  if (!isSeenStoreEnabled()) return

  try {
    const seen = readSeenEvents()

    // Check if already marked (update timestamp)
    const existing = seen.find(s => s.eventId === eventId)
    if (existing) {
      existing.seenAt = Date.now()
      existing.source = source // Update source if different
    } else {
      seen.push({
        eventId,
        seenAt: Date.now(),
        source
      })
    }

    // Limit total seen events
    let trimmed = seen
    if (trimmed.length > MAX_SEEN_EVENTS) {
      // Keep most recent
      trimmed = trimmed
        .sort((a, b) => b.seenAt - a.seenAt)
        .slice(0, MAX_SEEN_EVENTS)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.warn('Failed to mark event as seen:', error)
  }
}

/**
 * Check if an event has been seen recently
 */
export function hasSeenEvent(eventId: string): boolean {
  if (!isSeenStoreEnabled()) return false

  const seenIds = getSeenEventIds()
  return seenIds.has(eventId)
}

/**
 * Get all seen event IDs (within TTL)
 */
export function getSeenEventIds(): Set<string> {
  if (!isSeenStoreEnabled() || typeof window === 'undefined') {
    return new Set()
  }

  const seen = readSeenEvents()
  return new Set(seen.map(s => s.eventId))
}

/**
 * Read seen events from localStorage with automatic cleanup
 */
export function readSeenEvents(): SeenEvent[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed: SeenEvent[] = JSON.parse(stored)
    return cleanupExpiredSeen(parsed)
  } catch (error) {
    console.warn('Failed to read seen events:', error)
    return []
  }
}

/**
 * Remove seen events older than TTL and update storage
 */
function cleanupExpiredSeen(seen: SeenEvent[]): SeenEvent[] {
  if (typeof window === 'undefined') return seen

  const ttlMs = CONFIG.ttlDays * 24 * 60 * 60 * 1000
  const cutoff = Date.now() - ttlMs

  const filtered = seen.filter(s => s.seenAt > cutoff)

  // Update storage if we cleaned anything
  if (filtered.length !== seen.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.warn('Failed to update seen events:', error)
    }
  }

  return filtered
}

/**
 * Filter events to exclude seen ones
 */
export function filterUnseen<T extends { id: string }>(events: T[]): T[] {
  if (!isSeenStoreEnabled()) return events

  const seenIds = getSeenEventIds()
  return events.filter(event => !seenIds.has(event.id))
}

/**
 * Get seen event statistics
 */
export function getSeenStats(): {
  total: number
  last24h: number
  last7d: number
  last14d: number
} {
  if (!isSeenStoreEnabled()) {
    return { total: 0, last24h: 0, last7d: 0, last14d: 0 }
  }

  const seen = readSeenEvents()
  const now = Date.now()

  return {
    total: seen.length,
    last24h: seen.filter(s => s.seenAt > now - 24 * 60 * 60 * 1000).length,
    last7d: seen.filter(s => s.seenAt > now - 7 * 24 * 60 * 60 * 1000).length,
    last14d: seen.filter(s => s.seenAt > now - 14 * 24 * 60 * 60 * 1000).length,
  }
}

/**
 * Clear all seen events (for testing/privacy)
 */
export function clearSeenEvents(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear seen events:', error)
  }
}

/**
 * Bulk mark multiple events as seen (e.g., on scroll)
 */
export function markEventsAsSeen(
  eventIds: string[],
  source: SeenEvent['source'] = 'view'
): void {
  if (!isSeenStoreEnabled() || eventIds.length === 0) return

  try {
    const seen = readSeenEvents()
    const seenMap = new Map(seen.map(s => [s.eventId, s]))
    const now = Date.now()

    // Update or add each event
    eventIds.forEach(eventId => {
      const existing = seenMap.get(eventId)
      if (existing) {
        existing.seenAt = now
        existing.source = source
      } else {
        seenMap.set(eventId, { eventId, seenAt: now, source })
      }
    })

    let updated = Array.from(seenMap.values())

    // Limit total
    if (updated.length > MAX_SEEN_EVENTS) {
      updated = updated
        .sort((a, b) => b.seenAt - a.seenAt)
        .slice(0, MAX_SEEN_EVENTS)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.warn('Failed to bulk mark events as seen:', error)
  }
}
