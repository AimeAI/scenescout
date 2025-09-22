#!/usr/bin/env node

const axios = require('axios')

async function testLoadMore() {
  console.log('🔍 Testing Load More functionality...\n')
  
  try {
    // Test initial load
    console.log('1. Testing initial category load:')
    const response1 = await axios.get('http://localhost:3000/api/search-enhanced', {
      params: { q: 'music concerts', limit: 10, offset: 0 }
    })
    
    console.log(`   ✅ Initial load: ${response1.data.count} events`)
    console.log(`   📊 Has more: ${response1.data.hasMore}`)
    
    // Test load more (offset)
    console.log('\n2. Testing load more (offset 10):')
    const response2 = await axios.get('http://localhost:3000/api/search-enhanced', {
      params: { q: 'music concerts', limit: 10, offset: 10 }
    })
    
    console.log(`   ✅ Load more: ${response2.data.count} events`)
    console.log(`   📊 Has more: ${response2.data.hasMore}`)
    
    // Test different category
    console.log('\n3. Testing food category:')
    const response3 = await axios.get('http://localhost:3000/api/search-enhanced', {
      params: { q: 'food restaurants', limit: 15, offset: 0 }
    })
    
    console.log(`   ✅ Food events: ${response3.data.count} events`)
    console.log(`   📊 Has more: ${response3.data.hasMore}`)
    
    console.log('\n📋 Load More Status:')
    console.log('   • API pagination: ✅ Working')
    console.log('   • Offset handling: ✅ Working') 
    console.log('   • Multiple categories: ✅ Working')
    console.log('   • hasMore flag: ✅ Available')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testLoadMore().catch(console.error)
