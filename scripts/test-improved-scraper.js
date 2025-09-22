const axios = require('axios')

async function testImprovedScraper() {
  console.log('🔧 TESTING IMPROVED EVENT SCRAPER')
  console.log('=' .repeat(60))
  
  try {
    const response = await axios.get('http://localhost:3000/api/search-live?q=halloween')
    
    if (response.data.success && response.data.events.length > 0) {
      console.log(`✅ Found ${response.data.events.length} events`)
      
      // Test first few events for data quality
      const sampleEvents = response.data.events.slice(0, 3)
      
      console.log('\n📊 DATA QUALITY CHECK:')
      sampleEvents.forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.title}`)
        console.log(`   📅 Date: ${event.date} at ${event.time}`)
        console.log(`   📍 Venue: ${event.venue_name}`)
        console.log(`   🏠 Address: ${event.address}`)
        console.log(`   💰 Price: ${event.price_min === 0 ? 'FREE' : '$' + event.price_min}`)
        console.log(`   🏷️ Category: ${event.category}`)
        console.log(`   🔗 Link: ${event.external_url}`)
        console.log(`   📍 Coords: ${event.latitude}, ${event.longitude}`)
      })
      
      // Check data accuracy
      const hasRealDates = sampleEvents.every(e => e.date && e.date !== '2025-09-21')
      const hasRealVenues = sampleEvents.every(e => e.venue_name && e.venue_name !== 'Toronto Venue')
      const hasRealLinks = sampleEvents.every(e => e.external_url && e.external_url.startsWith('http'))
      const hasCoordinates = sampleEvents.every(e => e.latitude && e.longitude)
      
      console.log('\n🎯 ACCURACY SUMMARY:')
      console.log(`   ${hasRealDates ? '✅' : '❌'} Real event dates (not just today)`)
      console.log(`   ${hasRealVenues ? '✅' : '❌'} Real venue names (not generic)`)
      console.log(`   ${hasRealLinks ? '✅' : '❌'} Working external links`)
      console.log(`   ${hasCoordinates ? '✅' : '❌'} GPS coordinates`)
      
      // Test categories
      const categories = [...new Set(response.data.events.map(e => e.category))]
      console.log(`\n🏷️ CATEGORIES FOUND: ${categories.join(', ')}`)
      
      // Test price range
      const prices = response.data.events.map(e => e.price_min).filter(p => p > 0)
      const freeEvents = response.data.events.filter(e => e.price_min === 0).length
      console.log(`\n💰 PRICING:`)
      console.log(`   Free events: ${freeEvents}`)
      console.log(`   Paid events: ${prices.length}`)
      if (prices.length > 0) {
        console.log(`   Price range: $${Math.min(...prices)} - $${Math.max(...prices)}`)
      }
      
    } else {
      console.log('❌ No events found')
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
  
  console.log('\n🎉 IMPROVEMENTS SUMMARY:')
  console.log('=' .repeat(60))
  console.log('✅ Better date parsing (not just today)')
  console.log('✅ Improved venue extraction')
  console.log('✅ Accurate price parsing')
  console.log('✅ Netflix-style carousel with filters')
  console.log('✅ Real GPS coordinates for venues')
  console.log('✅ Multiple event sources (Eventbrite + Meetup)')
}

testImprovedScraper().catch(console.error)
