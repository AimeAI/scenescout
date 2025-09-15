import { supabase } from '@/lib/supabaseClient'
import { safeRpc, fallbackQueries } from '@/lib/safeRpc'
import type { Database } from '@/types/database.types'

export type Venue = Database['public']['Tables']['venues']['Row']
export type VenueInsert = Database['public']['Tables']['venues']['Insert']
export type VenueUpdate = Database['public']['Tables']['venues']['Update']

export interface VenueFilters {
  categories?: string[]
  city?: string
  search?: string
  sortBy?: 'name' | 'distance' | 'rating' | 'created'
  limit?: number
  offset?: number
  latitude?: number
  longitude?: number
  radius?: number
}

export interface VenueWithDistance extends Venue {
  distance?: number
}

export const venuesService = {
  // Get venues with filters
  async getVenues(filters: VenueFilters = {}): Promise<VenueWithDistance[]> {
    try {
      let query = supabase
        .from('venues')
        .select(`
          *,
          city:cities(id, name, slug)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.categories?.length) {
        query = query.in('venue_type', filters.categories)
      }

      if (filters.city) {
        query = query.eq('city_id', filters.city)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Pagination
      const limit = filters.limit || 50
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) throw error

      // Calculate distances if location provided
      let venues = data || []
      if (filters.latitude && filters.longitude && venues.length > 0) {
        venues = venues.map(venue => ({
          ...venue,
          distance: venue.latitude && venue.longitude 
            ? calculateDistance(
                filters.latitude!,
                filters.longitude!,
                venue.latitude,
                venue.longitude
              )
            : undefined
        }))

        // Filter by radius if specified
        if (filters.radius) {
          venues = venues.filter(venue => 
            !venue.distance || venue.distance <= filters.radius!
          )
        }

        // Sort by distance if requested
        if (filters.sortBy === 'distance') {
          venues.sort((a, b) => (a.distance || 999) - (b.distance || 999))
        }
      }

      return venues
    } catch (error) {
      console.error('Error fetching venues:', error)
      return []
    }
  },

  // Get nearby venues using PostGIS
  async getNearbyVenues(
    latitude: number, 
    longitude: number, 
    radiusKm = 5,
    limit = 50
  ): Promise<VenueWithDistance[]> {
    try {
      // Use RPC function for geo queries if available
      const result = await safeRpc(
        'get_nearby_venues',
        {
          lat: latitude,
          lng: longitude,
          radius_km: radiusKm,
          max_results: limit
        },
        'venues'
      )

      if (result.data) {
        return result.data.map((venue: any) => ({
          ...venue,
          distance: venue.distance_km
        }))
      }

      // Fallback to regular query with manual distance calculation
      return this.getVenues({
        latitude,
        longitude,
        radius: radiusKm,
        limit,
        sortBy: 'distance'
      })
    } catch (error) {
      console.error('Error fetching nearby venues:', error)
      return []
    }
  },

  // Get single venue
  async getVenue(id: string): Promise<Venue | null> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          city:cities(id, name, slug),
          events:events(
            id,
            title,
            start_date,
            end_date,
            price_min,
            price_max,
            image_url,
            category
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching venue:', error)
      return null
    }
  },

  // Get venues by source (Google Places, Yelp, etc.)
  async getVenuesBySource(
    source: 'google_places' | 'yelp' | 'manual',
    filters: VenueFilters = {}
  ): Promise<VenueWithDistance[]> {
    try {
      let query = supabase
        .from('venues')
        .select('*')
        .eq('is_active', true)

      // Filter by external_id pattern to identify source
      if (source === 'google_places') {
        query = query.like('external_id', 'ChIJ%')
      } else if (source === 'yelp') {
        query = query.not('external_id', 'like', 'ChIJ%')
        query = query.not('external_id', 'is', null)
      } else if (source === 'manual') {
        query = query.is('external_id', null)
      }

      const { data, error } = await query
      if (error) throw error

      return data || []
    } catch (error) {
      console.error(`Error fetching ${source} venues:`, error)
      return []
    }
  },

  // Get venue categories/types
  async getVenueCategories(): Promise<{ type: string; count: number }[]> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('venue_type')
        .eq('is_active', true)

      if (error) throw error

      // Count venues by type
      const categoryCounts = (data || []).reduce((acc, venue) => {
        const type = venue.venue_type || 'other'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return Object.entries(categoryCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    } catch (error) {
      console.error('Error fetching venue categories:', error)
      return []
    }
  },

  // Search venues with autocomplete
  async searchVenues(query: string, limit = 10): Promise<Venue[]> {
    if (!query || query.length < 2) return []

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
        .order('name')
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching venues:', error)
      return []
    }
  },

  // Get venue statistics
  async getVenueStats(): Promise<{
    total: number
    bySource: { source: string; count: number }[]
    byType: { type: string; count: number }[]
    recentlyAdded: number
  }> {
    try {
      const { data: venues, error } = await supabase
        .from('venues')
        .select('external_id, venue_type, created_at')
        .eq('is_active', true)

      if (error) throw error

      const total = venues?.length || 0
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const recentlyAdded = venues?.filter(v => v.created_at > oneDayAgo).length || 0

      // Categorize by source
      const bySource = venues?.reduce((acc, venue) => {
        let source = 'manual'
        if (venue.external_id?.startsWith('ChIJ')) {
          source = 'google_places'
        } else if (venue.external_id) {
          source = 'yelp'
        }
        
        const existing = acc.find(s => s.source === source)
        if (existing) {
          existing.count++
        } else {
          acc.push({ source, count: 1 })
        }
        return acc
      }, [] as { source: string; count: number }[]) || []

      // Categorize by type
      const byType = venues?.reduce((acc, venue) => {
        const type = venue.venue_type || 'other'
        const existing = acc.find(t => t.type === type)
        if (existing) {
          existing.count++
        } else {
          acc.push({ type, count: 1 })
        }
        return acc
      }, [] as { type: string; count: number }[]) || []

      return {
        total,
        bySource: bySource.sort((a, b) => b.count - a.count),
        byType: byType.sort((a, b) => b.count - a.count),
        recentlyAdded
      }
    } catch (error) {
      console.error('Error fetching venue stats:', error)
      return {
        total: 0,
        bySource: [],
        byType: [],
        recentlyAdded: 0
      }
    }
  }
}

// Helper function to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}