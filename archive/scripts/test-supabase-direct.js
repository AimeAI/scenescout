#!/usr/bin/env node

// Test Supabase with service role key directly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSupabaseServiceRole() {
  console.log('🔑 Testing Supabase with Service Role Key...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role instead
    );

    // Test basic connection and schema
    console.log('Testing database connection...');
    
    // Test if events table exists
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, created_at')
      .limit(3);

    if (eventsError) {
      console.log(`❌ Events table error: ${eventsError.message}`);
    } else {
      console.log(`✅ Events table accessible - Found ${events.length} events`);
      if (events.length > 0) {
        console.log(`   Sample event: "${events[0].title}"`);
      }
    }

    // Test if venues table exists
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .limit(2);

    if (venuesError) {
      console.log(`❌ Venues table error: ${venuesError.message}`);
    } else {
      console.log(`✅ Venues table accessible - Found ${venues.length} venues`);
    }

    // Test if we can insert a test event
    console.log('\nTesting write permissions...');
    const testEvent = {
      title: 'Test Event Integration',
      description: 'Integration test event',
      start_time: new Date().toISOString(),
      category: 'test',
      source: 'integration-test',
      external_id: 'test-' + Date.now(),
      status: 'active'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('events')
      .insert([testEvent])
      .select();

    if (insertError) {
      console.log(`❌ Insert test failed: ${insertError.message}`);
    } else {
      console.log(`✅ Insert test successful - Created event ID: ${insertData[0].id}`);
      
      // Clean up test event
      await supabase
        .from('events')
        .delete()
        .eq('id', insertData[0].id);
      console.log('   Test event cleaned up');
    }

    return true;

  } catch (error) {
    console.log(`❌ Service role test failed: ${error.message}`);
    return false;
  }
}

testSupabaseServiceRole();