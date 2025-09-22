#!/usr/bin/env node
/**
 * SceneScout Initial City Data Population
 * Seeds major US cities with proper geographic data and timezone information
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Major US cities with comprehensive data
const MAJOR_CITIES = [
  {
    name: 'New York',
    state_code: 'NY',
    country_code: 'US',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    population: 8336817,
    metro_area: 'New York-Newark-Jersey City',
    slug: 'new-york',
    is_active: true
  },
  {
    name: 'Los Angeles',
    state_code: 'CA',
    country_code: 'US',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
    population: 3979576,
    metro_area: 'Los Angeles-Long Beach-Anaheim',
    slug: 'los-angeles',
    is_active: true
  },
  {
    name: 'San Francisco',
    state_code: 'CA',
    country_code: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    population: 873965,
    metro_area: 'San Francisco-Oakland-Berkeley',
    slug: 'san-francisco',
    is_active: true
  },
  {
    name: 'Chicago',
    state_code: 'IL',
    country_code: 'US',
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
    population: 2693976,
    metro_area: 'Chicago-Naperville-Elgin',
    slug: 'chicago',
    is_active: true
  },
  {
    name: 'Austin',
    state_code: 'TX',
    country_code: 'US',
    latitude: 30.2672,
    longitude: -97.7431,
    timezone: 'America/Chicago',
    population: 964254,
    metro_area: 'Austin-Round Rock-Georgetown',
    slug: 'austin',
    is_active: true
  },
  // Additional major cities for broader coverage
  {
    name: 'Seattle',
    state_code: 'WA',
    country_code: 'US',
    latitude: 47.6062,
    longitude: -122.3321,
    timezone: 'America/Los_Angeles',
    population: 753675,
    metro_area: 'Seattle-Tacoma-Bellevue',
    slug: 'seattle',
    is_active: true
  },
  {
    name: 'Denver',
    state_code: 'CO',
    country_code: 'US',
    latitude: 39.7392,
    longitude: -104.9903,
    timezone: 'America/Denver',
    population: 715522,
    metro_area: 'Denver-Aurora-Lakewood',
    slug: 'denver',
    is_active: true
  },
  {
    name: 'Miami',
    state_code: 'FL',
    country_code: 'US',
    latitude: 25.7617,
    longitude: -80.1918,
    timezone: 'America/New_York',
    population: 467963,
    metro_area: 'Miami-Fort Lauderdale-Pompano Beach',
    slug: 'miami',
    is_active: true
  },
  {
    name: 'Nashville',
    state_code: 'TN',
    country_code: 'US',
    latitude: 36.1627,
    longitude: -86.7816,
    timezone: 'America/Chicago',
    population: 689447,
    metro_area: 'Nashville-Davidson--Murfreesboro--Franklin',
    slug: 'nashville',
    is_active: true
  },
  {
    name: 'Portland',
    state_code: 'OR',
    country_code: 'US',
    latitude: 45.5152,
    longitude: -122.6784,
    timezone: 'America/Los_Angeles',
    population: 652503,
    metro_area: 'Portland-Vancouver-Hillsboro',
    slug: 'portland',
    is_active: true
  }
]

async function seedCities() {
  console.log('🌆 Starting city seeding process...')
  
  try {
    // Check if cities already exist
    const { data: existingCities, error: checkError } = await supabase
      .from('cities')
      .select('slug')
    
    if (checkError) {
      console.error('Error checking existing cities:', checkError)
      return false
    }
    
    const existingSlugs = new Set(existingCities?.map(c => c.slug) || [])
    const citiesToInsert = MAJOR_CITIES.filter(city => !existingSlugs.has(city.slug))
    
    if (citiesToInsert.length === 0) {
      console.log('✅ All major cities already exist in database')
      return true
    }
    
    console.log(`📍 Inserting ${citiesToInsert.length} new cities...`)
    
    // Insert cities in batches
    const batchSize = 5
    const batches = []
    for (let i = 0; i < citiesToInsert.length; i += batchSize) {
      batches.push(citiesToInsert.slice(i, i + batchSize))
    }
    
    let totalInserted = 0
    for (const batch of batches) {
      const { data, error } = await supabase
        .from('cities')
        .insert(batch)
        .select()
      
      if (error) {
        console.error('Error inserting city batch:', error)
        continue
      }
      
      totalInserted += data?.length || 0
      console.log(`✅ Inserted batch of ${data?.length || 0} cities`)
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`🎉 Successfully seeded ${totalInserted} cities!`)
    
    // Verify the insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from('cities')
      .select('name, slug, state_code')
      .order('name')
    
    if (verifyError) {
      console.error('Error verifying cities:', verifyError)
    } else {
      console.log('\n📋 Cities in database:')
      verifyData?.forEach(city => {
        console.log(`  - ${city.name}, ${city.state_code} (${city.slug})`)
      })
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Failed to seed cities:', error)
    return false
  }
}

// Export for use in other scripts
module.exports = { seedCities, MAJOR_CITIES }

// Run if called directly
if (require.main === module) {
  seedCities()
    .then(success => {
      console.log(success ? '✅ City seeding completed!' : '❌ City seeding failed!')
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}