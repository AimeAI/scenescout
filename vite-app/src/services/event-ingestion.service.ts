// Event ingestion service for real-time data fetching from external APIs
import { supabase } from '@/lib/supabase'

interface LocationBounds {
  lat: number
  lng: number
  radius?: number
  city?: string
  stateCode?: string
}

interface IngestionResult {
  success: boolean
  eventsProcessed: number
  source: string
  error?: string
}

class EventIngestionService {
  private ingestionCache = new Map<string, number>()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  private getCacheKey(source: string, lat: number, lng: number, radius: number): string {
    const roundedLat = Math.round(lat * 100) / 100
    const roundedLng = Math.round(lng * 100) / 100
    return `${source}-${roundedLat}-${roundedLng}-${radius}`
  }

  private shouldIngest(cacheKey: string): boolean {
    const lastIngestion = this.ingestionCache.get(cacheKey)
    if (!lastIngestion) return true
    return Date.now() - lastIngestion > this.CACHE_DURATION
  }

  async ingestNearbyEvents(bounds: LocationBounds): Promise<IngestionResult[]> {
    const results: IngestionResult[] = []
    
    // Ingest from multiple sources in parallel
    const promises = [
      this.ingestEventbrite(bounds),
      this.ingestTicketmaster(bounds),
      this.ingestMeetup(bounds)
    ]

    const allResults = await Promise.allSettled(promises)
    
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        const sources = ['eventbrite', 'ticketmaster', 'meetup']
        results.push({
          success: false,
          eventsProcessed: 0,
          source: sources[index],
          error: result.reason?.message || 'Unknown error'
        })
      }
    })

    return results
  }

  private async ingestEventbrite(bounds: LocationBounds): Promise<IngestionResult> {
    const { lat, lng, radius = 10, city = 'San Francisco', stateCode = 'CA' } = bounds
    const cacheKey = this.getCacheKey('eventbrite', lat, lng, radius)
    
    if (!this.shouldIngest(cacheKey)) {
      return { success: true, eventsProcessed: 0, source: 'eventbrite' }
    }

    try {
      console.log(`🎫 Ingesting Eventbrite events near ${lat}, ${lng}`)
      
      // Call the Eventbrite edge function
      const { data, error } = await supabase.functions.invoke('ingest_eventbrite', {
        body: {
          lat,
          lng,
          location: `${lat},${lng}`,
          radius: radius * 1609.34, // Convert miles to meters
          city,
          stateCode
        }
      })

      if (error) throw error

      // Mark this area as ingested
      this.ingestionCache.set(cacheKey, Date.now())
      
      return {
        success: true,
        eventsProcessed: data?.eventsProcessed || 0,
        source: 'eventbrite'
      }
    } catch (error) {
      console.error('Eventbrite ingestion failed:', error)
      return {
        success: false,
        eventsProcessed: 0,
        source: 'eventbrite',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async ingestTicketmaster(bounds: LocationBounds): Promise<IngestionResult> {
    const { lat, lng, radius = 10, city = 'San Francisco', stateCode = 'CA' } = bounds
    const cacheKey = this.getCacheKey('ticketmaster', lat, lng, radius)
    
    if (!this.shouldIngest(cacheKey)) {
      return { success: true, eventsProcessed: 0, source: 'ticketmaster' }
    }

    try {
      console.log(`🎟️ Ingesting Ticketmaster events near ${lat}, ${lng}`)
      
      // Call the Ticketmaster edge function
      const { data, error } = await supabase.functions.invoke('ingest_ticketmaster', {
        body: {
          city,
          stateCode,
          size: 200
        }
      })

      if (error) throw error

      // Mark this area as ingested
      this.ingestionCache.set(cacheKey, Date.now())
      
      return {
        success: true,
        eventsProcessed: data?.eventsProcessed || 0,
        source: 'ticketmaster'
      }
    } catch (error) {
      console.error('Ticketmaster ingestion failed:', error)
      return {
        success: false,
        eventsProcessed: 0,
        source: 'ticketmaster',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async ingestMeetup(bounds: LocationBounds): Promise<IngestionResult> {
    const { lat, lng, radius = 10 } = bounds
    const cacheKey = this.getCacheKey('meetup', lat, lng, radius)
    
    if (!this.shouldIngest(cacheKey)) {
      return { success: true, eventsProcessed: 0, source: 'meetup' }
    }

    try {
      console.log(`👥 Ingesting Meetup events near ${lat}, ${lng}`)
      
      // Call the Meetup edge function
      const { data, error } = await supabase.functions.invoke('ingest_meetup', {
        body: {
          lat,
          lng,
          radius: radius * 1609.34 // Convert miles to meters
        }
      })

      if (error) throw error

      // Mark this area as ingested
      this.ingestionCache.set(cacheKey, Date.now())
      
      return {
        success: true,
        eventsProcessed: data?.eventsProcessed || 0,
        source: 'meetup'
      }
    } catch (error) {
      console.error('Meetup ingestion failed:', error)
      return {
        success: false,
        eventsProcessed: 0,
        source: 'meetup',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Check if we have events in a given area
  async hasEventsInArea(lat: number, lng: number, radius: number = 10): Promise<boolean> {
    try {
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      // Simple check - if we have any events, assume coverage
      // In production, you'd implement proper geographic bounds checking
      return (count || 0) > 10
      
    } catch (error) {
      console.error('Error checking event coverage:', error)
      return false
    }
  }

  // Force refresh events for a specific area
  async refreshEvents(bounds: LocationBounds): Promise<IngestionResult[]> {
    // Clear cache for all sources in this area
    const { lat, lng, radius = 10 } = bounds
    const sources = ['eventbrite', 'ticketmaster', 'meetup']
    
    sources.forEach(source => {
      const cacheKey = this.getCacheKey(source, lat, lng, radius)
      this.ingestionCache.delete(cacheKey)
    })

    // Ingest fresh data
    return this.ingestNearbyEvents(bounds)
  }
}

export const eventIngestionService = new EventIngestionService()