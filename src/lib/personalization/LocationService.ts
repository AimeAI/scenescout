import { SupabaseClient } from '@supabase/supabase-js'
import { Event, Venue } from '@/types'
import { LocationContext } from './types'

export class LocationService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Find events within a specified radius using PostGIS
   */
  async findEventsWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number = 1000
  ): Promise<Event[]> {
    try {
      // Use PostGIS ST_DWithin for efficient radius search
      const { data: events, error } = await this.supabase.rpc('find_events_within_radius', {
        center_lat: latitude,
        center_lng: longitude,
        radius_km: radiusKm,
        limit_count: limit
      })

      if (error) {
        console.error('Error finding events within radius:', error)
        return []
      }

      return events || []
    } catch (error) {
      console.error('LocationService radius search error:', error)
      return []
    }
  }

  /**
   * Find venues within a specified radius
   */
  async findVenuesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number = 500
  ): Promise<Venue[]> {
    try {
      const { data: venues, error } = await this.supabase.rpc('find_venues_within_radius', {
        center_lat: latitude,
        center_lng: longitude,
        radius_km: radiusKm,
        limit_count: limit
      })

      if (error) {
        console.error('Error finding venues within radius:', error)
        return []
      }

      return venues || []
    } catch (error) {
      console.error('LocationService venue radius search error:', error)
      return []
    }
  }

  /**
   * Get events clustered by geographical proximity
   */
  async getEventClusters(
    bounds: { north: number; south: number; east: number; west: number },
    zoomLevel: number,
    clusterRadius: number = 50
  ): Promise<Array<{
    id: string
    latitude: number
    longitude: number
    count: number
    event_ids: string[]
    categories: string[]
  }>> {
    try {
      const { data: clusters, error } = await this.supabase.rpc('get_event_clusters', {
        north_bound: bounds.north,
        south_bound: bounds.south,
        east_bound: bounds.east,
        west_bound: bounds.west,
        zoom_level: zoomLevel,
        cluster_radius: clusterRadius
      })

      if (error) {
        console.error('Error getting event clusters:', error)
        return []
      }

      return clusters || []
    } catch (error) {
      console.error('LocationService clustering error:', error)
      return []
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Get nearby cities based on location
   */
  async getNearbyCities(
    latitude: number,
    longitude: number,
    radiusKm: number = 100,
    limit: number = 20
  ): Promise<Array<{
    id: string
    name: string
    slug: string
    distance_km: number
    event_count: number
  }>> {
    try {
      const { data: cities, error } = await this.supabase.rpc('find_nearby_cities', {
        center_lat: latitude,
        center_lng: longitude,
        radius_km: radiusKm,
        limit_count: limit
      })

      if (error) {
        console.error('Error finding nearby cities:', error)
        return []
      }

      return cities || []
    } catch (error) {
      console.error('LocationService nearby cities error:', error)
      return []
    }
  }

  /**
   * Get location context from coordinates (reverse geocoding)
   */
  async getLocationContext(latitude: number, longitude: number): Promise<LocationContext> {
    try {
      // First try to get from database
      const { data: locationData, error } = await this.supabase.rpc('get_location_context', {
        lat: latitude,
        lng: longitude
      })

      if (locationData && !error) {
        return {
          latitude,
          longitude,
          accuracy: 100,
          city_id: locationData.city_id,
          neighborhood: locationData.neighborhood,
          timezone: locationData.timezone,
          country_code: locationData.country_code,
          source: 'database',
          timestamp: new Date().toISOString()
        }
      }

      // Fallback to external geocoding service
      return await this.reverseGeocode(latitude, longitude)

    } catch (error) {
      console.error('Error getting location context:', error)
      return {
        latitude,
        longitude,
        accuracy: 1000,
        timezone: 'UTC',
        country_code: 'Unknown',
        source: 'manual',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Update user's location history
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number = 100,
    source: 'gps' | 'ip' | 'manual' = 'gps'
  ): Promise<void> {
    try {
      await this.supabase.from('user_location_history').insert({
        user_id: userId,
        latitude,
        longitude,
        accuracy,
        source,
        timestamp: new Date().toISOString()
      })

      // Update user's current location
      await this.supabase.from('user_current_location').upsert({
        user_id: userId,
        latitude,
        longitude,
        accuracy,
        source,
        updated_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error updating user location:', error)
    }
  }

  /**
   * Get user's location history
   */
  async getUserLocationHistory(
    userId: string,
    limit: number = 100,
    days: number = 30
  ): Promise<LocationContext[]> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data: locations, error } = await this.supabase
        .from('user_location_history')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', cutoffDate)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error getting user location history:', error)
        return []
      }

      return locations || []
    } catch (error) {
      console.error('LocationService location history error:', error)
      return []
    }
  }

  /**
   * Get popular areas/neighborhoods for events
   */
  async getPopularAreas(
    cityId: string,
    categoryFilter?: string[],
    limit: number = 20
  ): Promise<Array<{
    neighborhood: string
    event_count: number
    average_rating: number
    categories: string[]
    center_lat: number
    center_lng: number
  }>> {
    try {
      const { data: areas, error } = await this.supabase.rpc('get_popular_areas', {
        city_id: cityId,
        category_filter: categoryFilter,
        limit_count: limit
      })

      if (error) {
        console.error('Error getting popular areas:', error)
        return []
      }

      return areas || []
    } catch (error) {
      console.error('LocationService popular areas error:', error)
      return []
    }
  }

  /**
   * Find events along a route/path
   */
  async findEventsAlongRoute(
    waypoints: Array<{ lat: number; lng: number }>,
    corridorWidthKm: number = 5,
    maxDetourKm: number = 10
  ): Promise<Event[]> {
    try {
      const { data: events, error } = await this.supabase.rpc('find_events_along_route', {
        waypoints: JSON.stringify(waypoints),
        corridor_width_km: corridorWidthKm,
        max_detour_km: maxDetourKm
      })

      if (error) {
        console.error('Error finding events along route:', error)
        return []
      }

      return events || []
    } catch (error) {
      console.error('LocationService route events error:', error)
      return []
    }
  }

  /**
   * Get travel time and distance between locations
   */
  async getTravelInfo(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    mode: 'driving' | 'walking' | 'transit' | 'cycling' = 'driving'
  ): Promise<{
    distance_km: number
    duration_minutes: number
    route_polyline?: string
  }> {
    try {
      // Use internal calculation for simple cases
      const straightLineDistance = this.calculateDistance(fromLat, fromLng, toLat, toLng)
      
      // Simple time estimation based on mode
      const speedKmh = {
        walking: 5,
        cycling: 15,
        driving: 40,
        transit: 25
      }[mode]

      const estimatedDuration = (straightLineDistance / speedKmh) * 60

      return {
        distance_km: straightLineDistance,
        duration_minutes: Math.round(estimatedDuration)
      }

    } catch (error) {
      console.error('Error calculating travel info:', error)
      return {
        distance_km: this.calculateDistance(fromLat, fromLng, toLat, toLng),
        duration_minutes: 30 // fallback
      }
    }
  }

  /**
   * Find optimal meeting point for multiple users
   */
  async findOptimalMeetingPoint(
    userLocations: Array<{ userId: string; lat: number; lng: number }>,
    maxTravelTime: number = 60,
    preferredCategories?: string[]
  ): Promise<{
    latitude: number
    longitude: number
    average_travel_time: number
    nearby_venues: Venue[]
    nearby_events: Event[]
  } | null> {
    try {
      const { data: meetingPoint, error } = await this.supabase.rpc('find_optimal_meeting_point', {
        user_locations: JSON.stringify(userLocations),
        max_travel_time: maxTravelTime,
        preferred_categories: preferredCategories
      })

      if (error) {
        console.error('Error finding optimal meeting point:', error)
        return null
      }

      return meetingPoint
    } catch (error) {
      console.error('LocationService meeting point error:', error)
      return null
    }
  }

  /**
   * Get location-based event density heatmap data
   */
  async getEventDensityHeatmap(
    bounds: { north: number; south: number; east: number; west: number },
    gridSize: number = 20,
    categoryFilter?: string[]
  ): Promise<Array<{
    lat: number
    lng: number
    density: number
    event_count: number
  }>> {
    try {
      const { data: heatmapData, error } = await this.supabase.rpc('get_event_density_heatmap', {
        north_bound: bounds.north,
        south_bound: bounds.south,
        east_bound: bounds.east,
        west_bound: bounds.west,
        grid_size: gridSize,
        category_filter: categoryFilter
      })

      if (error) {
        console.error('Error getting event density heatmap:', error)
        return []
      }

      return heatmapData || []
    } catch (error) {
      console.error('LocationService heatmap error:', error)
      return []
    }
  }

  /**
   * Check if location is within service area
   */
  async isLocationInServiceArea(latitude: number, longitude: number): Promise<{
    isSupported: boolean
    nearestCity?: string
    distanceToNearestKm?: number
  }> {
    try {
      const { data: serviceCheck, error } = await this.supabase.rpc('check_service_area', {
        lat: latitude,
        lng: longitude
      })

      if (error) {
        console.error('Error checking service area:', error)
        return { isSupported: false }
      }

      return serviceCheck || { isSupported: false }
    } catch (error) {
      console.error('LocationService service area error:', error)
      return { isSupported: false }
    }
  }

  // Private helper methods

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<LocationContext> {
    // Simplified reverse geocoding - in production, you'd use a service like Google Maps
    try {
      // For now, return basic context
      return {
        latitude,
        longitude,
        accuracy: 1000,
        timezone: this.getTimezoneFromCoordinates(latitude, longitude),
        country_code: this.getCountryFromCoordinates(latitude, longitude),
        source: 'ip',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return {
        latitude,
        longitude,
        accuracy: 10000,
        timezone: 'UTC',
        country_code: 'Unknown',
        source: 'manual',
        timestamp: new Date().toISOString()
      }
    }
  }

  private getTimezoneFromCoordinates(latitude: number, longitude: number): string {
    // Simplified timezone detection based on longitude
    const offset = Math.round(longitude / 15)
    const hours = offset >= 0 ? offset : 24 + offset
    return `UTC${offset >= 0 ? '+' : ''}${offset}`
  }

  private getCountryFromCoordinates(latitude: number, longitude: number): string {
    // Simplified country detection - in production, use proper geocoding
    if (latitude >= 24.396308 && latitude <= 49.384358 && longitude >= -125.0 && longitude <= -66.93457) {
      return 'US'
    }
    if (latitude >= 41.66185 && latitude <= 71.159885 && longitude >= -141.0 && longitude <= -52.6194) {
      return 'CA'
    }
    if (latitude >= 35.8245 && latitude <= 71.185 && longitude >= -31.266 && longitude <= 39.874) {
      return 'EU'
    }
    return 'Unknown'
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses: string[]): Promise<Array<{
    address: string
    latitude?: number
    longitude?: number
    confidence: number
    error?: string
  }>> {
    const results = []

    for (const address of addresses) {
      try {
        // In production, use a real geocoding service
        // For now, return mock data
        results.push({
          address,
          latitude: 37.7749,
          longitude: -122.4194,
          confidence: 0.8
        })
      } catch (error) {
        results.push({
          address,
          confidence: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Get location-based recommendations score
   */
  async getLocationScore(
    eventLatitude: number,
    eventLongitude: number,
    userLatitude: number,
    userLongitude: number,
    userPreferredRadius: number
  ): Promise<number> {
    const distance = this.calculateDistance(
      userLatitude,
      userLongitude,
      eventLatitude,
      eventLongitude
    )

    if (distance > userPreferredRadius) {
      return 0
    }

    // Exponential decay function for location scoring
    return Math.exp(-distance / (userPreferredRadius / 3))
  }
}