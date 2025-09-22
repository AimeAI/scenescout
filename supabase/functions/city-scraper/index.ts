import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ScrapingService } from '../_shared/scraping-service.ts'

interface CityScrapingRequest {
  target: string
  job_id?: string
  options?: {
    max_venues?: number
    max_events?: number
    categories?: string[]
    date_range?: {
      start: string
      end: string
    }
  }
}

interface ScrapingResult {
  success: boolean
  venues_found: number
  events_found: number
  error?: string
  duration: number
  city_data?: any
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

class CityScraper {
  private scrapingService: ScrapingService

  constructor() {
    this.scrapingService = new ScrapingService({
      userAgent: 'SceneScout City Scraper/1.0',
      maxRetries: 3,
      timeout: 30000,
      rateLimit: {
        requests: 10,
        window: 60000 // 1 minute
      }
    })
  }

  async scrapeCity(cityName: string, options: any = {}): Promise<ScrapingResult> {
    const startTime = Date.now()
    let venuesFound = 0
    let eventsFound = 0
    
    try {
      console.log(`Starting city scraping for: ${cityName}`)
      
      // Get or create city record
      const city = await this.getOrCreateCity(cityName)
      if (!city) {
        throw new Error(`Failed to create/find city: ${cityName}`)
      }

      // Scrape venues for the city
      const venues = await this.scrapeVenuesForCity(city, options)
      venuesFound = venues.length
      
      console.log(`Found ${venuesFound} venues for ${cityName}`)

      // Scrape events for each venue
      for (const venue of venues) {
        try {
          const events = await this.scrapeEventsForVenue(venue, options)
          eventsFound += events.length
          
          // Rate limiting between venues
          await this.delay(1000)
          
        } catch (error) {
          console.error(`Failed to scrape events for venue ${venue.id}:`, error)
        }
      }

      // Update city scraping metadata
      await this.updateCityMetadata(city.id, {
        last_scraped: new Date().toISOString(),
        venues_count: venuesFound,
        events_count: eventsFound
      })

      const duration = Date.now() - startTime
      
      return {
        success: true,
        venues_found: venuesFound,
        events_found: eventsFound,
        duration,
        city_data: city
      }
      
    } catch (error) {
      console.error('City scraping error:', error)
      
      return {
        success: false,
        venues_found: venuesFound,
        events_found: eventsFound,
        error: error.message,
        duration: Date.now() - startTime
      }
    }
  }

  private async getOrCreateCity(cityName: string): Promise<any> {
    // First try to find existing city
    const { data: existingCity } = await supabase
      .from('cities')
      .select('*')
      .ilike('name', cityName)
      .single()

    if (existingCity) {
      return existingCity
    }

    // Create new city if not found
    const cityData = await this.enrichCityData(cityName)
    
    const { data: newCity, error } = await supabase
      .from('cities')
      .insert(cityData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create city:', error)
      return null
    }

    return newCity
  }

  private async enrichCityData(cityName: string): Promise<any> {
    // Use geocoding to get city details
    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
      const response = await fetch(geocodeUrl)
      const results = await response.json()
      
      if (results.length > 0) {
        const location = results[0]
        return {
          name: cityName,
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
          country: this.extractCountry(location.display_name),
          state_province: this.extractStateProvince(location.display_name),
          population: null, // Could be enriched from other APIs
          timezone: await this.getTimezone(location.lat, location.lon),
          created_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }

    // Fallback basic city data
    return {
      name: cityName,
      latitude: null,
      longitude: null,
      country: null,
      state_province: null,
      population: null,
      timezone: null,
      created_at: new Date().toISOString()
    }
  }

  private async scrapeVenuesForCity(city: any, options: any): Promise<any[]> {
    const venues: any[] = []
    const maxVenues = options.max_venues || 100
    
    // Define venue sources to scrape
    const sources = [
      'eventbrite',
      'meetup',
      'facebook_events',
      'ticketmaster',
      'local_venues'
    ]

    for (const source of sources) {
      try {
        console.log(`Scraping venues from ${source} for ${city.name}`)
        
        const sourceVenues = await this.scrapeVenueSource(source, city, options)
        
        for (const venueData of sourceVenues) {
          if (venues.length >= maxVenues) break
          
          const venue = await this.createOrUpdateVenue(venueData, city.id)
          if (venue) {
            venues.push(venue)
          }
        }
        
        // Rate limiting between sources
        await this.delay(2000)
        
      } catch (error) {
        console.error(`Failed to scrape venues from ${source}:`, error)
      }
    }

    return venues
  }

  private async scrapeVenueSource(source: string, city: any, options: any): Promise<any[]> {
    switch (source) {
      case 'eventbrite':
        return await this.scrapeEventbriteVenues(city, options)
      case 'meetup':
        return await this.scrapeMeetupVenues(city, options)
      case 'facebook_events':
        return await this.scrapeFacebookVenues(city, options)
      case 'ticketmaster':
        return await this.scrapeTicketmasterVenues(city, options)
      case 'local_venues':
        return await this.scrapeLocalVenues(city, options)
      default:
        return []
    }
  }

  private async scrapeEventbriteVenues(city: any, options: any): Promise<any[]> {
    // Eventbrite API scraping logic
    const venues: any[] = []
    
    try {
      const searchUrl = `https://www.eventbrite.com/api/v3/events/search/`
      const params = new URLSearchParams({
        'location.address': city.name,
        'location.within': '25km',
        'expand': 'venue',
        'page_size': '50'
      })

      // Note: This would require API key in production
      const response = await this.scrapingService.fetchWithRetry(`${searchUrl}?${params}`)
      const data = await response.json()
      
      if (data.events) {
        const uniqueVenues = new Map()
        
        data.events.forEach((event: any) => {
          if (event.venue && event.venue.id) {
            uniqueVenues.set(event.venue.id, {
              external_id: event.venue.id,
              name: event.venue.name,
              address: event.venue.address?.localized_address_display,
              latitude: event.venue.latitude,
              longitude: event.venue.longitude,
              capacity: null,
              venue_type: 'general',
              source: 'eventbrite',
              source_url: `https://www.eventbrite.com/v/${event.venue.id}`
            })
          }
        })
        
        venues.push(...uniqueVenues.values())
      }
      
    } catch (error) {
      console.error('Eventbrite venue scraping error:', error)
    }
    
    return venues
  }

  private async scrapeMeetupVenues(city: any, options: any): Promise<any[]> {
    // Meetup.com venue scraping
    const venues: any[] = []
    
    try {
      // Web scraping approach since Meetup API has restrictions
      const searchUrl = `https://www.meetup.com/find/?location=${encodeURIComponent(city.name)}&source=EVENTS`
      
      const html = await this.scrapingService.fetchHtml(searchUrl)
      const venueMatches = html.match(/"venue":{[^}]+}/g) || []
      
      venueMatches.forEach((match, index) => {
        try {
          const venueData = JSON.parse(`{${match}}`).venue
          venues.push({
            external_id: `meetup_${venueData.id || index}`,
            name: venueData.name,
            address: venueData.address,
            latitude: venueData.lat,
            longitude: venueData.lon,
            capacity: null,
            venue_type: 'meetup_location',
            source: 'meetup',
            source_url: `https://www.meetup.com/venues/${venueData.id}`
          })
        } catch (parseError) {
          console.error('Failed to parse Meetup venue data:', parseError)
        }
      })
      
    } catch (error) {
      console.error('Meetup venue scraping error:', error)
    }
    
    return venues
  }

  private async scrapeFacebookVenues(city: any, options: any): Promise<any[]> {
    // Facebook Events venue scraping (placeholder - requires special handling)
    const venues: any[] = []
    
    // Facebook scraping is complex due to authentication requirements
    // This would typically require a more sophisticated approach
    console.log('Facebook venue scraping not implemented - requires special authentication')
    
    return venues
  }

  private async scrapeTicketmasterVenues(city: any, options: any): Promise<any[]> {
    // Ticketmaster venue scraping
    const venues: any[] = []
    
    try {
      const apiKey = Deno.env.get('TICKETMASTER_API_KEY')
      if (!apiKey) {
        console.log('Ticketmaster API key not found, skipping')
        return venues
      }
      
      const searchUrl = 'https://app.ticketmaster.com/discovery/v2/venues.json'
      const params = new URLSearchParams({
        apikey: apiKey,
        city: city.name,
        size: '100'
      })
      
      const response = await this.scrapingService.fetchWithRetry(`${searchUrl}?${params}`)
      const data = await response.json()
      
      if (data._embedded?.venues) {
        data._embedded.venues.forEach((venue: any) => {
          venues.push({
            external_id: venue.id,
            name: venue.name,
            address: venue.address?.line1,
            latitude: venue.location?.latitude,
            longitude: venue.location?.longitude,
            capacity: venue.capacity,
            venue_type: venue.classifications?.[0]?.segment?.name?.toLowerCase() || 'general',
            source: 'ticketmaster',
            source_url: venue.url
          })
        })
      }
      
    } catch (error) {
      console.error('Ticketmaster venue scraping error:', error)
    }
    
    return venues
  }

  private async scrapeLocalVenues(city: any, options: any): Promise<any[]> {
    // Local venue directory scraping (placeholder)
    const venues: any[] = []
    
    // This would scrape local venue directories, tourism sites, etc.
    console.log('Local venue scraping not implemented')
    
    return venues
  }

  private async createOrUpdateVenue(venueData: any, cityId: string): Promise<any> {
    try {
      // Check if venue already exists
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id')
        .eq('external_id', venueData.external_id)
        .eq('source', venueData.source)
        .single()

      if (existingVenue) {
        // Update existing venue
        const { data, error } = await supabase
          .from('venues')
          .update({
            ...venueData,
            city_id: cityId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVenue.id)
          .select()
          .single()

        if (error) {
          console.error('Failed to update venue:', error)
          return null
        }
        
        return data
      } else {
        // Create new venue
        const { data, error } = await supabase
          .from('venues')
          .insert({
            ...venueData,
            city_id: cityId,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Failed to create venue:', error)
          return null
        }
        
        return data
      }
    } catch (error) {
      console.error('Venue creation/update error:', error)
      return null
    }
  }

  private async scrapeEventsForVenue(venue: any, options: any): Promise<any[]> {
    // This would call the venue-scraper function
    try {
      const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/venue-scraper`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          venue_id: venue.id,
          options
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.events || []
      }
      
    } catch (error) {
      console.error('Failed to scrape events for venue:', error)
    }
    
    return []
  }

  private async updateCityMetadata(cityId: string, metadata: any): Promise<void> {
    const { error } = await supabase
      .from('cities')
      .update(metadata)
      .eq('id', cityId)

    if (error) {
      console.error('Failed to update city metadata:', error)
    }
  }

  private async getTimezone(lat: string, lon: string): Promise<string | null> {
    try {
      // Using a free timezone API
      const response = await fetch(`http://worldtimeapi.org/api/timezone/${lat},${lon}`)
      const data = await response.json()
      return data.timezone
    } catch (error) {
      console.error('Timezone lookup error:', error)
      return null
    }
  }

  private extractCountry(displayName: string): string | null {
    const parts = displayName.split(', ')
    return parts[parts.length - 1] || null
  }

  private extractStateProvince(displayName: string): string | null {
    const parts = displayName.split(', ')
    return parts.length > 2 ? parts[parts.length - 2] : null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { target, job_id, options }: CityScrapingRequest = await req.json()
    
    if (!target) {
      return new Response(
        JSON.stringify({ success: false, error: 'City name is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log(`Starting city scraping for: ${target}`)
    
    const scraper = new CityScraper()
    const result = await scraper.scrapeCity(target, options || {})
    
    console.log('City scraping completed:', result)
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('City scraper error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        venues_found: 0,
        events_found: 0,
        duration: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})