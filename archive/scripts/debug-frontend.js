#!/usr/bin/env node

// Debug what's happening in the frontend
console.log('🔍 Debugging Frontend Issues\n');

// Test the exact same client creation the frontend uses
const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs');
require('dotenv').config();

console.log('Environment variables the frontend sees:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20)}...`);

// Test the safe client function logic
function isSupabaseConfigured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('TODO') &&
    !supabaseAnonKey.includes('TODO') &&
    supabaseUrl.startsWith('http')
  )
}

console.log(`\nConfiguration check: ${isSupabaseConfigured()}`);

// Try creating the client the same way the app does
try {
  if (!isSupabaseConfigured()) {
    console.log('❌ Configuration check failed - this is why frontend shows mock data');
  } else {
    console.log('✅ Configuration check passed');
    
    // Test client creation
    const client = createClientComponentClient();
    console.log('✅ Client created successfully');
  }
} catch (error) {
  console.log(`❌ Client creation failed: ${error.message}`);
}