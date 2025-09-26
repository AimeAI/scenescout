import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export class EventRepository {
  async saveEvents(events: any[]) {
    if (events.length === 0) return { saved: 0, skipped: 0 }

    let saved = 0
    let skipped = 0

    for (const event of events) {
      try {
        // Create unique ID from title + date + venue
        const uniqueId = this.generateEventId(event.title, event.date, event.venue_name)
        
        const eventData = {
          id: uniqueId,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          venue_name: event.venue_name,
          address: event.address || 'Toronto, ON',
          price_min: event.price_min || 0,
          price_max: event.price_max || event.price_min || 0,
          price_range: event.price_range || (event.price_min === 0 ? 'Free' : `$${event.price_min}`),
          external_url: event.external_url,
          category: event.category,
          image_url: event.image_url || '',
          latitude: event.latitude || 43.6532,
          longitude: event.longitude || -79.3832,
          source: event.source || 'scraper',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Upsert (insert or update if exists)
        const { error } = await supabase
          .from('events')
          .upsert(eventData, { onConflict: 'id' })

        if (error) {
          console.error(`Failed to save event ${event.title}:`, error.message)
          skipped++
        } else {
          saved++
        }
      } catch (error) {
        console.error(`Error processing event ${event.title}:`, error)
        skipped++
      }
    }

    console.log(`💾 Saved ${saved} events, skipped ${skipped}`)
    return { saved, skipped }
  }

  async getEvents(filters: {
    category?: string
    limit?: number
    offset?: number
    minPrice?: number
    maxPrice?: number
    searchQuery?: string
  } = {}) {
    let query = supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0]) // Only future events
      .order('date', { ascending: true })

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price_min', filters.minPrice)
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price_min', filters.maxPrice)
    }

    if (filters.searchQuery) {
      query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%,venue_name.ilike.%${filters.searchQuery}%`)
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 25)) - 1)
    } else {
      query = query.limit(filters.limit || 25)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch events:', error)
      return []
    }

    return data || []
  }

  async getEventCount(category?: string) {
    let query = supabase
      .from('events')
      .select('id', { count: 'exact' })
      .gte('date', new Date().toISOString().split('T')[0])

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { count, error } = await query

    if (error) {
      console.error('Failed to count events:', error)
      return 0
    }

    return count || 0
  }

  async cleanupOldEvents() {
    // Remove events older than 7 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)

    const { error } = await supabase
      .from('events')
      .delete()
      .lt('date', cutoffDate.toISOString().split('T')[0])

    if (error) {
      console.error('Failed to cleanup old events:', error)
    } else {
      console.log('🧹 Cleaned up old events')
    }
  }

  private generateEventId(title: string, date: string, venue: string): string {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
    const cleanVenue = venue.toLowerCase().replace(/[^a-z0-9]/g, '')
    return `${cleanTitle.substring(0, 20)}-${date}-${cleanVenue.substring(0, 10)}`
  }
}
