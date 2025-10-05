/**
 * Geolocation utilities for "Near Me Now" feature
 * Handles permission requests, location detection, and storage
 */

export interface UserLocation {
  latitude: number
  longitude: number
  timestamp: number
  accuracy?: number
}

export type GeolocationPermission = 'granted' | 'denied' | 'prompt'

const LOCATION_STORAGE_KEY = 'user_location'
const PERMISSION_ASKED_KEY = 'geolocation_permission_asked'

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return typeof window !== 'undefined' && 'geolocation' in navigator
}

/**
 * Get current geolocation permission state
 */
export async function getGeolocationPermission(): Promise<GeolocationPermission> {
  if (!isGeolocationSupported()) return 'denied'

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result.state as GeolocationPermission
  } catch {
    // Fallback for browsers that don't support permissions API
    return 'prompt'
  }
}

/**
 * Check if user has been asked for permission before
 */
export function hasAskedForPermission(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PERMISSION_ASKED_KEY) === 'true'
}

/**
 * Mark that we've asked for permission
 */
function markPermissionAsked(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PERMISSION_ASKED_KEY, 'true')
}

/**
 * Get stored user location
 */
export function getStoredLocation(): UserLocation | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!stored) return null

    const location = JSON.parse(stored) as UserLocation

    // Check if location is stale (> 1 hour old)
    const ONE_HOUR = 60 * 60 * 1000
    if (Date.now() - location.timestamp > ONE_HOUR) {
      return null
    }

    return location
  } catch {
    return null
  }
}

/**
 * Store user location
 */
function storeLocation(location: UserLocation): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch (error) {
    console.error('Failed to store location:', error)
  }
}

/**
 * Request user location with permission handling
 */
export async function requestUserLocation(
  options: {
    force?: boolean // Force new location request even if cached
    timeout?: number // Timeout in ms (default: 10s)
    enableHighAccuracy?: boolean
  } = {}
): Promise<{ success: true; location: UserLocation } | { success: false; error: string }> {
  if (!isGeolocationSupported()) {
    return {
      success: false,
      error: 'Geolocation not supported by your browser'
    }
  }

  // Return cached location if available and not forced
  if (!options.force) {
    const stored = getStoredLocation()
    if (stored) {
      return { success: true, location: stored }
    }
  }

  // Mark that we've asked for permission
  markPermissionAsked()

  return new Promise((resolve) => {
    const timeoutMs = options.timeout || 10000

    const timeoutId = setTimeout(() => {
      resolve({
        success: false,
        error: 'Location request timed out. Please try again.'
      })
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)

        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy
        }

        storeLocation(location)

        resolve({ success: true, location })
      },
      (error) => {
        clearTimeout(timeoutId)

        let errorMessage = 'Failed to get location'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Enable location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }

        resolve({ success: false, error: errorMessage })
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: timeoutMs,
        maximumAge: 0
      }
    )
  })
}

/**
 * Clear stored location
 */
export function clearStoredLocation(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOCATION_STORAGE_KEY)
}

/**
 * Watch user location changes (useful for real-time tracking)
 */
export function watchUserLocation(
  onLocationUpdate: (location: UserLocation) => void,
  onError?: (error: string) => void
): () => void {
  if (!isGeolocationSupported()) {
    onError?.('Geolocation not supported')
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const location: UserLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now(),
        accuracy: position.coords.accuracy
      }

      storeLocation(location)
      onLocationUpdate(location)
    },
    (error) => {
      let errorMessage = 'Location watch failed'

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable'
          break
        case error.TIMEOUT:
          errorMessage = 'Location timeout'
          break
      }

      onError?.(errorMessage)
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000 // 1 minute
    }
  )

  // Return cleanup function
  return () => {
    navigator.geolocation.clearWatch(watchId)
  }
}
