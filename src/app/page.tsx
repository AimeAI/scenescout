'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { NetflixCategoryRow } from '@/components/NetflixCategoryRow'

// Comprehensive city event categories - ordered by user engagement
const CITY_CATEGORIES = [
  { id: 'tech', title: 'Tech & Startups', emoji: '💻', query: 'tech meetup startup' },
  { id: 'trending', title: 'Trending Now', emoji: '🔥', query: 'events toronto today' },
  { id: 'free', title: 'Free Events', emoji: '🆓', query: 'free events activities' },
  { id: 'nightlife', title: 'Nightlife & Parties', emoji: '🌃', query: 'party nightlife bar club' },
  { id: 'music', title: 'Live Music', emoji: '🎵', query: 'concerts music live bands' },
  { id: 'food', title: 'Food & Drinks', emoji: '🍽️', query: 'food festivals restaurants dining' },
  { id: 'business', title: 'Business & Networking', emoji: '💼', query: 'business networking professional meetup' },
  { id: 'learning', title: 'Workshops & Classes', emoji: '📚', query: 'workshops classes learning skills' },
  { id: 'comedy', title: 'Comedy Shows', emoji: '😂', query: 'comedy shows standup improv' },
  { id: 'fitness', title: 'Fitness & Wellness', emoji: '💪', query: 'fitness yoga wellness health' },
  { id: 'arts', title: 'Arts & Culture', emoji: '🎨', query: 'art exhibitions galleries museums' },
  { id: 'gaming', title: 'Gaming & Esports', emoji: '🎮', query: 'gaming esports video games tournaments' },
  { id: 'outdoor', title: 'Outdoor Activities', emoji: '🏞️', query: 'outdoor hiking nature activities' },
  { id: 'sports', title: 'Sports & Games', emoji: '⚽', query: 'sports games tournaments matches' },
  { id: 'theater', title: 'Theater & Shows', emoji: '🎭', query: 'theater shows plays performances' },
  { id: 'dating', title: 'Dating & Singles', emoji: '💕', query: 'dating singles speed dating meetup' },
  { id: 'family', title: 'Family & Kids', emoji: '👨‍👩‍👧‍👦', query: 'family kids children activities' },
  { id: 'students', title: 'Student Events', emoji: '🎓', query: 'student university college campus' },
  { id: 'photography', title: 'Photography & Film', emoji: '📸', query: 'photography film cinema workshops' },
  { id: 'markets', title: 'Markets & Fairs', emoji: '🛍️', query: 'markets fairs farmers craft' },
  { id: 'festivals', title: 'Festivals & Celebrations', emoji: '🎪', query: 'festivals celebrations cultural events' },
  { id: 'volunteer', title: 'Volunteer & Charity', emoji: '🤝', query: 'volunteer charity community service' },
  { id: 'lgbtq', title: 'LGBTQ+ Events', emoji: '🏳️‍🌈', query: 'lgbtq pride queer community' },
  { id: 'seniors', title: 'Seniors & 50+', emoji: '👴', query: 'seniors 50+ mature adults' },
  { id: 'religious', title: 'Religious & Spiritual', emoji: '🙏', query: 'religious spiritual meditation faith' },
  { id: 'automotive', title: 'Cars & Motorcycles', emoji: '🚗', query: 'cars automotive motorcycles shows' },
  { id: 'pets', title: 'Pets & Animals', emoji: '🐕', query: 'pets dogs animals adoption' },
  { id: 'fashion', title: 'Fashion & Beauty', emoji: '👗', query: 'fashion beauty style shows' },
  { id: 'crafts', title: 'Crafts & DIY', emoji: '🎨', query: 'crafts diy handmade workshops' },
  { id: 'books', title: 'Books & Literature', emoji: '📖', query: 'books literature reading clubs' }
]

export default function HomePage() {
  const [categoryEvents, setCategoryEvents] = useState<Record<string, any[]>>({})
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({})
  const [hasMoreCategories, setHasMoreCategories] = useState<Record<string, boolean>>({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadedCategoryCount, setLoadedCategoryCount] = useState(0)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  useEffect(() => {
    getUserLocation()
    loadInitialEvents()
  }, [])

  const loadMoreCategories = useCallback(async () => {
    if (loadedCategoryCount >= CITY_CATEGORIES.length) return
    
    console.log(`📂 Loading more categories: ${loadedCategoryCount}/${CITY_CATEGORIES.length}`)
    
    // Load next 3 categories at once for better UX
    const nextCategories = CITY_CATEGORIES.slice(loadedCategoryCount, loadedCategoryCount + 3)
    console.log(`📋 Next categories:`, nextCategories.map(c => c.title))
    
    const promises = nextCategories.map(category => 
      loadCategoryEvents(category.id, category.query, false)
    )
    
    await Promise.all(promises)
    setLoadedCategoryCount(prev => prev + nextCategories.length)
    console.log(`✅ Loaded ${nextCategories.length} more categories`)
  }, [loadedCategoryCount])

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000 &&
        loadedCategoryCount < CITY_CATEGORIES.length &&
        !initialLoading
      ) {
        loadMoreCategories()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadedCategoryCount, initialLoading, loadMoreCategories])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        () => {
          // Default to Toronto if location denied
          setUserLocation({ lat: 43.6532, lng: -79.3832 })
        }
      )
    } else {
      setUserLocation({ lat: 43.6532, lng: -79.3832 })
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const sortEventsByLocation = (events: any[]) => {
    if (!userLocation) return events
    
    return events.sort((a, b) => {
      const distanceA = calculateDistance(
        userLocation.lat, userLocation.lng,
        a.latitude || 43.6532, a.longitude || -79.3832
      )
      const distanceB = calculateDistance(
        userLocation.lat, userLocation.lng,
        b.latitude || 43.6532, b.longitude || -79.3832
      )
      return distanceA - distanceB
    })
  }

  const loadInitialEvents = async () => {
    setInitialLoading(true)
    
    // Load first 6 categories with more events each
    const initialCategories = CITY_CATEGORIES.slice(0, 6)
    const promises = initialCategories.map(category => 
      loadCategoryEvents(category.id, category.query, false)
    )
    
    await Promise.all(promises)
    setLoadedCategoryCount(6)
    setInitialLoading(false)
  }

  const loadCategoryEvents = async (categoryId: string, query: string, isLoadMore: boolean) => {
    setLoadingCategories(prev => ({ ...prev, [categoryId]: true }))
    
    try {
      const currentEvents = categoryEvents[categoryId] || []
      const offset = isLoadMore ? currentEvents.length : 0
      const limit = 25 // Increased from 15
      
      console.log(`🔍 Loading ${categoryId}: query="${query}", offset=${offset}, isLoadMore=${isLoadMore}`)
      
      const response = await fetch(
        `/api/search-enhanced?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
      )
      const data = await response.json()
      
      console.log(`📊 ${categoryId} response:`, { success: data.success, count: data.count, hasMore: data.hasMore })
      
      if (data.success && data.events.length > 0) {
        // Sort events by geographic proximity
        const sortedEvents = sortEventsByLocation(data.events)
        
        setCategoryEvents(prev => ({
          ...prev,
          [categoryId]: isLoadMore 
            ? [...(prev[categoryId] || []), ...sortedEvents]
            : sortedEvents
        }))
        
        setHasMoreCategories(prev => ({
          ...prev,
          [categoryId]: data.hasMore || (currentEvents.length + data.events.length < 50) // Show more button until we have 50+ events
        }))
        
        console.log(`✅ ${categoryId}: Added ${sortedEvents.length} events, total now ${isLoadMore ? currentEvents.length + sortedEvents.length : sortedEvents.length}`)
      } else {
        console.log(`⚠️ ${categoryId}: No events found`)
        setHasMoreCategories(prev => ({
          ...prev,
          [categoryId]: false
        }))
      }
    } catch (error) {
      console.error(`Failed to load ${categoryId} events:`, error)
      setHasMoreCategories(prev => ({
        ...prev,
        [categoryId]: false
      }))
    } finally {
      setLoadingCategories(prev => ({ ...prev, [categoryId]: false }))
    }
  }

  const handleLoadMoreCategory = (categoryId: string, query: string) => {
    console.log(`🔄 Loading more events for category: ${categoryId}`)
    if (!loadingCategories[categoryId]) {
      loadCategoryEvents(categoryId, query, true)
    }
  }

  const handleEventClick = (event: any) => {
    if (event.external_url) {
      window.open(event.external_url, '_blank')
    }
  }

  const totalEvents = Object.values(categoryEvents).reduce((sum, events) => sum + events.length, 0)
  const freeEvents = Object.values(categoryEvents).flat().filter(e => e.price_min === 0).length

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <div className="relative h-[50vh] bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
          <div className="text-center z-10">
            <h1 className="text-5xl font-bold mb-4">🎯 SceneScout</h1>
            <p className="text-xl text-gray-300 mb-6">
              Discover Events Near You
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/search'}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold transition"
              >
                🔍 Search Events
              </button>
              <button
                onClick={() => window.location.href = '/map'}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
              >
                🗺️ Event Map
              </button>
              <button
                onClick={() => window.location.href = '/feed'}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
              >
                🔥 Discover Trending
              </button>
            </div>

            {totalEvents > 0 && (
              <p className="text-sm text-gray-400 mt-4">
                {totalEvents} events • {freeEvents} free • Sorted by distance
              </p>
            )}
          </div>
        </div>

        {/* Netflix-Style Category Rows */}
        <div className="px-8 py-8 space-y-8">
          {initialLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-xl">🔍 Finding events near you...</p>
              <p className="text-sm text-gray-400 mt-2">Loading trending events, free activities, and local favorites</p>
            </div>
          ) : (
            <>
              {CITY_CATEGORIES.slice(0, loadedCategoryCount).map(category => {
                const events = categoryEvents[category.id] || []
                const loading = loadingCategories[category.id] || false
                const hasMore = hasMoreCategories[category.id] || false

                // Always show category if it has events or is loading
                return (
                  <NetflixCategoryRow
                    key={category.id}
                    title={category.title}
                    emoji={category.emoji}
                    events={events}
                    onEventClick={handleEventClick}
                    onLoadMore={() => handleLoadMoreCategory(category.id, category.query)}
                    hasMore={hasMore}
                    loading={loading}
                  />
                )
              })}

              {/* Infinite Scroll Loading */}
              {loadedCategoryCount < CITY_CATEGORIES.length && (
                <div className="text-center py-8">
                  <div className="animate-pulse mb-4">
                    <div className="text-lg text-gray-400">Loading more categories...</div>
                    <div className="text-sm text-gray-500 mt-2">
                      {loadedCategoryCount} of {CITY_CATEGORIES.length} loaded
                    </div>
                  </div>
                  
                  {/* Manual Load Button */}
                  <button
                    onClick={loadMoreCategories}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                  >
                    Load More Categories
                  </button>
                </div>
              )}

              {/* Stats */}
              {totalEvents > 0 && (
                <div className="text-center py-8 border-t border-gray-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-500">{totalEvents}</div>
                      <div className="text-sm text-gray-400">Total Events</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-500">{freeEvents}</div>
                      <div className="text-sm text-gray-400">Free Events</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-500">{loadedCategoryCount}</div>
                      <div className="text-sm text-gray-400">of {CITY_CATEGORIES.length} Categories</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-500">📍</div>
                      <div className="text-sm text-gray-400">Near You</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
