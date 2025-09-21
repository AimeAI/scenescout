import { supabase } from '@/lib/supabaseClient'
import { safeRpc } from '@/lib/safeRpc'
import type { Event, EventCategory } from '@/types/database.types'

// Enhanced error handling for API failures
const handleApiError = (error: any, fallbackData: any[] = []) => {
  console.error('API Error:', error)
  // In production, you might want to send to error tracking service
  return fallbackData
}

export type { Event, EventCategory }
export type EventStatus = 'active' | 'cancelled' | 'postponed'
export type EventCategoryWithAll = EventCategory | 'all'

export interface EventFilters {
  categories?: EventCategory[]
  category?: EventCategory
  city?: string
  cityId?: string
  dateFrom?: string
  dateTo?: string
  priceMin?: number
  priceMax?: number
  isFree?: boolean
  search?: string
  status?: EventStatus
  sortBy?: 'relevance' | 'date' | 'popular' | 'distance'
  limit?: number
  offset?: number
}

export const eventsService = {
  // Get all events with filters
  async getEvents(filters: EventFilters = {}) {
    let query = supabase
      .from('events')
      .select(`
        *,
        venue:venues(id, name, address, latitude, longitude, venue_type),
        city:cities(id, name, slug)
      `)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Apply filters
    if (filters.categories?.length) {
      query = query.in('category', filters.categories)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.city) {
      query = query.eq('city_id', filters.city)
    }

    if (filters.cityId) {
      query = query.eq('city_id', filters.cityId)
    }

    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo)
    }

    // Price filtering - simplified to avoid complex OR queries that can cause 400 errors
    if (filters.isFree === true) {
      query = query.eq('is_free', true)
    } else if (filters.isFree === false) {
      query = query.eq('is_free', false)
    }
    
    if (filters.priceMin !== undefined && !filters.isFree) {
      query = query.gte('price_min', filters.priceMin)
    }
    if (filters.priceMax !== undefined && !filters.isFree) {
      query = query.lte('price_max', filters.priceMax)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply status filter (commented out since status column doesn't exist)
    // if (filters.status) {
    //   query = query.eq('status', filters.status)
    // }

    // Pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return handleApiError(error, [])
    }

    return data || []
  },

  // Get featured events
  async getFeaturedEvents(limit = 10) {
    try {
      // Use direct query instead of RPC to avoid dependency issues
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(id, name, address, latitude, longitude, venue_type),
          city:cities(id, name, slug)
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('hotness_score', { ascending: false })
        .order('date', { ascending: true })
        .limit(limit)
      
      if (error) {
        console.warn('Featured events query failed:', error)
        return handleApiError(error, [])
      }
      
      return data || []
    } catch (err) {
      console.warn('Featured events error:', err)
      return handleApiError(err, [])
    }
  },

  // Get events by city
  async getEventsByCity(citySlug: string, limit = 50) {
    try {
      // Use direct query with city join
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(id, name, address, latitude, longitude, venue_type),
          city:cities!inner(id, name, slug)
        `)
        .eq('city.slug', citySlug)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit)
      
      if (error) {
        console.warn('Events by city query failed:', error)
        return handleApiError(error, [])
      }
      
      return data || []
    } catch (err) {
      console.warn('Events by city error:', err)
      return handleApiError(err, [])
    }
  },

  // Get nearby events
  async getNearbyEvents(lat: number, lng: number, radiusMiles = 10) {
    try {
      // Use direct query with latitude/longitude filtering
      // Note: This is a simplified approach - ideally you'd use PostGIS functions
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(id, name, address, latitude, longitude, venue_type),
          city:cities(id, name, slug)
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(100) // Get more to filter by distance client-side
      
      if (error) {
        console.warn('Nearby events query failed:', error)
        return handleApiError(error, [])
      }
      
      // Simple distance filtering client-side
      const radiusKm = radiusMiles * 1.60934
      const filteredEvents = (data || []).filter(event => {
        if (!event.latitude || !event.longitude) return false
        
        const distance = this.calculateDistance(lat, lng, event.latitude, event.longitude)
        return distance <= radiusKm
      }).slice(0, 50)
      
      return filteredEvents
    } catch (err) {
      console.warn('Nearby events error:', err)
      return handleApiError(err, [])
    }
  },
  
  // Helper function for distance calculation
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  },

  // Get single event
  async getEvent(id: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venue:venues(*),
        city:cities(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Search events
  async searchEvents(query: string, filters: EventFilters = {}) {
    try {
      let supabaseQuery = supabase
        .from('events')
        .select(`
          *,
          venue:venues(id, name, address, latitude, longitude, venue_type),
          city:cities(id, name, slug)
        `)
        .gte('date', new Date().toISOString().split('T')[0])
      
      if (query) {
        supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      }
      
      // Apply filters
      if (filters.category && filters.category !== 'all') {
        supabaseQuery = supabaseQuery.eq('category', filters.category)
      }
      
      if (filters.cityId) {
        supabaseQuery = supabaseQuery.eq('city_id', filters.cityId)
      }
      
      if (filters.isFree === true) {
        supabaseQuery = supabaseQuery.eq('is_free', true)
      }
      
      const { data, error } = await supabaseQuery
        .order('date', { ascending: true })
        .limit(filters.limit || 50)
      
      if (error) {
        console.warn('Search events query failed:', error)
        return handleApiError(error, [])
      }
      
      return data || []
    } catch (err) {
      console.warn('Search events error:', err)
      return handleApiError(err, [])
    }
  },

  // Increment event views
  async incrementViews(eventId: string) {
    // First get current view count
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('view_count')
      .eq('id', eventId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Then update it
    const { error: updateError } = await supabase
      .from('events')
      .update({ view_count: (event?.view_count || 0) + 1 })
      .eq('id', eventId)
    
    if (updateError) throw updateError
  },

  // Get events for infinite scroll
  async getEventsInfinite(pageParam = 0, filters: EventFilters = {}) {
    const limit = 20
    const events = await this.getEvents({
      ...filters,
      limit,
      offset: pageParam * limit
    })

    return {
      events,
      nextCursor: events.length === limit ? pageParam + 1 : null
    }
  }
}