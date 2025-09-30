const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testScraperHealth() {
  console.log('\n🏥 Testing Scraper Health Check...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/scraper-health`);
    const data = response.data;
    
    console.log('Health Check Results:');
    console.log(`✅ Healthy Sources: ${data.healthySources}/${data.totalSources}`);
    console.log(`⚠️  Degraded Sources: ${data.degradedSources}/${data.totalSources}`);
    console.log(`❌ Down Sources: ${data.downSources}/${data.totalSources}`);
    console.log('\nSource Details:');
    
    data.sources.forEach(source => {
      const emoji = source.status === 'healthy' ? '✅' : source.status === 'degraded' ? '⚠️' : '❌';
      console.log(`${emoji} ${source.name}: ${source.status} (${source.statusCode || 'N/A'}, ${source.responseTime}ms)`);
      if (source.error) {
        console.log(`   Error: ${source.error}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function testLiveScraper() {
  console.log('\n🔍 Testing Live Scraper...\n');
  
  const queries = ['concerts', 'food events', 'tech meetups', 'halloween'];
  
  for (const query of queries) {
    try {
      console.log(`\nTesting query: "${query}"`);
      const response = await axios.get(`${API_BASE}/search-live?q=${encodeURIComponent(query)}&limit=5`);
      const data = response.data;
      
      if (data.success) {
        console.log(`✅ Found ${data.count} events`);
        if (data.events && data.events.length > 0) {
          console.log('Sample events:');
          data.events.slice(0, 3).forEach((event, i) => {
            console.log(`  ${i + 1}. ${event.title} - ${event.date} at ${event.venue_name}`);
          });
        }
      } else {
        console.log(`⚠️ No events found for "${query}"`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to search for "${query}":`, error.response?.data?.error || error.message);
    }
  }
}

async function testEnhancedScraper() {
  console.log('\n🚀 Testing Enhanced Multi-Source Scraper...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/search-enhanced?q=events&limit=10`);
    const data = response.data;
    
    if (data.success) {
      console.log(`✅ Found ${data.totalFound} total events`);
      console.log('Source breakdown:');
      console.log(`  - Live scraper: ${data.sources.live} events`);
      console.log(`  - Multi-source: ${data.sources.multi} events`);
      console.log(`  - Unique after dedup: ${data.sources.unique} events`);
      console.log(`  - Returned: ${data.count} events`);
      
      if (data.events && data.events.length > 0) {
        console.log('\nSample events:');
        data.events.slice(0, 5).forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.title}`);
          console.log(`     📅 ${event.date} at ${event.venue_name}`);
          console.log(`     💰 ${event.price_range || 'Price not available'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Enhanced scraper failed:', error.response?.data?.error || error.message);
  }
}

async function testSpecificSources() {
  console.log('\n🎯 Testing Specific Problem Sources...\n');
  
  const problemSources = [
    { name: 'Ticketmaster', url: 'https://www.ticketmaster.ca/browse/concerts-catid-10001/music-rid-10001?city=Toronto' },
    { name: 'Facebook Events', url: 'https://www.facebook.com/events/explore/toronto/' },
    { name: 'Meetup', url: 'https://www.meetup.com/find/tech/?location=Toronto%2C+ON' }
  ];
  
  for (const source of problemSources) {
    try {
      console.log(`\nTesting ${source.name}...`);
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true
      });
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers['content-type']}`);
      console.log(`  Response size: ${response.data.length} bytes`);
      
      if (response.status === 403) {
        console.log(`  ⚠️ Access denied - may require authentication or different headers`);
      } else if (response.status === 404) {
        console.log(`  ⚠️ Page not found - URL may have changed`);
      } else if (response.status >= 200 && response.status < 300) {
        console.log(`  ✅ Source is accessible`);
      }
      
    } catch (error) {
      console.error(`  ❌ ${source.name} error:`, error.code || error.message);
    }
  }
}

async function runAllTests() {
  console.log('🧪 SceneScout Scraper Test Suite\n');
  console.log('================================');
  
  await testScraperHealth();
  await testLiveScraper();
  await testEnhancedScraper();
  await testSpecificSources();
  
  console.log('\n✅ All tests completed!\n');
}

// Run tests
runAllTests().catch(console.error);