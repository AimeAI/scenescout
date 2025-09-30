'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { trackEvent, readInteractions, isTrackingEnabled } from '@/lib/tracking/client'
import { computeAffinity, reorderRows } from '@/lib/tracking/affinity'
import { PriceBadge } from '@/components/events/PriceBadge'

// Enhanced categories with better naming and coverage
// Using simple keywords that work with both Ticketmaster and EventBrite
const CATEGORIES = [
  // Music & Entertainment
  { id: 'music-concerts', title: 'Music & Concerts', emoji: '🎵', query: 'concert' },
  { id: 'nightlife-dj', title: 'Nightlife & DJ Sets', emoji: '🌃', query: 'dance' },
  { id: 'comedy-improv', title: 'Comedy & Improv', emoji: '😂', query: 'comedy' },
  { id: 'theatre-dance', title: 'Theatre & Dance', emoji: '🎭', query: 'theatre' },

  // Food & Culture
  { id: 'food-drink', title: 'Food & Drink (Pop-ups, Tastings)', emoji: '🍽️', query: 'festival' },
  { id: 'arts-exhibits', title: 'Arts & Exhibits', emoji: '🎨', query: 'art' },
  { id: 'film-screenings', title: 'Film & Screenings', emoji: '🎬', query: 'film' },
  { id: 'markets-popups', title: 'Markets & Pop-ups', emoji: '🛍️', query: 'festival' },

  // Active & Wellness
  { id: 'sports-fitness', title: 'Sports & Fitness', emoji: '🏃', query: 'sports' },
  { id: 'outdoors-nature', title: 'Outdoors & Nature', emoji: '🌲', query: 'festival' },
  { id: 'wellness-mindfulness', title: 'Wellness & Mindfulness', emoji: '🧘', query: 'expo' },

  // Community & Learning
  { id: 'workshops-classes', title: 'Workshops & Classes', emoji: '📚', query: 'expo' },
  { id: 'tech-startups', title: 'Tech & Startups', emoji: '💻', query: 'tech' },

  // Special Categories
  { id: 'family-kids', title: 'Family & Kids', emoji: '👨‍👩‍👧‍👦', query: 'family' },
  { id: 'date-night', title: 'Date Night Ideas', emoji: '💕', query: 'jazz' },
  { id: 'late-night', title: 'Late Night (11pm–4am)', emoji: '🌙', query: 'club' },
  { id: 'neighborhood', title: 'Neighborhood Hotspots', emoji: '📍', query: 'festival' },
  { id: 'halloween', title: 'Halloween Events', emoji: '🎃', query: 'halloween' }
]

export default function HomePage() {
  const [categoryEvents, setCategoryEvents] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Create refs for scroll containers - one per category
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          console.log('✅ Location detected:', position.coords)
        },
        () => {
          console.log('📍 Using default location (SF)')
          setUserLocation({ lat: 37.7749, lng: -122.4194 })
        }
      )
    } else {
      setUserLocation({ lat: 37.7749, lng: -122.4194 })
    }
  }, [])

  // Load events for a category
  const loadEvents = async (categoryId: string, query: string) => {
    console.log(`🔍 Loading ${categoryId} events...`)
    
    const locationParams = userLocation ? 
      `lat=${userLocation.lat}&lng=${userLocation.lng}` : 
      'city=San Francisco'
    
    try {
      const response = await fetch(`/api/search-events?q=${encodeURIComponent(query)}&limit=20&${locationParams}`)
      const data = await response.json()
      
      if (data.success && data.events?.length > 0) {
        setCategoryEvents(prev => ({
          ...prev,
          [categoryId]: data.events
        }))
        console.log(`✅ ${categoryId}: ${data.events.length} events from ${data.sources?.ticketmaster || 0} TM + ${data.sources?.eventbrite || 0} EB`)
      } else {
        console.log(`ℹ️ No events found for ${categoryId}`)
        setCategoryEvents(prev => ({
          ...prev,
          [categoryId]: []
        }))
      }
    } catch (error) {
      console.error(`❌ Error loading ${categoryId}:`, error)
      setCategoryEvents(prev => ({
        ...prev,
        [categoryId]: []
      }))
    }
  }

  // Load all categories
  useEffect(() => {
    const loadAllCategories = async () => {
      setLoading(true)
      console.log('🚀 Starting to load all categories...')
      
      // Load categories in parallel (much faster)
      const promises = CATEGORIES.map(category => {
        console.log(`📂 Loading category: ${category.title}`)
        return loadEvents(category.id, category.query)
      })
      
      await Promise.all(promises)
      
      setLoading(false)
      console.log('✅ All categories loaded!')
    }
    
    // Start loading after location is set or timeout
    const timer = setTimeout(() => {
      loadAllCategories()
    }, userLocation ? 100 : 500)
    
    return () => clearTimeout(timer)
  }, [userLocation])

  const handleEventClick = (event: any) => {
    // Track click interaction for personalization
    if (isTrackingEnabled() && typeof window !== 'undefined') {
      trackEvent('click', {
        eventId: event?.id,
        category: event?.category || 'unknown',
        price: event?.price_min,
        venue: event?.venue_name
      })
    }

    if (event.external_url) {
      window.open(event.external_url, '_blank')
    }
  }

  const handleSaveEvent = (event: any) => {
    // Track save interaction for personalization
    if (isTrackingEnabled() && typeof window !== 'undefined') {
      trackEvent('save', {
        eventId: event?.id,
        category: event?.category || 'unknown',
        price: event?.price_min,
        venue: event?.venue_name
      })
    }

    const newSaved = new Set(savedEvents)
    if (savedEvents.has(event.id)) {
      newSaved.delete(event.id)
    } else {
      newSaved.add(event.id)
    }
    setSavedEvents(newSaved)
    localStorage.setItem('savedEvents', JSON.stringify([...newSaved]))
  }

  // Scroll function for arrows
  const scroll = (categoryId: string, direction: 'left' | 'right') => {
    const container = scrollRefs.current[categoryId]
    if (container) {
      const scrollAmount = 300 // Scroll by one card width plus gap
      const newScrollLeft = direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount
      container.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }
  }

  // Load saved events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedEvents')
    if (saved) {
      setSavedEvents(new Set(JSON.parse(saved)))
    }
  }, [])

  // Filter events by search query
  const filterEventsBySearch = (events: any[]) => {
    if (!searchQuery) return events
    return events.filter(event => 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const totalEvents = Object.values(categoryEvents).reduce((sum, events) => sum + events.length, 0)
  const freeEvents = Object.values(categoryEvents).flat().filter(e => e.price_min === 0).length

  // Compute personalized row order based on user interactions
  const displayCategories = useMemo(() => {
    if (!isTrackingEnabled() || typeof window === 'undefined') {
      return CATEGORIES
    }

    const interactions = readInteractions()
    if (interactions.length === 0) return CATEGORIES

    const affinity = computeAffinity(interactions)
    return reorderRows(CATEGORIES, affinity, categoryEvents, { discoveryFloor: 0.2 })
  }, [categoryEvents])

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <div className="relative h-[40vh] bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
          <div className="text-center z-10 max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold mb-4">🎯 SceneScout</h1>
            <p className="text-xl text-gray-300 mb-2">
              {userLocation ? 'Events Near You' : 'Discover Events'}
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Real-time events from Ticketmaster & EventBrite - {CATEGORIES.length} Curated Categories
            </p>
            <div className="text-xs text-gray-500 mb-4 max-w-2xl mx-auto">
              🎵 Entertainment: Music, Nightlife, Comedy, Theatre, Arts & Film<br/>
              🌟 Lifestyle: Food Pop-ups, Wellness, Outdoors, Date Night & Markets<br/>
              🚀 Special: Late Night, Family, Tech, Neighborhood & Halloween
            </div>
            
            {totalEvents > 0 && (
              <div className="flex justify-center gap-8 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{totalEvents}</div>
                  <div className="text-xs text-gray-400">Events Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{freeEvents}</div>
                  <div className="text-xs text-gray-400">Free Events</div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events, venues, or keywords..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchQuery(value)
                    // Track search for personalization
                    if (value.trim() && isTrackingEnabled() && typeof window !== 'undefined') {
                      trackEvent('search', { query: value })
                    }
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-4 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {userLocation ? 
                '📍 Showing events sorted by distance and popularity' : 
                '📍 Getting your location for personalized results...'
              }
            </div>
          </div>
        </div>

        {/* Event Categories */}
        <div className="px-8 py-8 space-y-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-xl">🔍 Finding events near you...</p>
              <p className="text-sm text-gray-400 mt-2">Loading {CATEGORIES.length} curated categories from Ticketmaster & EventBrite...</p>
            </div>
          ) : (
            displayCategories.map(category => {
              const allEvents = categoryEvents[category.id] || []
              const filteredEvents = filterEventsBySearch(allEvents)

              return (
                <div key={category.id} className="mb-8 relative">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span>{category.emoji}</span>
                        {category.title}
                      </h2>
                      <span className="text-gray-400 text-sm">
                        {filteredEvents.length} events
                      </span>
                    </div>

                  {/* Scroll Arrows */}
                  {filteredEvents.length > 3 && (
                    <>
                      <button
                        onClick={() => scroll(category.id, 'left')}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full shadow-lg transition-all"
                        aria-label="Scroll left"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => scroll(category.id, 'right')}
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
                    ref={(el) => { scrollRefs.current[category.id] = el }}
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth"
                  >
                    {filteredEvents.length === 0 ? (
                      <div className="flex-shrink-0 w-72 p-6 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600 text-center">
                        <div className="text-3xl mb-2">{category.emoji}</div>
                        <p className="text-gray-400 text-sm mb-2">No events found</p>
                        <p className="text-gray-500 text-xs">Try a different location or check back later</p>
                      </div>
                    ) : (
                      filteredEvents.map((event, index) => (
                      <div
                        key={`${event.id}-${index}`}
                        className="flex-shrink-0 w-72 cursor-pointer group snap-start"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 group-hover:scale-105 relative">
                          {/* Save Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveEvent(event)
                            }}
                            className="absolute top-2 left-2 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors"
                          >
                            {savedEvents.has(event.id) ? '❤️' : '🤍'}
                          </button>

                          {/* Event Image */}
                          <div className="relative h-40 overflow-hidden">
                            {event.image_url ? (
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            
                            {/* Fallback gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl text-white ${event.image_url ? 'hidden' : 'flex'}`}>
                              {category.emoji}
                            </div>
                            
                            {/* Overlay for better text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            
                            {/* Date badge */}
                            <div className="absolute top-2 right-2">
                              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                                {event.date
                                  ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'TBA'}
                              </span>
                            </div>
                          </div>

                          {/* Event Info */}
                          <div className="p-3">
                            <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-white">
                              {event.title}
                            </h3>
                            
                            <p className="text-xs text-gray-400 mb-1">
                              📍 {event.venue_name}
                            </p>
                            
                            {event.description && (
                              <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                                {event.description}
                              </p>
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
                              
                              <span className={`text-xs px-2 py-1 rounded ${
                                event.source?.includes('ticketmaster') 
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-orange-500/20 text-orange-400'
                              }`}>
                                {event.source?.includes('ticketmaster') ? 'TM' : 'EB'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </div>
              )
            }).filter(Boolean)
          )}
          
          {/* All categories loaded message */}
          {!loading && (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✨</div>
              <p className="text-gray-400 text-sm">
                Showing {CATEGORIES.length} curated categories from Ticketmaster & EventBrite
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Visit /feed for more trending events and discovery options
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}