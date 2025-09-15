import { supabase } from '@/lib/supabaseClient'
import { safeRpc, fallbackQueries } from '@/lib/safeRpc'
import { mockEvents, getMockEventsByCategory, getMockFeaturedEvents } from '@/lib/mockData'
import type { Event, EventCategory } from '@/types/database.types'

export type { Event, EventCategory }
export type EventStatus = 'active' | 'cancelled' | 'postponed'
export type EventCategoryWithAll = EventCategory | 'all'

export interface EventFilters {
  categories?: EventCategory[]
  city?: string
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

    if (filters.city) {
      query = query.eq('city_id', filters.city)
    }

    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo)
    }

    if (filters.isFree) {
      query = query.eq('is_free', true)
    } else {
      if (filters.priceMin !== undefined) {
        query = query.gte('price_min', filters.priceMin)
      }
      if (filters.priceMax !== undefined) {
        query = query.lte('price_max', filters.priceMax)
      }
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
      throw error
    }

    return data || []
  },

  // Get featured events
  async getFeaturedEvents(limit = 10) {
    const { data, error } = await safeRpc(
      'get_featured_events',
      { limit_count: limit },
      () => fallbackQueries.getFeaturedEvents(limit)
    )
    
    if (error) throw error
    return data || []
  },

  // Get events by city
  async getEventsByCity(citySlug: string, limit = 50) {
    const { data, error } = await safeRpc(
      'get_events_by_city',
      { city_slug: citySlug, limit_count: limit },
      () => fallbackQueries.getEventsByCategory(undefined, citySlug, limit)
    )
    
    if (error) throw error
    return data || []
  },

  // Get nearby events
  async getNearbyEvents(lat: number, lng: number, radiusMiles = 10) {
    const { data, error } = await safeRpc(
      'get_nearby_events',
      { user_lat: lat, user_lng: lng, radius_miles: radiusMiles },
      () => fallbackQueries.getNearbyEvents(lat, lng, radiusMiles)
    )
    
    if (error) throw error
    return data || []
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
    const { data, error } = await safeRpc(
      'search_events',
      { search_query: query, ...filters },
      () => fallbackQueries.searchEvents(query, filters)
    )
    
    if (error) throw error
    return data || []
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