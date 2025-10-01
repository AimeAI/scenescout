/**
 * Dynamic Category Manager
 *
 * Auto-spawns new category rails based on user affinity scores
 * and sunsets inactive rails to keep the homepage fresh.
 *
 * Features:
 * - Spawn rails when affinity crosses threshold
 * - Sunset rails after N days of inactivity
 * - Enforce core + dynamic limits
 * - Inventory-aware (min events per rail)
 * - Feature-flagged
 */

import { AffinityProfile } from '@/lib/tracking/affinity'
import { InteractionEvent } from '@/lib/tracking/client'

export interface DynamicRail {
  id: string
  categoryId: string
  title: string
  emoji: string
  affinityScore: number
  spawnedAt: number
  lastActiveAt: number
  isCore: boolean
}

export interface CategoryManagerConfig {
  coreLimit: number
  dynamicLimit: number
  spawnThreshold: number
  sunsetDays: number
}

const STORAGE_KEY = 'sceneScout_dynamicRails'

// Config from env
const CONFIG = {
  enabled: process.env.NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES === 'true',
  coreLimit: parseInt(process.env.NEXT_PUBLIC_DYNAMIC_CORE_LIMIT || '10'),
  dynamicLimit: parseInt(process.env.NEXT_PUBLIC_DYNAMIC_RAILS_LIMIT || '5'),
  spawnThreshold: parseFloat(process.env.NEXT_PUBLIC_DYNAMIC_SPAWN_THRESHOLD || '0.4'),
  sunsetDays: parseInt(process.env.NEXT_PUBLIC_DYNAMIC_SUNSET_DAYS || '7'),
}

/**
 * Check if dynamic categories are enabled
 */
export function isDynamicCategoriesEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return CONFIG.enabled
}

/**
 * Manage dynamic rails: spawn new ones, sunset inactive ones
 */
export function manageDynamicRails(
  coreCategories: any[],
  affinity: AffinityProfile,
  categoryEvents: Record<string, any[]>,
  interactions: InteractionEvent[]
): DynamicRail[] {
  if (!isDynamicCategoriesEnabled()) return []

  const existingRails = readDynamicRails()
  const now = Date.now()

  // Mark core categories
  const coreRails: DynamicRail[] = coreCategories
    .slice(0, CONFIG.coreLimit)
    .map((cat, idx) => {
      const existing = existingRails.find(r => r.categoryId === cat.id && r.isCore)
      return existing || {
        id: `core_${cat.id}`,
        categoryId: cat.id,
        title: cat.title,
        emoji: cat.emoji,
        affinityScore: affinity.categories[cat.id] || 0,
        spawnedAt: now,
        lastActiveAt: now,
        isCore: true
      }
    })

  // Find potential dynamic rails from affinity scores
  const dynamicCandidates = Object.entries(affinity.categories)
    .filter(([categoryId, score]) => {
      // Don't duplicate core categories
      if (coreRails.some(r => r.categoryId === categoryId)) return false

      // Check spawn threshold
      if (score < CONFIG.spawnThreshold) return false

      // Check inventory
      const events = categoryEvents[categoryId] || []
      const minEvents = parseInt(process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_EVENTS || '4')
      if (events.length < minEvents) return false

      return true
    })
    .map(([categoryId, score]) => ({
      categoryId,
      score,
      existing: existingRails.find(r => r.categoryId === categoryId && !r.isCore)
    }))
    .sort((a, b) => b.score - a.score)

  // Update or spawn dynamic rails
  const dynamicRails: DynamicRail[] = []

  for (const candidate of dynamicCandidates.slice(0, CONFIG.dynamicLimit)) {
    if (candidate.existing) {
      // Update existing dynamic rail
      dynamicRails.push({
        ...candidate.existing,
        affinityScore: candidate.score,
        lastActiveAt: hasRecentInteraction(candidate.categoryId, interactions, 24) ? now : candidate.existing.lastActiveAt
      })
    } else {
      // Spawn new dynamic rail
      dynamicRails.push({
        id: `dynamic_${candidate.categoryId}_${now}`,
        categoryId: candidate.categoryId,
        title: getCategoryDisplayName(candidate.categoryId),
        emoji: getCategoryEmoji(candidate.categoryId),
        affinityScore: candidate.score,
        spawnedAt: now,
        lastActiveAt: now,
        isCore: false
      })
    }
  }

  // Sunset inactive dynamic rails
  const sunsetThreshold = now - (CONFIG.sunsetDays * 24 * 60 * 60 * 1000)
  const activeDynamicRails = dynamicRails.filter(rail =>
    rail.lastActiveAt > sunsetThreshold
  )

  const allRails = [...coreRails, ...activeDynamicRails]

  // Persist to localStorage
  saveDynamicRails(allRails)

  return allRails
}

/**
 * Check if category has recent interactions
 */
function hasRecentInteraction(
  categoryId: string,
  interactions: InteractionEvent[],
  hoursAgo: number
): boolean {
  const threshold = Date.now() - (hoursAgo * 60 * 60 * 1000)

  return interactions.some(i =>
    i.category === categoryId &&
    i.timestamp > threshold
  )
}

/**
 * Read dynamic rails from localStorage
 */
function readDynamicRails(): DynamicRail[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    return JSON.parse(stored)
  } catch (error) {
    console.warn('Failed to read dynamic rails:', error)
    return []
  }
}

/**
 * Save dynamic rails to localStorage
 */
function saveDynamicRails(rails: DynamicRail[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rails))
  } catch (error) {
    console.warn('Failed to save dynamic rails:', error)
  }
}

/**
 * Get display name for category
 */
function getCategoryDisplayName(categoryId: string): string {
  const names: Record<string, string> = {
    'music': 'Music',
    'music-concerts': 'Music & Concerts',
    'concert': 'Concerts',
    'comedy': 'Comedy',
    'comedy-improv': 'Comedy & Improv',
    'theatre': 'Theatre',
    'theatre-dance': 'Theatre & Dance',
    'sports': 'Sports',
    'sports-fitness': 'Sports & Fitness',
    'food': 'Food & Drink',
    'food-drink': 'Food Pop-ups',
    'art': 'Arts',
    'arts-exhibits': 'Arts & Exhibits',
    'tech': 'Tech Events',
    'tech-startups': 'Tech & Startups',
    'nightlife': 'Nightlife',
    'nightlife-dj': 'Nightlife & DJ Sets',
    'family': 'Family Events',
    'family-kids': 'Family & Kids',
    'film': 'Film',
    'film-screenings': 'Film & Screenings',
    'markets': 'Markets',
    'markets-popups': 'Markets & Pop-ups',
    'outdoors': 'Outdoors',
    'outdoors-nature': 'Outdoors & Nature',
    'wellness': 'Wellness',
    'wellness-mindfulness': 'Wellness & Mindfulness',
    'workshops': 'Workshops',
    'workshops-classes': 'Workshops & Classes',
    'date-night': 'Date Night',
    'late-night': 'Late Night',
    'neighborhood': 'Neighborhood',
    'halloween': 'Halloween',
  }

  if (names[categoryId]) return names[categoryId]

  // Fallback: capitalize and format
  return categoryId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get emoji for category
 */
function getCategoryEmoji(categoryId: string): string {
  const emojis: Record<string, string> = {
    'music': '🎵',
    'music-concerts': '🎵',
    'concert': '🎸',
    'comedy': '😂',
    'comedy-improv': '😂',
    'theatre': '🎭',
    'theatre-dance': '🎭',
    'sports': '🏃',
    'sports-fitness': '🏃',
    'food': '🍽️',
    'food-drink': '🍽️',
    'art': '🎨',
    'arts-exhibits': '🎨',
    'tech': '💻',
    'tech-startups': '💻',
    'nightlife': '🌃',
    'nightlife-dj': '🌃',
    'family': '👨‍👩‍👧‍👦',
    'family-kids': '👨‍👩‍👧‍👦',
    'film': '🎬',
    'film-screenings': '🎬',
    'markets': '🛍️',
    'markets-popups': '🛍️',
    'outdoors': '🌲',
    'outdoors-nature': '🌲',
    'wellness': '🧘',
    'wellness-mindfulness': '🧘',
    'workshops': '📚',
    'workshops-classes': '📚',
    'date-night': '💕',
    'late-night': '🌙',
    'neighborhood': '📍',
    'halloween': '🎃',
  }

  for (const [key, emoji] of Object.entries(emojis)) {
    if (categoryId.includes(key)) return emoji
  }

  return '⭐'
}

/**
 * Clear all dynamic rails (for testing)
 */
export function clearDynamicRails(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear dynamic rails:', error)
  }
}

/**
 * Get stats about dynamic rails
 */
export function getDynamicRailsStats(): {
  total: number
  core: number
  dynamic: number
  spawned24h: number
  sunsetCandidates: number
} {
  if (!isDynamicCategoriesEnabled()) {
    return { total: 0, core: 0, dynamic: 0, spawned24h: 0, sunsetCandidates: 0 }
  }

  const rails = readDynamicRails()
  const now = Date.now()
  const sunsetThreshold = now - (CONFIG.sunsetDays * 24 * 60 * 60 * 1000)

  return {
    total: rails.length,
    core: rails.filter(r => r.isCore).length,
    dynamic: rails.filter(r => !r.isCore).length,
    spawned24h: rails.filter(r => r.spawnedAt > now - 24 * 60 * 60 * 1000).length,
    sunsetCandidates: rails.filter(r => !r.isCore && r.lastActiveAt < sunsetThreshold).length,
  }
}
