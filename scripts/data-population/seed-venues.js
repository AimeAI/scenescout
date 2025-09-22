#!/usr/bin/env node
/**
 * SceneScout Initial Venue Data Population
 * Seeds major venues including concert halls, theaters, and event spaces
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
}

// Major venues organized by city
const MAJOR_VENUES = {
  'new-york': [
    {
      name: 'Madison Square Garden',
      description: 'Iconic multipurpose indoor arena in Midtown Manhattan',
      address: '4 Pennsylvania Plaza, New York, NY 10001',
      latitude: 40.7505,
      longitude: -73.9934,
      capacity: 20789,
      venue_type: 'arena',
      amenities: ['parking', 'accessible', 'food_court', 'merchandise', 'wifi'],
      contact_info: {
        website: 'https://www.msg.com',
        phone: '(212) 465-6741'
      },
      is_verified: true
    },
    {
      name: 'Brooklyn Bowl',
      description: 'Music venue and bowling alley in Williamsburg',
      address: '61 Wythe Ave, Brooklyn, NY 11249',
      latitude: 40.7216,
      longitude: -73.9573,
      capacity: 600,
      venue_type: 'club',
      amenities: ['food_service', 'bar', 'bowling', 'accessible'],
      contact_info: {
        website: 'https://www.brooklynbowl.com',
        phone: '(718) 963-3369'
      },
      is_verified: true
    },
    {
      name: 'Lincoln Center',
      description: 'Performing arts complex on the Upper West Side',
      address: '10 Lincoln Center Plaza, New York, NY 10023',
      latitude: 40.7722,
      longitude: -73.9843,
      capacity: 2738,
      venue_type: 'theater',
      amenities: ['accessible', 'parking', 'fine_dining', 'gift_shop'],
      contact_info: {
        website: 'https://www.lincolncenter.org',
        phone: '(212) 875-5456'
      },
      is_verified: true
    },
    {
      name: 'Webster Hall',
      description: 'Historic music venue in the East Village',
      address: '125 E 11th St, New York, NY 10003',
      latitude: 40.7321,
      longitude: -73.9893,
      capacity: 1400,
      venue_type: 'club',
      amenities: ['bar', 'multiple_floors', 'vip_area'],
      contact_info: {
        website: 'https://www.websterhall.com',
        phone: '(212) 353-1600'
      },
      is_verified: true
    },
    {
      name: 'Apollo Theater',
      description: 'Historic music hall in Harlem',
      address: '253 W 125th St, New York, NY 10027',
      latitude: 40.8095,
      longitude: -73.9505,
      capacity: 1506,
      venue_type: 'theater',
      amenities: ['historic', 'accessible', 'gift_shop'],
      contact_info: {
        website: 'https://www.apollotheater.org',
        phone: '(212) 531-5305'
      },
      is_verified: true
    },
    {
      name: 'Terminal 5',
      description: 'Multi-level concert venue in Hell\'s Kitchen',
      address: '610 W 56th St, New York, NY 10019',
      latitude: 40.7677,
      longitude: -73.9873,
      capacity: 3000,
      venue_type: 'venue',
      amenities: ['multiple_floors', 'bar', 'vip_area'],
      contact_info: {
        website: 'https://www.terminal5nyc.com',
        phone: '(212) 582-6600'
      },
      is_verified: true
    }
  ],
  
  'los-angeles': [
    {
      name: 'Hollywood Bowl',
      description: 'Iconic outdoor amphitheater in Hollywood Hills',
      address: '2301 Highland Ave, Los Angeles, CA 90068',
      latitude: 34.1122,
      longitude: -118.3391,
      capacity: 17500,
      venue_type: 'amphitheater',
      amenities: ['outdoor', 'parking', 'picnic_allowed', 'accessible'],
      contact_info: {
        website: 'https://www.hollywoodbowl.com',
        phone: '(323) 850-2000'
      },
      is_verified: true
    },
    {
      name: 'The Greek Theatre',
      description: 'Historic outdoor amphitheater in Griffith Park',
      address: '2700 N Vermont Ave, Los Angeles, CA 90027',
      latitude: 34.1192,
      longitude: -118.2913,
      capacity: 5900,
      venue_type: 'amphitheater',
      amenities: ['outdoor', 'historic', 'parking', 'accessible'],
      contact_info: {
        website: 'https://www.greektheatrela.com',
        phone: '(323) 665-5857'
      },
      is_verified: true
    },
    {
      name: 'Walt Disney Concert Hall',
      description: 'Frank Gehry-designed concert hall in Downtown LA',
      address: '111 S Grand Ave, Los Angeles, CA 90012',
      latitude: 34.0554,
      longitude: -118.2499,
      capacity: 2265,
      venue_type: 'concert_hall',
      amenities: ['fine_dining', 'parking', 'accessible', 'gift_shop'],
      contact_info: {
        website: 'https://www.laphil.com',
        phone: '(323) 850-2000'
      },
      is_verified: true
    },
    {
      name: 'The Troubadour',
      description: 'Legendary rock club in West Hollywood',
      address: '9081 Santa Monica Blvd, West Hollywood, CA 90069',
      latitude: 34.0901,
      longitude: -118.3895,
      capacity: 400,
      venue_type: 'club',
      amenities: ['bar', 'historic', 'intimate'],
      contact_info: {
        website: 'https://www.troubadour.com',
        phone: '(310) 276-6168'
      },
      is_verified: true
    },
    {
      name: 'El Rey Theatre',
      description: 'Art deco theater in the Miracle Mile',
      address: '5515 Wilshire Blvd, Los Angeles, CA 90036',
      latitude: 34.0621,
      longitude: -118.3456,
      capacity: 771,
      venue_type: 'theater',
      amenities: ['art_deco', 'bar', 'accessible'],
      contact_info: {
        website: 'https://www.theelrey.com',
        phone: '(323) 936-6400'
      },
      is_verified: true
    }
  ],
  
  'san-francisco': [
    {
      name: 'The Fillmore',
      description: 'Historic rock venue in the Western Addition',
      address: '1805 Geary Blvd, San Francisco, CA 94115',
      latitude: 37.7841,
      longitude: -122.4316,
      capacity: 1150,
      venue_type: 'venue',
      amenities: ['historic', 'bar', 'poster_tradition'],
      contact_info: {
        website: 'https://www.thefillmore.com',
        phone: '(415) 346-6000'
      },
      is_verified: true
    },
    {
      name: 'Davies Symphony Hall',
      description: 'Home of the San Francisco Symphony',
      address: '201 Van Ness Ave, San Francisco, CA 94102',
      latitude: 37.7787,
      longitude: -122.4203,
      capacity: 2743,
      venue_type: 'concert_hall',
      amenities: ['accessible', 'fine_dining', 'parking'],
      contact_info: {
        website: 'https://www.sfsymphony.org',
        phone: '(415) 864-6000'
      },
      is_verified: true
    },
    {
      name: 'The Independent',
      description: 'Intimate rock venue in the Divisadero Corridor',
      address: '628 Divisadero St, San Francisco, CA 94117',
      latitude: 37.7747,
      longitude: -122.4378,
      capacity: 500,
      venue_type: 'club',
      amenities: ['intimate', 'bar', 'standing_room'],
      contact_info: {
        website: 'https://www.theindependentsf.com',
        phone: '(415) 771-1421'
      },
      is_verified: true
    },
    {
      name: 'Great American Music Hall',
      description: 'Historic venue with ornate Victorian interior',
      address: '859 O\'Farrell St, San Francisco, CA 94109',
      latitude: 37.7852,
      longitude: -122.4186,
      capacity: 470,
      venue_type: 'venue',
      amenities: ['historic', 'seated_dining', 'bar', 'balcony'],
      contact_info: {
        website: 'https://www.gamh.com',
        phone: '(415) 885-0750'
      },
      is_verified: true
    }
  ],
  
  'chicago': [
    {
      name: 'Chicago Theatre',
      description: 'Historic landmark theater in the Loop',
      address: '175 N State St, Chicago, IL 60601',
      latitude: 41.8852,
      longitude: -87.6274,
      capacity: 3600,
      venue_type: 'theater',
      amenities: ['historic', 'accessible', 'landmark'],
      contact_info: {
        website: 'https://www.thechicagotheatre.com',
        phone: '(312) 462-6300'
      },
      is_verified: true
    },
    {
      name: 'Metro Chicago',
      description: 'Alternative rock venue in Wrigleyville',
      address: '3730 N Clark St, Chicago, IL 60613',
      latitude: 41.9488,
      longitude: -87.6596,
      capacity: 1150,
      venue_type: 'club',
      amenities: ['bar', 'intimate', 'balcony'],
      contact_info: {
        website: 'https://www.metrochicago.com',
        phone: '(773) 549-4140'
      },
      is_verified: true
    },
    {
      name: 'United Center',
      description: 'Major sports and entertainment arena',
      address: '1901 W Madison St, Chicago, IL 60612',
      latitude: 41.8807,
      longitude: -87.6742,
      capacity: 23500,
      venue_type: 'arena',
      amenities: ['parking', 'food_court', 'accessible', 'merchandise'],
      contact_info: {
        website: 'https://www.unitedcenter.com',
        phone: '(312) 455-4500'
      },
      is_verified: true
    },
    {
      name: 'House of Blues Chicago',
      description: 'Music venue and restaurant in Marina City',
      address: '329 N Dearborn St, Chicago, IL 60654',
      latitude: 41.8881,
      longitude: -87.6290,
      capacity: 1800,
      venue_type: 'club',
      amenities: ['restaurant', 'bar', 'vip_area'],
      contact_info: {
        website: 'https://www.houseofblues.com/chicago',
        phone: '(312) 923-2000'
      },
      is_verified: true
    }
  ],
  
  'austin': [
    {
      name: 'Moody Theater',
      description: 'Home of Austin City Limits live music television program',
      address: '310 W Willie Nelson Blvd, Austin, TX 78701',
      latitude: 30.2642,
      longitude: -97.7489,
      capacity: 2750,
      venue_type: 'theater',
      amenities: ['tv_studio', 'accessible', 'downtown'],
      contact_info: {
        website: 'https://www.acl-live.com',
        phone: '(512) 225-7999'
      },
      is_verified: true
    },
    {
      name: 'Stubb\'s Bar-B-Q',
      description: 'Outdoor amphitheater and restaurant',
      address: '801 Red River St, Austin, TX 78701',
      latitude: 30.2634,
      longitude: -97.7341,
      capacity: 2200,
      venue_type: 'amphitheater',
      amenities: ['outdoor', 'restaurant', 'bar', 'bbq'],
      contact_info: {
        website: 'https://www.stubbsaustin.com',
        phone: '(512) 480-8341'
      },
      is_verified: true
    },
    {
      name: 'The Continental Club',
      description: 'Historic honky-tonk on South Congress',
      address: '1315 S Congress Ave, Austin, TX 78704',
      latitude: 30.2484,
      longitude: -97.7506,
      capacity: 400,
      venue_type: 'club',
      amenities: ['historic', 'bar', 'honky_tonk'],
      contact_info: {
        website: 'https://www.continentalclub.com',
        phone: '(512) 441-2444'
      },
      is_verified: true
    },
    {
      name: 'Antone\'s Nightclub',
      description: 'Home of the Blues in Austin',
      address: '305 E 5th St, Austin, TX 78701',
      latitude: 30.2654,
      longitude: -97.7397,
      capacity: 800,
      venue_type: 'club',
      amenities: ['blues_venue', 'bar', 'intimate'],
      contact_info: {
        website: 'https://www.antonesnightclub.com',
        phone: '(512) 814-0361'
      },
      is_verified: true
    }
  ]
}

async function seedVenues() {
  console.log('🎭 Starting venue seeding process...')
  
  try {
    // Get city IDs for reference
    const { data: cities, error: cityError } = await supabase
      .from('cities')
      .select('id, slug')
    
    if (cityError) {
      console.error('Error fetching cities:', cityError)
      return false
    }
    
    const cityMap = new Map(cities?.map(c => [c.slug, c.id]) || [])
    
    // Check existing venues
    const { data: existingVenues, error: checkError } = await supabase
      .from('venues')
      .select('slug')
    
    if (checkError) {
      console.error('Error checking existing venues:', checkError)
      return false
    }
    
    const existingSlugs = new Set(existingVenues?.map(v => v.slug) || [])
    
    // Prepare venues for insertion
    const venuesToInsert = []
    let totalVenuesCount = 0
    
    for (const [citySlug, venues] of Object.entries(MAJOR_VENUES)) {
      const cityId = cityMap.get(citySlug)
      if (!cityId) {
        console.warn(`⚠️ City ${citySlug} not found, skipping venues`)
        continue
      }
      
      for (const venue of venues) {
        totalVenuesCount++
        const slug = createSlug(venue.name)
        
        if (existingSlugs.has(slug)) {
          continue
        }
        
        venuesToInsert.push({
          ...venue,
          slug,
          city_id: cityId,
          images: venue.images || [],
          hours: venue.hours || {}
        })
      }
    }
    
    if (venuesToInsert.length === 0) {
      console.log('✅ All major venues already exist in database')
      return true
    }
    
    console.log(`🎭 Inserting ${venuesToInsert.length} new venues out of ${totalVenuesCount} total...`)
    
    // Insert venues in batches
    const batchSize = 10
    const batches = []
    for (let i = 0; i < venuesToInsert.length; i += batchSize) {
      batches.push(venuesToInsert.slice(i, i + batchSize))
    }
    
    let totalInserted = 0
    for (const batch of batches) {
      const { data, error } = await supabase
        .from('venues')
        .insert(batch)
        .select()
      
      if (error) {
        console.error('Error inserting venue batch:', error)
        continue
      }
      
      totalInserted += data?.length || 0
      console.log(`✅ Inserted batch of ${data?.length || 0} venues`)
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    console.log(`🎉 Successfully seeded ${totalInserted} venues!`)
    
    // Verify the insertion by city
    const { data: verifyData, error: verifyError } = await supabase
      .from('venues')
      .select(`
        name, slug, venue_type, capacity,
        cities(name, slug)
      `)
      .order('name')
    
    if (verifyError) {
      console.error('Error verifying venues:', verifyError)
    } else {
      console.log('\n📋 Venues by city:')
      const venuesByCity = {}
      verifyData?.forEach(venue => {
        const cityName = venue.cities?.name || 'Unknown'
        if (!venuesByCity[cityName]) venuesByCity[cityName] = []
        venuesByCity[cityName].push(venue)
      })
      
      Object.entries(venuesByCity).forEach(([city, venues]) => {
        console.log(`\n  ${city}:`)
        venues.forEach(venue => {
          console.log(`    - ${venue.name} (${venue.venue_type}, ${venue.capacity} capacity)`)
        })
      })
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Failed to seed venues:', error)
    return false
  }
}

// Export for use in other scripts
module.exports = { seedVenues, MAJOR_VENUES }

// Run if called directly
if (require.main === module) {
  seedVenues()
    .then(success => {
      console.log(success ? '✅ Venue seeding completed!' : '❌ Venue seeding failed!')
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}