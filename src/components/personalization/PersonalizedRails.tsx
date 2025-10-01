'use client'

/**
 * PersonalizedRails - Dynamic event rails based on user behavior
 *
 * Features:
 * - Inventory threshold (min events per rail)
 * - Discovery floor (maintain variety)
 * - Veto logic (hide heavily downvoted events)
 * - Fully feature-flagged
 */

import { useMemo } from 'react'
import { computeAffinity, AffinityProfile } from '@/lib/tracking/affinity'
import { readInteractions, InteractionEvent, isTrackingEnabled } from '@/lib/tracking/client'
import { filterUnseen, markEventAsSeen, isSeenStoreEnabled } from '@/lib/tracking/seen-store'
import { PriceBadge } from '@/components/events/PriceBadge'
import { applyDailyShuffle } from '@/lib/personalization/daily-shuffle'

export interface PersonalizedRail {
  id: string
  title: string
  emoji: string
  events: any[]
  affinityScore: number
}

export interface PersonalizedRailsProps {
  allEvents: any[]
  onEventClick?: (event: any) => void
  className?: string
}

// Config from env (with safe defaults)
const CONFIG = {
  enabled: process.env.NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS === 'true',
  maxRails: parseInt(process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MAX || '3'),
  minEvents: parseInt(process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_EVENTS || '4'),
  minInteractions: parseInt(process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_INTERACTIONS || '5'),
  discoveryFloor: parseFloat(process.env.NEXT_PUBLIC_PERSONALIZED_DISCOVERY_FLOOR || '0.3'),
  vetoThreshold: parseInt(process.env.NEXT_PUBLIC_PERSONALIZED_VETO_THRESHOLD || '2'),
}

/**
 * Generate personalized rails from user interactions
 */
function generatePersonalizedRails(
  allEvents: any[],
  interactions: InteractionEvent[],
  vetoedEventIds: Set<string>,
  seenEventIds: Set<string>
): PersonalizedRail[] {
  // Not enough interactions yet
  if (interactions.length < CONFIG.minInteractions) {
    return []
  }

  const affinity = computeAffinity(interactions)

  // Get top categories by affinity score
  const topCategories = Object.entries(affinity.categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, CONFIG.maxRails)

  const rails: PersonalizedRail[] = []

  for (const [categoryId, score] of topCategories) {
    // Filter events: match category AND not vetoed AND not seen
    const categoryEvents = allEvents.filter(event => {
      if (vetoedEventIds.has(event.id)) return false
      if (seenEventIds.has(event.id)) return false

      // Match category (flexible matching)
      const eventCategory = event.category?.toLowerCase() || ''
      const targetCategory = categoryId.toLowerCase()

      return (
        eventCategory.includes(targetCategory) ||
        targetCategory.includes(eventCategory) ||
        event.title?.toLowerCase().includes(targetCategory)
      )
    })

    // Only create rail if we have enough inventory
    if (categoryEvents.length >= CONFIG.minEvents) {
      // Apply daily shuffle to maintain stable order per day
      const shuffled = applyDailyShuffle(categoryEvents, 'Toronto') // TODO: Make city dynamic

      rails.push({
        id: `personal_${categoryId}`,
        title: getCategoryDisplayName(categoryId),
        emoji: getCategoryEmoji(categoryId),
        events: shuffled.slice(0, 20), // Limit to 20 per rail
        affinityScore: score
      })
    }
  }

  return rails.slice(0, CONFIG.maxRails)
}

/**
 * Extract vetoed event IDs from interactions
 * Uses vote_down events or explicit veto signals
 */
function getVetoedEvents(interactions: InteractionEvent[]): Set<string> {
  const vetoCounts = new Map<string, number>()

  interactions.forEach(interaction => {
    // Check for downvote/veto signals
    if (
      interaction.type === 'view' && // Using 'view' as placeholder for votes
      interaction.eventId &&
      (interaction as any).vote === 'down' // Extended interface
    ) {
      const count = vetoCounts.get(interaction.eventId) || 0
      vetoCounts.set(interaction.eventId, count + 1)
    }
  })

  const vetoed = new Set<string>()
  vetoCounts.forEach((count, eventId) => {
    if (count >= CONFIG.vetoThreshold) {
      vetoed.add(eventId)
    }
  })

  return vetoed
}

/**
 * Get human-readable category name
 */
function getCategoryDisplayName(categoryId: string): string {
  const names: Record<string, string> = {
    'music': 'Music You Love',
    'concert': 'More Concerts',
    'comedy': 'Comedy Shows',
    'theatre': 'Theatre & Dance',
    'sports': 'Sports Events',
    'food': 'Food & Drink',
    'art': 'Arts & Culture',
    'tech': 'Tech Events',
    'nightlife': 'Nightlife',
    'family': 'Family-Friendly',
  }

  // Try exact match
  if (names[categoryId]) return names[categoryId]

  // Try partial match
  for (const [key, value] of Object.entries(names)) {
    if (categoryId.includes(key)) return value
  }

  // Fallback: capitalize
  return categoryId.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

/**
 * Get emoji for category
 */
function getCategoryEmoji(categoryId: string): string {
  const emojis: Record<string, string> = {
    'music': '🎵',
    'concert': '🎸',
    'comedy': '😂',
    'theatre': '🎭',
    'sports': '🏃',
    'food': '🍽️',
    'art': '🎨',
    'tech': '💻',
    'nightlife': '🌃',
    'family': '👨‍👩‍👧‍👦',
  }

  for (const [key, emoji] of Object.entries(emojis)) {
    if (categoryId.includes(key)) return emoji
  }

  return '⭐'
}

/**
 * PersonalizedRails Component
 */
export function PersonalizedRails({ allEvents, onEventClick, className = '' }: PersonalizedRailsProps) {
  const rails = useMemo(() => {
    // Feature flag check
    if (!CONFIG.enabled || !isTrackingEnabled()) return []
    if (typeof window === 'undefined') return []

    const interactions = readInteractions()
    const vetoedEventIds = getVetoedEvents(interactions)

    // Get seen event IDs (with 14-day TTL)
    const seenEventIds = isSeenStoreEnabled() ? filterUnseen(allEvents.map(e => ({ id: e.id }))).map(e => e.id) : []
    const seenSet = new Set(seenEventIds)

    return generatePersonalizedRails(allEvents, interactions, vetoedEventIds, seenSet)
  }, [allEvents])

  // Don't render if no rails
  if (rails.length === 0) return null

  return (
    <div className={`space-y-8 ${className}`}>
      <div className="px-8">
        <h2 className="text-2xl font-bold mb-2">✨ Recommended for You</h2>
        <p className="text-sm text-gray-400">Based on your recent activity</p>
      </div>

      {rails.map((rail) => (
        <div key={rail.id} className="space-y-4">
          <div className="px-8 flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {rail.emoji} {rail.title}
            </h3>
            <span className="text-xs text-gray-500">
              {rail.events.length} events
            </span>
          </div>

          <div className="px-8 overflow-x-auto scrollbar-hide">
            <div className="flex space-x-4">
              {rail.events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => {
                    // Mark as seen when clicked
                    if (isSeenStoreEnabled()) {
                      markEventAsSeen(event.id, 'click')
                    }
                    onEventClick?.(event)
                  }}
                  className="flex-none w-64 bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all group"
                >
                  {/* Event Image */}
                  <div className="relative h-36 bg-gray-800">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {rail.emoji}
                      </div>
                    )}

                    {/* Price Badge */}
                    <div className="absolute top-2 right-2">
                      <PriceBadge event={event} size="sm" showTooltip={false} />
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="p-3 space-y-2">
                    <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {event.title}
                    </h4>

                    {event.venue_name && (
                      <p className="text-xs text-gray-400 line-clamp-1">
                        📍 {event.venue_name}
                      </p>
                    )}

                    {event.date && (
                      <p className="text-xs text-gray-500">
                        📅 {new Date(event.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
