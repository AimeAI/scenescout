'use client'

import { useEffect, useRef } from 'react'
import { useCachedEvents } from '@/lib/events/useCachedEvents'
import { markEventsAsSeen } from '@/lib/tracking/seen-store'
import { PriceBadge } from './PriceBadge'
import { Thumbs } from './Thumbs'
import { isSaved, toggleSaved } from '@/lib/saved/store'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'

interface CategoryRailProps {
  category: { id: string; title: string; emoji: string; query: string }
  userLocation: { lat: number; lng: number } | null
  onEventClick: (event: any) => void
  searchQuery?: string
  activeChip?: string | null
}

export function CategoryRail({
  category,
  userLocation,
  onEventClick,
  searchQuery = '',
  activeChip = null
}: CategoryRailProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const markedRef = useRef(false)

  // Use cached events hook
  const { events: cachedEvents, loading: cachedLoading } = useCachedEvents({
    category: category.query,
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    limit: 60,
    cityName: 'Toronto', // TODO: Make dynamic based on location
    applySeen: true
  })

  // Mark events as seen when they become visible
  useEffect(() => {
    if (cachedEvents.length > 0 && !markedRef.current && process.env.NEXT_PUBLIC_FEATURE_CACHED_EVENTS === 'true') {
      // Debounced mark as seen
      const timer = setTimeout(() => {
        markEventsAsSeen(cachedEvents.map(e => e.id), 'view')
        markedRef.current = true
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cachedEvents])

  // Filter events by search query and chip
  const filteredEvents = cachedEvents.filter(event => {
    // Search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matches =
        event.title?.toLowerCase().includes(query) ||
        event.venue_name?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
      if (!matches) return false
    }

    // Chip filters
    if (activeChip) {
      const now = new Date()
      switch (activeChip) {
        case 'tonight': {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          if (!event.date) return false
          const eventDate = new Date(event.date)
          return eventDate >= todayStart && eventDate < todayEnd
        }
        case 'now': {
          const currentHour = now.getHours()
          if (!event.time) return false
          const [hours] = event.time.split(':').map(Number)
          return Math.abs(hours - currentHour) <= 2
        }
        case 'near': {
          return !event.distance || event.distance <= 10
        }
        case 'free': {
          return event.price_min === 0 || event.price_min === null
        }
      }
    }

    return true
  })

  const handleSaveEvent = (event: any) => {
    const wasSaved = isSaved(event.id)
    toggleSaved(event.id, event) // Pass full event object for proper tracking

    // Track save/unsave interaction
    if (isTrackingEnabled() && typeof window !== 'undefined') {
      trackEvent(wasSaved ? 'unsave' : 'save', {
        eventId: event?.id,
        category: event?.category || category.id, // Use category.id as fallback
        price: event?.price_min,
        venue: event?.venue_name
      })
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300
      const newScrollLeft =
        direction === 'left'
          ? scrollRef.current.scrollLeft - scrollAmount
          : scrollRef.current.scrollLeft + scrollAmount
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }
  }

  if (cachedLoading && filteredEvents.length === 0) {
    return null // Don't show empty loading state
  }

  if (filteredEvents.length === 0) {
    return null // Don't show empty categories
  }

  return (
    <div className="mb-8 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>{category.emoji}</span>
          {category.title}
        </h2>
        <span className="text-gray-400 text-sm">{filteredEvents.length} events</span>
      </div>

      {/* Scroll Arrows */}
      {filteredEvents.length > 3 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg transition-all"
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg transition-all"
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {filteredEvents.map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className="flex-shrink-0 w-72 cursor-pointer group snap-start"
            onClick={() => onEventClick(event)}
          >
            <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 group-hover:scale-105 relative">
              {/* Save Button */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleSaveEvent(event)
                }}
                className="absolute top-2 left-2 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors"
              >
                {isSaved(event.id) ? '❤️' : '🤍'}
              </button>

              {/* Event Image */}
              <div className="relative h-40 overflow-hidden">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling.style.display = 'flex'
                    }}
                  />
                ) : null}

                {/* Fallback gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl text-white ${
                    event.image_url ? 'hidden' : 'flex'
                  }`}
                >
                  {category.emoji}
                </div>

                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Date badge */}
                <div className="absolute top-2 right-2">
                  <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                    {event.date
                      ? new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'TBA'}
                  </span>
                </div>
              </div>

              {/* Event Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-white">{event.title}</h3>

                <p className="text-xs text-gray-400 mb-1">📍 {event.venue_name}</p>

                {event.description && (
                  <p className="text-xs text-gray-300 mb-2 line-clamp-2">{event.description}</p>
                )}

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <PriceBadge event={event} size="sm" showTooltip={false} />

                    {event.time && event.time !== '19:00:00' && (
                      <span className="text-xs text-gray-400">
                        {new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      event.source?.includes('ticketmaster')
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}
                  >
                    {event.source?.includes('ticketmaster') ? 'TM' : 'EB'}
                  </span>
                </div>

                {/* Thumbs Component */}
                <div className="mt-2" onClick={e => e.stopPropagation()}>
                  <Thumbs event={event} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
