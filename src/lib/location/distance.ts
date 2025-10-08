/**
 * Distance calculation utilities using Haversine formula
 * Calculates great-circle distances between two points on Earth
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface EventWithDistance {
  distance: number // in miles
  distanceKm: number // in kilometers
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 3959 // Earth's radius in miles (use 6371 for km)

  const lat1 = toRadians(point1.latitude)
  const lat2 = toRadians(point2.latitude)
  const deltaLat = toRadians(point2.latitude - point1.latitude)
  const deltaLon = toRadians(point2.longitude - point1.longitude)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate distance in kilometers
 */
export function calculateDistanceKm(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371 // Earth's radius in kilometers

  const lat1 = toRadians(point1.latitude)
  const lat2 = toRadians(point2.latitude)
  const deltaLat = toRadians(point2.latitude - point1.latitude)
  const deltaLon = toRadians(point2.longitude - point1.longitude)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format distance for display
 */
export function formatDistance(distanceInMiles: number): string {
  if (distanceInMiles < 0.1) {
    return '< 0.1 mi'
  }

  if (distanceInMiles < 1) {
    return `${distanceInMiles.toFixed(1)} mi`
  }

  if (distanceInMiles < 10) {
    return `${distanceInMiles.toFixed(1)} mi`
  }

  return `${Math.round(distanceInMiles)} mi`
}

/**
 * Add distance to event object
 */
export function addDistanceToEvent<T extends { latitude?: number; longitude?: number }>(
  event: T,
  userLocation: Coordinates
): T & { distance?: number; distanceFormatted?: string } {
  if (!event.latitude || !event.longitude) {
    return event
  }

  const distance = calculateDistance(
    userLocation,
    { latitude: event.latitude, longitude: event.longitude }
  )

  return {
    ...event,
    distance,
    distanceFormatted: formatDistance(distance)
  }
}

/**
 * Sort events by distance (closest first)
 */
export function sortByDistance<T extends { distance?: number }>(
  events: T[]
): T[] {
  return [...events].sort((a, b) => {
    // Events without distance go to the end
    if (a.distance === undefined) return 1
    if (b.distance === undefined) return -1

    return a.distance - b.distance
  })
}

/**
 * Filter events within a certain radius
 */
export function filterByRadius<T extends { distance?: number }>(
  events: T[],
  maxDistanceMiles: number
): T[] {
  return events.filter(event => {
    if (event.distance === undefined) return false
    return event.distance <= maxDistanceMiles
  })
}

/**
 * Check if event is within walking distance (< 1 mile)
 */
export function isWalkingDistance(distanceInMiles?: number): boolean {
  if (distanceInMiles === undefined) return false
  return distanceInMiles < 1
}

/**
 * Check if event is nearby (< 5 miles)
 */
export function isNearby(distanceInMiles?: number): boolean {
  if (distanceInMiles === undefined) return false
  return distanceInMiles < 5
}

/**
 * Get distance category for display
 */
export function getDistanceCategory(distanceInMiles?: number): string {
  if (distanceInMiles === undefined) return 'Unknown'

  if (distanceInMiles < 0.5) return 'Right here'
  if (distanceInMiles < 1) return 'Walking distance'
  if (distanceInMiles < 5) return 'Nearby'
  if (distanceInMiles < 15) return 'Short drive'

  return 'Far away'
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate bearing between two points (direction in degrees)
 */
export function calculateBearing(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1 = toRadians(point1.latitude)
  const lat2 = toRadians(point2.latitude)
  const deltaLon = toRadians(point2.longitude - point1.longitude)

  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)

  const bearing = Math.atan2(y, x)

  // Convert to degrees and normalize to 0-360
  return (bearing * (180 / Math.PI) + 360) % 360
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}
