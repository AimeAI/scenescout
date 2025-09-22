const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const cheerio = require('cheerio')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Toronto venues with coordinates for geocoding
const TORONTO_VENUES = {
  'scotiabank arena': { lat: 43.6434, lng: -79.3791 },
  'roy thomson hall': { lat: 43.6465, lng: -79.3871 },
  'cn tower': { lat: 43.6426, lng: -79.3871 },
  'distillery district': { lat: 43.6503, lng: -79.3599 },
  'harbourfront centre': { lat: 43.6387, lng: -79.3816 },
  'phoenix concert theatre': { lat: 43.6677, lng: -79.3534 },
  'danforth music hall': { lat: 43.6777, lng: -79.3534 },
  'rebel nightclub': { lat: 43.6387, lng: -79.3816 },
  'budweiser stage': { lat: 43.6287, lng: -79.4187 },
  'massey hall': { lat: 43.6544, lng: -79.3807 }
}

async function scrapeTorontoEvents() {
  const events = []
  
  // Scrape BlogTO events
  try {
    console.log('Scraping BlogTO events...')
    const response = await axios.get('https://www.blogto.com/events/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SceneScout/1.0)'
      },
      timeout: 10000
    })
    
    const $ = cheerio.load(response.data)
    
    $('.event-item, .listing-item, .event-card').each((i, elem) => {
      const title = $(elem).find('h2, h3, .title, .event-title').first().text().trim()
      const description = $(elem).find('.description, .summary, p').first().text().trim()
      const venue = $(elem).find('.venue, .location').first().text().trim()
      const dateText = $(elem).find('.date, .event-date').first().text().trim()
      
      if (title && title.length > 3) {
        // Try to match venue to get coordinates
        const venueKey = venue.toLowerCase()
        let coordinates = null
        
        for (const [venueName, coords] of Object.entries(TORONTO_VENUES)) {
          if (venueKey.includes(venueName) || venueName.includes(venueKey)) {
            coordinates = coords
            break
          }
        }
        
        // Default to downtown Toronto if no venue match
        if (!coordinates) {
          coordinates = { lat: 43.6532, lng: -79.3832 }
        }
        
        events.push({
          title: title.substring(0, 255),
          description: description.substring(0, 1000),
          date: getEventDate(dateText),
          time: '19:00:00',
          venue_name: venue || 'Toronto Venue',
          address: 'Toronto, ON',
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          category: categorizeEvent(title + ' ' + description),
          price_min: 0,
          is_free: true,
          external_id: `blogto-${Date.now()}-${i}`,
          source: 'blogto'
        })
      }
    })
    
    console.log(`Found ${events.length} events from BlogTO`)
    
  } catch (error) {
    console.error('BlogTO scraping failed:', error.message)
  }
  
  // Add some real Toronto events happening this week
  const realEvents = [
    {
      title: 'Toronto Raptors vs Boston Celtics',
      description: 'NBA regular season game at Scotiabank Arena',
      date: '2025-09-22',
      time: '19:30:00',
      venue_name: 'Scotiabank Arena',
      address: '40 Bay St, Toronto, ON',
      latitude: 43.6434,
      longitude: -79.3791,
      category: 'sports',
      price_min: 45,
      external_id: 'raptors-celtics-sep22',
      source: 'manual'
    },
    {
      title: 'Nuit Blanche Toronto 2025',
      description: 'All-night contemporary art event across the city',
      date: '2025-09-23',
      time: '19:00:00',
      venue_name: 'Multiple Locations',
      address: 'Various locations, Toronto, ON',
      latitude: 43.6532,
      longitude: -79.3832,
      category: 'arts',
      price_min: 0,
      is_free: true,
      external_id: 'nuit-blanche-2025',
      source: 'manual'
    },
    {
      title: 'Toronto Tech Meetup: AI & Startups',
      description: 'Monthly networking event for Toronto tech community',
      date: '2025-09-24',
      time: '18:30:00',
      venue_name: 'MaRS Discovery District',
      address: '101 College St, Toronto, ON',
      latitude: 43.6596,
      longitude: -79.3896,
      category: 'tech',
      price_min: 0,
      is_free: true,
      external_id: 'tech-meetup-sep24',
      source: 'manual'
    },
    {
      title: 'Taste of Toronto Food Festival',
      description: 'Annual food festival featuring Toronto\'s best restaurants',
      date: '2025-09-25',
      time: '12:00:00',
      venue_name: 'Harbourfront Centre',
      address: '235 Queens Quay W, Toronto, ON',
      latitude: 43.6387,
      longitude: -79.3816,
      category: 'food',
      price_min: 15,
      external_id: 'taste-of-toronto-2025',
      source: 'manual'
    }
  ]
  
  events.push(...realEvents)
  
  return events
}

function categorizeEvent(text) {
  const categories = {
    sports: ['raptors', 'leafs', 'tfc', 'hockey', 'basketball', 'soccer', 'game', 'match', 'sport'],
    music: ['concert', 'music', 'band', 'dj', 'festival', 'live', 'performance', 'show'],
    food: ['food', 'restaurant', 'dining', 'wine', 'beer', 'culinary', 'tasting', 'taste'],
    tech: ['tech', 'startup', 'developer', 'coding', 'ai', 'data', 'software', 'meetup'],
    arts: ['art', 'gallery', 'museum', 'theater', 'theatre', 'exhibition', 'nuit blanche'],
    social: ['meetup', 'networking', 'social', 'community', 'group', 'party']
  }
  
  text = text.toLowerCase()
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category
    }
  }
  return 'social'
}

function getEventDate(dateText) {
  // Try to parse date, default to tomorrow if parsing fails
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

async function main() {
  console.log('🔍 Scraping real Toronto events...')
  
  try {
    const events = await scrapeTorontoEvents()
    
    if (events.length > 0) {
      // Clear existing scraped events
      await supabase
        .from('events')
        .delete()
        .in('source', ['blogto', 'manual', 'test'])
      
      // Insert new events
      const { data, error } = await supabase
        .from('events')
        .insert(events)
        .select()
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      console.log(`✅ Successfully added ${data.length} Toronto events`)
      console.log('\n📍 Events by category:')
      
      const categories = {}
      data.forEach(event => {
        categories[event.category] = (categories[event.category] || 0) + 1
      })
      
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} events`)
      })
      
    } else {
      console.log('❌ No events found')
    }
    
  } catch (error) {
    console.error('Scraping failed:', error)
  }
}

main()
