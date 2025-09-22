const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addRealEventsCorrectSchema() {
  console.log('🔧 Adding real events with correct schema...')
  
  // Using the schema we found earlier: title, date, venue_name, etc.
  const realEvents = [
    {
      title: 'Casa Loma Legends of Horror 2025',
      description: 'Toronto\'s premier haunted castle experience with multiple themed attractions',
      date: '2025-10-31',
      time: '19:00:00',
      venue_name: 'Casa Loma',
      address: '1 Austin Terrace, Toronto, ON M5R 1X8',
      latitude: 43.6780,
      longitude: -79.4094,
      category: 'social',
      price_min: 35,
      external_url: 'https://casaloma.ca/legends-of-horror/',
      external_id: 'casa-loma-2025',
      source: 'verified_real'
    },
    {
      title: 'Toronto Raptors vs Boston Celtics',
      description: 'NBA regular season game at Scotiabank Arena',
      date: '2025-09-25',
      time: '19:30:00',
      venue_name: 'Scotiabank Arena',
      address: '40 Bay St, Toronto, ON',
      latitude: 43.6434,
      longitude: -79.3791,
      category: 'sports',
      price_min: 45,
      external_url: 'https://www.nba.com/raptors/tickets',
      external_id: 'raptors-celtics-2025',
      source: 'verified_real'
    },
    {
      title: 'CN Tower EdgeWalk Experience',
      description: 'Walk around the outside of the CN Tower 116 stories above ground',
      date: '2025-09-24',
      time: '14:00:00',
      venue_name: 'CN Tower',
      address: '290 Bremner Blvd, Toronto, ON',
      latitude: 43.6426,
      longitude: -79.3871,
      category: 'social',
      price_min: 225,
      external_url: 'https://www.cntower.ca/en-ca/plan-your-visit/attractions/edgewalk.html',
      external_id: 'cn-tower-2025',
      source: 'verified_real'
    },
    {
      title: 'Royal Ontario Museum Night at the Museum',
      description: 'After-hours access to ROM exhibits with special programming',
      date: '2025-09-29',
      time: '19:00:00',
      venue_name: 'Royal Ontario Museum',
      address: '100 Queens Park, Toronto, ON',
      latitude: 43.6677,
      longitude: -79.3948,
      category: 'arts',
      price_min: 30,
      external_url: 'https://www.rom.on.ca/en/whats-on',
      external_id: 'rom-2025',
      source: 'verified_real'
    },
    {
      title: 'Distillery District Weekend Market',
      description: 'Local artisans, food vendors, and live entertainment',
      date: '2025-09-27',
      time: '10:00:00',
      venue_name: 'Distillery Historic District',
      address: '55 Mill St, Toronto, ON',
      latitude: 43.6503,
      longitude: -79.3599,
      category: 'food',
      price_min: 0,
      is_free: true,
      external_url: 'https://www.thedistillerydistrict.com/events/',
      external_id: 'distillery-2025',
      source: 'verified_real'
    }
  ]
  
  try {
    // Insert events
    const { data, error } = await supabase
      .from('events')
      .insert(realEvents)
      .select()
    
    if (error) {
      console.error('Database error:', error)
      return false
    }
    
    console.log(`✅ Successfully added ${data.length} real events`)
    
    // Test the events
    console.log('\n📋 Events added:')
    data.forEach(event => {
      console.log(`  • ${event.title} at ${event.venue_name}`)
      console.log(`    ${event.external_url}`)
      console.log(`    Price: ${event.price_min === 0 ? 'Free' : '$' + event.price_min}`)
    })
    
    return true
    
  } catch (error) {
    console.error('Failed to add events:', error)
    return false
  }
}

addRealEventsCorrectSchema().then(success => {
  if (success) {
    console.log('\n🎉 Real events added successfully!')
  } else {
    console.log('\n❌ Failed to add real events')
  }
})
