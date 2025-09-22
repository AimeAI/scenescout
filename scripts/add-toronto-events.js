const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Toronto events with correct coordinates
const torontoEvents = [
  {
    title: 'Raptors vs Lakers',
    description: 'NBA game at Scotiabank Arena in downtown Toronto',
    date: '2025-09-22',
    time: '19:30:00',
    venue_name: 'Scotiabank Arena',
    address: '40 Bay St, Toronto, ON M5J 2X2',
    latitude: 43.6434,
    longitude: -79.3791,
    category: 'sports',
    price_min: 35,
    source: 'manual',
    external_id: 'raptors-lakers-toronto-2025'
  },
  {
    title: 'Toronto Symphony Orchestra',
    description: 'Classical music performance at Roy Thomson Hall',
    date: '2025-09-23',
    time: '20:00:00',
    venue_name: 'Roy Thomson Hall',
    address: '60 Simcoe St, Toronto, ON M5J 2H5',
    latitude: 43.6465,
    longitude: -79.3871,
    category: 'music',
    price_min: 45,
    source: 'manual',
    is_featured: true,
    external_id: 'tso-concert-toronto-2025'
  },
  {
    title: 'CN Tower EdgeWalk',
    description: 'Thrilling outdoor walk around the CN Tower',
    date: '2025-09-24',
    time: '14:00:00',
    venue_name: 'CN Tower',
    address: '290 Bremner Blvd, Toronto, ON M5V 3L9',
    latitude: 43.6426,
    longitude: -79.3871,
    category: 'social',
    price_min: 225,
    source: 'manual',
    external_id: 'cn-tower-edgewalk-2025'
  },
  {
    title: 'Distillery District Food Festival',
    description: 'Local food vendors and craft beer in historic district',
    date: '2025-09-25',
    time: '12:00:00',
    venue_name: 'Distillery District',
    address: '55 Mill St, Toronto, ON M5A 3C4',
    latitude: 43.6503,
    longitude: -79.3599,
    category: 'food',
    price_min: 0,
    is_free: true,
    source: 'manual',
    external_id: 'distillery-food-fest-2025'
  },
  {
    title: 'Tech Toronto Meetup',
    description: 'Monthly tech networking event for developers',
    date: '2025-09-26',
    time: '18:30:00',
    venue_name: 'MaRS Discovery District',
    address: '101 College St, Toronto, ON M5G 1L7',
    latitude: 43.6596,
    longitude: -79.3896,
    category: 'tech',
    price_min: 0,
    is_free: true,
    source: 'manual',
    external_id: 'tech-toronto-meetup-2025'
  },
  {
    title: 'Art Gallery of Ontario Exhibition',
    description: 'Contemporary Canadian art exhibition',
    date: '2025-09-27',
    time: '10:00:00',
    venue_name: 'Art Gallery of Ontario',
    address: '317 Dundas St W, Toronto, ON M5T 1G4',
    latitude: 43.6536,
    longitude: -79.3925,
    category: 'arts',
    price_min: 25,
    source: 'manual',
    external_id: 'ago-exhibition-2025'
  }
]

async function addTorontoEvents() {
  console.log('Adding Toronto events...')
  
  try {
    // Clear existing events to avoid confusion
    await supabase
      .from('events')
      .delete()
      .neq('latitude', 43.6532) // Keep only Toronto area events
    
    const { data, error } = await supabase
      .from('events')
      .insert(torontoEvents)
      .select()
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    console.log(`✅ Added ${data.length} Toronto events`)
    
    // Test Toronto location query
    const { data: nearbyEvents } = await supabase
      .from('events')
      .select('title, venue_name, latitude, longitude')
      .gte('latitude', 43.6)
      .lte('latitude', 43.7)
      .gte('longitude', -79.5)
      .lte('longitude', -79.3)
    
    console.log('\n📍 Toronto events:')
    nearbyEvents?.forEach(event => {
      console.log(`  ${event.title} - ${event.venue_name}`)
    })
    
  } catch (error) {
    console.error('Failed:', error)
  }
}

addTorontoEvents()
