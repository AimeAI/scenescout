/**
 * Client-side interaction tracking for personalized event recommendations
 * Stores all data in localStorage (browser-only, no server requests)
 */

export interface InteractionEvent {
  type: 'click' | 'save' | 'search' | 'view'
  eventId?: string
  category?: string
  query?: string
  price?: number
  venue?: string
  distance?: number
  timestamp: number
  sessionId: string
}

export type InteractionType = InteractionEvent['type']

const STORAGE_KEY = 'sceneScout_interactions'
const SESSION_KEY = 'sceneScout_sessionId'
const MAX_AGE_DAYS = 60
const DEBOUNCE_MS = 500
const MAX_EVENTS = 1000 // Prevent localStorage overflow

// Debounced event queue
let eventQueue: InteractionEvent[] = []
let flushTimer: number | null = null

/**
 * Check if tracking is enabled via feature flag and we're in browser
 */
export function isTrackingEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return process.env.NEXT_PUBLIC_FEATURE_TRACKING_V1 === 'true'
}

/**
 * Track an interaction event (debounced write to localStorage)
 */
export function trackEvent(
  type: InteractionType,
  data: Partial<Omit<InteractionEvent, 'type' | 'timestamp' | 'sessionId'>> = {}
): void {
  if (!isTrackingEnabled()) return

  eventQueue.push({
    type,
    ...data,
    timestamp: Date.now(),
    sessionId: getOrCreateSessionId()
  })

  // Debounced flush to avoid excessive writes
  if (flushTimer !== null) window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(flushToStorage, DEBOUNCE_MS)
}

/**
 * Flush queued events to localStorage
 */
function flushToStorage(): void {
  if (typeof window === 'undefined' || eventQueue.length === 0) return

  try {
    const existing = readInteractions()
    let merged = [...existing, ...eventQueue]

    // Limit total events to prevent localStorage overflow
    if (merged.length > MAX_EVENTS) {
      merged = merged.slice(-MAX_EVENTS)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    eventQueue = []
  } catch (error) {
    console.warn('Failed to write tracking data:', error)
    eventQueue = [] // Clear queue to prevent memory leak
  }
}

/**
 * Read all interactions from localStorage (with SSR guard)
 */
export function readInteractions(): InteractionEvent[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed: InteractionEvent[] = JSON.parse(stored)
    return clearOldInteractions(parsed, MAX_AGE_DAYS)
  } catch (error) {
    console.warn('Failed to read tracking data:', error)
    return []
  }
}

/**
 * Remove interactions older than maxAgeDays and update storage
 */
export function clearOldInteractions(
  interactions: InteractionEvent[],
  maxAgeDays: number = MAX_AGE_DAYS
): InteractionEvent[] {
  if (typeof window === 'undefined') return interactions

  const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000)
  const filtered = interactions.filter(i => i.timestamp > cutoff)

  // Update storage if we filtered anything
  if (filtered.length !== interactions.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.warn('Failed to update tracking data:', error)
    }
  }

  return filtered
}

/**
 * Get or create session ID (persists for browser session)
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_session'

  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY)

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(SESSION_KEY, sessionId)
    }

    return sessionId
  } catch {
    // Fallback if sessionStorage is blocked
    return `temp_${Date.now()}`
  }
}

/**
 * Clear all tracking data (for user privacy/testing)
 */
export function clearAllInteractions(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    eventQueue = []
  } catch (error) {
    console.warn('Failed to clear tracking data:', error)
  }
}
