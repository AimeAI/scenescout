/**
 * Affinity scoring and row reordering for personalized event discovery
 * Implements exponential decay and discovery floor to prevent filter bubbles
 */

import { InteractionEvent } from './client'

export interface AffinityProfile {
  categories: Record<string, number>      // 0-1 normalized
  priceRanges: Record<string, number>     // 0-1 normalized
  venues: Record<string, number>          // 0-1 normalized
  timePatterns: Record<string, number>    // 0-1 normalized
  totalInteractions: number
}

export interface Row {
  id: string
  title: string
  emoji: string
  query: string
  [key: string]: any
}

export interface ReorderOptions {
  discoveryFloor: number        // 0-1, minimum % of original order to preserve
  decayHalfLifeDays?: number   // Default: 30 days
}

// Interaction weights (aligned with Netflix-style recommendations)
const WEIGHTS: Record<string, number> = {
  click: 10,
  save: 50,
  search: 30,
  view: 1,
  vote_up: 75,      // Strong positive signal (even stronger than save)
  vote_down: -50,   // Negative signal to decrease category affinity
  unsave: -25       // Removing from saved list decreases affinity
}

/**
 * Compute affinity scores from user interactions with exponential decay
 */
export function computeAffinity(
  interactions: InteractionEvent[],
  decayHalfLifeDays: number = 30
): AffinityProfile {
  if (interactions.length === 0) {
    return {
      categories: {},
      priceRanges: {},
      venues: {},
      timePatterns: {},
      totalInteractions: 0
    }
  }

  const now = Date.now()
  const halfLife = decayHalfLifeDays * 24 * 60 * 60 * 1000

  const raw = {
    categories: {} as Record<string, number>,
    priceRanges: {} as Record<string, number>,
    venues: {} as Record<string, number>,
    timePatterns: {} as Record<string, number>
  }

  interactions.forEach(interaction => {
    // Exponential decay: weight * 0.5^(age/halfLife)
    const age = now - interaction.timestamp
    const decay = Math.pow(0.5, age / halfLife)
    const weight = (WEIGHTS[interaction.type] || 0) * decay

    // Category affinity
    if (interaction.category) {
      raw.categories[interaction.category] =
        (raw.categories[interaction.category] || 0) + weight
    }

    // Price range affinity
    if (interaction.price !== undefined) {
      const range = getPriceRange(interaction.price)
      raw.priceRanges[range] = (raw.priceRanges[range] || 0) + weight
    }

    // Venue affinity
    if (interaction.venue) {
      raw.venues[interaction.venue] =
        (raw.venues[interaction.venue] || 0) + weight
    }

    // Time patterns (weekend vs weekday)
    const date = new Date(interaction.timestamp)
    const dayType = isWeekend(date) ? 'weekend' : 'weekday'
    raw.timePatterns[dayType] = (raw.timePatterns[dayType] || 0) + weight
  })

  return {
    categories: normalize(raw.categories),
    priceRanges: normalize(raw.priceRanges),
    venues: normalize(raw.venues),
    timePatterns: normalize(raw.timePatterns),
    totalInteractions: interactions.length
  }
}

/**
 * Reorder rows based on affinity scores while preserving discovery floor
 * Non-empty rows are reordered, empty rows appended in original order
 *
 * DIVERSITY STRATEGY:
 * - discoveryFloor (default 20%): Forces showing categories in original order to prevent filter bubble
 * - Injects variety by mixing personalized + discovery categories
 * - Ensures user sees new content even with strong preferences
 */
export function reorderRows(
  rows: Row[],
  affinity: AffinityProfile,
  categoryEvents: Record<string, any[]> = {},
  opts: ReorderOptions = { discoveryFloor: 0.25 } // Increased from 0.2 to 0.25 for more diversity
): Row[] {
  // Edge case: no data yet, return original
  if (affinity.totalInteractions === 0) return rows

  const { discoveryFloor, decayHalfLifeDays = 30 } = opts

  // Separate empty and non-empty categories
  const nonEmptyRows: Row[] = []
  const emptyRows: Row[] = []

  rows.forEach(row => {
    const events = categoryEvents[row.id] || []
    if (events.length > 0) {
      nonEmptyRows.push(row)
    } else {
      emptyRows.push(row)
    }
  })

  // If no non-empty rows, return original
  if (nonEmptyRows.length === 0) return rows

  const discoveryCount = Math.ceil(nonEmptyRows.length * discoveryFloor)

  // Score each non-empty row
  const scored = nonEmptyRows.map((row, originalIndex) => ({
    row,
    originalIndex,
    score: affinity.categories[row.id] || 0
  }))

  // Sort by score (descending), stable sort for ties
  scored.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score
    return a.originalIndex - b.originalIndex
  })

  // Take top (1 - discoveryFloor) as personalized
  const personalizedCount = nonEmptyRows.length - discoveryCount
  const personalizedRows = scored.slice(0, personalizedCount).map(s => s.row)

  // DIVERSITY INJECTION: Instead of keeping discovery rows at the end,
  // pick categories user HASN'T interacted with much (low affinity scores)
  // This prevents showing ONLY what user likes
  const lowAffinityCategories = scored
    .filter(s => s.score < 0.3) // Categories with low affinity
    .slice(0, discoveryCount)
    .map(s => s.row)

  // If not enough low-affinity categories, fill with original order
  const discoveryRows = lowAffinityCategories.length >= discoveryCount
    ? lowAffinityCategories
    : [...lowAffinityCategories, ...nonEmptyRows.slice(-Math.max(0, discoveryCount - lowAffinityCategories.length))]

  // Interleave personalized and discovery to create variety
  // Pattern: personalized, personalized, discovery, personalized, discovery...
  const result: Row[] = []
  let pIdx = 0
  let dIdx = 0

  while (pIdx < personalizedRows.length || dIdx < discoveryRows.length) {
    // Add 2 personalized, then 1 discovery
    if (pIdx < personalizedRows.length) {
      result.push(personalizedRows[pIdx++])
    }
    if (pIdx < personalizedRows.length) {
      result.push(personalizedRows[pIdx++])
    }
    if (dIdx < discoveryRows.length) {
      result.push(discoveryRows[dIdx++])
    }
  }

  // Append empty rows at the end in original order
  return [...result, ...emptyRows]
}

/**
 * Normalize scores to 0-1 range
 */
function normalize(scores: Record<string, number>): Record<string, number> {
  const values = Object.values(scores)
  if (values.length === 0) return {}

  const max = Math.max(...values, 1) // Avoid division by 0
  const normalized: Record<string, number> = {}

  for (const [key, value] of Object.entries(scores)) {
    normalized[key] = value / max
  }

  return normalized
}

/**
 * Categorize price into ranges
 */
function getPriceRange(price: number): string {
  if (price === 0) return 'free'
  if (price < 25) return 'under25'
  if (price < 50) return 'under50'
  if (price < 100) return 'under100'
  return 'over100'
}

/**
 * Check if date is weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}
