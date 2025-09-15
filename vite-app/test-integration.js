#!/usr/bin/env node

/**
 * Integration Test Script for Google Places and Yelp
 * 
 * This script helps test the venue ingestion and display functionality
 */

console.log('🧪 SceneScout Integration Test');
console.log('==============================\n');

console.log('📋 Pre-flight Checklist:\n');

console.log('1. ✅ Ensure Supabase is running:');
console.log('   cd vite-app');
console.log('   supabase start\n');

console.log('2. ✅ Deploy Edge Functions:');
console.log('   supabase functions deploy ingest_places_google');
console.log('   supabase functions deploy ingest_places_yelp\n');

console.log('3. ✅ Set API Keys as Secrets:');
console.log('   supabase secrets set GOOGLE_PLACES_API_KEY=YOUR_KEY');
console.log('   supabase secrets set YELP_API_KEY=YOUR_KEY\n');

console.log('4. ✅ Start the Vite dev server:');
console.log('   npm run dev\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🧪 Test 1: Direct Function Invocation\n');

console.log('Test Google Places ingestion (Toronto):');
console.log(`supabase functions invoke ingest_places_google \\
  --body '{"location":"43.6532,-79.3832","radius":1000}'\n`);

console.log('Test Yelp ingestion (Toronto):');
console.log(`supabase functions invoke ingest_places_yelp \\
  --body '{"location":"Toronto, ON","radius":2000}'\n`);

console.log('Expected results:');
console.log('- If API keys are set: {"success":true,"venuesProcessed":20-50}');
console.log('- If API keys missing: {"status":"disabled","reason":"missing API_KEY"}\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🧪 Test 2: Admin Ingestion Page\n');

console.log('1. Navigate to: http://localhost:5173/admin/ingest');
console.log('2. Login with a Pro or Admin account');
console.log('3. Enter test coordinates:');
console.log('   - Latitude: 43.6532');
console.log('   - Longitude: -79.3832');
console.log('   - Radius: 1000');
console.log('4. Click "Ingest from Google Places"');
console.log('5. Click "Ingest from Yelp"');
console.log('6. Check the JSON results for venue counts\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🧪 Test 3: Check Database for Venues\n');

console.log('Run SQL query in Supabase Studio:');
console.log(`SELECT 
  name, 
  venue_type, 
  external_id,
  latitude,
  longitude,
  created_at
FROM venues
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🧪 Test 4: Map Page Background Ingestion\n');

console.log('1. Navigate to: http://localhost:5173/map');
console.log('2. Open browser Developer Tools → Network tab');
console.log('3. Filter by "fetch" or "XHR"');
console.log('4. Pan/zoom the map to a new area');
console.log('5. Look for calls to:');
console.log('   - ingest_places_google');
console.log('   - ingest_places_yelp');
console.log('6. Check response for venue counts\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🧪 Test 5: Verify Venue Display\n');

console.log('Currently, venues are NOT displayed directly on the map.');
console.log('The system stores venues but only shows events.\n');

console.log('To see if venues are being used:');
console.log('1. Check if any events reference the new venues:');
console.log(`SELECT 
  e.title,
  e.venue_name,
  v.name as linked_venue,
  v.external_id
FROM events e
LEFT JOIN venues v ON e.venue_id = v.id
WHERE v.external_id IS NOT NULL
LIMIT 10;\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🔍 Troubleshooting:\n');

console.log('If venues are not appearing:');
console.log('1. Check Supabase logs: supabase functions logs');
console.log('2. Verify API keys are set: supabase secrets list');
console.log('3. Check browser console for errors');
console.log('4. Ensure you are logged in (background ingestion requires auth)');
console.log('5. Check if rate limits are being hit\n');

console.log('💡 Note: The current architecture collects venue data for future use');
console.log('but does not display venues as standalone markers on the map.');
console.log('Only events are shown on the map, which may reference venues.\n');