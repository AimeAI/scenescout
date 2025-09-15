import { useState, useEffect } from 'react'
import { locationService } from '@/services/location.service'

interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  city?: string
}

export function useLocationService() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const locationData = await locationService.getCurrentLocation()
        setLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        })
      } catch (err) {
        console.error('Failed to get location:', err)
        setError('Failed to get location')
        
        // Fallback to default location (Toronto)
        setLocation({
          latitude: 43.6532,
          longitude: -79.3832,
          city: 'Toronto'
        })
      } finally {
        setIsLoading(false)
      }
    }

    getCurrentLocation()
  }, [])

  return {
    location,
    isLoading,
    error,
    refetch: () => {
      setLocation(null)
      setIsLoading(true)
      setError(null)
    }
  }
}