'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { PriceBadge } from '@/components/events/PriceBadge'
import { Thumbs } from '@/components/events/Thumbs'
import { EmptyState, getEmptyState } from '@/components/empty-states'
import { isSaved, toggleSaved } from '@/lib/saved/store'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'
import { motion } from 'framer-motion'

// Category mapping - must match the IDs from the homepage CATEGORIES array
const CATEGORY_MAP: Record<string, { title: string; emoji: string; query: string }> = {
  // Music & Entertainment
  'music-concerts': { title: 'Music & Concerts', emoji: '🎵', query: 'concert' },
  'nightlife-dj': { title: 'Nightlife & DJ Sets', emoji: '🌃', query: 'dance' },
  'comedy-improv': { title: 'Comedy & Improv', emoji: '😂', query: 'comedy' },
  'theatre-dance': { title: 'Theatre & Dance', emoji: '🎭', query: 'theatre' },

  // Food & Culture
  'food-drink': { title: 'Food & Drink (Pop-ups, Tastings)', emoji: '🍽️', query: 'festival' },
  'arts-exhibits': { title: 'Arts & Exhibits', emoji: '🎨', query: 'art' },
  'film-screenings': { title: 'Film & Screenings', emoji: '🎬', query: 'film' },
  'markets-popups': { title: 'Markets & Pop-ups', emoji: '🛍️', query: 'festival' },

  // Active & Wellness
  'sports-fitness': { title: 'Sports & Fitness', emoji: '🏃', query: 'sports' },
  'outdoors-nature': { title: 'Outdoors & Nature', emoji: '🌲', query: 'festival' },
  'wellness-mindfulness': { title: 'Wellness & Mindfulness', emoji: '🧘', query: 'expo' },

  // Community & Learning
  'workshops-classes': { title: 'Workshops & Classes', emoji: '📚', query: 'expo' },
  'tech-startups': { title: 'Tech & Startups', emoji: '💻', query: 'tech' },

  // Special Categories
  'family-kids': { title: 'Family & Kids', emoji: '👨‍👩‍👧‍👦', query: 'family' },
  'date-night': { title: 'Date Night Ideas', emoji: '💕', query: 'jazz' },
  'late-night': { title: 'Late Night (11pm–4am)', emoji: '🌙', query: 'club' },
  'neighborhood': { title: 'Neighborhood Hotspots', emoji: '📍', query: 'festival' },
  'halloween': { title: 'Halloween Events', emoji: '🎃', query: 'halloween' }
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const category = CATEGORY_MAP[slug]

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [displayLimit, setDisplayLimit] = useState(100) // Start with 100 events
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Location access denied:', error)
          // Default to Toronto
          setUserLocation({ lat: 43.8398293591559, lng: -79.39243707875843 })
        }
      )
    } else {
      // Default to Toronto
      setUserLocation({ lat: 43.8398293591559, lng: -79.39243707875843 })
    }
  }, [])

  // Fetch events directly from API with high limit
  useEffect(() => {
    if (!category || !userLocation) return

    const fetchEvents = async () => {
      setLoading(true)
      try {
        // Fetch with limit of 200 to get lots of events
        // Use 'relevance' sorting to get most popular/relevant events first
        const response = await fetch(
          `/api/search-events?q=${encodeURIComponent(category.query)}&limit=200&lat=${userLocation.lat}&lng=${userLocation.lng}&sort=relevance`
        )
        const data = await response.json()
        console.log(`📊 ${category.title}: Loaded ${data.events?.length || 0} events (sorted by relevance)`)
        setAllEvents(data.events || [])
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setAllEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [category, userLocation])

  // Handle infinite scroll
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || displayLimit >= allEvents.length) return

    setIsLoadingMore(true)
    setTimeout(() => {
      setDisplayLimit(prev => Math.min(prev + 50, allEvents.length))
      setIsLoadingMore(false)
    }, 300)
  }, [isLoadingMore, displayLimit, allEvents.length])

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current
    if (!trigger || !allEvents || allEvents.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && displayLimit < allEvents.length) {
          handleLoadMore()
        }
      },
      { threshold: 0.5, rootMargin: '400px' }
    )

    observer.observe(trigger)

    return () => {
      if (trigger) observer.unobserve(trigger)
    }
  }, [handleLoadMore, isLoadingMore, displayLimit, allEvents])

  const handleSaveEvent = (event: any) => {
    const wasSaved = isSaved(event.id)
    toggleSaved(event.id, event)

    if (isTrackingEnabled() && typeof window !== 'undefined') {
      trackEvent(wasSaved ? 'unsave' : 'save', {
        eventId: event?.id,
        category: category?.query,
        price: event?.price_min,
        venue: event?.venue_name
      })
    }
  }

  const handleEventClick = (event: any) => {
    console.log('🔍 Category page - Event clicked:', event?.id, event?.title)

    if (isTrackingEnabled()) {
      trackEvent('click', {
        eventId: event?.id,
        category: category?.query,
        price: event?.price_min,
        venue: event?.venue_name
      })
    }

    if (event?.id) {
      // Cache the event data in sessionStorage so the detail page can use it
      // This is especially important for EventBrite events that can't be fetched by ID
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`event_${event.id}`, JSON.stringify(event))
          console.log('💾 Cached event in sessionStorage:', event.id)
        } catch (error) {
          console.warn('Failed to cache event:', error)
        }
      }

      console.log('✅ Navigating to:', `/events/${event.id}`)
      router.push(`/events/${event.id}`)
    } else {
      console.warn('⚠️ NO EVENT ID - cannot navigate', event)
    }
  }

  // If category not found
  if (!category) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
            <p className="text-gray-400 mb-6">The category you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const displayedEvents = allEvents.slice(0, displayLimit)
  const hasMore = allEvents.length > displayLimit

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <div className="relative h-[30vh] bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 text-center px-4">
            <div className="text-6xl mb-4">{category.emoji}</div>
            <h1 className="text-5xl font-bold mb-2">{category.title}</h1>
            <p className="text-gray-300 text-lg">
              {loading ? 'Loading events...' : `${allEvents.length} events found`}
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="px-8 pt-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>

        {/* Events Grid */}
        <div className="px-8 py-8">
          {loading && displayedEvents.length === 0 ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-xl">Loading {category.title}...</p>
            </div>
          ) : displayedEvents.length === 0 ? (
            <EmptyState
              {...getEmptyState('noCategoryEvents', {
                emoji: category.emoji,
                title: `No ${category.title} Events`,
                description: `There aren't any ${category.title.toLowerCase()} events available right now.`
              })}
              action={{
                label: 'Browse All Events',
                onClick: () => router.push('/')
              }}
              secondaryAction={{
                label: 'Go Back',
                onClick: () => router.back(),
                variant: 'outline'
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedEvents.map((event, index) => (
                  <motion.div
                    key={`${event.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="cursor-pointer group"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 group-hover:scale-105 relative h-full flex flex-col">
                      {/* Save Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveEvent(event)
                        }}
                        className="absolute top-2 left-2 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors"
                      >
                        {isSaved(event.id) ? '❤️' : '🤍'}
                      </button>

                      {/* Event Image */}
                      <div className="relative h-48 overflow-hidden">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}

                        {/* Fallback gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl text-white ${event.image_url ? 'hidden' : 'flex'}`}>
                          {category.emoji}
                        </div>

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Date badge */}
                        <div className="absolute top-2 right-2">
                          <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                            {event.date
                              ? (() => {
                                  let date: Date
                                  if (typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    const [year, month, day] = event.date.split('-').map(Number)
                                    date = new Date(year, month - 1, day)
                                  } else {
                                    date = new Date(event.date)
                                  }
                                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                })()
                              : 'TBA'}
                          </span>
                        </div>
                      </div>

                      {/* Event Info */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-base mb-2 line-clamp-2 text-white">
                          {event.title}
                        </h3>

                        <p className="text-sm text-gray-400 mb-2">
                          📍 {event.venue_name}
                        </p>

                        {event.description && (
                          <p className="text-sm text-gray-300 mb-3 line-clamp-2 flex-1">
                            {event.description}
                          </p>
                        )}

                        <div className="flex justify-between items-center mt-auto">
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

                          <span className={`text-xs px-2 py-1 rounded ${
                            event.source?.includes('ticketmaster')
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {event.source?.includes('ticketmaster') ? 'TM' : 'EB'}
                          </span>
                        </div>

                        {/* Thumbs Component */}
                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <Thumbs event={event} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Infinite scroll trigger */}
              {hasMore && (
                <div ref={loadMoreTriggerRef} className="py-12 flex justify-center">
                  {isLoadingMore ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
                      <p className="text-gray-400">Loading more events...</p>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">↓ Scroll for more ↓</div>
                  )}
                </div>
              )}

              {/* All loaded message */}
              {!hasMore && displayedEvents.length > 0 && (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">✨</div>
                  <p className="text-gray-400 text-sm">
                    Showing all {allEvents.length} {category.title} events
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
