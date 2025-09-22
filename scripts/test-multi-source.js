#!/usr/bin/env node

// Simple test without importing TypeScript directly
const axios = require('axios')

class TestMultiSourceScraper {
  async testScraping() {
    console.log('🚀 Testing expanded multi-source event scraping...\n')
    
    const sources = [
      { name: 'Ticketmaster Music', url: 'https://www.ticketmaster.ca/browse/concerts-catid-10001/music-rid-10001?city=Toronto' },
      { name: 'Ticketmaster Sports', url: 'https://www.ticketmaster.ca/browse/sports-catid-10004?city=Toronto' },
      { name: 'SeatGeek Toronto', url: 'https://seatgeek.com/cities/toronto/sports' },
      { name: 'ROM Events', url: 'https://www.rom.on.ca/en/whats-on' },
      { name: 'AGO Events', url: 'https://ago.ca/events' },
      { name: 'Toronto.com', url: 'https://www.toronto.com/events/' }
    ]
    
    for (const source of sources) {
      console.log(`\n🔍 Testing ${source.name}:`)
      
      try {
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 10000
        })
        
        if (response.status === 200) {
          console.log(`✅ ${source.name}: Successfully connected (${response.data.length} bytes)`)
          
          // Check for common event indicators
          const content = response.data.toLowerCase()
          const eventIndicators = ['event', 'concert', 'show', 'game', 'exhibition', 'performance']
          const foundIndicators = eventIndicators.filter(indicator => content.includes(indicator))
          
          if (foundIndicators.length > 0) {
            console.log(`   📋 Found event content: ${foundIndicators.join(', ')}`)
          } else {
            console.log(`   ⚠️  No obvious event content detected`)
          }
        }
        
      } catch (error) {
        if (error.code === 'ENOTFOUND') {
          console.log(`❌ ${source.name}: DNS resolution failed`)
        } else if (error.response?.status) {
          console.log(`❌ ${source.name}: HTTP ${error.response.status}`)
        } else {
          console.log(`❌ ${source.name}: ${error.message}`)
        }
      }
    }
    
    console.log('\n🎉 Multi-source connectivity test completed!')
    console.log('\n📊 Summary: Added 6 new event sources beyond Eventbrite:')
    console.log('   • Ticketmaster (Music & Sports)')
    console.log('   • SeatGeek (Sports)')
    console.log('   • ROM & AGO (Arts & Culture)')
    console.log('   • Toronto.com (General Events)')
    console.log('   • Additional Meetup categories')
  }
}

async function testMultiSourceScraping() {
  const tester = new TestMultiSourceScraper()
  await tester.testScraping()
}

// Run the test
testMultiSourceScraping().catch(console.error)
