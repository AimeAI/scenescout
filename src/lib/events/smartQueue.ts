/**
 * Smart event queue for "Surprise Me" feature
 * Selects events intelligently to help users discover their taste
 */

import { AffinityProfile, computeAffinity } from '@/lib/tracking/affinity'
import { readInteractions } from '@/lib/tracking/client'
import { getSavedIds } from '@/lib/saved/store'

interface SmartQueueOptions {
  maxEvents?: number
  diversityWeight?: number // 0-1, higher = more diverse categories
  qualityWeight?: number // 0-1, higher = prioritize high-quality events
}

/**
 * Create a smart queue of events for swiping
 * Algorithm prioritizes:
 * 1. Not already saved
 * 2. Not past events
 * 3. Mix of user's favorite categories + new discoveries
 * 4. High-quality events (with images, descriptions, etc.)
 */
export function createSmartQueue(
  allEvents: any[],
  options: SmartQueueOptions = {}
): any[] {
  const {
    maxEvents = 20,
    diversityWeight = 0.3,
    qualityWeight = 0.4
  } = options

  // Get user preferences
  const savedIds = getSavedIds()
  const interactions = readInteractions()
  const affinity = interactions.length > 0 ? computeAffinity(interactions) : null

  // Filter out saved and past events
  let candidates = allEvents.filter(event => {
    // Skip already saved
    if (savedIds.has(event.id)) return false

    // Skip past events
    const eventDate = new Date(event.date || event.start_date)
    if (eventDate < new Date()) return false

    return true
  })

  // Score each event
  const scoredEvents = candidates.map(event => ({
    event,
    score: calculateEventScore(event, affinity, { diversityWeight, qualityWeight })
  }))

  // Sort by score (highest first)
  scoredEvents.sort((a, b) => b.score - a.score)

  // Apply diversity sampling
  const selectedEvents = diversitySample(scoredEvents, maxEvents, affinity)

  return selectedEvents.map(se => se.event)
}

/**
 * Calculate quality score for an event
 */
function calculateEventScore(
  event: any,
  affinity: AffinityProfile | null,
  options: { diversityWeight: number; qualityWeight: number }
): number {
  let score = 0

  // 1. Quality score (40% weight by default)
  const qualityScore = getQualityScore(event)
  score += qualityScore * options.qualityWeight

  // 2. Affinity score (30% weight if we have user data)
  if (affinity) {
    const affinityScore = getAffinityScore(event, affinity)
    score += affinityScore * (1 - options.diversityWeight - options.qualityWeight)
  }

  // 3. Diversity bonus (30% weight by default)
  // Events from categories user hasn't explored get a boost
  if (affinity) {
    const diversityBonus = getDiversityBonus(event, affinity)
    score += diversityBonus * options.diversityWeight
  } else {
    // If no user data, add random diversity
    score += Math.random() * options.diversityWeight
  }

  return score
}

/**
 * Get quality score based on event data completeness
 */
function getQualityScore(event: any): number {
  let score = 0

  // Has image (most important for swipe UX)
  if (event.image_url) score += 0.4

  // Has description
  if (event.description && event.description.length > 50) score += 0.2

  // Has venue
  if (event.venue_name) score += 0.15

  // Has time information
  if (event.time || event.start_time) score += 0.1

  // Has category
  if (event.category) score += 0.1

  // Has price information
  if (event.price_min !== undefined || event.price_max !== undefined) score += 0.05

  return score
}

/**
 * Get affinity score based on user preferences
 */
function getAffinityScore(event: any, affinity: AffinityProfile): number {
  let score = 0

  // Category affinity
  if (event.category && affinity.categories[event.category]) {
    score += affinity.categories[event.category] * 0.5
  }

  // Venue affinity
  if (event.venue_name && affinity.venues[event.venue_name]) {
    score += affinity.venues[event.venue_name] * 0.3
  }

  // Price range affinity
  const priceRange = getPriceRange(event.price_min)
  if (affinity.priceRanges[priceRange]) {
    score += affinity.priceRanges[priceRange] * 0.2
  }

  return score
}

/**
 * Get diversity bonus for unexplored categories
 */
function getDiversityBonus(event: any, affinity: AffinityProfile): number {
  if (!event.category) return 0.5 // Unknown category gets medium bonus

  const categoryAffinity = affinity.categories[event.category] || 0

  // Categories user hasn't explored get higher bonus
  if (categoryAffinity === 0) return 1.0
  if (categoryAffinity < 0.3) return 0.7
  if (categoryAffinity < 0.6) return 0.4

  return 0.1 // Already explored
}

/**
 * Sample events with diversity in mind
 * Ensures we don't show too many events from the same category
 */
function diversitySample(
  scoredEvents: Array<{ event: any; score: number }>,
  maxEvents: number,
  affinity: AffinityProfile | null
): Array<{ event: any; score: number }> {
  const selected: Array<{ event: any; score: number }> = []
  const categoryCounts: Record<string, number> = {}
  const maxPerCategory = Math.ceil(maxEvents / 5) // Max 4 per category for 20 events

  // First pass: take highest scoring events up to category limit
  for (const scoredEvent of scoredEvents) {
    if (selected.length >= maxEvents) break

    const category = scoredEvent.event.category || 'unknown'
    const count = categoryCounts[category] || 0

    if (count < maxPerCategory) {
      selected.push(scoredEvent)
      categoryCounts[category] = count + 1
    }
  }

  // Second pass: if we don't have enough events, add more ignoring category limits
  if (selected.length < maxEvents) {
    for (const scoredEvent of scoredEvents) {
      if (selected.length >= maxEvents) break
      if (!selected.includes(scoredEvent)) {
        selected.push(scoredEvent)
      }
    }
  }

  return selected
}

/**
 * Helper to determine price range
 */
function getPriceRange(price?: number): string {
  if (!price || price === 0) return 'free'
  if (price < 25) return 'under25'
  if (price < 50) return 'under50'
  if (price < 100) return 'under100'
  return 'premium'
}

/**
 * Shuffle array randomly (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
