const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let SUPABASE_URL, SUPABASE_ANON_KEY

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    SUPABASE_URL = line.split('=')[1].trim()
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    SUPABASE_ANON_KEY = line.split('=')[1].trim()
  }
})

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function clearAndRefresh() {
  console.log('🗑️  Clearing old cached events...')

  // Delete all events from cache sources (not user-submitted events)
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .in('source', ['ticketmaster', 'eventbrite', 'yelp_events'])

  if (deleteError) {
    console.error('❌ Delete error:', deleteError.message)
  } else {
    console.log('✅ Old events cleared!')
  }

  console.log('\n🔄 Triggering cache refresh from live APIs...')
  console.log('This will fetch fresh events with proper categories.\n')

  // Trigger cache refresh
  const response = await fetch('http://localhost:3000/api/admin/refresh-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city: 'San Francisco' })
  })

  const result = await response.json()

  if (result.success) {
    console.log('✅ Cache refreshed successfully!')
    console.log(`📊 Total events: ${result.totalEvents}`)
    console.log('\n📂 Categories:')
    result.categories.forEach(cat => {
      console.log(`   ${cat.category}: ${cat.count} events`)
    })
  } else {
    console.error('❌ Refresh failed:', result.error)
  }
}

clearAndRefresh()
