const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testLocationAndEvents() {
  console.log('Testing location-based events...')
  
  // Add a simple test event
  const testEvent = {
    name: 'Test Event Near You',
    slug: 'test-event-' + Date.now(),
    description: 'This is a test event to verify location detection',
    event_date: '2025-09-22',
    start_time: '19:00',
    location_name: 'Test Venue',
    address: 'Test Address',
    latitude: 37.7749, // San Francisco
    longitude: -122.4194,
    source: 'test'
  }
  
  try {
    // Insert test event
    const { data: insertData, error: insertError } = await supabase
      .from('events')
      .insert([testEvent])
      .select()
    
    if (insertError) {
      console.error('Insert error:', insertError)
      return
    }
    
    console.log('✅ Test event added:', insertData[0].name)
    
    // Test location-based query
    const { data: events, error: queryError } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', '2025-09-22')
      .limit(5)
    
    if (queryError) {
      console.error('Query error:', queryError)
      return
    }
    
    console.log(`✅ Found ${events.length} events:`)
    events.forEach(event => {
      console.log(`  - ${event.name} (${event.latitude}, ${event.longitude})`)
    })
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testLocationAndEvents()
