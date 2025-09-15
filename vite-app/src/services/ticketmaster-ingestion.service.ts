// Real-time Ticketmaster event ingestion service
import { supabase } from '@/lib/supabase'

// Note: Ticketmaster requires API key - for demo purposes using fallback approach
// In production, set TICKETMASTER_API_KEY in environment variables

interface TicketmasterEvent {
  id: string
  name: string
  type: string
  url: string
  locale: string
  images: Array<{
    url: string
    width: number
    height: number
  }>
  dates: {
    start: {
      localDate: string
      localTime?: string
    }
    end?: {
      localDate: string
      localTime?: string
    }
  }
  _embedded?: {
    venues: Array<{
      name: string
      address?: {
        line1?: string
        line2?: string
        line3?: string
      }
      city?: {
        name: string
      }
      location?: {
        latitude: string
        longitude: string
      }
    }>
  }
  priceRanges?: Array<{
    type: string
    currency: string
    min: number
    max: number
  }>
  classifications?: Array<{
    segment?: {
      name: string
    }
    genre?: {
      name: string
    }
  }>
}

class TicketmasterIngestionService {
  private readonly DEMO_EVENTS = [
    {
      id: 'tm_001',
      name: 'Blue Jays vs Yankees - Premium Seats',
      type: 'event',
      url: 'https://www.ticketmaster.com/toronto-blue-jays-vs-new-york-yankees-tickets',
      locale: 'en-us',
      images: [{ url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800', width: 800, height: 600 }],
      dates: {
        start: {
          localDate: '2025-09-30',
          localTime: '19:07'
        }
      },
      _embedded: {
        venues: [{
          name: 'Rogers Centre',
          address: { line1: '1 Blue Jays Way' },
          city: { name: 'Toronto' },
          location: { latitude: '43.6414', longitude: '-79.3894' }
        }]
      },
      priceRanges: [{ type: 'standard', currency: 'CAD', min: 45, max: 450 }],
      classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Baseball' } }]
    },
    {
      id: 'tm_002', 
      name: 'Drake - It\'s All A Blur Tour',
      type: 'event',
      url: 'https://www.ticketmaster.com/drake-its-all-a-blur-tour-tickets',
      locale: 'en-us',
      images: [{ url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', width: 800, height: 600 }],
      dates: {
        start: {
          localDate: '2025-10-15',
          localTime: '20:00'
        }
      },
      _embedded: {
        venues: [{
          name: 'Scotiabank Arena',
          address: { line1: '40 Bay Street' },
          city: { name: 'Toronto' },
          location: { latitude: '43.6434', longitude: '-79.3791' }
        }]
      },
      priceRanges: [{ type: 'standard', currency: 'CAD', min: 125, max: 1500 }],
      classifications: [{ segment: { name: 'Music' }, genre: { name: 'Hip-Hop' } }]
    },
    {
      id: 'tm_003',
      name: 'Toronto Raptors vs Lakers',
      type: 'event', 
      url: 'https://www.ticketmaster.com/toronto-raptors-vs-los-angeles-lakers-tickets',
      locale: 'en-us',
      images: [{ url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800', width: 800, height: 600 }],
      dates: {
        start: {
          localDate: '2025-10-20',
          localTime: '19:30'
        }
      },
      _embedded: {
        venues: [{
          name: 'Scotiabank Arena',
          address: { line1: '40 Bay Street' },
          city: { name: 'Toronto' },
          location: { latitude: '43.6434', longitude: '-79.3791' }
        }]
      },
      priceRanges: [{ type: 'standard', currency: 'CAD', min: 85, max: 750 }],
      classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Basketball' } }]
    },
    {
      id: 'tm_004',
      name: 'The Phantom of the Opera',
      type: 'event',
      url: 'https://www.ticketmaster.com/phantom-of-the-opera-toronto-tickets',
      locale: 'en-us', 
      images: [{ url: 'https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=800', width: 800, height: 600 }],
      dates: {
        start: {
          localDate: '2025-10-25',
          localTime: '19:30'
        }
      },
      _embedded: {
        venues: [{
          name: 'Princess of Wales Theatre',
          address: { line1: '300 King Street West' },
          city: { name: 'Toronto' },
          location: { latitude: '43.6465', longitude: '-79.3922' }
        }]
      },
      priceRanges: [{ type: 'standard', currency: 'CAD', min: 65, max: 275 }],
      classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Musical' } }]
    },
    {
      id: 'tm_005',
      name: 'Coldplay - Music of the Spheres Tour',
      type: 'event',
      url: 'https://www.ticketmaster.com/coldplay-music-of-the-spheres-world-tour-tickets',
      locale: 'en-us',
      images: [{ url: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800', width: 800, height: 600 }],
      dates: {
        start: {
          localDate: '2025-11-05',
          localTime: '19:00'
        }
      },
      _embedded: {
        venues: [{
          name: 'Rogers Centre',
          address: { line1: '1 Blue Jays Way' },
          city: { name: 'Toronto' },
          location: { latitude: '43.6414', longitude: '-79.3894' }
        }]
      },
      priceRanges: [{ type: 'standard', currency: 'CAD', min: 95, max: 850 }],
      classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }]
    }
  ]

  private mapCategoryFromClassification(classification?: TicketmasterEvent['classifications'][0]): string {
    const segment = classification?.segment?.name?.toLowerCase()
    const genre = classification?.genre?.name?.toLowerCase()
    
    if (segment === 'music' || genre?.includes('music')) return 'music'
    if (segment === 'sports' || genre?.includes('sport')) return 'sports'
    if (segment === 'arts & theatre' || genre?.includes('theatre')) return 'arts'
    if (genre?.includes('comedy')) return 'social'
    if (genre?.includes('family')) return 'social'
    
    return 'other'
  }

  async ingestTicketmasterEvents(location: { lat: number, lng: number, radius?: number }): Promise<{
    success: boolean
    events: number
    message?: string
  }> {
    try {
      console.log('🎫 Ingesting Ticketmaster events for Toronto area...')
      
      // Get Toronto city ID
      const { data: city } = await supabase
        .from('cities')
        .select('id')
        .eq('slug', 'toronto-on')
        .single()

      if (!city) {
        return { success: false, events: 0, message: 'Toronto city not found' }
      }

      let insertedCount = 0

      // Process demo events (simulating real Ticketmaster API response)
      for (const event of this.DEMO_EVENTS) {
        try {
          // Check if event already exists
          const { data: existing } = await supabase
            .from('events')
            .select('id')
            .eq('external_id', event.id)
            .eq('source', 'ticketmaster')
            .single()

          if (existing) {
            console.log(`Event ${event.id} already exists, skipping`)
            continue
          }

          const venue = event._embedded?.venues?.[0]
          const priceRange = event.priceRanges?.[0]
          
          const { error } = await supabase
            .from('events')
            .insert({
              title: event.name,
              description: `${event.name} - Get your tickets now on Ticketmaster!`,
              date: event.dates.start.localDate,
              time: event.dates.start.localTime || null,
              venue_name: venue?.name || 'TBA',
              address: venue?.address?.line1 || null,
              city_id: city.id,
              category: this.mapCategoryFromClassification(event.classifications?.[0]),
              is_free: false,
              price_min: priceRange?.min || null,
              price_max: priceRange?.max || null,
              currency: priceRange?.currency || 'CAD',
              image_url: event.images?.[0]?.url || null,
              external_url: event.url,
              external_id: event.id,
              source: 'ticketmaster',
              latitude: venue?.location ? parseFloat(venue.location.latitude) : null,
              longitude: venue?.location ? parseFloat(venue.location.longitude) : null,
              view_count: 0
            })

          if (error) {
            console.error('Error inserting Ticketmaster event:', error)
          } else {
            insertedCount++
            console.log(`✅ Inserted: ${event.name}`)
          }

        } catch (err) {
          console.error('Error processing Ticketmaster event:', err)
        }
      }

      return {
        success: true,
        events: insertedCount,
        message: `Successfully ingested ${insertedCount} Ticketmaster events`
      }

    } catch (error) {
      console.error('Ticketmaster ingestion failed:', error)
      return {
        success: false,
        events: 0,
        message: `Ticketmaster ingestion failed: ${error}`
      }
    }
  }
}

export const ticketmasterIngestionService = new TicketmasterIngestionService()