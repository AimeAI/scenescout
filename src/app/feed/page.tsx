'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { NetflixCarousel } from '@/components/NetflixCarousel'
import { getHiddenEventIds } from '@/lib/thumbs'

export default function DiscoverPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [hiddenEvents, setHiddenEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTrendingEvents()

    // Listen for preferences updates
    const handlePreferencesUpdate = () => {
      console.log('🔄 Preferences updated, reloading events...')
      loadTrendingEvents()
    }

    // Reload when page becomes visible (user navigates back from settings)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible, checking for updates...')
        loadTrendingEvents()
      }
    }

    window.addEventListener('preferencesUpdated', handlePreferencesUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Listen for thumbs down events to update hidden events in real-time
  useEffect(() => {
    const handleEventHidden = () => {
      const hidden = getHiddenEventIds()
      setHiddenEvents(hidden)

      // Filter out hidden events from current list
      setEvents(prevEvents => {
        const filtered = prevEvents.filter(event => !hidden.has(event.id))
        console.log(`🗑️ Filtered out hidden events. Before: ${prevEvents.length}, After: ${filtered.length}`)
        return filtered
      })
    }

    window.addEventListener('eventHidden', handleEventHidden)
    return () => window.removeEventListener('eventHidden', handleEventHidden)
  }, [])

  const loadTrendingEvents = async () => {
    try {
      // Get user location
      let userLocation = { lat: 43.6532, lng: -79.3832 } // Default to Toronto

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        } catch (error) {
          console.log('Using default location (Toronto)')
        }
      }

      // Get user's customized search categories from preferences
      const { getEnabledSearchCategories, getUserPreferences } = await import('@/lib/user-preferences')
      const enabledCategories = getEnabledSearchCategories()
      const userPrefs = getUserPreferences()

      console.log(`🎯 Using ${enabledCategories.length} enabled categories from user preferences`)
      console.log('📋 Categories:', enabledCategories.map(c => `${c.name} (${c.query})`).join(', '))

      const allEvents = []

      // Use user's custom categories and queries
      for (const category of enabledCategories) {
        try {
          const limit = category.eventsPerCategory || 5
          const response = await fetch(`/api/search-live?q=${encodeURIComponent(category.query)}&limit=${limit * 2}`)
          const data = await response.json()

          if (data.success && data.events) {
            console.log(`✅ ${category.name} (${category.query}): ${data.events.length} events`)
            allEvents.push(...data.events.slice(0, limit))
          }
        } catch (error) {
          console.error(`❌ ${category.name} failed:`, error)
        }
      }

      // Remove duplicates and sort by popularity/price
      const uniqueEvents = removeDuplicates(allEvents)

      // Get current hidden events (fresh read)
      const currentlyHidden = getHiddenEventIds()
      setHiddenEvents(currentlyHidden)

      // Filter out hidden events (thumbs down)
      const visibleEvents = uniqueEvents.filter(event => !currentlyHidden.has(event.id))

      const trendingEvents = visibleEvents
        .sort((a, b) => {
          // Prioritize paid events and known venues
          const aScore = (a.price_min > 0 ? 10 : 0) + (isKnownVenue(a.venue_name) ? 5 : 0)
          const bScore = (b.price_min > 0 ? 10 : 0) + (isKnownVenue(b.venue_name) ? 5 : 0)
          return bScore - aScore
        })
        .slice(0, userPrefs.totalEventsLimit) // Use user's total limit

      console.log(`✅ Loaded ${trendingEvents.length} events from ${allEvents.length} total (${currentlyHidden.size} hidden)`)
      console.log(`   📊 Source: Live scraper with ${enabledCategories.length} custom categories`)
      console.log(`   ⚙️ User limit: ${userPrefs.totalEventsLimit} events`)
      setEvents(trendingEvents)
    } catch (error) {
      console.error('Failed to load trending events:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeDuplicates = (events) => {
    const seen = new Set()
    return events.filter(event => {
      const key = event.title.toLowerCase().replace(/[^\w]/g, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const isKnownVenue = (venueName) => {
    const knownVenues = [
      'scotiabank arena', 'massey hall', 'phoenix concert theatre',
      'cn tower', 'casa loma', 'roy thomson hall', 'danforth music hall'
    ]
    return knownVenues.some(venue => 
      venueName.toLowerCase().includes(venue)
    )
  }

  const handleEventClick = (event) => {
    // Cache event data in sessionStorage for detail page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`event_${event.id}`, JSON.stringify(event))
    }

    // Navigate to internal event detail page
    window.location.href = `/events/${event.id}`
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">🔥 Discover Trending Events</h1>
          <p className="text-xl text-gray-300 mb-6">
            {loading ? 'Finding the hottest events happening right now...' : 
             `${events.length} trending events curated from multiple sources`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-xl">🔍 Discovering trending events...</p>
            <p className="text-sm text-gray-400 mt-2">Searching concerts, parties, festivals, and more</p>
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-8">
            {/* Trending Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {events.filter(e => e.category === 'music').length}
                </div>
                <div className="text-sm text-gray-400">Music Events</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {events.filter(e => e.price_min === 0).length}
                </div>
                <div className="text-sm text-gray-400">Free Events</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {events.filter(e => e.category === 'social').length}
                </div>
                <div className="text-sm text-gray-400">Social Events</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {events.filter(e => e.price_min > 50).length}
                </div>
                <div className="text-sm text-gray-400">Premium Events</div>
              </div>
            </div>

            {/* Netflix Carousel */}
            <NetflixCarousel 
              events={events} 
              onEventClick={handleEventClick}
            />

            {/* Quick Actions */}
            <div className="mt-12 text-center">
              <h3 className="text-xl font-semibold mb-4">Want More Events?</h3>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => window.location.href = '/search'}
                  className="px-6 py-3 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                >
                  🔍 Search Specific Events
                </button>
                <button
                  onClick={() => loadTrendingEvents()}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  🔄 Refresh Trending
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-semibold mb-2">No Trending Events Found</h3>
            <p className="text-gray-400 mb-6">
              We couldn&apos;t find any trending events right now. Try refreshing or search manually.
            </p>
            <button
              onClick={() => window.location.href = '/search'}
              className="px-6 py-3 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              🔍 Search Events Manually
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
