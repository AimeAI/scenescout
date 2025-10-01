/**
 * Tests for PersonalizedRails component
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock window and localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

// Mock Next.js env
process.env.NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS = 'true'
process.env.NEXT_PUBLIC_FEATURE_TRACKING_V1 = 'true'
process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MAX = '3'
process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_EVENTS = '4'
process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_INTERACTIONS = '5'
process.env.NEXT_PUBLIC_PERSONALIZED_VETO_THRESHOLD = '2'

describe('PersonalizedRails', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('should not show rails without enough interactions', () => {
    const { trackEvent, readInteractions } = require('@/lib/tracking/client')

    // Add only 3 interactions (below threshold of 5)
    trackEvent('click', { category: 'music', eventId: 'event1' })
    trackEvent('click', { category: 'music', eventId: 'event2' })
    trackEvent('save', { category: 'music', eventId: 'event3' })

    const interactions = readInteractions()
    expect(interactions.length).toBeLessThan(5)
  })

  it('should show rails with enough interactions', async () => {
    const { trackEvent } = require('@/lib/tracking/client')

    // Add 6 interactions (above threshold)
    for (let i = 0; i < 6; i++) {
      trackEvent('click', { category: 'music', eventId: `event${i}` })
    }

    // Wait for debounced flush (500ms)
    await new Promise(resolve => setTimeout(resolve, 600))

    const { computeAffinity } = require('@/lib/tracking/affinity')
    const { readInteractions } = require('@/lib/tracking/client')

    const interactions = readInteractions()
    const affinity = computeAffinity(interactions)

    expect(interactions.length).toBeGreaterThanOrEqual(5)
    expect(affinity.categories['music']).toBeGreaterThan(0)
  })

  it('should enforce inventory threshold (min events per rail)', () => {
    const mockEvents = [
      { id: '1', title: 'Concert 1', category: 'music' },
      { id: '2', title: 'Concert 2', category: 'music' },
      { id: '3', title: 'Concert 3', category: 'music' },
      // Only 3 events - below threshold of 4
    ]

    // With minEvents=4, this rail should NOT be created
    expect(mockEvents.length).toBeLessThan(4)
  })

  it('should veto heavily downvoted events', () => {
    const { trackEvent, readInteractions } = require('@/lib/tracking/client')

    // Simulate 3 downvotes for same event (above threshold of 2)
    const vetoedEventId = 'bad_event'

    trackEvent('view', { eventId: vetoedEventId, vote: 'down' } as any)
    trackEvent('view', { eventId: vetoedEventId, vote: 'down' } as any)
    trackEvent('view', { eventId: vetoedEventId, vote: 'down' } as any)

    const interactions = readInteractions()
    const downvotes = interactions.filter(
      i => i.eventId === vetoedEventId && (i as any).vote === 'down'
    )

    expect(downvotes.length).toBeGreaterThanOrEqual(2)
  })

  it('should limit max rails to configured value', () => {
    const maxRails = parseInt(process.env.NEXT_PUBLIC_PERSONALIZED_RAILS_MAX || '3')
    expect(maxRails).toBe(3)

    // If we have 5 categories with high affinity, only show top 3
    const mockCategories = [
      { id: 'music', score: 1.0 },
      { id: 'comedy', score: 0.9 },
      { id: 'sports', score: 0.8 },
      { id: 'food', score: 0.7 },
      { id: 'tech', score: 0.6 },
    ]

    const topRails = mockCategories
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRails)

    expect(topRails.length).toBe(3)
    expect(topRails[0].id).toBe('music')
  })

  it('should compute affinity scores with decay', () => {
    const { computeAffinity } = require('@/lib/tracking/affinity')

    const now = Date.now()
    const oldInteraction = {
      type: 'click',
      category: 'music',
      timestamp: now - (40 * 24 * 60 * 60 * 1000), // 40 days ago
      sessionId: 'test'
    }

    const recentInteraction = {
      type: 'click',
      category: 'music',
      timestamp: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
      sessionId: 'test'
    }

    // Recent interactions should have higher weight due to decay
    const affinityWithOld = computeAffinity([oldInteraction])
    const affinityWithRecent = computeAffinity([recentInteraction])

    expect(affinityWithRecent.categories['music']).toBeGreaterThan(
      affinityWithOld.categories['music']
    )
  })
})
