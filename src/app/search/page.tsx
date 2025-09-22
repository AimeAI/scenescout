'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { NetflixCarousel } from '@/components/NetflixCarousel'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const handleSearch = async (isLoadMore = false) => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    if (!isLoadMore) {
      setHasSearched(true)
      setEvents([])
    }
    
    try {
      const offset = isLoadMore ? events.length : 0
      const url = `/api/search-live?q=${encodeURIComponent(searchQuery)}&time=${timeFilter}&limit=20&offset=${offset}`
      
      console.log(`🔍 Live searching for: "${searchQuery}" (time: ${timeFilter}, offset: ${offset})`)
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        if (isLoadMore) {
          setEvents(prev => [...prev, ...data.events])
        } else {
          setEvents(data.events)
        }
        setHasMore(data.hasMore || false)
        setTotalCount(data.totalCount || data.count)
        console.log(`✅ Found ${data.totalCount || data.count} total events, loaded ${data.events.length} new`)
      } else {
        if (!isLoadMore) {
          setEvents([])
          setHasMore(false)
          setTotalCount(0)
        }
        console.log('❌ No events found')
      }
    } catch (error) {
      console.error('Search failed:', error)
      if (!isLoadMore) {
        setEvents([])
        setHasMore(false)
        setTotalCount(0)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      handleSearch(true)
    }
  }

  const handleEventClick = (event) => {
    if (event.external_url) {
      window.open(event.external_url, '_blank')
    }
  }

  const handleTimeFilterChange = (newTimeFilter) => {
    setTimeFilter(newTimeFilter)
    if (searchQuery.trim()) {
      // Re-search with new time filter
      setTimeout(() => handleSearch(), 100)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">🔍 Live Event Discovery</h1>
          <p className="text-gray-400 mb-6">
            Search for events with accurate dates, venues, and pricing. Filter by time and load unlimited results.
          </p>
          
          {/* Search Bar */}
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              placeholder="Search for events... (e.g. 'halloween haunted houses', 'concerts', 'tech meetups')"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Live'}
            </button>
          </div>

          {/* Time Filters */}
          <div className="flex gap-2 mb-4">
            <span className="text-sm text-gray-400 py-2">When:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => handleTimeFilterChange(filter.id)}
                className={`px-3 py-1 rounded text-sm transition ${
                  timeFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Quick Search Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['halloween haunted houses', 'concerts tonight', 'tech meetups', 'food festivals', 'art exhibitions'].map(term => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term)
                  setTimeout(() => handleSearch(), 100)
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-lg">🔍 Scraping live events with accurate data...</p>
            <p className="text-sm text-gray-400 mt-2">Finding relevant events and extracting real details</p>
          </div>
        )}

        {/* Results with Netflix Carousel */}
        {!loading && hasSearched && events.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Found {totalCount} Events for "{searchQuery}"
              </h2>
              <p className="text-gray-400">
                Showing {events.length} of {totalCount} events • Real data with accurate dates and venues
              </p>
            </div>

            <NetflixCarousel 
              events={events} 
              onEventClick={handleEventClick}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              loading={loading}
            />
          </div>
        )}

        {/* No Results */}
        {!loading && hasSearched && events.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
            <p className="text-gray-400 mb-4">
              No events found for "{searchQuery}" {timeFilter !== 'all' && `in the selected time period`}.
            </p>
            <div className="text-sm text-gray-500">
              <p>Try:</p>
              <p>• Different search terms (e.g., "concerts", "halloween", "food")</p>
              <p>• Changing the time filter to "All Time"</p>
              <p>• More general keywords</p>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && !loading && (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Enhanced Event Discovery</h3>
            <p className="text-gray-400 mb-4">
              Search for events with unlimited results, time filtering, and Netflix-style browsing
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto text-sm text-gray-500">
              <div>✅ Unlimited results</div>
              <div>✅ Time filtering</div>
              <div>✅ Real event images</div>
              <div>✅ Accurate data</div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
