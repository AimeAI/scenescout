'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { NetflixCarousel } from '@/components/NetflixCarousel'

export default function DiscoverPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrendingEvents()
  }, [])

  const loadTrendingEvents = async () => {
    try {
      // Search for multiple trending topics
      const trendingQueries = [
        'concerts tonight',
        'halloween parties',
        'food festivals',
        'tech events',
        'art exhibitions'
      ]

      const allEvents = []
      
      for (const query of trendingQueries) {
        try {
          const response = await fetch(`/api/search-live?q=${encodeURIComponent(query)}`)
          const data = await response.json()
          
          if (data.success && data.events) {
            // Take top 5 events from each category
            allEvents.push(...data.events.slice(0, 5))
          }
        } catch (error) {
          console.error(`Failed to load ${query}:`, error)
        }
      }

      // Remove duplicates and sort by popularity/price
      const uniqueEvents = removeDuplicates(allEvents)
      const trendingEvents = uniqueEvents
        .sort((a, b) => {
          // Prioritize paid events and known venues
          const aScore = (a.price_min > 0 ? 10 : 0) + (isKnownVenue(a.venue_name) ? 5 : 0)
          const bScore = (b.price_min > 0 ? 10 : 0) + (isKnownVenue(b.venue_name) ? 5 : 0)
          return bScore - aScore
        })
        .slice(0, 20) // Top 20 trending events

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
    if (event.external_url) {
      window.open(event.external_url, '_blank')
    }
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
              We couldn't find any trending events right now. Try refreshing or search manually.
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
