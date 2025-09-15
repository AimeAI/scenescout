// Test script to validate our ingestion functions
// This can be run with: node test-integrations.js

const FUNCTIONS_TO_TEST = [
  {
    name: 'Google Places',
    endpoint: 'ingest_places_google',
    payload: {
      location: '43.6532,-79.3832', // Toronto
      radius: 1000
    }
  },
  {
    name: 'Yelp',
    endpoint: 'ingest_places_yelp', 
    payload: {
      location: 'Toronto, ON',
      radius: 2000
    }
  }
]

console.log('🧪 Integration Test Plan')
console.log('=======================')
console.log('')

FUNCTIONS_TO_TEST.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name} Function`)
  console.log(`   Endpoint: ${test.endpoint}`)
  console.log(`   Test payload:`, JSON.stringify(test.payload, null, 4))
  console.log('')
  console.log(`   Test command:`)
  console.log(`   supabase functions invoke ${test.endpoint} --method POST \\`)
  console.log(`     --data '${JSON.stringify(test.payload)}'`)
  console.log('')
  console.log('   Expected response:')
  console.log('   - success: true')
  console.log('   - venuesProcessed: > 0 (if API keys are set)')
  console.log('   - OR status: "disabled" with reason (if keys missing)')
  console.log('')
})

console.log('🔑 Required Secrets')
console.log('==================')
console.log('Run these commands to set API keys:')
console.log('')
console.log('supabase secrets set GOOGLE_PLACES_API_KEY=AIzaSyCrsauxxAb2nqLsfhr4UqSeJIFkssLHjNE')
console.log('supabase secrets set YELP_API_KEY=tpNEPYv1OdDlphvD--672xPJKCr3KGFNLsJ5Q1Hbq12xA0suztjs8dYxFr_sUGD8a5Pp2fPej32Xeh0uvxh6wYvF2tgAoedhXJ2fNqnrpq4Rme_m6bTptrxuJajHaHYx')
console.log('')

console.log('🌐 Admin UI Testing')
console.log('==================')
console.log('1. Navigate to: http://localhost:5173/admin/ingest')
console.log('2. Set coordinates: lat=43.6532, lng=-79.3832, radius=1000')
console.log('3. Test each source (Google Places, Yelp)')
console.log('4. Verify results show venue counts or disabled status')
console.log('')

console.log('🗺️  Map Integration Testing')
console.log('============================')
console.log('1. Navigate to: http://localhost:5173/map')
console.log('2. Click the "Filters" button')
console.log('3. Verify filter modal opens with categories, dates, price, sources')
console.log('4. Apply filters and verify events update')
console.log('5. Pan around map to trigger background ingestion (logged-in users)')
console.log('6. Verify source badges show on event cards (EB, TM, Google, Yelp)')
console.log('')

console.log('✅ All integrations are ready for testing!')