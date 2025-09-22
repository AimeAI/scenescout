import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ScrapingService } from '../_shared/scraping-service.ts'

interface VenueScrapingRequest {
  venue_id?: string
  target?: string
  options?: {
    max_events?: number
    date_range?: {
      start: string
      end: string
    }
    categories?: string[]
    include_past_events?: boolean
  }
}

interface EventData {
  external_id: string
  title: string
  description?: string
  start_time: string
  end_time?: string
  ticket_url?: string
  price_min?: number
  price_max?: number
  category: string
  source: string
  source_url: string
  image_url?: string
  organizer?: string
  capacity?: number
  attendee_count?: number
}

interface ScrapingResult {
  success: boolean
  events_found: number
  events_created: number
  events_updated: number
  error?: string
  duration: number
  venue_data?: any
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

class VenueScraper {
  private scrapingService: ScrapingService

  constructor() {
    this.scrapingService = new ScrapingService({
      userAgent: 'SceneScout Venue Scraper/1.0',
      maxRetries: 3,
      timeout: 30000,
      rateLimit: {
        requests: 5,
        window: 60000 // 1 minute
      }
    })
  }

  async scrapeVenue(venueId: string, options: any = {}): Promise<ScrapingResult> {
    const startTime = Date.now()
    let eventsFound = 0
    let eventsCreated = 0
    let eventsUpdated = 0
    
    try {
      console.log(`Starting venue scraping for venue ID: ${venueId}`)
      
      // Get venue details
      const venue = await this.getVenueDetails(venueId)
      if (!venue) {
        throw new Error(`Venue not found: ${venueId}`)
      }

      console.log(`Scraping events for venue: ${venue.name} (${venue.source})`)

      // Get date range for scraping
      const dateRange = this.getDateRange(options)
      
      // Scrape events based on venue source
      const events = await this.scrapeEventsBySource(venue, dateRange, options)
      eventsFound = events.length
      
      console.log(`Found ${eventsFound} events for venue ${venue.name}`)

      // Process and store events
      for (const eventData of events) {
        try {
          const result = await this.createOrUpdateEvent(eventData, venue.id)
          if (result.created) {
            eventsCreated++
          } else if (result.updated) {
            eventsUpdated++
          }
        } catch (error) {
          console.error(`Failed to process event ${eventData.external_id}:`, error)
        }
      }

      // Update venue last scraped timestamp
      await this.updateVenueMetadata(venue.id, {
        last_scraped: new Date().toISOString(),
        events_count: eventsFound
      })

      const duration = Date.now() - startTime
      
      return {
        success: true,
        events_found: eventsFound,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        duration,
        venue_data: venue
      }
      
    } catch (error) {
      console.error('Venue scraping error:', error)
      
      return {
        success: false,
        events_found: eventsFound,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        error: error.message,
        duration: Date.now() - startTime
      }
    }
  }

  async scrapeVenueByUrl(targetUrl: string, options: any = {}): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Starting venue scraping for URL: ${targetUrl}`)
      
      // Determine source from URL
      const source = this.detectSourceFromUrl(targetUrl)
      
      // Create temporary venue data
      const tempVenue = {
        id: 'temp',
        name: 'Unknown Venue',
        source,
        source_url: targetUrl
      }

      const dateRange = this.getDateRange(options)
      const events = await this.scrapeEventsBySource(tempVenue, dateRange, options)
      
      return {
        success: true,
        events_found: events.length,
        events_created: 0,
        events_updated: 0,
        duration: Date.now() - startTime,
        venue_data: tempVenue
      }
      
    } catch (error) {
      console.error('URL venue scraping error:', error)
      
      return {
        success: false,
        events_found: 0,
        events_created: 0,
        events_updated: 0,
        error: error.message,
        duration: Date.now() - startTime
      }
    }
  }

  private async getVenueDetails(venueId: string): Promise<any> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (error) {
      console.error('Failed to get venue details:', error)
      return null
    }

    return data
  }

  private getDateRange(options: any): { start: Date; end: Date } {
    const now = new Date()
    const start = options.date_range?.start ? new Date(options.date_range.start) : now
    const end = options.date_range?.end ? new Date(options.date_range.end) : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
    
    return { start, end }
  }

  private async scrapeEventsBySource(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    switch (venue.source) {
      case 'eventbrite':
        return await this.scrapeEventbriteEvents(venue, dateRange, options)
      case 'meetup':
        return await this.scrapeMeetupEvents(venue, dateRange, options)
      case 'facebook_events':
        return await this.scrapeFacebookEvents(venue, dateRange, options)
      case 'ticketmaster':
        return await this.scrapeTicketmasterEvents(venue, dateRange, options)
      case 'yelp':
        return await this.scrapeYelpEvents(venue, dateRange, options)
      case 'foursquare':
        return await this.scrapeFoursquareEvents(venue, dateRange, options)
      default:
        return await this.scrapeGenericVenue(venue, dateRange, options)
    }
  }

  private async scrapeEventbriteEvents(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    try {
      if (venue.external_id) {
        // Use Eventbrite API if we have the venue ID
        const apiUrl = `https://www.eventbrite.com/api/v3/venues/${venue.external_id}/events/`
        const params = new URLSearchParams({
          'start_date.range_start': dateRange.start.toISOString(),
          'start_date.range_end': dateRange.end.toISOString(),
          'status': 'live',
          'order_by': 'start_asc',
          'expand': 'ticket_availability,organizer'
        })

        const response = await this.scrapingService.fetchWithRetry(`${apiUrl}?${params}`)
        const data = await response.json()
        
        if (data.events) {
          data.events.forEach((event: any) => {
            events.push(this.parseEventbriteEvent(event))
          })
        }
      } else if (venue.source_url) {
        // Scrape venue page directly
        const html = await this.scrapingService.fetchHtml(venue.source_url)
        const parsedEvents = this.parseEventbritePageEvents(html, venue)
        events.push(...parsedEvents)
      }
      
    } catch (error) {
      console.error('Eventbrite scraping error:', error)
    }
    
    return events
  }

  private async scrapeMeetupEvents(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    try {
      if (venue.source_url) {
        const html = await this.scrapingService.fetchHtml(venue.source_url)
        const parsedEvents = this.parseMeetupPageEvents(html, venue)
        events.push(...parsedEvents)
      }
      
    } catch (error) {
      console.error('Meetup scraping error:', error)
    }
    
    return events
  }

  private async scrapeFacebookEvents(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    // Facebook scraping is complex and may require special handling
    console.log('Facebook event scraping requires special authentication')
    
    return events
  }

  private async scrapeTicketmasterEvents(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    try {
      const apiKey = Deno.env.get('TICKETMASTER_API_KEY')
      if (!apiKey) {
        console.log('Ticketmaster API key not found')
        return events
      }
      
      if (venue.external_id) {
        const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json'
        const params = new URLSearchParams({
          apikey: apiKey,
          venueId: venue.external_id,
          startDateTime: dateRange.start.toISOString(),
          endDateTime: dateRange.end.toISOString(),
          size: '100'
        })
        
        const response = await this.scrapingService.fetchWithRetry(`${apiUrl}?${params}`)
        const data = await response.json()
        
        if (data._embedded?.events) {
          data._embedded.events.forEach((event: any) => {
            events.push(this.parseTicketmasterEvent(event))
          })
        }
      }
      
    } catch (error) {
      console.error('Ticketmaster scraping error:', error)
    }
    
    return events
  }

  private async scrapeYelpEvents(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    try {
      if (venue.source_url) {
        const html = await this.scrapingService.fetchHtml(venue.source_url + '/events')
        const parsedEvents = this.parseYelpPageEvents(html, venue)
        events.push(...parsedEvents)
      }
      
    } catch (error) {
      console.error('Yelp scraping error:', error)
    }
    
    return events
  }

  private async scrapeFoursquareEvents(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    // Foursquare event scraping (placeholder)
    console.log('Foursquare event scraping not implemented')
    
    return events
  }

  private async scrapeGenericVenue(venue: any, dateRange: any, options: any): Promise<EventData[]> {
    const events: EventData[] = []
    
    try {
      if (venue.source_url) {
        const html = await this.scrapingService.fetchHtml(venue.source_url)
        const parsedEvents = this.parseGenericPageEvents(html, venue)
        events.push(...parsedEvents)
      }
      
    } catch (error) {
      console.error('Generic venue scraping error:', error)
    }
    
    return events
  }

  private parseEventbriteEvent(event: any): EventData {
    return {
      external_id: event.id,
      title: event.name?.text || 'Untitled Event',
      description: event.description?.text,
      start_time: event.start?.utc,
      end_time: event.end?.utc,
      ticket_url: event.url,
      price_min: event.ticket_availability?.minimum_ticket_price?.major_value,
      price_max: event.ticket_availability?.maximum_ticket_price?.major_value,
      category: event.category?.name || 'general',
      source: 'eventbrite',
      source_url: event.url,
      image_url: event.logo?.url,
      organizer: event.organizer?.name,
      capacity: event.capacity,
      attendee_count: null
    }
  }

  private parseTicketmasterEvent(event: any): EventData {
    const prices = event.priceRanges?.[0]
    
    return {
      external_id: event.id,
      title: event.name,
      description: event.pleaseNote,
      start_time: event.dates?.start?.dateTime,
      end_time: null,
      ticket_url: event.url,
      price_min: prices?.min,
      price_max: prices?.max,
      category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'general',
      source: 'ticketmaster',
      source_url: event.url,
      image_url: event.images?.[0]?.url,
      organizer: event.promoter?.name,
      capacity: null,
      attendee_count: null
    }
  }

  private parseEventbritePageEvents(html: string, venue: any): EventData[] {
    const events: EventData[] = []
    
    // Parse Eventbrite venue page HTML
    const eventMatches = html.match(/"event":{[^}]+}/g) || []
    
    eventMatches.forEach((match, index) => {
      try {
        const eventData = JSON.parse(`{${match}}`).event
        events.push({
          external_id: eventData.id || `eventbrite_${venue.id}_${index}`,
          title: eventData.name || 'Untitled Event',
          description: eventData.description,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          ticket_url: eventData.url,
          price_min: null,
          price_max: null,
          category: 'general',
          source: 'eventbrite',
          source_url: eventData.url || venue.source_url,
          image_url: eventData.image_url,
          organizer: null,
          capacity: null,
          attendee_count: null
        })
      } catch (parseError) {
        console.error('Failed to parse Eventbrite event:', parseError)
      }
    })
    
    return events
  }

  private parseMeetupPageEvents(html: string, venue: any): EventData[] {
    const events: EventData[] = []
    
    // Parse Meetup venue page HTML
    const eventMatches = html.match(/"event":{[^}]+}/g) || []
    
    eventMatches.forEach((match, index) => {
      try {
        const eventData = JSON.parse(`{${match}}`).event
        events.push({
          external_id: eventData.id || `meetup_${venue.id}_${index}`,
          title: eventData.name || 'Untitled Event',
          description: eventData.description,
          start_time: eventData.time,
          end_time: null,
          ticket_url: eventData.link,
          price_min: null,
          price_max: null,
          category: 'meetup',
          source: 'meetup',
          source_url: eventData.link || venue.source_url,
          image_url: null,
          organizer: null,
          capacity: null,
          attendee_count: eventData.yes_rsvp_count
        })
      } catch (parseError) {
        console.error('Failed to parse Meetup event:', parseError)
      }
    })
    
    return events
  }

  private parseYelpPageEvents(html: string, venue: any): EventData[] {
    const events: EventData[] = []
    
    // Parse Yelp events page HTML (simplified)
    const eventMatches = html.match(/class="event-card[^>]*>([\s\S]*?)<\/div>/g) || []
    
    eventMatches.forEach((match, index) => {
      try {
        const titleMatch = match.match(/class="event-title[^>]*>([^<]+)</)
        const dateMatch = match.match(/class="event-date[^>]*>([^<]+)</)
        
        if (titleMatch && dateMatch) {
          events.push({
            external_id: `yelp_${venue.id}_${index}`,
            title: titleMatch[1].trim(),
            description: null,
            start_time: this.parseYelpDate(dateMatch[1].trim()),
            end_time: null,
            ticket_url: venue.source_url,
            price_min: null,
            price_max: null,
            category: 'general',
            source: 'yelp',
            source_url: venue.source_url,
            image_url: null,
            organizer: null,
            capacity: null,
            attendee_count: null
          })
        }
      } catch (parseError) {
        console.error('Failed to parse Yelp event:', parseError)
      }
    })
    
    return events
  }

  private parseGenericPageEvents(html: string, venue: any): EventData[] {
    const events: EventData[] = []
    
    // Generic event parsing using common patterns
    const eventKeywords = ['event', 'show', 'concert', 'performance', 'workshop']
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi
    ]
    
    // This is a simplified generic parser
    // In practice, you'd want more sophisticated extraction
    
    return events
  }

  private parseYelpDate(dateStr: string): string {
    try {
      // Parse Yelp date format and convert to ISO
      const date = new Date(dateStr)
      return date.toISOString()
    } catch (error) {
      console.error('Failed to parse Yelp date:', error)
      return new Date().toISOString()
    }
  }

  private detectSourceFromUrl(url: string): string {
    if (url.includes('eventbrite.com')) return 'eventbrite'
    if (url.includes('meetup.com')) return 'meetup'
    if (url.includes('facebook.com')) return 'facebook_events'
    if (url.includes('ticketmaster.com')) return 'ticketmaster'
    if (url.includes('yelp.com')) return 'yelp'
    if (url.includes('foursquare.com')) return 'foursquare'
    return 'generic'
  }

  private async createOrUpdateEvent(eventData: EventData, venueId: string): Promise<{
    created: boolean
    updated: boolean
    event?: any
  }> {
    try {
      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id, updated_at')
        .eq('external_id', eventData.external_id)
        .eq('source', eventData.source)
        .single()

      const eventRecord = {
        ...eventData,
        venue_id: venueId,
        updated_at: new Date().toISOString()
      }

      if (existingEvent) {
        // Update existing event
        const { data, error } = await supabase
          .from('events')
          .update(eventRecord)
          .eq('id', existingEvent.id)
          .select()
          .single()

        if (error) {
          console.error('Failed to update event:', error)
          return { created: false, updated: false }
        }
        
        return { created: false, updated: true, event: data }
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert({
            ...eventRecord,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Failed to create event:', error)
          return { created: false, updated: false }
        }
        
        return { created: true, updated: false, event: data }
      }
    } catch (error) {
      console.error('Event creation/update error:', error)
      return { created: false, updated: false }
    }
  }

  private async updateVenueMetadata(venueId: string, metadata: any): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .update(metadata)
      .eq('id', venueId)

    if (error) {
      console.error('Failed to update venue metadata:', error)
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { venue_id, target, options }: VenueScrapingRequest = await req.json()
    
    if (!venue_id && !target) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either venue_id or target URL is required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const scraper = new VenueScraper()
    let result: ScrapingResult
    
    if (venue_id) {
      console.log(`Starting venue scraping for venue ID: ${venue_id}`)
      result = await scraper.scrapeVenue(venue_id, options || {})
    } else {
      console.log(`Starting venue scraping for URL: ${target}`)
      result = await scraper.scrapeVenueByUrl(target!, options || {})
    }
    
    console.log('Venue scraping completed:', result)
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Venue scraper error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        events_found: 0,
        events_created: 0,
        events_updated: 0,
        duration: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})