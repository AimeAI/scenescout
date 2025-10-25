'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Navigation, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { EventCard } from '@/components/events/EventCard'
import { EmptyState, EMPTY_STATE_VARIANTS } from '@/components/empty-states'
import { EventCardSkeletonGrid } from '@/components/skeletons'
import {
  requestUserLocation,
  getStoredLocation,
  isGeolocationSupported,
  type UserLocation
} from '@/lib/location/geolocation'
import {
  addDistanceToEvent,
  sortByDistance,
  filterByRadius
} from '@/lib/location/distance'

const CATEGORIES = [
  // Music & Entertainment
  { id: 'music', label: '🎵 Music', query: 'music' },
  { id: 'concert', label: '🎸 Concerts', query: 'concert' },
  { id: 'nightlife', label: '🌃 Nightlife', query: 'nightlife' },
  { id: 'dj', label: '🎧 DJ Sets', query: 'dj' },
  { id: 'rock', label: '🎸 Rock', query: 'rock' },
  { id: 'jazz', label: '🎺 Jazz', query: 'jazz' },
  { id: 'hiphop', label: '🎤 Hip Hop', query: 'hip hop' },
  { id: 'electronic', label: '🎹 Electronic', query: 'electronic' },
  { id: 'classical', label: '🎻 Classical', query: 'classical' },
  { id: 'country', label: '🤠 Country', query: 'country' },

  // Performing Arts
  { id: 'comedy', label: '😂 Comedy', query: 'comedy' },
  { id: 'theater', label: '🎭 Theater', query: 'theater' },
  { id: 'dance', label: '💃 Dance', query: 'dance' },
  { id: 'ballet', label: '🩰 Ballet', query: 'ballet' },
  { id: 'opera', label: '🎭 Opera', query: 'opera' },
  { id: 'musical', label: '🎵 Musical', query: 'musical' },

  // Sports
  { id: 'sports', label: '⚽ Sports', query: 'sports' },
  { id: 'basketball', label: '🏀 Basketball', query: 'basketball' },
  { id: 'hockey', label: '🏒 Hockey', query: 'hockey' },
  { id: 'baseball', label: '⚾ Baseball', query: 'baseball' },
  { id: 'soccer', label: '⚽ Soccer', query: 'soccer' },
  { id: 'football', label: '🏈 Football', query: 'football' },

  // Arts & Culture
  { id: 'art', label: '🎨 Art', query: 'art' },
  { id: 'gallery', label: '🖼️ Gallery', query: 'gallery' },
  { id: 'exhibition', label: '🏛️ Exhibition', query: 'exhibition' },
  { id: 'museum', label: '🏛️ Museum', query: 'museum' },

  // Food & Drink
  { id: 'food', label: '🍽️ Food', query: 'food' },
  { id: 'wine', label: '🍷 Wine Tasting', query: 'wine tasting' },
  { id: 'beer', label: '🍺 Beer', query: 'beer festival' },
  { id: 'brunch', label: '🥞 Brunch', query: 'brunch' },

  // Events & Festivals
  { id: 'festival', label: '🎉 Festivals', query: 'festival' },
  { id: 'fair', label: '🎡 Fair', query: 'fair' },
  { id: 'market', label: '🛍️ Market', query: 'market' },
  { id: 'carnival', label: '🎠 Carnival', query: 'carnival' },

  // Special Interest
  { id: 'film', label: '🎬 Film', query: 'film' },
  { id: 'family', label: '👨‍👩‍👧‍👦 Family', query: 'family' },
  { id: 'kids', label: '👶 Kids', query: 'kids' },
  { id: 'educational', label: '📚 Educational', query: 'educational' },
  { id: 'networking', label: '🤝 Networking', query: 'networking' },
  { id: 'business', label: '💼 Business', query: 'business' },
  { id: 'tech', label: '💻 Tech', query: 'tech' },
  { id: 'gaming', label: '🎮 Gaming', query: 'gaming' },
  { id: 'anime', label: '🎌 Anime', query: 'anime' },
  { id: 'convention', label: '🎪 Convention', query: 'convention' },
]

export default function NearMePage() {
  const router = useRouter()
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [radius, setRadius] = useState(10) // Default 10 miles
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('today')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    CATEGORIES.map(cat => cat.id) // All selected by default
  )

  // Request location on mount
  useEffect(() => {
    const initLocation = async () => {
      console.log('🌍 Near Me page: Initializing location...')

      const stored = getStoredLocation()
      if (stored) {
        console.log('✅ Using stored location:', stored)
        setUserLocation(stored)
        fetchNearbyEvents(stored)
      } else if (isGeolocationSupported()) {
        console.log('📍 Requesting new location...')
        const result = await requestUserLocation()
        if (result.success) {
          console.log('✅ Location acquired:', result.location)
          setUserLocation(result.location)
          fetchNearbyEvents(result.location)
        } else {
          console.error('❌ Location request failed:', result.error)
          setError(result.error)
          if (result.error.includes('denied')) {
            setPermissionDenied(true)
          }
        }
      } else {
        console.error('❌ Geolocation not supported')
        setError('Geolocation is not supported by your browser')
      }
    }
    initLocation()
  }, [])

  const fetchNearbyEvents = async (location: UserLocation) => {
    setLoading(true)
    setError(null)

    try {
      console.log(`🔍 Fetching events within ${radius} miles of (${location.latitude}, ${location.longitude})`)

      // Build date range for API (use local timezone)
      const now = new Date()

      // Get today in local timezone (not UTC)
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const startDate = `${year}-${month}-${day}`

      let endDate = ''
      if (timeFilter === 'today') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowYear = tomorrow.getFullYear()
        const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0')
        const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0')
        endDate = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`
      } else if (timeFilter === 'week') {
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        const weekYear = nextWeek.getFullYear()
        const weekMonth = String(nextWeek.getMonth() + 1).padStart(2, '0')
        const weekDay = String(nextWeek.getDate()).padStart(2, '0')
        endDate = `${weekYear}-${weekMonth}-${weekDay}`
      }

      console.log(`📅 Fetching with date range: ${startDate} to ${endDate || 'all'} (local timezone)`)

      // Only fetch selected categories
      const categoriesToFetch = CATEGORIES
        .filter(cat => selectedCategories.includes(cat.id))
        .map(cat => cat.query)

      console.log(`🏷️ Searching categories: ${categoriesToFetch.join(', ')}`)

      const allEvents: any[] = []

      for (const category of categoriesToFetch) {
        try {
          const params = new URLSearchParams({
            q: category,
            limit: '100',
            lat: location.latitude.toString(),
            lng: location.longitude.toString(),
          })

          if (endDate) {
            params.append('startDate', startDate)
            params.append('endDate', endDate)
          }

          const response = await fetch(`/api/search-events?${params.toString()}`)
          const data = await response.json()

          if (data.success && data.events) {
            allEvents.push(...data.events)
            console.log(`✅ ${category}: ${data.events.length} events`)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch ${category} events:`, error)
        }
      }

      console.log(`📦 Total events fetched: ${allEvents.length}`)

      // Dedupe events by ID
      const uniqueEvents = Array.from(
        new Map(allEvents.map(event => [event.id, event])).values()
      )

      console.log(`🔄 After deduplication: ${uniqueEvents.length} events`)

      // Filter out events from yesterday (strict date check)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const todayOrFutureEvents = uniqueEvents.filter(event => {
        const eventDate = event.start_date || event.date
        if (!eventDate) {
          console.log(`⚠️ Event without date: ${event.title}`)
          return true // Keep events without dates
        }

        const eventStart = new Date(eventDate)
        const isPast = eventStart < todayStart

        if (isPast) {
          console.log(`❌ Filtering past event: ${event.title} (${eventDate})`)
        }

        return !isPast
      })

      console.log(`📅 After filtering past events: ${todayOrFutureEvents.length} events (removed ${uniqueEvents.length - todayOrFutureEvents.length} from yesterday)`)

      // Add distance and filter by radius
      const eventsWithDistance = todayOrFutureEvents
        .map(event => addDistanceToEvent(event, location))
        .filter(event => {
          const hasDistance = event.distance !== undefined
          if (!hasDistance) {
            console.log(`❌ No coordinates for: ${event.title}`)
          }
          return hasDistance
        })

      console.log(`📏 Events with coordinates: ${eventsWithDistance.length}`)

      // Log distance distribution
      if (eventsWithDistance.length > 0) {
        const distances = eventsWithDistance.map(e => e.distance).sort((a, b) => a! - b!)
        console.log(`📊 Distance range: ${distances[0]?.toFixed(1)} to ${distances[distances.length - 1]?.toFixed(1)} miles`)
        console.log(`📊 Closest 5 events:`, eventsWithDistance.slice(0, 5).map(e => `${e.title}: ${e.distanceFormatted}`))
      }

      const nearby = filterByRadius(eventsWithDistance, radius)
      console.log(`📍 Events within ${radius} miles: ${nearby.length}`)

      const sorted = sortByDistance(nearby)

      setEvents(sorted)
    } catch (err: any) {
      console.error('Error fetching nearby events:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch when radius, time filter, or categories change
  useEffect(() => {
    if (userLocation) {
      fetchNearbyEvents(userLocation)
    }
  }, [radius, timeFilter, selectedCategories])

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Don't allow deselecting all categories
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(id => id !== categoryId))
      }
    } else {
      setSelectedCategories([...selectedCategories, categoryId])
    }
  }

  const selectAllCategories = () => {
    setSelectedCategories(CATEGORIES.map(cat => cat.id))
  }

  const clearAllCategories = () => {
    setSelectedCategories([CATEGORIES[0].id]) // Keep at least one
  }

  const handleRequestLocation = async () => {
    if (!isGeolocationSupported()) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoading(true)
    setError(null)
    setPermissionDenied(false)

    const result = await requestUserLocation({ force: true })

    if (result.success) {
      setUserLocation(result.location)
      fetchNearbyEvents(result.location)
    } else {
      setError(result.error)
      if (result.error.includes('denied')) {
        setPermissionDenied(true)
      }
      setLoading(false)
    }
  }

  // Show location permission request if no location
  if (!userLocation) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back()
            } else {
              router.replace('/')
            }
          }}
          className="mb-6 text-sm text-zinc-300 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">📍 Near Me Today</h1>
          <p className="text-white/60 mb-8">
            Discover events happening within 10 miles of your location today
          </p>

          {permissionDenied ? (
            <EmptyState
              {...EMPTY_STATE_VARIANTS.locationDenied}
              action={{
                label: loading ? 'Getting location...' : 'Try Again',
                onClick: handleRequestLocation,
                variant: 'default'
              }}
              secondaryAction={{
                label: 'Browse All Events',
                onClick: () => router.push('/'),
                variant: 'outline'
              }}
            />
          ) : !isGeolocationSupported() ? (
            <EmptyState
              {...EMPTY_STATE_VARIANTS.locationUnavailable}
              action={{
                label: 'Select City Manually',
                onClick: () => router.push('/'),
                variant: 'default'
              }}
            />
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-xl font-semibold mb-2">Enable Location</h3>
              <p className="text-white/60 mb-4">
                Allow location access to discover events near you
              </p>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handleRequestLocation}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                <Navigation className="w-5 h-5" />
                {loading ? 'Getting location...' : 'Enable Location'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
              } else {
                router.replace('/')
              }
            }}
            className="text-sm text-zinc-300 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleRequestLocation}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Update Location
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">📍 Near Me</h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Distance Radius */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/60">Distance:</label>
              <div className="flex gap-2">
                {[5, 10, 25, 50].map((miles) => (
                  <button
                    key={miles}
                    onClick={() => setRadius(miles)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      radius === miles
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {miles} mi
                  </button>
                ))}
              </div>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/60">When:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeFilter('today')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    timeFilter === 'today'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeFilter('week')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    timeFilter === 'week'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTimeFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    timeFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/60">Categories:</label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllCategories}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedCategories.includes(category.id)
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-white/60">
            {loading
              ? 'Searching for events near you...'
              : `${events.length} ${events.length === 1 ? 'event' : 'events'} within ${radius} miles`}
          </p>
        </div>

        {loading ? (
          <EventCardSkeletonGrid count={9} />
        ) : events.length === 0 ? (
          <EmptyState
            {...EMPTY_STATE_VARIANTS.noNearbyEvents}
            description={`No events found within ${radius} miles ${timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'this week' : ''}.`}
            action={{
              label: 'Increase Radius',
              onClick: () => setRadius(radius === 50 ? 50 : radius === 25 ? 50 : radius === 10 ? 25 : 50),
              variant: 'default'
            }}
            secondaryAction={{
              label: 'Browse All Events',
              onClick: () => router.push('/'),
              variant: 'outline'
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="relative">
                {event.distanceFormatted && (
                  <div className="absolute top-2 right-2 z-10 bg-purple-600/90 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                    📍 {event.distanceFormatted}
                  </div>
                )}
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
