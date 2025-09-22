#!/usr/bin/env node

const axios = require('axios')

async function testEnhancedSources() {
  console.log('🚀 Testing Enhanced Multi-Source Event Discovery\n')
  
  const testQueries = [
    { query: 'concert', category: 'music' },
    { query: 'hockey', category: 'sports' },
    { query: 'food festival', category: 'food' },
    { query: 'tech meetup', category: 'tech' },
    { query: 'art gallery', category: 'arts' },
    { query: 'halloween party', category: 'social' }
  ]
  
  for (const test of testQueries) {
    console.log(`\n🔍 Testing "${test.query}" in ${test.category} category:`)
    
    try {
      const response = await axios.get(`http://localhost:3000/api/search-live`, {
        params: {
          q: test.query,
          category: test.category,
          limit: 10,
          refresh: 'true'
        },
        timeout: 30000
      })
      
      const data = response.data
      
      if (data.success) {
        console.log(`✅ Found ${data.count} events (${data.totalCount} total)`)
        
        // Show source breakdown
        const sourceBreakdown = {}
        data.events.forEach(event => {
          sourceBreakdown[event.source] = (sourceBreakdown[event.source] || 0) + 1
        })
        
        console.log('📊 Sources used:')
        Object.entries(sourceBreakdown).forEach(([source, count]) => {
          console.log(`   ${source}: ${count} events`)
        })
        
        // Show sample events
        if (data.events.length > 0) {
          console.log('\n📋 Sample events:')
          data.events.slice(0, 2).forEach((event, i) => {
            console.log(`   ${i + 1}. ${event.title}`)
            console.log(`      📅 ${event.date} at ${event.time}`)
            console.log(`      📍 ${event.venue_name}`)
            console.log(`      🏷️  ${event.category} (${event.source})`)
            if (event.external_url) {
              console.log(`      🔗 ${event.external_url}`)
            }
          })
        }
        
      } else {
        console.log(`❌ Search failed: ${data.message || 'Unknown error'}`)
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Server not running (start with: npm run dev)`)
      } else {
        console.log(`❌ Error: ${error.message}`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
  }
  
  console.log('\n🎉 Enhanced multi-source testing completed!')
  console.log('\n📈 New Sources Added:')
  console.log('   • Toronto.com (all categories)')
  console.log('   • BlogTO (music, food, sports, arts, events)')
  console.log('   • NOW Toronto (music, events)')
  console.log('   • TechTO (tech events)')
  console.log('   • Toronto Foodie Events (food)')
  console.log('   • Toronto Art Book (arts)')
  console.log('   • Plus enhanced Eventbrite integration')
}

// Run the test
testEnhancedSources().catch(console.error)
