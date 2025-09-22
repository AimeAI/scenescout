'use client'

import { useState, useEffect } from 'react'
import { NetflixEventCarousel } from '@/components/events/NetflixEventCarousel'
import { RealtorEventMap } from '@/components/events/RealtorEventMap'
import { AppLayout } from '@/components/layout/AppLayout'

export default function EnhancedHomePage() {
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [viewMode, setViewMode] = useState<'carousel' | 'map'>('carousel')
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Location error:', error)
          setLocationError('Unable to get your location')
          // Default to San Francisco
          setUserLocation({ lat: 37.7749, lng: -122.4194 })
        }
      )
    } else {
      setLocationError('Geolocation not supported')
      setUserLocation({ lat: 37.7749, lng: -122.4194 })
    }
  }, [])

  if (!userLocation) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Finding events near you...</h2>
            {locationError && (
              <p className="text-gray-400 text-sm">{locationError} - Using default location</p>
            )}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black">
        {/* View Toggle */}
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

        {/* Content */}
        {viewMode === 'carousel' ? (
          <NetflixEventCarousel userLocation={userLocation} />
        ) : (
          <div className="h-screen">
            <RealtorEventMap userLocation={userLocation} />
          </div>
        )}

        {/* Location indicator */}
        <div className="fixed bottom-4 left-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm border border-gray-700">
          📍 Showing events near {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}
        </div>
      </div>
    </AppLayout>
  )
}
