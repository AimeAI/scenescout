#!/usr/bin/env node

const axios = require('axios')

async function testCategoriesOrder() {
  console.log('🔍 Testing category order and Load More...\n')
  
  const topCategories = [
    { name: 'Tech & Startups', query: 'tech meetup startup' },
    { name: 'Trending Now', query: 'events toronto today' },
    { name: 'Free Events', query: 'free events activities' },
    { name: 'Nightlife & Parties', query: 'party nightlife bar club' },
    { name: 'Live Music', query: 'concerts music live bands' }
  ]
  
  for (const category of topCategories) {
    try {
      console.log(`📂 Testing: ${category.name}`)
      
      // Test initial load
      const response1 = await axios.get('http://localhost:3000/api/search-enhanced', {
        params: { q: category.query, limit: 10, offset: 0 }
      })
      
      console.log(`   ✅ Initial: ${response1.data.count} events`)
      
      // Test load more
      if (response1.data.count > 0) {
        const response2 = await axios.get('http://localhost:3000/api/search-enhanced', {
          params: { q: category.query, limit: 10, offset: 10 }
        })
        console.log(`   🔄 Load More: ${response2.data.count} additional events`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
    
    console.log('')
  }
  
  console.log('📊 Category Priority Status:')
  console.log('   1. 💻 Tech & Startups - TOP PRIORITY')
  console.log('   2. 🔥 Trending Now - HIGH ENGAGEMENT') 
  console.log('   3. 🆓 Free Events - ZERO FRICTION')
  console.log('   4. 🌃 Nightlife & Parties - SOCIAL')
  console.log('   5. 🎵 Live Music - ENTERTAINMENT')
}

testCategoriesOrder().catch(console.error)
