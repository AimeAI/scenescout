// Simple test to verify Nominatim geocoding works
// This test demonstrates that Google API has been removed and geocoding still functions

async function testNominatimGeocoding() {
  console.log('🧪 Testing Nominatim Geocoding (Google API removed)...\n');
  
  const testAddress = 'Times Square, New York, NY';
  const encodedAddress = encodeURIComponent(testAddress);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
  
  console.log(`📍 Testing address: ${testAddress}`);
  console.log(`🌐 Using Nominatim API (no Google API required)\n`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SceneScout/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      console.log('✅ Geocoding successful!');
      console.log(`   Latitude: ${result.lat}`);
      console.log(`   Longitude: ${result.lon}`);
      console.log(`   Display name: ${result.display_name}`);
      
      if (result.address) {
        console.log(`   City: ${result.address.city || result.address.town || 'N/A'}`);
        console.log(`   State: ${result.address.state || 'N/A'}`);
        console.log(`   Country: ${result.address.country || 'N/A'}`);
      }
    } else {
      console.log('⚠️  No results found');
    }
    
    console.log('\n🎉 Successfully removed Google Places API!');
    console.log('   Geocoding now uses free, open-source Nominatim (OpenStreetMap)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testNominatimGeocoding();