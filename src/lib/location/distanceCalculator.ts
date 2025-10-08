/**
 * Location utilities for calculating distances and walking times
 */

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(point2.lat - point1.lat)
  const dLng = toRad(point2.lng - point1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Calculate walking time in minutes (assuming 3 mph average)
 */
export function calculateWalkingTime(distanceMiles: number): number {
  const walkingSpeedMph = 3
  const hours = distanceMiles / walkingSpeedMph
  return Math.round(hours * 60)
}

/**
 * Format distance to human-readable string
 */
export function formatDistance(distanceMiles: number): string {
  if (distanceMiles < 0.1) {
    const feet = Math.round(distanceMiles * 5280)
    return `${feet} ft`
  }

  if (distanceMiles < 1) {
    return `${distanceMiles.toFixed(1)} mi`
  }

  return `${distanceMiles.toFixed(1)} mi`
}

/**
 * Format walking time to human-readable string
 */
export function formatWalkingTime(distanceMiles: number): string {
  const minutes = calculateWalkingTime(distanceMiles)

  if (minutes < 1) {
    return 'Less than 1 min walk'
  }

  if (minutes < 60) {
    return `${minutes} min walk`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} hr walk`
  }

  return `${hours}h ${remainingMinutes}m walk`
}

/**
 * Get distance category for filtering
 */
export function getDistanceCategory(
  distanceMiles: number
): '5min' | '15min' | '30min' | 'any' {
  const walkingMinutes = calculateWalkingTime(distanceMiles)

  if (walkingMinutes <= 5) return '5min'
  if (walkingMinutes <= 15) return '15min'
  if (walkingMinutes <= 30) return '30min'
  return 'any'
}

/**
 * Convert walking time to distance in miles
 */
export function walkingTimeToDistance(minutes: number): number {
  const walkingSpeedMph = 3
  return (minutes / 60) * walkingSpeedMph
}

/**
 * Sort events by distance from user location
 */
export function sortByDistance<T extends { lat?: number; lng?: number; distance?: number }>(
  events: T[],
  userLocation: Coordinates | null
): T[] {
  if (!userLocation) {
    // If no user location, return events with distance already calculated first
    return [...events].sort((a, b) => {
      if (a.distance !== undefined && b.distance === undefined) return -1
      if (a.distance === undefined && b.distance !== undefined) return 1
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance
      }
      return 0
    })
  }

  // Calculate distances for events that have coordinates
  const eventsWithDistance = events.map(event => {
    if (event.lat && event.lng) {
      const distance = calculateDistance(userLocation, {
        lat: event.lat,
        lng: event.lng
      })
      return { ...event, distance }
    }
    return event
  })

  // Sort by distance (closest first)
  return eventsWithDistance.sort((a, b) => {
    if (a.distance !== undefined && b.distance === undefined) return -1
    if (a.distance === undefined && b.distance !== undefined) return 1
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance
    }
    return 0
  })
}
