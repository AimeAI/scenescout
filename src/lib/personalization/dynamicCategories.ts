/**
 * Dynamic category generator - creates personalized categories based on user preferences
 * Makes the app unique to each person by identifying their specific taste patterns
 */

import { InteractionEvent } from '../tracking/client'
import { AffinityProfile } from '../tracking/affinity'

export interface DynamicCategory {
  id: string
  title: string
  emoji: string
  query: string
  reason: string // Why this was created for the user
  score: number // Affinity score
  isGenerated: boolean
}

/**
 * Generate dynamic categories based on user interactions
 */
export function generateDynamicCategories(
  interactions: InteractionEvent[],
  affinity: AffinityProfile,
  existingCategories: Array<{ id: string; title: string; emoji: string }>
): DynamicCategory[] {
  if (interactions.length < 5) {
    return [] // Need at least 5 interactions to identify patterns
  }

  const dynamicCategories: DynamicCategory[] = []

  // 1. Analyze venue patterns (frequent venues)
  const venueCategories = generateVenueCategories(affinity, interactions)
  dynamicCategories.push(...venueCategories)

  // 2. Analyze price patterns (budget preferences)
  const priceCategories = generatePriceCategories(affinity, interactions)
  dynamicCategories.push(...priceCategories)

  // 3. Analyze time patterns (when user likes to go out)
  const timeCategories = generateTimeCategories(affinity, interactions)
  dynamicCategories.push(...timeCategories)

  // 4. Analyze cross-category patterns (combined interests)
  const hybridCategories = generateHybridCategories(affinity, existingCategories, interactions)
  dynamicCategories.push(...hybridCategories)

  // 5. Analyze engagement patterns (what user saves/votes on)
  const engagementCategories = generateEngagementCategories(interactions)
  dynamicCategories.push(...engagementCategories)

  // Sort by score (highest first) and limit to top 5
  return dynamicCategories
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

/**
 * Generate categories based on favorite venues
 */
function generateVenueCategories(
  affinity: AffinityProfile,
  interactions: InteractionEvent[]
): DynamicCategory[] {
  const categories: DynamicCategory[] = []

  // Find top venues with multiple interactions
  const topVenues = Object.entries(affinity.venues)
    .filter(([venue, score]) => {
      const venueInteractions = interactions.filter(i => i.venue === venue)
      return venueInteractions.length >= 3 && score > 0.5
    })
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)

  topVenues.forEach(([venue, score]) => {
    categories.push({
      id: `venue-${venue.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: `Events at ${venue}`,
      emoji: '📍',
      query: venue,
      reason: `You love ${venue}`,
      score,
      isGenerated: true
    })
  })

  return categories
}

/**
 * Generate categories based on price preferences
 */
function generatePriceCategories(
  affinity: AffinityProfile,
  interactions: InteractionEvent[]
): DynamicCategory[] {
  const categories: DynamicCategory[] = []

  // Check if user prefers free events
  const freeScore = affinity.priceRanges['free'] || 0
  if (freeScore > 0.6) {
    const freeCount = interactions.filter(i => i.price === 0).length
    if (freeCount >= 3) {
      categories.push({
        id: 'price-free',
        title: 'Free Events',
        emoji: '🆓',
        query: 'free',
        reason: `${freeCount} free events saved`,
        score: freeScore,
        isGenerated: true
      })
    }
  }

  // Check if user prefers budget-friendly events
  const budgetScore = (affinity.priceRanges['under25'] || 0) + (affinity.priceRanges['under50'] || 0)
  if (budgetScore > 0.5) {
    categories.push({
      id: 'price-budget',
      title: 'Budget-Friendly Events',
      emoji: '💰',
      query: 'affordable',
      reason: 'You prefer affordable events',
      score: budgetScore / 2,
      isGenerated: true
    })
  }

  return categories
}

/**
 * Generate categories based on time preferences
 */
function generateTimeCategories(
  affinity: AffinityProfile,
  interactions: InteractionEvent[]
): DynamicCategory[] {
  const categories: DynamicCategory[] = []

  const weekendScore = affinity.timePatterns['weekend'] || 0
  const weekdayScore = affinity.timePatterns['weekday'] || 0

  // Weekend warrior
  if (weekendScore > weekdayScore * 1.5) {
    categories.push({
      id: 'time-weekend',
      title: 'Weekend Adventures',
      emoji: '🎉',
      query: 'weekend',
      reason: 'You prefer weekend events',
      score: weekendScore,
      isGenerated: true
    })
  }

  // Weekday explorer
  if (weekdayScore > weekendScore * 1.5) {
    categories.push({
      id: 'time-weekday',
      title: 'Weekday Events',
      emoji: '📅',
      query: 'weekday',
      reason: 'You love weekday events',
      score: weekdayScore,
      isGenerated: true
    })
  }

  return categories
}

/**
 * Generate hybrid categories by combining top interests
 */
function generateHybridCategories(
  affinity: AffinityProfile,
  existingCategories: Array<{ id: string; title: string; emoji: string }>,
  interactions: InteractionEvent[]
): DynamicCategory[] {
  const categories: DynamicCategory[] = []

  // Get top 2 category interests
  const topCategoryIds = Object.entries(affinity.categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([id]) => id)

  if (topCategoryIds.length < 2) return categories

  const cat1 = existingCategories.find(c => c.id === topCategoryIds[0])
  const cat2 = existingCategories.find(c => c.id === topCategoryIds[1])

  if (!cat1 || !cat2) return categories

  // Create hybrid category
  const hybridScore = (affinity.categories[cat1.id] + affinity.categories[cat2.id]) / 2

  if (hybridScore > 0.5) {
    categories.push({
      id: `hybrid-${cat1.id}-${cat2.id}`,
      title: `${cat1.title} & ${cat2.title}`,
      emoji: `${cat1.emoji}${cat2.emoji}`,
      query: `${cat1.title.split(' ')[0]} ${cat2.title.split(' ')[0]}`,
      reason: 'Your unique combination',
      score: hybridScore,
      isGenerated: true
    })
  }

  return categories
}

/**
 * Generate categories based on high-engagement patterns
 */
function generateEngagementCategories(
  interactions: InteractionEvent[]
): DynamicCategory[] {
  const categories: DynamicCategory[] = []

  // Find categories with high save rate
  const categoryEngagement: Record<string, { saves: number; total: number }> = {}

  interactions.forEach(interaction => {
    if (!interaction.category) return

    if (!categoryEngagement[interaction.category]) {
      categoryEngagement[interaction.category] = { saves: 0, total: 0 }
    }

    categoryEngagement[interaction.category].total++

    if (interaction.type === 'save' || interaction.type === 'vote_up') {
      categoryEngagement[interaction.category].saves++
    }
  })

  // Find categories where user saves >70% of interactions
  Object.entries(categoryEngagement).forEach(([category, stats]) => {
    const saveRate = stats.saves / stats.total
    if (saveRate >= 0.7 && stats.total >= 3) {
      categories.push({
        id: `engagement-${category}`,
        title: `Can't Miss ${category.split('-')[0]}`,
        emoji: '⭐',
        query: category,
        reason: `${Math.round(saveRate * 100)}% save rate`,
        score: saveRate,
        isGenerated: true
      })
    }
  })

  return categories
}

/**
 * Merge dynamic categories with static categories, reordering by affinity
 */
export function mergeCategoriesWithDynamic(
  staticCategories: Array<{ id: string; title: string; emoji: string; query: string }>,
  dynamicCategories: DynamicCategory[],
  affinity: AffinityProfile
): Array<{ id: string; title: string; emoji: string; query: string; score?: number; isGenerated?: boolean; reason?: string }> {
  // Add scores to static categories
  const scoredStatic = staticCategories.map(cat => ({
    ...cat,
    score: affinity.categories[cat.id] || 0,
    isGenerated: false
  }))

  // Combine and sort by score
  const combined = [...scoredStatic, ...dynamicCategories]

  // Sort: dynamic first if high score, then static by score
  combined.sort((a, b) => {
    // Prioritize dynamic categories with very high scores
    if (a.isGenerated && !b.isGenerated && a.score > 0.7) return -1
    if (!a.isGenerated && b.isGenerated && b.score > 0.7) return 1

    // Otherwise sort by score
    return b.score - a.score
  })

  return combined
}
