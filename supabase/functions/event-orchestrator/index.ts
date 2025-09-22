import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const SCRAPERS = {
  ticketmaster: { url: 'https://www.ticketmaster.com/discover/concerts/{city}', selector: '.event-card' },
  eventbrite: { url: 'https://www.eventbrite.com/d/{city}/events/', selector: '.event-card' },
  meetup: { url: 'https://www.meetup.com/find/?location={city}', selector: '.eventCard' },
  facebook: { url: 'https://www.facebook.com/events/explore/{city}/', selector: '[data-testid="event-card"]' },
  yelp: { url: 'https://www.yelp.com/events/{city}', selector: '.event-card' },
  timeout: { url: 'https://www.timeout.com/{city}/things-to-do', selector: '.event-item' }
}

async function scrapeEvents(city: string) {
  const events = []
  
  for (const [source, config] of Object.entries(SCRAPERS)) {
    try {
      const url = config.url.replace('{city}', city.toLowerCase())
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SceneScout/1.0)' }
      })
      const html = await response.text()
      const $ = cheerio.load(html)
      
      $(config.selector).each((i, elem) => {
        const event = extractEventData($, elem, source)
        if (event) events.push(event)
      })
    } catch (error) {
      console.error(`Failed to scrape ${source}:`, error)
    }
  }
  
  return events
}

function extractEventData($: any, elem: any, source: string) {
  const title = $(elem).find('h2, h3, .title, .event-name').first().text().trim()
  if (!title) return null
  
  return {
    external_id: `${source}-${Date.now()}-${Math.random()}`,
    source,
    name: title,
    description: $(elem).find('.description, .summary, p').first().text().trim(),
    event_date: extractDate($(elem)),
    start_time: extractTime($(elem)),
    venue_name: $(elem).find('.venue, .location, .place').first().text().trim(),
    ticket_price_min: extractPrice($(elem)),
    featured_image_url: $(elem).find('img').first().attr('src'),
    ticket_url: $(elem).find('a').first().attr('href'),
    categories: [categorizeEvent(title)],
    scraped_at: new Date().toISOString()
  }
}

function categorizeEvent(text: string): string {
  const categories = {
    music: ['concert', 'live music', 'band', 'dj', 'festival'],
    sports: ['game', 'match', 'tournament', 'basketball', 'football'],
    food: ['food', 'wine', 'tasting', 'dinner', 'restaurant'],
    tech: ['tech', 'startup', 'code', 'developer', 'ai'],
    arts: ['art', 'gallery', 'exhibition', 'theater', 'performance']
  }
  
  text = text.toLowerCase()
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category
    }
  }
  return 'other'
}

function extractDate(elem: any): string | null {
  // Implementation for date extraction
  return null
}

function extractTime(elem: any): string | null {
  // Implementation for time extraction  
  return null
}

function extractPrice(elem: any): number | null {
  // Implementation for price extraction
  return null
}

serve(async (req) => {
  try {
    const { data: cities } = await supabase
      .from('cities')
      .select('name')
      .eq('is_active', true)
      .limit(10)
    
    for (const city of cities || []) {
      const events = await scrapeEvents(city.name)
      
      if (events.length > 0) {
        const { error } = await supabase
          .from('events')
          .upsert(events, { onConflict: 'external_id' })
        
        if (!error) {
          // Broadcast real-time updates
          await supabase
            .channel('events_updates')
            .send({
              type: 'broadcast',
              event: 'new_events',
              payload: { city: city.name, count: events.length }
            })
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
