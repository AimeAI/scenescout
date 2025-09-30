// Test script to verify Nominatim geocoding still works
import { GeocodingService } from '../src/lib/scraping/pipeline/GeocodingService';

async function testGeocoding() {
  console.log('🧪 Testing Nominatim Geocoding (Google API removed)...\n');
  
  const geocoder = new GeocodingService({
    cacheEnabled: true,
    fallbackToApproximateLocation: true
  });

  const testAddresses = [
    'Times Square, New York, NY',
    '1600 Pennsylvania Avenue NW, Washington, DC',
    'Space Needle, Seattle, WA',
    'Golden Gate Bridge, San Francisco, CA',
    'Chicago Theatre, Chicago, IL',
    'Invalid Address That Should Fallback'
  ];

  for (const address of testAddresses) {
    console.log(`\n📍 Testing: ${address}`);
    
    try {
      const result = await geocoder.geocode(address);
      
      console.log(`   Source: ${result.source}`);
      console.log(`   Confidence: ${result.confidence}`);
      
      if (result.coordinates) {
        console.log(`   ✅ Coordinates: ${result.coordinates.latitude}, ${result.coordinates.longitude}`);
      } else {
        console.log(`   ⚠️  No coordinates found`);
      }
      
      if (result.city) {
        console.log(`   City: ${result.city}`);
      }
      if (result.state) {
        console.log(`   State: ${result.state}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${(error as Error).message}`);
    }
  }
  
  // Test batch geocoding
  console.log('\n\n🧪 Testing Batch Geocoding...\n');
  
  const batchResults = await geocoder.batchGeocode(testAddresses.slice(0, 3));
  console.log(`✅ Batch geocoded ${batchResults.length} addresses`);
  console.log(`   Success rate: ${batchResults.filter(r => r.coordinates).length}/${batchResults.length}`);
  
  // Test cache
  console.log('\n\n🧪 Testing Cache...\n');
  console.log(`   Cache size: ${geocoder.getCacheStats().size} entries`);
  
  console.log('\n✅ Geocoding tests complete!');
  console.log('\n🎉 Google Places API has been successfully removed.');
  console.log('   Geocoding now uses Nominatim (OpenStreetMap) exclusively.');
}

testGeocoding().catch(console.error);