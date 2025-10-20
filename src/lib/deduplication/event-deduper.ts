/**
 * Event deduplication utilities for SceneScout
 * Handles cross-provider duplicate detection and removal
 */

export interface DedupeOptions {
  /** Time window in minutes for considering events similar (default: 90) */
  timeWindowMinutes?: number
  /** Title similarity threshold 0-1 (default: 0.85) */
  titleSimilarityThreshold?: number
  /** Whether venue must match for duplicates (default: false) */
  venueMatchRequired?: boolean
  /** Which provider to prefer when deduping (default: 'ticketmaster') */
  preserveProvider?: 'ticketmaster' | 'eventbrite' | null
}

export interface EventDedupeKey {
  slug: string
  date: string
  venue?: string
}

/**
 * Normalize event title and venue into a consistent slug for comparison
 */
export function normalizeEventSlug(title: string, venue?: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .replace(/\s/g, '-') // Convert spaces to hyphens
  
  if (venue) {
    const venueNormalized = venue
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .trim()
    return `${normalized}__${venueNormalized}`
  }
  
  return normalized
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  
  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0
  
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0))
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  const maxLen = Math.max(len1, len2)
  return 1 - (matrix[len1][len2] / maxLen)
}

/**
 * Check if two events are similar based on title, time, and venue
 */
export function areEventsSimilar(
  eventA: any, 
  eventB: any, 
  options: DedupeOptions = {}
): boolean {
  const {
    timeWindowMinutes = 90,
    titleSimilarityThreshold = 0.95, // Increased to 0.95 to reduce false positives
    venueMatchRequired = false
  } = options
  
  // Check title similarity
  const titleA = (eventA.title || '').toLowerCase()
  const titleB = (eventB.title || '').toLowerCase()
  
  if (titleA === titleB) {
    // Exact title match - check time window
    return isWithinTimeWindow(eventA, eventB, timeWindowMinutes)
  }
  
  const similarity = calculateSimilarity(titleA, titleB)
  if (similarity < titleSimilarityThreshold) {
    return false
  }
  
  // Check venue if required
  if (venueMatchRequired) {
    const venueA = (eventA.venue_name || '').toLowerCase()
    const venueB = (eventB.venue_name || '').toLowerCase()
    if (venueA !== venueB && venueA && venueB) {
      return false
    }
  }
  
  // Check time window
  return isWithinTimeWindow(eventA, eventB, timeWindowMinutes)
}

/**
 * Check if two events are within the specified time window
 */
function isWithinTimeWindow(eventA: any, eventB: any, windowMinutes: number): boolean {
  try {
    const dateA = new Date(eventA.start_time || eventA.date || '1970-01-01')
    const dateB = new Date(eventB.start_time || eventB.date || '1970-01-01')
    
    const diffMs = Math.abs(dateA.getTime() - dateB.getTime())
    const diffMinutes = diffMs / (1000 * 60)
    
    return diffMinutes <= windowMinutes
  } catch (error) {
    // If date parsing fails, fall back to string comparison
    const dateStrA = eventA.start_time || eventA.date || ''
    const dateStrB = eventB.start_time || eventB.date || ''
    return dateStrA === dateStrB
  }
}

/**
 * Choose which event to keep when deduplicating
 */
function selectBetterEvent(eventA: any, eventB: any, preserveProvider?: string): any {
  // Provider preference
  if (preserveProvider) {
    const sourceA = eventA.source || ''
    const sourceB = eventB.source || ''
    
    if (sourceA.includes(preserveProvider) && !sourceB.includes(preserveProvider)) {
      return eventA
    }
    if (sourceB.includes(preserveProvider) && !sourceA.includes(preserveProvider)) {
      return eventB
    }
  }
  
  // Prefer events with more complete data
  const scoreA = calculateEventCompleteness(eventA)
  const scoreB = calculateEventCompleteness(eventB)
  
  return scoreA >= scoreB ? eventA : eventB
}

/**
 * Calculate completeness score for an event
 */
function calculateEventCompleteness(event: any): number {
  let score = 0
  
  // Required fields
  if (event.title) score += 2
  if (event.date || event.start_time) score += 2
  if (event.venue_name) score += 2
  
  // Optional fields that add value
  if (event.description) score += 1
  if (event.image_url) score += 1
  if (event.price_min !== undefined) score += 1
  if (event.external_url) score += 1
  if (event.latitude && event.longitude) score += 1
  if (event.category) score += 1
  
  return score
}

/**
 * Remove duplicate events from a list
 */
export function dedupeEvents(events: any[], options: DedupeOptions = {}): any[] {
  if (!events || events.length === 0) {
    return events
  }
  
  console.log(`🔍 Deduplicating ${events.length} events...`)

  const dedupedEvents: any[] = []
  const processedSlugs = new Set<string>()
  let duplicatesRemoved = 0
  
  for (const event of events) {
    if (!event.title) {
      // Keep events without titles as-is
      dedupedEvents.push(event)
      continue
    }
    
    // Check for exact matches first (fast path)
    const slug = normalizeEventSlug(event.title, event.venue_name)
    if (processedSlugs.has(slug)) {
      continue
    }
    
    // Check for fuzzy matches against existing events
    let isDuplicate = false
    let duplicateIndex = -1
    
    for (let i = 0; i < dedupedEvents.length; i++) {
      const existingEvent = dedupedEvents[i]
      if (areEventsSimilar(event, existingEvent, options)) {
        isDuplicate = true
        duplicateIndex = i
        break
      }
    }
    
    if (isDuplicate && duplicateIndex >= 0) {
      // Replace with better event
      const betterEvent = selectBetterEvent(
        event,
        dedupedEvents[duplicateIndex],
        options.preserveProvider
      )
      dedupedEvents[duplicateIndex] = betterEvent
      duplicatesRemoved++
      console.log(`🔍 Duplicate found: "${event.title}" ≈ "${dedupedEvents[duplicateIndex].title}"`)
    } else {
      // Add new unique event
      dedupedEvents.push(event)
      processedSlugs.add(slug)
    }
  }
  
  const removedCount = events.length - dedupedEvents.length
  console.log(`✅ Removed ${removedCount} duplicates, kept ${dedupedEvents.length} unique events`)
  
  return dedupedEvents
}