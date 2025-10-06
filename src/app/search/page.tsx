'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { EventCard } from '@/components/events/EventCard'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)
    setEvents([])
    setError(null)

    try {
      const response = await fetch(`/api/search-events?q=${encodeURIComponent(searchQuery)}&limit=50`)
      const data = await response.json()

      if (data.success && data.events) {
        setEvents(data.events)
        console.log(`✅ Found ${data.events.length} events for "${searchQuery}"`)
      } else {
        setEvents([])
        console.log('❌ No events found')
      }
    } catch (err) {
      console.error('Search failed:', err)
      setError('Search failed. Please try again.')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-search if query param exists
  useEffect(() => {
    if (initialQuery) {
      handleSearch()
    }
  }, [initialQuery])

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-6">
        {/* Header */}
        <div className="mb-8 max-w-4xl mx-auto">
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <h1 className="text-3xl font-bold mb-4">Search Events</h1>

          {/* Search Bar */}
          <div className="flex gap-4">
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
              placeholder="Search for concerts, comedy, sports, food..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !searchQuery.trim()}
              className="px-6"
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Searching for "{searchQuery}"...</p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && hasSearched && events.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <p className="text-gray-400 mb-6">
              Found {events.length} events for "{searchQuery}"
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => {
                    // Store event in sessionStorage for detail page
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem(`event_${event.id}`, JSON.stringify(event))
                    }
                    router.push(`/events/${event.id}`)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">Search Error</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={handleSearch}>Retry Search</Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && hasSearched && events.length === 0 && (
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
            <p className="text-gray-400 mb-6">
              No events found for "{searchQuery}". Try different keywords or check back later.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Browse All Events
            </Button>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && !loading && (
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Search for Events</h3>
            <p className="text-gray-400">
              Enter keywords to find concerts, comedy shows, sports events, and more.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
