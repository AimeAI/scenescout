/**
 * Thumbs (Voting) System - Integrated with tracking and veto logic
 *
 * Features:
 * - Thumb up/down voting
 * - Integrates with existing veto threshold
 * - Tracks votes in localStorage
 * - Hooks into tracking system for affinity/veto
 * - Feature-flagged
 */

import { trackEvent, isTrackingEnabled } from './tracking/client'

export interface EventVote {
  eventId: string
  vote: 'up' | 'down'
  votedAt: number
}

const STORAGE_KEY = 'sceneScout_votes'
const MAX_VOTES = 1000

/**
 * Check if thumbs feature is enabled
 */
export function isThumbsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return process.env.NEXT_PUBLIC_FEATURE_THUMBS === 'true'
}

/**
 * Vote on an event (thumb up or down)
 */
export function voteEvent(eventId: string, vote: 'up' | 'down', eventData?: any): void {
  if (!isThumbsEnabled()) return

  try {
    const votes = readVotes()

    // Remove existing vote if any
    const filtered = votes.filter(v => v.eventId !== eventId)

    // Add new vote
    const newVote: EventVote = {
      eventId,
      vote,
      votedAt: Date.now()
    }

    filtered.unshift(newVote)

    // Limit total
    const trimmed = filtered.slice(0, MAX_VOTES)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))

    // Integrate with tracking system
    if (isTrackingEnabled()) {
      // Track as view with vote metadata
      trackEvent('view', {
        eventId,
        category: eventData?.category,
        vote // Extended field for veto logic
      } as any)

      // If thumb up, also track as positive signal
      if (vote === 'up') {
        trackEvent('save', {
          eventId,
          category: eventData?.category
        })
      }
    }
  } catch (error) {
    console.warn('Failed to vote on event:', error)
  }
}

/**
 * Get vote for an event
 */
export function getEventVote(eventId: string): 'up' | 'down' | null {
  if (!isThumbsEnabled()) return null

  const votes = readVotes()
  const vote = votes.find(v => v.eventId === eventId)
  return vote?.vote || null
}

/**
 * Check if event has been voted on
 */
export function hasVoted(eventId: string): boolean {
  if (!isThumbsEnabled()) return false

  return getEventVote(eventId) !== null
}

/**
 * Remove vote for an event
 */
export function removeVote(eventId: string): void {
  if (!isThumbsEnabled()) return

  try {
    const votes = readVotes()
    const filtered = votes.filter(v => v.eventId !== eventId)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.warn('Failed to remove vote:', error)
  }
}

/**
 * Read votes from localStorage
 */
export function readVotes(): EventVote[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    return JSON.parse(stored)
  } catch (error) {
    console.warn('Failed to read votes:', error)
    return []
  }
}

/**
 * Get vote statistics
 */
export function getVoteStats(): {
  total: number
  thumbsUp: number
  thumbsDown: number
} {
  if (!isThumbsEnabled()) {
    return { total: 0, thumbsUp: 0, thumbsDown: 0 }
  }

  const votes = readVotes()

  return {
    total: votes.length,
    thumbsUp: votes.filter(v => v.vote === 'up').length,
    thumbsDown: votes.filter(v => v.vote === 'down').length
  }
}

/**
 * Get events voted down (for veto integration)
 */
export function getDownvotedEventIds(): Set<string> {
  if (!isThumbsEnabled()) return new Set()

  const votes = readVotes()
  return new Set(
    votes
      .filter(v => v.vote === 'down')
      .map(v => v.eventId)
  )
}

/**
 * Clear all votes (for testing)
 */
export function clearVotes(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear votes:', error)
  }
}

/**
 * Toggle vote (if no vote, thumb up; if already voted, toggle; if opposite, switch)
 */
export function toggleVote(eventId: string, targetVote: 'up' | 'down', eventData?: any): void {
  if (!isThumbsEnabled()) return

  const currentVote = getEventVote(eventId)

  if (currentVote === targetVote) {
    // Remove vote if clicking same button
    removeVote(eventId)
  } else {
    // Set or switch vote
    voteEvent(eventId, targetVote, eventData)
  }
}
