interface Location {
  latitude: number
  longitude: number
  accuracy?: number
  city?: string
  state?: string
  country?: string
}

interface LocationError {
  code: number
  message: string
}

const DEFAULT_LOCATION: Location = {
  latitude: 43.6532,
  longitude: -79.3832,
  city: 'Toronto',
  state: 'ON',
  country: 'Canada'
}

class LocationService {
  private currentLocation: Location | null = null
  private locationPromise: Promise<Location> | null = null

  async getCurrentLocation(forceRefresh = false): Promise<Location> {
    // Return cached location if available and not forcing refresh
    if (this.currentLocation && !forceRefresh) {
      return this.currentLocation
    }

    // Return existing promise if already fetching
    if (this.locationPromise && !forceRefresh) {
      return this.locationPromise
    }

    this.locationPromise = new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported, using default location')
        this.currentLocation = DEFAULT_LOCATION
        resolve(DEFAULT_LOCATION)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }

          // Try to get city information via reverse geocoding
          try {
            const cityInfo = await this.reverseGeocode(location.latitude, location.longitude)
            location.city = cityInfo.city
            location.state = cityInfo.state
            location.country = cityInfo.country
          } catch (error) {
            console.warn('Failed to get city info:', error)
          }

          this.currentLocation = location
          resolve(location)
        },
        (error) => {
          console.error('Geolocation error:', error)
          this.currentLocation = DEFAULT_LOCATION
          resolve(DEFAULT_LOCATION)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })

    return this.locationPromise
  }

  async reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string; country: string }> {
    try {
      // Using OpenStreetMap Nominatim for reverse geocoding (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        {
          headers: {
            'User-Agent': 'SceneScout/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Reverse geocoding failed')
      }

      const data = await response.json()
      
      return {
        city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
        state: data.address?.state || data.address?.province || 'Unknown',
        country: data.address?.country || 'Unknown'
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return {
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown'
      }
    }
  }

  getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  async getLocationPermissionStatus(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return 'prompt'
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      return result.state
    } catch {
      return 'prompt'
    }
  }

  clearCache(): void {
    this.currentLocation = null
    this.locationPromise = null
  }
}

export const locationService = new LocationService()
export type { Location, LocationError }