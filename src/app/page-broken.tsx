'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeaturedBanner } from '@/components/events/FeaturedBanner'
import { CategoryRow } from '@/components/events/CategoryRow'
import { useFeaturedEvents, useEventsByCategory } from '@/hooks/useEvents'
import { FeaturedEvent, CategoryRow as CategoryRowType, Event, EventHoverInfo, EventCategory } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

const categories_list: { id: string; title: string; emoji: string; gradient: string }[] = [
  { id: 'trending', title: 'Trending Now', emoji: '🔥', gradient: 'from-red-500 to-orange-500' },
  { id: 'sports', title: 'Sports Events', emoji: '⚽', gradient: 'from-green-500 to-blue-500' },
  { id: 'music', title: 'Live Music', emoji: '🎵', gradient: 'from-purple-500 to-pink-500' },
  { id: 'food', title: 'Food & Drink', emoji: '🍽️', gradient: 'from-yellow-500 to-red-500' },
  { id: 'tech', title: 'Tech Meetups', emoji: '💻', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'arts', title: 'Arts & Culture', emoji: '🎨', gradient: 'from-pink-500 to-purple-500' },
  { id: 'social', title: 'Social Events', emoji: '👥', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'free', title: 'Free Events', emoji: '🎁', gradient: 'from-green-500 to-teal-500' }
]

export default function HomePage() {
  const [hoveredEvent, setHoveredEvent] = useState<EventHoverInfo | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [viewMode, setViewMode] = useState<'carousel' | 'map'>('carousel')
  const [categories, setCategories] = useState<Map<string, any[]>>(new Map())
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  
  // Get user location with better error handling
  useEffect(() => {
    console.log('Attempting to get user location...')
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using default location')
      setUserLocation({ lat: 37.7749, lng: -122.4194 })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        console.log('Location detected:', location)
        setUserLocation(location)
      },
      (error) => {
        console.log('Location error:', error.message)
        // Default to San Francisco
        setUserLocation({ lat: 37.7749, lng: -122.4194 })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [])
  
  // Fetch featured events using the hook
  const { data: featuredEventsData, isLoading: featuredLoading, error: featuredError } = useFeaturedEvents()
  
  // Fetch events with live scraping on every load
  useEffect(() => {
    const loadEventsWithScraping = async () => {
      if (!userLocation) return
      
      try {
        console.log('🔄 Loading events with live scraping...')
        
        // Trigger scraping and get categorized events
        const response = await fetch('/api/scrape-and-load')
        const result = await response.json()
        
        if (result.success) {
          console.log(`✅ Scraped ${result.scraped_count} fresh events`)
          
          // Set categories with scraped data
          const categoryMap = new Map()
          Object.entries(result.categories).forEach(([key, events]) => {
            categoryMap.set(key, events)
          })
          setCategories(categoryMap)
        }
      } catch (error) {
        console.error('Failed to load events:', error)
      }
    }
    
    loadEventsWithScraping()
  }, [userLocation])

  // Remove the old event fetching logic
  const locationForQueries = userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : undefined
  
  // Transform to FeaturedEvent type
  const featuredEvents: FeaturedEvent[] = (featuredEventsData || []).map(event => ({
    ...event,
    featured_description: event.description ? `${event.description.slice(0, 200)}...` : undefined,
    hotness_score: typeof event.hotness_score === 'number' ? event.hotness_score : Math.random() * 100,
  }))

  // Build category rows using the pre-fetched data
  const categoryQueries = [musicEvents, sportsEvents, artsEvents, foodEvents, techEvents, socialEvents, businessEvents, educationEvents]
  const categoryRows: CategoryRowType[] = categories.map((category, index) => {
    const query = categoryQueries[index]
    return {
      id: category.id,
      title: category.title,
      category: category.id,
      events: query.data?.slice(0, 20) || [],
      loading: query.isLoading,
      hasMore: (query.data?.length || 0) >= 20,
    }
  })

  const handleEventHover = (info: EventHoverInfo) => {
    setHoveredEvent(info.isVisible ? info : null)
  }

  const handleVideoPlay = (eventId: string) => {
    setPlayingVideoId(eventId)
  }

  const handleLoadMoreCategory = async (categoryId: string) => {
    // TODO: Implement load more functionality with pagination
    console.log('Load more for category:', categoryId)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        {/* Debug Info */}
        <div className="fixed top-20 right-4 bg-gray-800 text-white p-3 rounded text-xs z-40">
          <div>Location: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Loading...'}</div>
          <div>Categories: {categories.size}</div>
          <div>Status: {categories.size > 0 ? 'Loaded' : 'Loading...'}</div>
        </div>
        <div className="fixed top-4 right-4 z-50 bg-gray-900 rounded-lg p-2 border border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('carousel')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                viewMode === 'carousel'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-gray-800'
              }`}
            >
              🎬 Browse
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                viewMode === 'map'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-gray-800'
              }`}
            >
              🗺️ Map
            </button>
          </div>
        </div>

        {viewMode === 'carousel' ? (
          <>
            {/* Netflix-style Hero */}
            <div className="relative h-[70vh] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-12 z-20">
                <h1 className="text-6xl font-bold mb-4">What's Happening Near You</h1>
                <p className="text-xl text-gray-300 mb-8">
                  {userLocation ? `Events within 25km • Live updates` : 'Discovering events...'}
                </p>
                <div className="flex gap-4">
                  <button className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition">
                    Browse All
                  </button>
                  <button className="px-8 py-3 bg-gray-800 font-bold rounded hover:bg-gray-700 transition">
                    My Interests
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Category Rows */}
            <div className="px-12 -mt-32 relative z-30 space-y-8">
              {categories.size > 0 ? categories_list.map((category, index) => {
                const categoryEvents = categories.get(category.id) || []
                
                return (
                  <div key={category.id} className="mb-12">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <span className="text-3xl">{category.emoji}</span>
                      {category.title}
                      <span className="text-sm text-gray-400 ml-2">
                        ({categoryEvents.length} events)
                      </span>
                    </h2>
                    
                    <div className="relative">
                      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                        <AnimatePresence>
                          {categoryEvents.slice(0, 20).map((event) => (
                            <motion.div
                              key={event.id}
                              className="flex-shrink-0 w-64 cursor-pointer"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.05, zIndex: 10 }}
                              onHoverStart={() => setHoveredCard(event.id)}
                              onHoverEnd={() => setHoveredCard(null)}
                              onClick={() => window.open(event.external_url || '#', '_blank')}
                            >
                              <div className="relative rounded-lg overflow-hidden bg-gray-800">
                                <div className={`h-36 bg-gradient-to-br ${category.gradient} flex items-center justify-center`}>
                                  {event.image_url ? (
                                    <img 
                                      src={event.image_url} 
                                      alt={event.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-white text-4xl">{category.emoji}</div>
                                  )}
                                  {event.hotness_score > 80 && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                                      🔥 HOT
                                    </div>
                                  )}
                                </div>
                                
                                <div className="p-4">
                                  <h3 className="font-semibold mb-1 line-clamp-2">
                                    {event.title}
                                  </h3>
                                  <div className="text-sm text-gray-400 space-y-1">
                                    <div className="flex items-center gap-1">
                                      📍 {event.venue_name || 'Venue TBA'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      📅 {new Date(event.date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      💰 {event.price_min === 0 ? 'Free' : `From $${event.price_min}`}
                                    </div>
                                  </div>
                                </div>

                                {/* Hover Details */}
                                {hoveredCard === event.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent p-4 flex flex-col justify-end"
                                  >
                                    <p className="text-sm mb-3 line-clamp-3">
                                      {event.description || 'No description available'}
                                    </p>
                                    <button className="w-full py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition">
                                      View Event Details
                                    </button>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-xl">🔄 Discovering fresh events near you...</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">🗺️ Interactive Event Map</h2>
              <p className="text-gray-400">Map view coming soon...</p>
            </div>
          </div>
        )}

        {/* Location indicator */}
        {userLocation && (
          <div className="fixed bottom-4 left-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm border border-gray-700">
            📍 Events near {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}
          </div>
        )}

        {/* Event Hover Preview */}
        {hoveredEvent && hoveredEvent.isVisible && (
          <div className="fixed z-50 pointer-events-none top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-80 shadow-2xl"
            >
              <h3 className="text-white font-semibold text-lg mb-2">
                {hoveredEvent.event.title || hoveredEvent.event.name}
              </h3>
              <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                {hoveredEvent.event.description || 'No description available'}
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div>📅 {new Date(hoveredEvent.event.event_date || hoveredEvent.event.start_time || hoveredEvent.event.date || Date.now()).toLocaleDateString()}</div>
                <div>📍 {hoveredEvent.event.venue_name}</div>
                <div>🏷️ {hoveredEvent.event.category}</div>
                {hoveredEvent.event.price_min && (
                  <div>💰 From ${hoveredEvent.event.price_min}</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

