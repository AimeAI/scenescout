#!/usr/bin/env node

// SceneScout Integration Test Suite
// Tests all configured APIs and services

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 SceneScout Integration Test Suite\n');

// Test 1: Environment Variables
console.log('📋 Testing Environment Configuration...');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_PLACES_API_KEY',
  'YELP_API_KEY',
  'EVENTBRITE_PRIVATE_TOKEN'
];

let envMissing = 0;
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (!value || value.includes('TODO')) {
    console.log(`❌ ${envVar}: Missing or TODO`);
    envMissing++;
  } else {
    console.log(`✅ ${envVar}: Configured`);
  }
});

if (envMissing > 0) {
  console.log(`\n⚠️  ${envMissing} environment variables need attention\n`);
} else {
  console.log(`\n✅ All environment variables configured\n`);
}

// Test 2: Supabase Connection
console.log('🗄️  Testing Supabase Connection...');
async function testSupabase() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase
      .from('events')
      .select('id, title, created_at')
      .limit(1);

    if (error) {
      console.log(`❌ Supabase Error: ${error.message}`);
      return false;
    }

    console.log(`✅ Supabase Connected - Found ${data.length} event(s)`);
    return true;
  } catch (error) {
    console.log(`❌ Supabase Connection Failed: ${error.message}`);
    return false;
  }
}

// Test 3: External APIs
console.log('🌐 Testing External APIs...');

async function testEventbriteAPI() {
  try {
    const token = process.env.EVENTBRITE_PRIVATE_TOKEN;
    if (!token || token.includes('TODO')) {
      console.log('⚠️  Eventbrite: No token configured');
      return false;
    }

    const response = await fetch(
      'https://www.eventbriteapi.com/v3/events/search/?location.address=Toronto&expand=venue&sort_by=date&limit=1',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Eventbrite API: Working (${data.events?.length || 0} events)`);
      return true;
    } else {
      console.log(`❌ Eventbrite API: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Eventbrite API: ${error.message}`);
    return false;
  }
}

async function testGooglePlacesAPI() {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey || apiKey.includes('TODO')) {
      console.log('⚠️  Google Places: No API key configured');
      return false;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurants%20in%20Toronto&key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Google Places API: Working (${data.results?.length || 0} results)`);
      return true;
    } else {
      console.log(`❌ Google Places API: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Google Places API: ${error.message}`);
    return false;
  }
}

async function testYelpAPI() {
  try {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey || apiKey.includes('TODO')) {
      console.log('⚠️  Yelp: No API key configured');
      return false;
    }

    const response = await fetch(
      'https://api.yelp.com/v3/businesses/search?location=Toronto&categories=restaurants&limit=1',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Yelp API: Working (${data.businesses?.length || 0} businesses)`);
      return true;
    } else {
      console.log(`❌ Yelp API: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Yelp API: ${error.message}`);
    return false;
  }
}

// Test 4: Application Endpoints
async function testAppEndpoints() {
  console.log('🚀 Testing Application Endpoints...');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    // Test main page
    const homeResponse = await fetch(baseUrl);
    if (homeResponse.ok) {
      console.log('✅ Home Page: Accessible');
    } else {
      console.log(`❌ Home Page: HTTP ${homeResponse.status}`);
    }

    // Test API endpoint
    const apiResponse = await fetch(`${baseUrl}/api/ingest`);
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log(`✅ Ingestion API: ${data.message}`);
    } else {
      console.log(`❌ Ingestion API: HTTP ${apiResponse.status}`);
    }

  } catch (error) {
    console.log(`❌ Application endpoints: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('Starting integration tests...\n');
  
  const supabaseOk = await testSupabase();
  
  console.log('');
  await testEventbriteAPI();
  await testGooglePlacesAPI(); 
  await testYelpAPI();
  
  console.log('');
  await testAppEndpoints();
  
  console.log('\n🏁 Integration tests complete!');
  
  if (supabaseOk) {
    console.log('\n✅ System Status: Ready for production data ingestion');
    console.log('🎯 Next Steps:');
    console.log('   • Visit http://localhost:3000/admin/ingestion to test data ingestion');
    console.log('   • Run real event ingestion from the admin panel');
    console.log('   • Monitor ingestion logs for any issues');
  } else {
    console.log('\n⚠️  System Status: Supabase needs attention');
    console.log('🔧 Fix Required:');
    console.log('   • Verify Supabase URL and anon key are correct');
    console.log('   • Check database schema is deployed');
    console.log('   • Ensure RLS policies allow access');
  }
}

runTests().catch(console.error);