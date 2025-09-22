import { getServiceSupabaseClient } from '@/lib/supabase-server'

const supabase = getServiceSupabaseClient()

export class EventManager {
  
  async storeEvents(events: any[], source: string = 'live_scrape') {
    const eventsToStore = events.map(event => ({
      ...event,
      external_id: event.external_id || `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    }))

    // Use upsert to avoid duplicates based on external_id
    const { data, error } = await supabase
      .from('events')
      .upsert(eventsToStore, { 
        onConflict: 'external_id',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Failed to store events:', error)
      return { success: false, error }
    }

    console.log(`✅ Stored/updated ${data.length} events in database`)
    return { success: true, data }
  }

  async getStoredEvents(filters: {
    category?: string
    timeFilter?: 'today' | 'week' | 'month' | 'all'
    priceFilter?: 'free' | 'paid' | 'all'
    location?: { lat: number, lng: number, radius: number }
    limit?: number
    offset?: number
  } = {}) {
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future events
      .order('date', { ascending: true })

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.priceFilter === 'free') {
      query = query.eq('price_min', 0)
    } else if (filters.priceFilter === 'paid') {
      query = query.gt('price_min', 0)
    }

    // Time filtering
    if (filters.timeFilter && filters.timeFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      let endDate: Date
      switch (filters.timeFilter) {
        case 'today':
          endDate = new Date(today)
          endDate.setDate(endDate.getDate() + 1)
          break
        case 'week':
          endDate = new Date(today)
          endDate.setDate(endDate.getDate() + 7)
          break
        case 'month':
          endDate = new Date(today)
          endDate.setMonth(endDate.getMonth() + 1)
          break
      }
      
      query = query.lte('date', endDate.toISOString().split('T')[0])
    }

    // Location filtering (if provided)
    if (filters.location) {
      // Simple bounding box filter (can be enhanced with PostGIS)
      const { lat, lng, radius } = filters.location
      const latDelta = radius / 111 // Rough km to degrees conversion
      const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180))
      
      query = query
        .gte('latitude', lat - latDelta)
        .lte('latitude', lat + latDelta)
        .gte('longitude', lng - lngDelta)
        .lte('longitude', lng + lngDelta)
    }

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to get stored events:', error)
      return { success: false, error, events: [] }
    }

    return { success: true, events: data || [] }
  }

  async cleanupExpiredEvents() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const cutoffDate = yesterday.toISOString().split('T')[0]

    // Mark expired events as inactive instead of deleting
    const { data, error } = await supabase
      .from('events')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .lt('date', cutoffDate)
      .eq('is_active', true)
      .select('id')

    if (error) {
      console.error('Failed to cleanup expired events:', error)
      return { success: false, error }
    }

    console.log(`🧹 Cleaned up ${data?.length || 0} expired events`)
    return { success: true, count: data?.length || 0 }
  }

  async getEventStats() {
    const { data, error } = await supabase
      .from('events')
      .select('category, price_min, is_active')
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])

    if (error) {
      console.error('Failed to get event stats:', error)
      return null
    }

    const stats = {
      total: data.length,
      byCategory: {} as Record<string, number>,
      freeEvents: data.filter(e => e.price_min === 0).length,
      paidEvents: data.filter(e => e.price_min > 0).length
    }

    data.forEach(event => {
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1
    })

    return stats
  }

  async searchStoredEvents(query: string, filters: any = {}) {
    // First try to get from stored events
    const storedResult = await this.getStoredEvents({
      ...filters,
      limit: 50
    })

    if (storedResult.success && storedResult.events.length > 0) {
      // Filter by search query
      const filteredEvents = storedResult.events.filter(event =>
        event.title?.toLowerCase().includes(query.toLowerCase()) ||
        event.description?.toLowerCase().includes(query.toLowerCase()) ||
        event.venue_name?.toLowerCase().includes(query.toLowerCase())
      )

      if (filteredEvents.length >= 10) {
        console.log(`📚 Found ${filteredEvents.length} events in stored data`)
        return { success: true, events: filteredEvents, source: 'stored' }
      }
    }

    // If not enough stored events, indicate need for fresh scraping
    return { success: false, events: [], source: 'needs_scraping' }
  }

  async mergeWithStoredEvents(newEvents: any[], source: string) {
    // Store new events
    const storeResult = await this.storeEvents(newEvents, source)
    
    if (!storeResult.success) {
      return storeResult
    }

    // Return combined results (stored + new)
    const allEventsResult = await this.getStoredEvents({ limit: 100 })
    
    return {
      success: true,
      events: allEventsResult.events,
      newCount: newEvents.length,
      totalCount: allEventsResult.events.length
    }
  }
}
