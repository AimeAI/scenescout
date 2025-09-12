import { supabase } from '@/lib/supabase'
import type { Tables, Enums } from '@/lib/supabase'

export type Event = Tables<'events'>
export type EventCategory = Enums<'event_category'>
export type EventStatus = Enums<'event_status'>

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
        venue:venues(id, name, address, latitude, longitude),
        city:cities(id, name, slug)
      `)
      .eq('is_approved', true)
      .eq('status', filters.status || 'active')
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

    // Pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data
  },

  // Get featured events
  async getFeaturedEvents(limit = 10) {
    const { data, error } = await supabase
      .rpc('get_featured_events', { limit_count: limit })
    
    if (error) throw error
    return data
  },

  // Get events by city
  async getEventsByCity(citySlug: string, limit = 50) {
    const { data, error } = await supabase
      .rpc('get_events_by_city', { city_slug: citySlug, limit_count: limit })
    
    if (error) throw error
    return data
  },

  // Get nearby events
  async getNearbyEvents(lat: number, lng: number, radiusKm = 10) {
    const { data, error } = await supabase
      .rpc('get_nearby_events', { lat, lng, radius_km: radiusKm })
    
    if (error) throw error
    return data
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
  async searchEvents(query: string) {
    const { data, error } = await supabase
      .rpc('search_events', { search_query: query })
    
    if (error) throw error
    return data
  },

  // Increment event views
  async incrementViews(eventId: string) {
    const { error } = await supabase
      .rpc('increment_event_views', { event_id: eventId })
    
    if (error) throw error
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