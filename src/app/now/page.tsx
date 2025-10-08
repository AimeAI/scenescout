'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { MapPin, Clock, Navigation, Flame, Filter, Map as MapIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateDistance, formatDistance, formatWalkingTime, sortByDistance, walkingTimeToDistance } from '@/lib/location/distanceCalculator'
import { filterByTimeWindow, formatTimeUntil, isHappeningNow, parseEventDateTime } from '@/lib/time/timeUntil'
import { PriceBadge } from '@/components/events/PriceBadge'
import { trackEvent, isTrackingEnabled } from '@/lib/tracking/client'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamically import map to avoid SSR issues
const EventMap = dynamic(() => import('@/components/map/EventMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-800 rounded-lg animate-pulse" />
})

type TimeFilter = 'next-hour' | 'next-3-hours' | 'tonight' | 'weekend'
type DistanceFilter = '5min' | '15min' | '30min' | 'any'

export default function NowPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('next-3-hours')
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('15min')
  const [showMap, setShowMap] = useState(false)

  // Get user location on mount
  useEffect(() => {
    requestLocation()
  }, [])

  // Request user location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLocationLoading(false)
        toast.success('📍 Location updated!', { duration: 2000 })
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError('Unable to get location')
        setLocationLoading(false)
        // Fallback to San Francisco
        setUserLocation({ lat: 37.7749, lng: -122.4194 })
        toast.error('Using default location (SF)', { duration: 3000 })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  // Load all events
  useEffect(() => {
    if (!userLocation) return

    const loadEvents = async () => {
      setLoading(true)
      try {
        const categories = [
          'concert', 'comedy', 'dance', 'theatre', 'art', 'festival',
          'film', 'sports', 'expo', 'tech', 'family', 'jazz', 'club'
        ]

        const promises = categories.map(async (query) => {
          const response = await fetch(
            `/api/search-events?q=${encodeURIComponent(query)}&limit=20&lat=${userLocation.lat}&lng=${userLocation.lng}`
          )
          const data = await response.json()
          return data.success ? data.events || [] : []
        })

        const results = await Promise.all(promises)
        const allEvents = results.flat()

        // Deduplicate by ID
        const unique = allEvents.reduce((acc: any[], event: any) => {
          if (!acc.find(e => e.id === event.id)) {
            acc.push(event)
          }
          return acc
        }, [])

        setEvents(unique)
      } catch (error) {
        console.error('Failed to load events:', error)
        toast.error('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [userLocation])

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    // Filter by time window
    filtered = filterByTimeWindow(filtered, timeFilter)

    // Add distance calculations
    if (userLocation) {
      filtered = filtered.map(event => {
        if (event.lat && event.lng) {
          const distance = calculateDistance(userLocation, {
            lat: event.lat,
            lng: event.lng
          })
          return { ...event, distance }
        }
        return event
      })

      // Filter by distance
      if (distanceFilter !== 'any') {
        const maxDistance = walkingTimeToDistance(
          distanceFilter === '5min' ? 5 : distanceFilter === '15min' ? 15 : 30
        )
        filtered = filtered.filter(e => e.distance !== undefined && e.distance <= maxDistance)
      }

      // Sort by distance (closest first)
      filtered = sortByDistance(filtered, userLocation)
    }

    return filtered
  }, [events, timeFilter, distanceFilter, userLocation])

  const handleEventClick = (event: any) => {
    if (isTrackingEnabled()) {
      trackEvent('click', {
        eventId: event.id,
        category: event.category || 'unknown',
        price: event.price_min,
        venue: event.venue_name
      })
    }

    // Store event in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`event_${event.id}`, JSON.stringify(event))
    }

    router.push(`/events/${event.id}`)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-orange-600 via-red-600 to-red-700 py-12 px-8">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <div className="flex items-center gap-3 mb-4">
              <Flame className="w-10 h-10 text-white animate-pulse" />
              <h1 className="text-5xl font-bold text-white">Happening Now</h1>
            </div>

            <p className="text-white/90 text-lg mb-6">
              Find something spontaneous near you
            </p>

            {/* Location Update Button */}
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="flex items-center gap-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-4 rounded-xl transition-all duration-200 border border-white/30 disabled:opacity-50"
            >
              {locationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Getting your location...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">
                      {userLocation ? 'Update Location' : 'Enable Location'}
                    </div>
                    <div className="text-sm text-white/70">
                      {locationError
                        ? locationError
                        : userLocation
                        ? 'Location set'
                        : 'Permission required'}
                    </div>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 py-4 px-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Time Filters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">When</span>
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'next-hour', label: 'Next Hour', emoji: '⚡' },
                  { id: 'next-3-hours', label: 'Next 3 Hours', emoji: '🕐' },
                  { id: 'tonight', label: 'Tonight', emoji: '🌙' },
                  { id: 'weekend', label: 'This Weekend', emoji: '🎉' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setTimeFilter(filter.id as TimeFilter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      timeFilter === filter.id
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {filter.emoji} {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance + Map Toggle */}
            <div className="flex items-start justify-between gap-4">
              {/* Distance Filters */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">Distance</span>
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {[
                    { id: '5min', label: '5 min walk' },
                    { id: '15min', label: '15 min walk' },
                    { id: '30min', label: '30 min walk' },
                    { id: 'any', label: 'Any distance' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setDistanceFilter(filter.id as DistanceFilter)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        distanceFilter === filter.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Toggle */}
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showMap
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                {showMap ? 'List' : 'Map'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="px-8 py-4 bg-gray-900/50">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-gray-400">
              {loading ? (
                'Loading events...'
              ) : (
                <>
                  <span className="font-semibold text-white">{filteredEvents.length}</span> events found
                  {userLocation && distanceFilter !== 'any' && (
                    <span> within {distanceFilter === '5min' ? '5' : distanceFilter === '15min' ? '15' : '30'} min walk</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Map View */}
        <AnimatePresence>
          {showMap && userLocation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-8"
            >
              <div className="max-w-7xl mx-auto mb-6">
                <EventMap
                  events={filteredEvents}
                  userLocation={userLocation}
                  onEventClick={handleEventClick}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event List */}
        <div className="px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-xl">Finding events near you...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              // Empty State
              <div className="text-center py-20">
                <Flame className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-4">No events happening right now</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Try expanding your distance or time range to find more events
                </p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setDistanceFilter('any')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                  >
                    Show all distances
                  </button>

                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Browse all events →
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredEvents.map((event, index) => {
                    const eventDateTime = parseEventDateTime(
                      event.date || event.start_date,
                      event.time || event.start_time
                    )

                    const happeningNow = eventDateTime && isHappeningNow(eventDateTime)

                    return (
                      <motion.div
                        key={event.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleEventClick(event)}
                        className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 transition-all cursor-pointer group"
                      >
                        <div className="flex gap-4 p-4">
                          {/* Event Image */}
                          <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 relative">
                              {event.image_url ? (
                                <img
                                  src={event.image_url}
                                  alt={event.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                  🔥
                                </div>
                              )}

                              {/* Happening NOW badge */}
                              {happeningNow && (
                                <div className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse">
                                  NOW
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-orange-400 transition-colors">
                              {event.title}
                            </h3>

                            <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-2">
                              {/* Distance */}
                              {event.distance !== undefined && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span className="font-medium text-orange-400">
                                    {formatDistance(event.distance)}
                                  </span>
                                  <span className="text-gray-500">·</span>
                                  <span>{formatWalkingTime(event.distance)}</span>
                                </div>
                              )}

                              {/* Time */}
                              {eventDateTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium text-white">
                                    {formatTimeUntil(eventDateTime)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <PriceBadge event={event} size="sm" showTooltip={false} />

                              {event.venue_name && (
                                <span className="text-xs text-gray-500 truncate">
                                  at {event.venue_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
