/**
 * Saved Events - Local bookmark system
 *
 * Features:
 * - localStorage-based (no server required)
 * - Add/remove saved events
 * - Check if event is saved
 * - Get all saved events
 * - Feature-flagged
 */

export interface SavedEvent {
  eventId: string
  title: string
  savedAt: number
  category?: string
  date?: string
  venue?: string
  imageUrl?: string
}

const STORAGE_KEY = 'sceneScout_savedEvents'
const MAX_SAVED = 500 // Prevent localStorage overflow

/**
 * Check if saved events feature is enabled
 */
export function isSavedEventsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return process.env.NEXT_PUBLIC_FEATURE_SAVED_EVENTS === 'true'
}

/**
 * Save an event
 */
export function saveEvent(event: any): void {
  if (!isSavedEventsEnabled()) return

  try {
    const saved = readSavedEvents()

    // Check if already saved
    if (saved.some(s => s.eventId === event.id)) {
      return // Already saved
    }

    const savedEvent: SavedEvent = {
      eventId: event.id,
      title: event.title || 'Untitled Event',
      savedAt: Date.now(),
      category: event.category,
      date: event.date,
      venue: event.venue_name,
      imageUrl: event.image_url
    }

    saved.unshift(savedEvent) // Add to front

    // Limit total saved events
    const trimmed = saved.slice(0, MAX_SAVED)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.warn('Failed to save event:', error)
  }
}

/**
 * Remove a saved event
 */
export function unsaveEvent(eventId: string): void {
  if (!isSavedEventsEnabled()) return

  try {
    const saved = readSavedEvents()
    const filtered = saved.filter(s => s.eventId !== eventId)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.warn('Failed to unsave event:', error)
  }
}

/**
 * Check if an event is saved
 */
export function isEventSaved(eventId: string): boolean {
  if (!isSavedEventsEnabled()) return false

  const savedIds = getSavedEventIds()
  return savedIds.has(eventId)
}

/**
 * Get all saved event IDs
 */
export function getSavedEventIds(): Set<string> {
  if (!isSavedEventsEnabled() || typeof window === 'undefined') {
    return new Set()
  }

  const saved = readSavedEvents()
  return new Set(saved.map(s => s.eventId))
}

/**
 * Read saved events from localStorage
 */
export function readSavedEvents(): SavedEvent[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    return JSON.parse(stored)
  } catch (error) {
    console.warn('Failed to read saved events:', error)
    return []
  }
}

/**
 * Get count of saved events
 */
export function getSavedCount(): number {
  if (!isSavedEventsEnabled()) return 0

  return readSavedEvents().length
}

/**
 * Clear all saved events (for testing/privacy)
 */
export function clearSavedEvents(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear saved events:', error)
  }
}

/**
 * Toggle saved status (save if unsaved, unsave if saved)
 */
export function toggleSaveEvent(event: any): boolean {
  if (!isSavedEventsEnabled()) return false

  const isSaved = isEventSaved(event.id)

  if (isSaved) {
    unsaveEvent(event.id)
    return false
  } else {
    saveEvent(event)
    return true
  }
}
