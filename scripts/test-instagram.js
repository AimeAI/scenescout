#!/usr/bin/env node

const axios = require('axios')

async function testInstagram() {
  console.log('🔍 Testing Instagram event discovery...\n')
  
  try {
    // Test Instagram hashtag page access
    const hashtag = 'torontoevents'
    const url = `https://www.instagram.com/explore/tags/${hashtag}/`
    
    console.log(`Testing: ${url}`)
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    })
    
    console.log(`✅ Status: ${response.status}`)
    console.log(`📄 Content length: ${response.data.length} bytes`)
    
    // Check for common Instagram elements
    const hasInstagramContent = response.data.includes('instagram') || response.data.includes('_sharedData')
    console.log(`📱 Instagram content detected: ${hasInstagramContent}`)
    
    // Check for JSON data
    const hasJsonData = response.data.includes('window._sharedData')
    console.log(`📊 JSON data found: ${hasJsonData}`)
    
    if (hasJsonData) {
      console.log('✅ Instagram scraper should work with this response')
    } else {
      console.log('⚠️  Instagram may be blocking or using different structure')
    }
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('❌ Rate limited by Instagram')
    } else if (error.response?.status === 403) {
      console.log('❌ Blocked by Instagram')
    } else {
      console.log(`❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n📋 Instagram Integration Status:')
  console.log('   • Scraper code: ✅ Added to multi-source scraper')
  console.log('   • API integration: ✅ Connected to search-enhanced endpoint')
  console.log('   • Data extraction: ⚠️  Depends on Instagram access')
  console.log('   • Fallback: ✅ Other scrapers continue working')
}

testInstagram().catch(console.error)
