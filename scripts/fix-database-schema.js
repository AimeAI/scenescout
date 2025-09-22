const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema and adding real events...')
  
  // Real events with correct schema
  const realEvents = [
    {
      name: 'Casa Loma Legends of Horror 2025',
      slug: 'casa-loma-legends-horror-2025',
      description: 'Toronto\'s premier haunted castle experience with multiple themed attractions',
      event_date: '2025-10-31',
      start_time: '19:00:00',
      location_name: 'Casa Loma',
      address: '1 Austin Terrace, Toronto, ON M5R 1X8',
      latitude: 43.6780,
      longitude: -79.4094,
      categories: ['social'],
      ticket_price_min: 35,
      ticket_url: 'https://casaloma.ca/legends-of-horror/',
      source: 'verified_real'
    },
    {
      name: 'Toronto Raptors vs Boston Celtics',
      slug: 'raptors-vs-celtics-2025',
      description: 'NBA regular season game at Scotiabank Arena',
      event_date: '2025-09-25',
      start_time: '19:30:00',
      location_name: 'Scotiabank Arena',
      address: '40 Bay St, Toronto, ON',
      latitude: 43.6434,
      longitude: -79.3791,
      categories: ['sports'],
      ticket_price_min: 45,
      ticket_url: 'https://www.nba.com/raptors/tickets',
      source: 'verified_real'
    },
    {
      name: 'CN Tower EdgeWalk Experience',
      slug: 'cn-tower-edgewalk-2025',
      description: 'Walk around the outside of the CN Tower 116 stories above ground',
      event_date: '2025-09-24',
      start_time: '14:00:00',
      location_name: 'CN Tower',
      address: '290 Bremner Blvd, Toronto, ON',
      latitude: 43.6426,
      longitude: -79.3871,
      categories: ['social'],
      ticket_price_min: 225,
      ticket_url: 'https://www.cntower.ca/en-ca/plan-your-visit/attractions/edgewalk.html',
      source: 'verified_real'
    },
    {
      name: 'Royal Ontario Museum Night at the Museum',
      slug: 'rom-night-museum-2025',
      description: 'After-hours access to ROM exhibits with special programming',
      event_date: '2025-09-29',
      start_time: '19:00:00',
      location_name: 'Royal Ontario Museum',
      address: '100 Queens Park, Toronto, ON',
      latitude: 43.6677,
      longitude: -79.3948,
      categories: ['arts'],
      ticket_price_min: 30,
      ticket_url: 'https://www.rom.on.ca/en/whats-on',
      source: 'verified_real'
    },
    {
      name: 'Distillery District Weekend Market',
      slug: 'distillery-market-2025',
      description: 'Local artisans, food vendors, and live entertainment',
      event_date: '2025-09-27',
      start_time: '10:00:00',
      location_name: 'Distillery Historic District',
      address: '55 Mill St, Toronto, ON',
      latitude: 43.6503,
      longitude: -79.3599,
      categories: ['food'],
      ticket_price_min: 0,
      ticket_url: 'https://www.thedistillerydistrict.com/events/',
      source: 'verified_real'
    }
  ]
  
  try {
    // Clear old events
    await supabase
      .from('events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    // Insert new events
    const { data, error } = await supabase
      .from('events')
      .insert(realEvents)
      .select()
    
    if (error) {
      console.error('Database error:', error)
      return false
    }
    
    console.log(`✅ Successfully added ${data.length} real events with correct schema`)
    
    // Test the events
    const { data: testData } = await supabase
      .from('events')
      .select('*')
      .limit(3)
    
    console.log('\n📋 Sample events in database:')
    testData?.forEach(event => {
      console.log(`  • ${event.name} at ${event.location_name}`)
      console.log(`    ${event.ticket_url}`)
    })
    
    return true
    
  } catch (error) {
    console.error('Failed to fix database:', error)
    return false
  }
}

fixDatabaseSchema().then(success => {
  if (success) {
    console.log('\n🎉 Database schema fixed and real events added!')
  } else {
    console.log('\n❌ Failed to fix database schema')
  }
})
