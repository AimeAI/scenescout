#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sampleEvents = [
  {
    title: 'The Weeknd - After Hours World Tour',
    description: 'Experience The Weeknd\'s chart-topping hits in an unforgettable live concert experience.',
    date: '2025-10-15',
    time: '20:00:00',
    category: 'music',
    is_free: false,
    price_min: 89,
    price_max: 299,
    currency: 'USD',
    external_url: 'https://www.ticketmaster.com/the-weeknd-tickets/artist/1464032',
    url: 'https://www.ticketmaster.com/the-weeknd-tickets/artist/1464032',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    source: 'ticketmaster',
    external_id: 'tm-weeknd-2025',
    hotness_score: 95,
    latitude: 37.7749,
    longitude: -122.4194,
    venue_name: 'Chase Center',
    address: '1 Warriors Way, San Francisco, CA'
  },
  {
    title: 'SF Food & Wine Festival 2025',
    description: 'Taste the best of San Francisco\'s culinary scene with wine pairings from local vineyards.',
    date: '2025-09-28',
    time: '17:00:00',
    category: 'food',
    is_free: false,
    price_min: 125,
    price_max: 250,
    currency: 'USD',
    external_url: 'https://www.eventbrite.com/e/sf-food-wine-festival-tickets',
    url: 'https://www.eventbrite.com/e/sf-food-wine-festival-tickets',
    image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    source: 'eventbrite',
    external_id: 'eb-food-wine-2025',
    hotness_score: 87,
    latitude: 37.7849,
    longitude: -122.4094,
    venue_name: 'Fort Mason Center',
    address: '2 Marina Blvd, San Francisco, CA'
  },
  {
    title: 'Tech Innovators Meetup',
    description: 'Join Silicon Valley\'s brightest minds for an evening of networking and innovation talks.',
    date: '2025-09-22',
    time: '18:30:00',
    category: 'tech',
    is_free: true,
    price_min: null,
    price_max: null,
    currency: 'USD',
    external_url: 'https://www.meetup.com/tech-innovators-sf/events/295847362',
    url: 'https://www.meetup.com/tech-innovators-sf/events/295847362',
    image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
    source: 'meetup',
    external_id: 'meetup-tech-innovators',
    hotness_score: 78,
    latitude: 37.7849,
    longitude: -122.4194,
    venue_name: 'SOMA StrEat Food Park',
    address: '428 11th St, San Francisco, CA'
  },
  {
    title: 'Golden State Warriors vs Lakers',
    description: 'Classic rivalry game between the Warriors and Lakers - don\'t miss this epic showdown!',
    date: '2025-11-02',
    time: '19:30:00',
    category: 'sports',
    is_free: false,
    price_min: 65,
    price_max: 850,
    currency: 'USD',
    external_url: 'https://www.ticketmaster.com/golden-state-warriors-vs-los-angeles-lakers-tickets',
    url: 'https://www.ticketmaster.com/golden-state-warriors-vs-los-angeles-lakers-tickets',
    image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    source: 'ticketmaster',
    external_id: 'tm-warriors-lakers',
    hotness_score: 92,
    latitude: 37.7749,
    longitude: -122.4194,
    venue_name: 'Chase Center',
    address: '1 Warriors Way, San Francisco, CA'
  },
  {
    title: 'SF Symphony: Beethoven\'s 9th',
    description: 'Experience Beethoven\'s magnificent 9th Symphony performed by the world-class SF Symphony.',
    date: '2025-10-08',
    time: '20:00:00',
    category: 'arts',
    is_free: false,
    price_min: 45,
    price_max: 185,
    currency: 'USD',
    external_url: 'https://www.sfsymphony.org/Buy-Tickets/2024-25/Beethovens-Ninth',
    url: 'https://www.sfsymphony.org/Buy-Tickets/2024-25/Beethovens-Ninth',
    image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800',
    source: 'manual',
    external_id: 'sf-symphony-beethoven9',
    hotness_score: 83,
    latitude: 37.7781,
    longitude: -122.4191,
    venue_name: 'Davies Symphony Hall',
    address: '201 Van Ness Ave, San Francisco, CA'
  },
  {
    title: 'Comedy Night at Cobb\'s',
    description: 'Laugh the night away with some of the best stand-up comedians in the business.',
    date: '2025-09-25',
    time: '21:00:00',
    category: 'arts',
    is_free: false,
    price_min: 35,
    price_max: 75,
    currency: 'USD',
    external_url: 'https://cobbscomedy.com/events',
    url: 'https://cobbscomedy.com/events',
    image_url: 'https://images.unsplash.com/photo-1585699184237-96d4de9c4436?w=800',
    source: 'manual',
    external_id: 'cobbs-comedy-night',
    hotness_score: 74,
    latitude: 37.7983,
    longitude: -122.4092,
    venue_name: 'Cobb\'s Comedy Club',
    address: '915 Columbus Ave, San Francisco, CA'
  },
  {
    title: 'Outdoor Movie Night: Inception',
    description: 'Watch Christopher Nolan\'s mind-bending thriller under the stars in Dolores Park.',
    date: '2025-09-30',
    time: '19:30:00',
    category: 'arts',
    is_free: true,
    price_min: null,
    price_max: null,
    currency: 'USD',
    external_url: 'https://www.doloresparkmovie.org/schedule',
    url: 'https://www.doloresparkmovie.org/schedule',
    image_url: 'https://images.unsplash.com/photo-1489599162064-e4d2b0191e4b?w=800',
    source: 'manual',
    external_id: 'dolores-park-inception',
    hotness_score: 81,
    latitude: 37.7598,
    longitude: -122.4267,
    venue_name: 'Dolores Park',
    address: 'Dolores St & 18th St, San Francisco, CA'
  },
  {
    title: 'SF Street Art Festival',
    description: 'Celebrate urban art with live murals, installations, and performances by local artists.',
    date: '2025-10-12',
    time: '12:00:00',
    category: 'arts',
    is_free: true,
    price_min: null,
    price_max: null,
    currency: 'USD',
    external_url: 'https://www.eventbrite.com/e/sf-street-art-festival-tickets',
    url: 'https://www.eventbrite.com/e/sf-street-art-festival-tickets',
    image_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800',
    source: 'eventbrite',
    external_id: 'eb-street-art-fest',
    hotness_score: 79,
    latitude: 37.7749,
    longitude: -122.4130,
    venue_name: 'Mission District',
    address: '16th St & Mission St, San Francisco, CA'
  },
  {
    title: 'Chinatown Night Market',
    description: 'Experience authentic Asian cuisine and cultural performances in this vibrant night market.',
    date: '2025-09-20',
    time: '18:00:00',
    category: 'food',
    is_free: true,
    price_min: null,
    price_max: null,
    currency: 'USD',
    external_url: 'https://www.sanfranciscochinatown.com/events/night-market',
    url: 'https://www.sanfranciscochinatown.com/events/night-market',
    image_url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
    source: 'manual',
    external_id: 'chinatown-night-market',
    hotness_score: 86,
    latitude: 37.7941,
    longitude: -122.4078,
    venue_name: 'Grant Avenue',
    address: 'Grant Ave & California St, San Francisco, CA'
  },
  {
    title: 'Startup Pitch Competition',
    description: 'Watch the next generation of entrepreneurs pitch their innovative ideas to top VCs.',
    date: '2025-10-05',
    time: '19:00:00',
    category: 'tech',
    is_free: false,
    price_min: 25,
    price_max: 50,
    currency: 'USD',
    external_url: 'https://www.eventbrite.com/e/startup-pitch-competition-tickets',
    url: 'https://www.eventbrite.com/e/startup-pitch-competition-tickets',
    image_url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
    source: 'eventbrite',
    external_id: 'eb-startup-pitch',
    hotness_score: 82,
    latitude: 37.7849,
    longitude: -122.3974,
    venue_name: 'The Battery',
    address: '717 Battery St, San Francisco, CA'
  }
]

async function addSampleEvents() {
  console.log('🎪 Adding sample events with external URLs...')
  
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(sampleEvents)
      .select()

    if (error) {
      console.error('❌ Error inserting events:', error)
      return
    }

    console.log(`✅ Successfully added ${data.length} sample events`)
    
    // Check total events now
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 Total events in database: ${count}`)
    
  } catch (error) {
    console.error('💥 Fatal error:', error)
  }
}

addSampleEvents()
  .then(() => {
    console.log('✨ Sample events added successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })