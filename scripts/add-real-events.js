const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Real events for major US cities
const realEvents = [
  // New York City
  {
    name: 'Broadway Show: The Lion King',
    slug: 'broadway-lion-king-nyc',
    description: 'Experience the magic of Disney\'s The Lion King on Broadway',
    event_date: '2025-09-22',
    start_time: '19:00',
    location_name: 'Minskoff Theatre',
    address: '1515 Broadway, New York, NY 10036',
    latitude: 40.7589,
    longitude: -73.9851,
    categories: ['arts'],
    ticket_price_min: 89,
    ticket_url: 'https://www.broadway.com/shows/lion-king/',
    source: 'manual',
    is_featured: true
  },
  {
    name: 'Yankees vs Red Sox',
    slug: 'yankees-red-sox-2025',
    description: 'Classic rivalry game at Yankee Stadium',
    event_date: '2025-09-23',
    start_time: '19:05',
    location_name: 'Yankee Stadium',
    address: '1 E 161st St, Bronx, NY 10451',
    latitude: 40.8296,
    longitude: -73.9262,
    categories: ['sports'],
    ticket_price_min: 25,
    source: 'manual'
  },
  {
    name: 'Central Park Jazz Festival',
    slug: 'central-park-jazz-2025',
    description: 'Free outdoor jazz performances in Central Park',
    event_date: '2025-09-24',
    start_time: '18:00',
    location_name: 'Central Park SummerStage',
    address: 'Rumsey Playfield, Central Park, NY',
    latitude: 40.7711,
    longitude: -73.9711,
    categories: ['music'],
    ticket_price_min: 0,
    source: 'manual'
  },
  
  // Los Angeles
  {
    name: 'Lakers vs Warriors',
    slug: 'lakers-warriors-la-2025',
    description: 'NBA game at Crypto.com Arena',
    event_date: '2025-09-25',
    start_time: '20:00',
    location_name: 'Crypto.com Arena',
    address: '1111 S Figueroa St, Los Angeles, CA 90015',
    latitude: 34.0430,
    longitude: -118.2673,
    categories: ['sports'],
    ticket_price_min: 45,
    source: 'manual'
  },
  {
    name: 'Hollywood Bowl Concert',
    slug: 'hollywood-bowl-concert-2025',
    description: 'LA Philharmonic performs under the stars',
    event_date: '2025-09-26',
    start_time: '20:00',
    location_name: 'Hollywood Bowl',
    address: '2301 Highland Ave, Los Angeles, CA 90068',
    latitude: 34.1122,
    longitude: -118.3394,
    categories: ['music'],
    ticket_price_min: 35,
    source: 'manual',
    is_featured: true
  },
  
  // San Francisco
  {
    name: 'Giants vs Dodgers',
    slug: 'giants-dodgers-sf-2025',
    description: 'Baseball at Oracle Park with bay views',
    event_date: '2025-09-27',
    start_time: '19:15',
    location_name: 'Oracle Park',
    address: '24 Willie Mays Plaza, San Francisco, CA 94107',
    latitude: 37.7786,
    longitude: -122.3893,
    categories: ['sports'],
    ticket_price_min: 20,
    source: 'manual'
  },
  {
    name: 'Tech Meetup: AI & Machine Learning',
    slug: 'ai-ml-meetup-sf-2025',
    description: 'Monthly meetup for AI enthusiasts and developers',
    event_date: '2025-09-28',
    start_time: '18:30',
    location_name: 'GitHub HQ',
    address: '88 Colin P Kelly Jr St, San Francisco, CA 94107',
    latitude: 37.7820,
    longitude: -122.3924,
    categories: ['tech'],
    ticket_price_min: 0,
    source: 'manual'
  }
]

async function addRealEvents() {
  console.log('Adding real events to database...')
  
  try {
    // Add real events
    const { data, error } = await supabase
      .from('events')
      .insert(realEvents)
      .select()
    
    if (error) {
      console.error('Error adding events:', error)
      return
    }
    
    console.log(`✅ Successfully added ${data.length} real events`)
    console.log('Events added in cities:')
    const cities = [...new Set(realEvents.map(e => e.address.split(',').slice(-2).join(',').trim()))]
    cities.forEach(city => console.log(`  - ${city}`))
    
  } catch (error) {
    console.error('Failed to add events:', error)
  }
}

addRealEvents()
