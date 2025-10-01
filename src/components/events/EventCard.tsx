'use client'

/**
 * EventCard - Reusable event card with saved/thumbs/price badge
 *
 * Features:
 * - Save/unsave button
 * - Thumb up/down buttons
 * - Price badge
 * - Click tracking
 * - Feature-flagged
 */

import { useState } from 'react'
import { PriceBadge } from './PriceBadge'
import { isEventSaved, toggleSaveEvent, isSavedEventsEnabled } from '@/lib/saved-events'
import { getEventVote, toggleVote, isThumbsEnabled } from '@/lib/thumbs'
import { markEventAsSeen, isSeenStoreEnabled } from '@/lib/tracking/seen-store'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'

export interface EventCardProps {
  event: any
  onClick?: (event: any) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showActions?: boolean
}

export function EventCard({
  event,
  onClick,
  className = '',
  size = 'md',
  showActions = true
}: EventCardProps) {
  const [saved, setSaved] = useState(() =>
    isSavedEventsEnabled() ? isEventSaved(event.id) : false
  )
  const [vote, setVote] = useState<'up' | 'down' | null>(() =>
    isThumbsEnabled() ? getEventVote(event.id) : null
  )

  const handleClick = () => {
    // Mark as seen
    if (isSeenStoreEnabled()) {
      markEventAsSeen(event.id, 'click')
    }

    // Track click
    if (isTrackingEnabled()) {
      trackEvent('click', {
        eventId: event.id,
        category: event.category,
        price: event.price_min,
        venue: event.venue_name
      })
    }

    onClick?.(event)
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isSavedEventsEnabled()) return

    const newSaved = toggleSaveEvent(event)
    setSaved(newSaved)

    // Track save
    if (isTrackingEnabled()) {
      if (newSaved) {
        trackEvent('save', {
          eventId: event.id,
          category: event.category
        })
      }
    }
  }

  const handleVote = (targetVote: 'up' | 'down') => (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isThumbsEnabled()) return

    toggleVote(event.id, targetVote, event)

    // Update local state
    const newVote = getEventVote(event.id)
    setVote(newVote)
  }

  const sizeClasses = {
    sm: 'w-64 h-auto',
    md: 'w-72 h-auto',
    lg: 'w-80 h-auto'
  }

  const imageSizeClasses = {
    sm: 'h-32',
    md: 'h-40',
    lg: 'h-48'
  }

  return (
    <div
      onClick={handleClick}
      className={`${sizeClasses[size]} flex-none bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all group ${className}`}
    >
      {/* Event Image */}
      <div className={`relative ${imageSizeClasses[size]} bg-gray-800`}>
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {event.emoji || '🎉'}
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-2 right-2">
          <PriceBadge event={event} size="sm" showTooltip={false} />
        </div>

        {/* Save Button */}
        {showActions && isSavedEventsEnabled() && (
          <button
            onClick={handleSave}
            className={`absolute top-2 left-2 p-2 rounded-full transition-all ${
              saved
                ? 'bg-red-500 text-white'
                : 'bg-black/50 text-white/70 hover:bg-black/70 hover:text-white'
            }`}
            aria-label={saved ? 'Unsave event' : 'Save event'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={saved ? 'currentColor' : 'none'}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}
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

        {/* Thumbs (Vote) Buttons */}
        {showActions && isThumbsEnabled() && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
            <button
              onClick={handleVote('up')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                vote === 'up'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              aria-label="Thumb up"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={vote === 'up' ? 'currentColor' : 'none'}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
            </button>

            <button
              onClick={handleVote('down')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                vote === 'down'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              aria-label="Thumb down"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={vote === 'down' ? 'currentColor' : 'none'}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
