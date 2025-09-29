'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

// Featured categories for faster loading
const CATEGORIES = [
  // Top Music Categories 
  { id: 'concerts', title: 'Concerts & Music', emoji: '🎵', query: 'concerts music' },
  { id: 'halloween', title: 'Halloween Events', emoji: '🎃', query: 'halloween' },
  { id: 'food-drink', title: 'Food & Drink', emoji: '🍽️', query: 'food festival' },
  
  // Popular Events
  { id: 'sports', title: 'Sports Events', emoji: '🏆', query: 'sports' },
  { id: 'comedy-shows', title: 'Comedy Shows', emoji: '😂', query: 'comedy' },
  { id: 'networking', title: 'Networking', emoji: '🤝', query: 'networking business' },
  
  // Local Events
  { id: 'workshops', title: 'Workshops', emoji: '📚', query: 'workshop education' },
  { id: 'tech', title: 'Tech Events', emoji: '💻', query: 'technology meetup' }
]

export default function HomePage() {
  const [categoryEvents, setCategoryEvents] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

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
      const response = await fetch(`/api/search-events?q=${encodeURIComponent(query)}&limit=15&${locationParams}`)
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
    if (event.external_url) {
      window.open(event.external_url, '_blank')
    }
  }

  const handleSaveEvent = (event: any) => {
    const newSaved = new Set(savedEvents)
    if (savedEvents.has(event.id)) {
      newSaved.delete(event.id)
    } else {
      newSaved.add(event.id)
    }
    setSavedEvents(newSaved)
    localStorage.setItem('savedEvents', JSON.stringify([...newSaved]))
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
              Real-time events from Ticketmaster & EventBrite - {CATEGORIES.length} Featured Categories
            </p>
            <div className="text-xs text-gray-500 mb-4 max-w-2xl mx-auto">
              🎵 Music & Entertainment: Concerts, Halloween, Comedy, Sports<br/>
              🌟 Professional & Local: Networking, Workshops, Tech, Food & Drink
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              <p className="text-sm text-gray-400 mt-2">Loading {CATEGORIES.length} featured categories from Ticketmaster & EventBrite...</p>
            </div>
          ) : (
            CATEGORIES.map(category => {
              const allEvents = categoryEvents[category.id] || []
              const filteredEvents = filterEventsBySearch(allEvents)
              
              // Show all categories, even if empty (for better UX)
              
              return (
                <div key={category.id} className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span>{category.emoji}</span>
                      {category.title}
                    </h2>
                    <span className="text-gray-400 text-sm">
                      {filteredEvents.length} events
                    </span>
                  </div>

                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
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
                        className="flex-shrink-0 w-72 cursor-pointer group"
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
                            {event.date && (
                              <div className="absolute top-2 right-2">
                                <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Event Info */}
                          <div className="p-3" onClick={() => handleEventClick(event)}>
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
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                  event.price_min === 0 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-blue-600 text-white'
                                }`}>
                                  {event.price_min === 0 ? 'FREE' : `$${event.price_min}`}
                                </span>
                                
                                {event.time && (
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
                Showing {CATEGORIES.length} featured categories from Ticketmaster & EventBrite
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Visit /feed for more categories and trending events
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}