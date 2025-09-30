#!/usr/bin/env node

// LIVE TEST - Real verification of what's working
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function liveTest() {
  console.log('🧪 LIVE TEST - No Pretending!\n');

  console.log('Environment Check:');
  console.log(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20)}...`);
  console.log(`DEBUG_MOCK_DATA: ${process.env.DEBUG_MOCK_DATA}`);
  console.log('');

  // Test 1: Direct Supabase connection with anon key
  console.log('1. Testing Supabase with ANON key (what the app uses):');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .limit(3);

    if (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log('❌ App is NOT using real Supabase data');
      return false;
    } else {
      console.log(`✅ SUCCESS: Found ${data.length} events`);
      data.forEach((event, i) => {
        console.log(`   ${i+1}. "${event.title}" (${event.source || 'no source'})`);
      });
      return true;
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    return false;
  }
}

// Test 2: Check if app endpoint works
async function testAppAPI() {
  console.log('\n2. Testing App API endpoint:');
  try {
    const response = await fetch('http://localhost:3000/api/ingest');
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (data.configured && data.database) {
      console.log('✅ App API confirms Supabase is working');
      return true;
    } else {
      console.log('❌ App API says Supabase is NOT working');
      return false;
    }
  } catch (error) {
    console.log(`❌ App API test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Check homepage content
async function testHomepage() {
  console.log('\n3. Testing Homepage content:');
  try {
    const response = await fetch('http://localhost:3000');
    const html = await response.text();
    
    // Look for mock data indicators
    const hasMockData = html.includes('Electric Nights') || 
                       html.includes('Live Jazz Night') || 
                       html.includes('mock-0');
    
    // Look for real data indicators  
    const hasRealData = html.includes('The Weeknd') ||
                       html.includes('SF Food') ||
                       html.includes('Warriors');
    
    console.log(`Mock data found: ${hasMockData}`);
    console.log(`Real data found: ${hasRealData}`);
    
    if (hasRealData && !hasMockData) {
      console.log('✅ Homepage showing REAL data');
      return true;
    } else if (hasMockData) {
      console.log('❌ Homepage showing MOCK data');
      return false;
    } else {
      console.log('⚠️  Homepage content unclear');
      return false;
    }
  } catch (error) {
    console.log(`❌ Homepage test failed: ${error.message}`);
    return false;
  }
}

async function runLiveTests() {
  const supabaseWorks = await liveTest();
  const apiWorks = await testAppAPI();
  const homepageWorks = await testHomepage();
  
  console.log('\n🎯 LIVE TEST RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Supabase Connection: ${supabaseWorks ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`API Endpoint: ${apiWorks ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`Homepage Data: ${homepageWorks ? '✅ REAL DATA' : '❌ MOCK/BROKEN'}`);
  
  const overallScore = [supabaseWorks, apiWorks, homepageWorks].filter(Boolean).length;
  
  console.log('\n🏆 HONEST ASSESSMENT:');
  if (overallScore === 3) {
    console.log('✅ FULLY WORKING - Everything is actually functioning!');
  } else if (overallScore === 2) {
    console.log('⚠️  PARTIALLY WORKING - Some issues need fixing');
  } else {
    console.log('❌ NOT WORKING - Major issues need to be addressed');
  }
  
  console.log(`\nScore: ${overallScore}/3 components working`);
}

runLiveTests().catch(console.error);