const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Real events using the correct schema
const realEvents = [
  {
    title: 'Broadway Show: The Lion King',
    description: 'Experience the magic of Disney\'s The Lion King on Broadway',
    date: '2025-09-22',
    time: '19:00:00',
    venue_name: 'Minskoff Theatre',
    address: '1515 Broadway, New York, NY 10036',
    latitude: 40.7589,
    longitude: -73.9851,
    category: 'arts',
    price_min: 89,
    external_url: 'https://www.broadway.com/shows/lion-king/',
    source: 'manual',
    is_featured: true,
    external_id: 'broadway-lion-king-nyc'
  },
  {
    title: 'Yankees vs Red Sox',
    description: 'Classic rivalry game at Yankee Stadium',
    date: '2025-09-23',
    time: '19:05:00',
    venue_name: 'Yankee Stadium',
    address: '1 E 161st St, Bronx, NY 10451',
    latitude: 40.8296,
    longitude: -73.9262,
    category: 'sports',
    price_min: 25,
    source: 'manual',
    external_id: 'yankees-red-sox-2025'
  },
  {
    title: 'Central Park Jazz Festival',
    description: 'Free outdoor jazz performances in Central Park',
    date: '2025-09-24',
    time: '18:00:00',
    venue_name: 'Central Park SummerStage',
    address: 'Rumsey Playfield, Central Park, NY',
    latitude: 40.7711,
    longitude: -73.9711,
    category: 'music',
    price_min: 0,
    is_free: true,
    source: 'manual',
    external_id: 'central-park-jazz-2025'
  },
  {
    title: 'Lakers vs Warriors',
    description: 'NBA game at Crypto.com Arena',
    date: '2025-09-25',
    time: '20:00:00',
    venue_name: 'Crypto.com Arena',
    address: '1111 S Figueroa St, Los Angeles, CA 90015',
    latitude: 34.0430,
    longitude: -118.2673,
    category: 'sports',
    price_min: 45,
    source: 'manual',
    external_id: 'lakers-warriors-la-2025'
  },
  {
    title: 'Hollywood Bowl Concert',
    description: 'LA Philharmonic performs under the stars',
    date: '2025-09-26',
    time: '20:00:00',
    venue_name: 'Hollywood Bowl',
    address: '2301 Highland Ave, Los Angeles, CA 90068',
    latitude: 34.1122,
    longitude: -118.3394,
    category: 'music',
    price_min: 35,
    source: 'manual',
    is_featured: true,
    external_id: 'hollywood-bowl-concert-2025'
  },
  {
    title: 'Giants vs Dodgers',
    description: 'Baseball at Oracle Park with bay views',
    date: '2025-09-27',
    time: '19:15:00',
    venue_name: 'Oracle Park',
    address: '24 Willie Mays Plaza, San Francisco, CA 94107',
    latitude: 37.7786,
    longitude: -122.3893,
    category: 'sports',
    price_min: 20,
    source: 'manual',
    external_id: 'giants-dodgers-sf-2025'
  },
  {
    title: 'Tech Meetup: AI & Machine Learning',
    description: 'Monthly meetup for AI enthusiasts and developers',
    date: '2025-09-28',
    time: '18:30:00',
    venue_name: 'GitHub HQ',
    address: '88 Colin P Kelly Jr St, San Francisco, CA 94107',
    latitude: 37.7820,
    longitude: -122.3924,
    category: 'tech',
    price_min: 0,
    is_free: true,
    source: 'manual',
    external_id: 'ai-ml-meetup-sf-2025'
  }
]

async function addRealEvents() {
  console.log('Adding real events with correct schema...')
  
  try {
    // Clear existing test/mock events
    await supabase
      .from('events')
      .delete()
      .in('source', ['test', 'mock'])
    
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
    
    // Test location query
    const { data: nearbyEvents } = await supabase
      .from('events')
      .select('title, venue_name, latitude, longitude, category')
      .not('latitude', 'is', null)
      .limit(10)
    
    console.log('\n📍 Events with locations:')
    nearbyEvents?.forEach(event => {
      console.log(`  ${event.title} - ${event.venue_name} (${event.latitude}, ${event.longitude})`)
    })
    
  } catch (error) {
    console.error('Failed to add events:', error)
  }
}

addRealEvents()
