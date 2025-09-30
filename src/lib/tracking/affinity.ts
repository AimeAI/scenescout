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
const WEIGHTS: Record<InteractionEvent['type'], number> = {
  click: 10,
  save: 50,
  search: 30,
  view: 1
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
    const weight = WEIGHTS[interaction.type] * decay

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
 */
export function reorderRows(
  rows: Row[],
  affinity: AffinityProfile,
  categoryEvents: Record<string, any[]> = {},
  opts: ReorderOptions = { discoveryFloor: 0.2 }
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

  // Keep last discoveryCount non-empty rows in original order (discovery)
  const discoveryRows = nonEmptyRows.slice(-discoveryCount)

  // Append empty rows at the end in original order
  return [...personalizedRows, ...discoveryRows, ...emptyRows]
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
