import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Toronto-specific event sources
const TORONTO_SCRAPERS = {
  eventbrite: 'https://www.eventbrite.ca/d/canada--toronto/events/',
  meetup: 'https://www.meetup.com/find/?location=Toronto%2C+ON',
  ticketmaster: 'https://www.ticketmaster.ca/browse/concerts-catid-10001/sports-catid-10004?city=Toronto',
  blogto: 'https://www.blogto.com/events/',
  toronto_com: 'https://www.toronto.com/events/',
  now_magazine: 'https://nowtoronto.com/events'
}

async function scrapeTorontoEvents() {
  const events = []
  
  // Scrape Eventbrite Toronto
  try {
    const response = await fetch('https://www.eventbrite.ca/api/v3/events/search/?location.address=Toronto,ON&expand=venue', {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('EVENTBRITE_API_KEY')}`,
        'User-Agent': 'SceneScout/1.0'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      
      for (const event of data.events || []) {
        if (event.venue?.latitude && event.venue?.longitude) {
          events.push({
            title: event.name?.text || 'Untitled Event',
            description: event.description?.text || '',
            date: event.start?.local?.split('T')[0],
            time: event.start?.local?.split('T')[1]?.substring(0, 5) + ':00',
            venue_name: event.venue?.name || 'TBA',
            address: event.venue?.address?.localized_address_display || '',
            latitude: parseFloat(event.venue.latitude),
            longitude: parseFloat(event.venue.longitude),
            category: categorizeEvent(event.name?.text + ' ' + event.description?.text),
            price_min: event.ticket_availability?.minimum_ticket_price?.major_value || 0,
            is_free: event.is_free || false,
            external_url: event.url,
            external_id: `eventbrite-${event.id}`,
            source: 'eventbrite',
            image_url: event.logo?.url
          })
        }
      }
    }
  } catch (error) {
    console.error('Eventbrite scraping failed:', error)
  }

  // Scrape Meetup Toronto
  try {
    const meetupResponse = await fetch('https://api.meetup.com/find/events?location=Toronto,ON&radius=25', {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MEETUP_API_KEY')}`,
        'User-Agent': 'SceneScout/1.0'
      }
    })
    
    if (meetupResponse.ok) {
      const meetupData = await meetupResponse.json()
      
      for (const event of meetupData || []) {
        if (event.venue?.lat && event.venue?.lon) {
          events.push({
            title: event.name || 'Meetup Event',
            description: event.description || '',
            date: new Date(event.time).toISOString().split('T')[0],
            time: new Date(event.time).toTimeString().substring(0, 8),
            venue_name: event.venue?.name || event.group?.name || 'TBA',
            address: `${event.venue?.address_1 || ''}, Toronto, ON`,
            latitude: event.venue.lat,
            longitude: event.venue.lon,
            category: 'social',
            price_min: 0,
            is_free: true,
            external_url: event.link,
            external_id: `meetup-${event.id}`,
            source: 'meetup'
          })
        }
      }
    }
  } catch (error) {
    console.error('Meetup scraping failed:', error)
  }

  return events
}

function categorizeEvent(text: string): string {
  const categories = {
    sports: ['hockey', 'raptors', 'tfc', 'baseball', 'basketball', 'soccer', 'game', 'match'],
    music: ['concert', 'music', 'band', 'dj', 'festival', 'live', 'performance'],
    food: ['food', 'restaurant', 'dining', 'wine', 'beer', 'culinary', 'tasting'],
    tech: ['tech', 'startup', 'developer', 'coding', 'ai', 'data', 'software'],
    arts: ['art', 'gallery', 'museum', 'theater', 'theatre', 'exhibition', 'show'],
    social: ['meetup', 'networking', 'social', 'community', 'group']
  }
  
  text = text.toLowerCase()
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category
    }
  }
  return 'social'
}

serve(async (req) => {
  try {
    console.log('Starting Toronto event scraping...')
    
    const events = await scrapeTorontoEvents()
    
    if (events.length > 0) {
      // Clear old events and insert new ones
      await supabase
        .from('events')
        .delete()
        .in('source', ['eventbrite', 'meetup'])
      
      const { data, error } = await supabase
        .from('events')
        .insert(events)
        .select()
      
      if (error) {
        throw error
      }
      
      console.log(`✅ Scraped and stored ${data.length} Toronto events`)
      
      return new Response(JSON.stringify({
        success: true,
        events_scraped: data.length,
        sources: ['eventbrite', 'meetup'],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'No events found',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Scraping error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
