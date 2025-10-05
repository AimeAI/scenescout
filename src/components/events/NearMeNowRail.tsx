'use client'

import { useState, useEffect, useMemo } from 'react'
import { EventCard } from './EventCard'
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
import { MapPin, Navigation, RefreshCw } from 'lucide-react'

interface NearMeNowRailProps {
  events: any[]
  className?: string
}

export function NearMeNowRail({ events, className = '' }: NearMeNowRailProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Check for stored location on mount, or request new location
  useEffect(() => {
    const initLocation = async () => {
      const stored = getStoredLocation()
      if (stored) {
        setUserLocation(stored)
      } else if (isGeolocationSupported()) {
        // Auto-request location on first load
        const result = await requestUserLocation()
        if (result.success) {
          setUserLocation(result.location)
        }
      }
    }
    initLocation()
  }, [])

  // Filter events happening today or within next 24 hours
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    return events.filter(event => {
      if (!event.start_date && !event.date) return false

      const eventDate = event.start_date || event.date
      const eventStart = new Date(eventDate)

      // Event must start within the next 24 hours
      return eventStart >= now && eventStart <= tomorrow
    })
  }, [events])

  // Add distance to events and sort
  const nearbyEvents = useMemo(() => {
    if (!userLocation) return []

    console.log(`📍 Near Me Now: Checking ${upcomingEvents.length} upcoming events`)

    // Add distance to each event
    const eventsWithDistance = upcomingEvents
      .map(event => addDistanceToEvent(event, userLocation))
      .filter(event => {
        const hasDistance = event.distance !== undefined
        if (!hasDistance) {
          console.log(`❌ No distance for event: ${event.title} (lat: ${event.latitude}, lng: ${event.longitude})`)
        }
        return hasDistance
      })

    console.log(`📏 Events with distance: ${eventsWithDistance.length}`)

    // Filter to events within 10 miles
    const nearby = filterByRadius(eventsWithDistance, 10)
    console.log(`📍 Events within 10 miles: ${nearby.length}`)

    // Sort by distance (closest first)
    return sortByDistance(nearby)
  }, [upcomingEvents, userLocation])

  // Request location
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
    } else {
      setError(result.error)
      if (result.error.includes('denied')) {
        setPermissionDenied(true)
      }
    }

    setLoading(false)
  }

  // Don't show rail if no upcoming events
  if (upcomingEvents.length === 0) {
    return null
  }

  // Show location permission request if no location
  if (!userLocation) {
    return (
      <div className={`${className}`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">📍 Near Me Today</h2>
          <p className="text-white/60 text-sm">
            Events happening today within 10 miles
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-semibold mb-2">Enable Location</h3>
          <p className="text-white/60 mb-4">
            Allow location access to discover events happening near you right now
          </p>

          {error && !permissionDenied && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          {permissionDenied && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 text-sm">
                Location access was denied. To enable:
                <br />
                1. Click the 🔒 icon in your browser's address bar
                <br />
                2. Allow location permissions for this site
                <br />
                3. Refresh the page
              </p>
            </div>
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
      </div>
    )
  }

  // Show message if no nearby events
  if (nearbyEvents.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">📍 Near Me Now</h2>
            <p className="text-white/60 text-sm">
              Events happening within 3 hours near you
            </p>
          </div>

          <button
            onClick={handleRequestLocation}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Update Location
          </button>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-white/60">
            No events found within 10 miles today.
            <br />
            <span className="text-sm">Try checking back later or browse all events below.</span>
          </p>
        </div>
      </div>
    )
  }

  // Determine if any event is happening now (within 30 min)
  const now = new Date()
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000)

  return (
    <div id="near-me-now-rail" className={`${className}`}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">📍 Near Me Today</h2>
          <p className="text-white/60 text-sm">
            {nearbyEvents.length} {nearbyEvents.length === 1 ? 'event' : 'events'} within 10 miles today
          </p>
        </div>

        <button
          onClick={handleRequestLocation}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Update
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-4 min-w-max">
          {nearbyEvents.map((event) => {
            const eventStart = new Date(event.start_date)
            const isHappeningNow = eventStart >= now && eventStart <= thirtyMinutesLater

            return (
              <div key={event.id} className="relative w-[280px] flex-shrink-0">
                {isHappeningNow && (
                  <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    HAPPENING NOW
                  </div>
                )}
                {event.distanceFormatted && (
                  <div className="absolute top-2 right-2 z-10 bg-purple-600/90 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                    📍 {event.distanceFormatted}
                  </div>
                )}
                <EventCard event={event} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
