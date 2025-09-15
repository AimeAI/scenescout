import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { locationService, type Location } from '@/services/location.service'
import { useNearbyEvents, useFeaturedEvents } from '@/hooks/useEvents'
import { eventKeys } from '@/hooks/useEvents'

export function useLocationEvents() {
  const [location, setLocation] = useState<Location | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(true)

  // Get user location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        setIsGettingLocation(true)
        const userLocation = await locationService.getCurrentLocation()
        setLocation(userLocation)
        setLocationError(null)
      } catch (error) {
        console.error('Failed to get location:', error)
        setLocationError('Unable to get your location')
        // Use default location (Toronto)
        setLocation({
          latitude: 43.6532,
          longitude: -79.3832,
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        })
      } finally {
        setIsGettingLocation(false)
      }
    }

    getUserLocation()
  }, [])

  // Get nearby events based on user location
  const nearbyEventsQuery = useNearbyEvents(
    location?.latitude,
    location?.longitude,
    50 // 50km radius
  )

  // Get featured events (still useful for global highlights)
  const featuredEventsQuery = useFeaturedEvents(5)

  // Location-aware featured events (prioritize nearby if available)
  const locationFeaturedEvents = nearbyEventsQuery.data?.slice(0, 5) || featuredEventsQuery.data || []

  return {
    location,
    locationError,
    isGettingLocation,
    nearbyEvents: nearbyEventsQuery.data || [],
    featuredEvents: locationFeaturedEvents,
    isLoadingNearby: nearbyEventsQuery.isLoading,
    isLoadingFeatured: featuredEventsQuery.isLoading,
    nearbyError: nearbyEventsQuery.error,
    featuredError: featuredEventsQuery.error,
    refetchLocation: () => {
      setIsGettingLocation(true)
      locationService.clearCache()
      locationService.getCurrentLocation().then(setLocation).finally(() => setIsGettingLocation(false))
    }
  }
}

// Hook for category-based nearby events
export function useLocationCategoryEvents(category: string, limit = 20) {
  const [location, setLocation] = useState<Location | null>(null)

  useEffect(() => {
    locationService.getCurrentLocation().then(setLocation)
  }, [])

  return useQuery({
    queryKey: [...eventKeys.nearby(location?.latitude!, location?.longitude!), category, limit],
    queryFn: async () => {
      if (!location) return []
      
      // This would ideally call a backend RPC that filters by category AND location
      // For now, we'll enhance the events service to support this
      const { eventsService } = await import('@/services/events.service')
      return eventsService.getEvents({
        categories: category === 'all' ? undefined : [category as any],
        limit,
        // Add location-based sorting when backend supports it
      })
    },
    enabled: !!location && !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to get events within user's vicinity with automatic location detection
export function useLocalEvents(radiusKm = 50) {
  const [location, setLocation] = useState<Location | null>(null)

  useEffect(() => {
    locationService.getCurrentLocation().then(setLocation)
  }, [])

  return useQuery({
    queryKey: ['local-events', location?.latitude, location?.longitude, radiusKm],
    queryFn: async () => {
      if (!location) return []
      
      const { eventsService } = await import('@/services/events.service')
      
      // Get all events and filter by distance client-side for now
      // TODO: Implement proper geo-queries in backend
      const allEvents = await eventsService.getEvents({ limit: 200 })
      
      return allEvents.filter(event => {
        if (!event.latitude || !event.longitude) return false
        
        const distance = locationService.getDistanceKm(
          location.latitude,
          location.longitude,
          event.latitude,
          event.longitude
        )
        
        return distance <= radiusKm
      }).sort((a, b) => {
        // Sort by distance and then by hotness
        const distanceA = locationService.getDistanceKm(location.latitude, location.longitude, a.latitude!, a.longitude!)
        const distanceB = locationService.getDistanceKm(location.latitude, location.longitude, b.latitude!, b.longitude!)
        
        // If distances are similar (within 5km), sort by hotness score
        if (Math.abs(distanceA - distanceB) < 5) {
          return (b.hotness_score || 0) - (a.hotness_score || 0)
        }
        
        return distanceA - distanceB
      }).slice(0, 50) // Limit to top 50 events
    },
    enabled: !!location,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}