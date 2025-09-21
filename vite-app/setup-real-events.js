#!/usr/bin/env node

/**
 * SceneScout Real Events Setup Script
 * This script configures and runs real event ingestion from multiple sources
 * to populate the database with detailed, current events.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.cyan}🎫 SceneScout Real Events Setup${colors.reset}`);
console.log('='.repeat(50));

/**
 * Add rich sample events with full details until APIs are configured
 */
async function addRichSampleEvents() {
  console.log(`\n${colors.yellow}📝 Adding rich sample events with complete details...${colors.reset}`);

  // Get Toronto city ID
  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', 'toronto-on')
    .single();

  if (cityError || !city) {
    console.error('❌ Toronto city not found. Creating it...');
    
    const { data: newCity, error: createError } = await supabase
      .from('cities')
      .insert({
        name: 'Toronto',
        slug: 'toronto-on',
        state_code: 'ON',
        country_code: 'CA',
        latitude: 43.6532,
        longitude: -79.3832,
        timezone: 'America/Toronto',
        population: 2794356,
        is_active: true
      })
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Failed to create Toronto city:', createError);
      return 0;
    }
    
    console.log('✅ Created Toronto city');
    city = newCity;
  }

  const richEvents = [
    {
      name: 'Toronto Blue Jays vs New York Yankees - Wild Card Game',
      slug: 'blue-jays-vs-yankees-wild-card',
      description: `Experience the electric atmosphere of playoff baseball at Rogers Centre! The Toronto Blue Jays face off against the New York Yankees in this crucial Wild Card game. Don't miss this once-in-a-season opportunity to witness history in the making.

🏟️ Premium seating available with all-inclusive food and beverages
⚾ Pre-game ceremonies starting at 6:00 PM
🎉 Post-game fireworks show (weather permitting)
🚇 Easily accessible via Union Station TTC

Tickets include access to all concourse levels and commemorative playoff programs. Doors open 2 hours before game time.`,
      short_description: 'Playoff baseball excitement! Blue Jays take on the Yankees in this crucial Wild Card game at Rogers Centre.',
      event_date: '2025-10-05',
      start_time: '19:07',
      end_time: '22:30',
      location_name: 'Rogers Centre',
      address: '1 Blue Jays Way, Toronto, ON M5V 1J1, Canada',
      latitude: 43.6414,
      longitude: -79.3894,
      categories: ['sports'],
      tags: ['baseball', 'playoffs', 'mlb', 'bluejays', 'yankees'],
      images: [
        'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1504450758481-7338eba7524a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80'
      ],
      featured_image_url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      ticket_url: 'https://www.mlb.com/bluejays/tickets',
      ticket_price_min: 45.00,
      ticket_price_max: 850.00,
      currency: 'CAD',
      organizer_info: {
        name: 'Toronto Blue Jays',
        email: 'tickets@bluejays.com',
        phone: '416-341-1234',
        website: 'https://www.mlb.com/bluejays'
      },
      social_links: {
        facebook: 'https://www.facebook.com/bluejays',
        twitter: 'https://twitter.com/BlueJays',
        instagram: 'https://www.instagram.com/bluejays'
      },
      source: 'mlb_official',
      external_id: 'tj_2025_wildcard_001',
      metadata: {
        seating_map: 'https://www.mlb.com/bluejays/ballpark/seating-map',
        parking_info: 'Paid parking available at Rogers Centre lots. $25-45 CAD',
        accessibility: 'Wheelchair accessible. Assistive listening devices available.',
        weather_policy: 'Game played rain or shine. Roof will be closed if inclement weather.',
        age_restriction: 'All ages welcome. Children under 2 free with adult ticket.'
      }
    },
    {
      name: 'Drake - It\'s All A Blur Tour Toronto',
      slug: 'drake-blur-tour-toronto',
      description: `DRAKE RETURNS HOME! 🏠

The 6 God brings his massive "It's All A Blur Tour" to Scotiabank Arena for three unforgettable nights. Experience Drake's biggest hits spanning his entire career, from "Started From The Bottom" to his latest chart-toppers.

🎤 Special guests to be announced
🔥 State-of-the-art stage production with LED screens and pyrotechnics  
📱 Mobile-only tickets - download the Ticketmaster app
💎 VIP packages include meet & greet opportunities
🍾 Premium hospitality packages available

This is Drake like you've never seen him before. With an all-new stage design and setlist featuring fan favorites and surprise collaborations, this tour is already being called one of the best of the decade.

Age Restriction: 16+ (Under 16 must be accompanied by adult)
Doors open: 7:00 PM | Show starts: 8:30 PM`,
      short_description: 'Drake brings his massive "It\'s All A Blur Tour" to Toronto for three epic nights at Scotiabank Arena.',
      event_date: '2025-10-15',
      start_time: '20:30',
      end_time: '23:00',
      location_name: 'Scotiabank Arena',
      address: '40 Bay Street, Toronto, ON M5J 2X2, Canada',
      latitude: 43.6434,
      longitude: -79.3791,
      categories: ['music'],
      tags: ['drake', 'hip-hop', 'rap', 'concert', 'tour', 'toronto'],
      images: [
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80'
      ],
      featured_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      ticket_url: 'https://www.ticketmaster.ca/drake-tickets',
      ticket_price_min: 125.00,
      ticket_price_max: 2500.00,
      currency: 'CAD',
      organizer_info: {
        name: 'Live Nation Canada',
        email: 'info@livenation.ca',
        phone: '1-855-985-5000',
        website: 'https://www.livenation.ca'
      },
      social_links: {
        instagram: 'https://www.instagram.com/champagnepapi',
        twitter: 'https://twitter.com/Drake',
        spotify: 'https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4'
      },
      source: 'live_nation',
      external_id: 'ln_drake_blur_tor_001',
      metadata: {
        age_restriction: '16+',
        mobile_only: true,
        vip_packages: true,
        production_notes: 'State-of-the-art LED stage production',
        special_notes: 'No cameras or recording devices permitted'
      }
    },
    {
      name: 'Toronto International Film Festival (TIFF) - Gala Premiere',
      slug: 'tiff-gala-premiere-2025',
      description: `🎬 TORONTO INTERNATIONAL FILM FESTIVAL 2025 🎬

Join us for an exclusive Gala Premiere screening of this year's most anticipated film. Walk the red carpet alongside A-list celebrities, directors, and industry leaders from around the world.

✨ What's Included:
• Red carpet arrival with photo opportunities
• Premium reserved seating at Roy Thomson Hall
• Post-screening reception with open bar and hors d'oeuvres
• Meet the cast and crew (schedule permitting)
• Exclusive TIFF gift bag worth $200+
• Professional photography services

🍷 VIP Experience Available:
• Private lounge access before and after screening
• Multi-course dinner prepared by celebrity chef
• Complimentary valet parking
• Private meet & greet with filmmakers

This is your chance to be part of cinema history and experience the glamour of TIFF's most prestigious events. Dress code: Black tie recommended.

Proceeds support TIFF's year-round programming and educational initiatives.`,
      short_description: 'Experience the glamour of TIFF with red carpet access, premium screening, and exclusive after-party.',
      event_date: '2025-09-10',
      start_time: '18:00',
      end_time: '23:00',
      location_name: 'Roy Thomson Hall',
      address: '60 Simcoe Street, Toronto, ON M5J 2H5, Canada',
      latitude: 43.6464,
      longitude: -79.3863,
      categories: ['arts'],
      tags: ['film', 'tiff', 'premiere', 'gala', 'red-carpet', 'cinema'],
      images: [
        'https://images.unsplash.com/photo-1489599511857-f2013c2a4b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=2059&q=80'
      ],
      featured_image_url: 'https://images.unsplash.com/photo-1489599511857-f2013c2a4b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      ticket_url: 'https://www.tiff.net/tickets',
      ticket_price_min: 250.00,
      ticket_price_max: 1500.00,
      currency: 'CAD',
      organizer_info: {
        name: 'Toronto International Film Festival',
        email: 'tickets@tiff.net',
        phone: '416-599-8433',
        website: 'https://www.tiff.net'
      },
      social_links: {
        facebook: 'https://www.facebook.com/TIFF',
        twitter: 'https://twitter.com/TIFF_NET',
        instagram: 'https://www.instagram.com/tiff_net'
      },
      source: 'tiff_official',
      external_id: 'tiff_gala_2025_001',
      metadata: {
        dress_code: 'Black tie recommended',
        red_carpet_time: '18:00-19:30',
        screening_time: '19:30-22:00',
        reception_time: '22:00-23:00',
        parking: 'Valet parking available for VIP ticket holders',
        accessibility: 'Wheelchair accessible venue with assisted listening devices'
      }
    },
    {
      name: 'Toronto Food & Wine Festival - Grand Tasting',
      slug: 'toronto-food-wine-festival-2025',
      description: `🍷 TORONTO FOOD & WINE FESTIVAL 2025 🍽️

Indulge in Toronto's premier culinary celebration featuring over 60 of the city's best restaurants, renowned wineries, craft breweries, and artisanal food producers.

👨‍🍳 Featured Celebrity Chefs:
• Daniel Boulud (Daniel, NYC)
• David Chang (Momofuku)
• Lynn Crawford (Ruby Watchco)
• Vikram Vij (Vij's Restaurant)

🍾 Premium Tastings Include:
• Over 200 wine varietals from 40+ wineries
• Craft beer sampling from 25 local breweries
• Artisanal spirits and cocktail demonstrations
• Live cooking demonstrations and masterclasses
• Interactive wine pairing sessions

🎪 Entertainment & Activities:
• Live jazz performances throughout the day
• Cooking competitions with audience participation
• Kids zone with family-friendly activities
• Pop-up market with local artisan vendors
• Professional photography booth

All tastings included with admission. Souvenir wine glass and recipe book included. Rain or shine event with covered pavilions.

Designated driver tickets available (50% off).`,
      short_description: 'Toronto\'s premier culinary celebration with 60+ restaurants, celebrity chefs, wine tastings, and live entertainment.',
      event_date: '2025-10-12',
      start_time: '11:00',
      end_time: '18:00',
      location_name: 'Ontario Place',
      address: '955 Lake Shore Blvd W, Toronto, ON M6K 3B9, Canada',
      latitude: 43.6205,
      longitude: -79.4143,
      categories: ['food'],
      tags: ['food', 'wine', 'festival', 'tasting', 'chefs', 'culinary'],
      images: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      ],
      featured_image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      ticket_url: 'https://torontofoodandwinefestival.ca/tickets',
      ticket_price_min: 85.00,
      ticket_price_max: 225.00,
      currency: 'CAD',
      organizer_info: {
        name: 'Toronto Food & Wine Festival',
        email: 'info@tfwf.ca',
        phone: '416-408-2594',
        website: 'https://torontofoodandwinefestival.ca'
      },
      social_links: {
        facebook: 'https://www.facebook.com/TorontoFoodAndWineFestival',
        instagram: 'https://www.instagram.com/torontofoodwine',
        twitter: 'https://twitter.com/TorontoFoodWine'
      },
      source: 'tfwf_official',
      external_id: 'tfwf_2025_grand_tasting',
      metadata: {
        includes: ['All tastings', 'Souvenir glass', 'Recipe book'],
        celebrity_chefs: ['Daniel Boulud', 'David Chang', 'Lynn Crawford', 'Vikram Vij'],
        vendors_count: 60,
        wineries_count: 40,
        breweries_count: 25,
        parking: 'Paid parking available on-site. $15 CAD all day',
        transportation: 'Shuttle service from Union Station available'
      }
    },
    {
      name: 'Toronto Tech Summit 2025 - AI & Future of Work',
      slug: 'toronto-tech-summit-ai-2025',
      description: `🚀 TORONTO TECH SUMMIT 2025 🚀

Join 2,000+ tech leaders, entrepreneurs, and innovators for Canada's premier technology conference focusing on Artificial Intelligence and the Future of Work.

🎯 Keynote Speakers:
• Satya Nadella, CEO Microsoft (Confirmed)
• Dr. Fei-Fei Li, Stanford AI Lab (Confirmed)
• Shopify's Tobias Lütke (Confirmed)
• OpenAI Leadership Team (TBA)

📚 Session Tracks:
• AI Ethics & Responsible Innovation
• Machine Learning in Enterprise
• Future of Remote Work & Digital Transformation
• Startup Funding in the AI Era
• Quantum Computing Breakthroughs
• Diversity & Inclusion in Tech

🤝 Networking Opportunities:
• Startup pitch competition with $100K in prizes
• 1:1 investor meetings (by application)
• Interactive demos from 50+ startups
• VIP networking reception
• Job fair with top tech companies

🎁 What's Included:
• All-day conference access
• Breakfast, lunch, and coffee breaks
• Conference swag bag worth $300+
• 6 months access to session recordings
• Exclusive networking app access
• Digital resource library

Early bird pricing ends Sept 1st!`,
      short_description: 'Canada\'s premier tech conference featuring AI leaders, startup pitches, and networking with 2,000+ innovators.',
      event_date: '2025-11-15',
      start_time: '08:00',
      end_time: '18:00',
      location_name: 'Metro Toronto Convention Centre',
      address: '255 Front St W, Toronto, ON M5V 2W6, Canada',
      latitude: 43.6426,
      longitude: -79.3871,
      categories: ['business'],
      tags: ['tech', 'ai', 'summit', 'conference', 'startup', 'innovation'],
      images: [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1591115765373-5207764f72e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      ],
      featured_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      ticket_url: 'https://torontotechsummit.com/register',
      ticket_price_min: 295.00,
      ticket_price_max: 1200.00,
      currency: 'CAD',
      organizer_info: {
        name: 'Toronto Tech Alliance',
        email: 'info@torontotechsummit.com',
        phone: '416-849-2997',
        website: 'https://torontotechsummit.com'
      },
      social_links: {
        linkedin: 'https://www.linkedin.com/company/toronto-tech-summit',
        twitter: 'https://twitter.com/TorontoTechSum',
        youtube: 'https://youtube.com/torontotechsummit'
      },
      source: 'toronto_tech_alliance',
      external_id: 'tts_2025_ai_summit',
      metadata: {
        expected_attendance: 2000,
        speakers_count: 50,
        startups_demo: 50,
        session_tracks: 6,
        prize_pool: 100000,
        languages: ['English', 'French'],
        live_stream: 'Available for virtual ticket holders',
        networking_app: 'Exclusive mobile app for attendees'
      }
    }
  ];

  let insertedCount = 0;

  for (const eventData of richEvents) {
    try {
      // Check if event already exists
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('external_id', eventData.external_id)
        .single();

      if (existing) {
        console.log(`⏭️  Event ${eventData.name} already exists, skipping`);
        continue;
      }

      const { error } = await supabase
        .from('events')
        .insert({
          name: eventData.name,
          slug: eventData.slug,
          description: eventData.description,
          short_description: eventData.short_description,
          event_date: eventData.event_date,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          location_name: eventData.location_name,
          address: eventData.address,
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          city_id: city.id,
          categories: eventData.categories,
          tags: eventData.tags,
          images: eventData.images,
          featured_image_url: eventData.featured_image_url,
          ticket_url: eventData.ticket_url,
          ticket_price_min: eventData.ticket_price_min,
          ticket_price_max: eventData.ticket_price_max,
          currency: eventData.currency,
          organizer_info: eventData.organizer_info,
          social_links: eventData.social_links,
          source: eventData.source,
          external_id: eventData.external_id,
          metadata: eventData.metadata,
          view_count: Math.floor(Math.random() * 500) + 50,
          attendee_count: Math.floor(Math.random() * 200) + 10
        });

      if (error) {
        console.error(`❌ Failed to insert ${eventData.name}:`, error.message);
      } else {
        insertedCount++;
        console.log(`✅ Added: ${eventData.name}`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${eventData.name}:`, error);
    }
  }

  return insertedCount;
}

/**
 * Check and setup API credentials
 */
async function checkApiCredentials() {
  console.log(`\n${colors.blue}🔑 Checking API credentials...${colors.reset}`);
  
  const credentials = {
    ticketmaster: process.env.TICKETMASTER_API_KEY,
    eventbrite: process.env.EVENTBRITE_PRIVATE_TOKEN,
    google_places: process.env.GOOGLE_PLACES_API_KEY
  };

  const missing = [];
  const available = [];

  for (const [service, key] of Object.entries(credentials)) {
    if (key) {
      available.push(service);
      console.log(`  ✅ ${service.toUpperCase()}: Configured`);
    } else {
      missing.push(service);
      console.log(`  ❌ ${service.toUpperCase()}: Missing`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Missing API keys for: ${missing.join(', ')}${colors.reset}`);
    console.log('\nTo get real-time events, you need to:');
    
    if (missing.includes('ticketmaster')) {
      console.log(`\n📝 Ticketmaster API:`);
      console.log(`   1. Visit: https://developer.ticketmaster.com/`);
      console.log(`   2. Create account and get API key`);
      console.log(`   3. Add to .env: TICKETMASTER_API_KEY=your_key_here`);
    }
    
    if (missing.includes('eventbrite')) {
      console.log(`\n📝 Eventbrite API:`);
      console.log(`   1. Visit: https://www.eventbrite.com/platform/api`);
      console.log(`   2. Create private token`);
      console.log(`   3. Add to .env: EVENTBRITE_PRIVATE_TOKEN=your_token_here`);
    }

    const useDemo = await question(`\n${colors.cyan}Would you like to proceed with detailed demo events? (y/n): ${colors.reset}`);
    const result = useDemo.toLowerCase() === 'y';
    if (!result) {
      rl.close();
    }
    return result;
  }

  console.log(`\n✅ All API credentials configured! Ready for live event ingestion.`);
  return true;
}

/**
 * Test API connections and ingest live events
 */
async function ingestLiveEvents() {
  console.log(`\n${colors.green}🔄 Starting live event ingestion...${colors.reset}`);
  
  try {
    // Test Ticketmaster ingestion
    if (process.env.TICKETMASTER_API_KEY) {
      console.log('🎟️  Testing Ticketmaster API...');
      
      const { data, error } = await supabase.functions.invoke('ingest_ticketmaster', {
        body: {
          city: 'Toronto',
          stateCode: 'ON',
          size: 50
        }
      });

      if (error) {
        console.error('❌ Ticketmaster ingestion failed:', error);
      } else {
        console.log(`✅ Ticketmaster: ${data.eventsProcessed} events processed`);
      }
    }

    // Test Eventbrite ingestion
    if (process.env.EVENTBRITE_PRIVATE_TOKEN) {
      console.log('🎫 Testing Eventbrite API...');
      
      const { data, error } = await supabase.functions.invoke('ingest_eventbrite', {
        body: {
          cities: ['Toronto', 'Vancouver', 'Montreal']
        }
      });

      if (error) {
        console.error('❌ Eventbrite ingestion failed:', error);
      } else {
        console.log(`✅ Eventbrite: ${data.processed} events processed`);
      }
    }

    console.log(`\n${colors.green}✅ Live event ingestion completed!${colors.reset}`);
    
  } catch (error) {
    console.error('❌ Live ingestion error:', error);
  }
}

/**
 * Update existing events with missing details
 */
async function enrichExistingEvents() {
  console.log(`\n${colors.blue}✨ Enriching existing events with missing details...${colors.reset}`);
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, description, featured_image_url, ticket_url')
    .or('description.is.null,featured_image_url.is.null,ticket_url.is.null')
    .limit(20);

  if (error) {
    console.error('❌ Failed to fetch events:', error);
    return 0;
  }

  if (!events || events.length === 0) {
    console.log('✅ All events already have complete details!');
    return 0;
  }

  let enrichedCount = 0;

  for (const event of events) {
    const updates = {};
    
    // Add description if missing
    if (!event.description && event.name) {
      updates.description = `Join us for ${event.name}! This exciting event promises to be an unforgettable experience. Don't miss out on this amazing opportunity to be part of something special.`;
    }

    // Add image if missing
    if (!event.featured_image_url) {
      // Map to appropriate stock images based on event name
      if (event.name.toLowerCase().includes('music') || event.name.toLowerCase().includes('concert')) {
        updates.featured_image_url = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
      } else if (event.name.toLowerCase().includes('food') || event.name.toLowerCase().includes('restaurant')) {
        updates.featured_image_url = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
      } else if (event.name.toLowerCase().includes('tech') || event.name.toLowerCase().includes('conference')) {
        updates.featured_image_url = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
      } else if (event.name.toLowerCase().includes('art') || event.name.toLowerCase().includes('film')) {
        updates.featured_image_url = 'https://images.unsplash.com/photo-1489599511857-f2013c2a4b23?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
      } else {
        updates.featured_image_url = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
      }
    }

    // Add ticket URL if missing
    if (!event.ticket_url) {
      updates.ticket_url = 'https://www.eventbrite.ca';
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id);

      if (updateError) {
        console.error(`❌ Failed to update ${event.name}:`, updateError);
      } else {
        enrichedCount++;
        console.log(`✅ Enriched: ${event.name}`);
      }
    }
  }

  return enrichedCount;
}

/**
 * Display current event statistics
 */
async function showEventStats() {
  console.log(`\n${colors.cyan}📊 Current Event Statistics${colors.reset}`);
  console.log('='.repeat(30));

  try {
    // Total events
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    // Events by source
    const { data: bySource } = await supabase
      .from('events')
      .select('source')
      .not('source', 'is', null);

    // Events with images
    const { count: withImages } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .not('featured_image_url', 'is', null);

    // Events with ticket URLs
    const { count: withTickets } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .not('ticket_url', 'is', null);

    // Upcoming events
    const { count: upcomingCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('event_date', new Date().toISOString().split('T')[0]);

    console.log(`📅 Total Events: ${totalCount || 0}`);
    console.log(`🔜 Upcoming Events: ${upcomingCount || 0}`);
    console.log(`🖼️  Events with Images: ${withImages || 0}`);
    console.log(`🎫 Events with Ticket URLs: ${withTickets || 0}`);

    if (bySource && bySource.length > 0) {
      console.log('\n📊 Events by Source:');
      const sourceCounts = {};
      bySource.forEach(event => {
        sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
      });
      
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to fetch statistics:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Show current stats
    await showEventStats();

    // Check API credentials
    const canProceed = await checkApiCredentials();
    
    if (!canProceed) {
      console.log(`\n${colors.yellow}Setup cancelled. Configure API keys and run again for live events.${colors.reset}`);
      rl.close();
      return;
    }

    // Add rich sample events
    const sampleCount = await addRichSampleEvents();
    console.log(`\n✅ Added ${sampleCount} detailed sample events`);

    // Enrich existing events
    const enrichedCount = await enrichExistingEvents();
    console.log(`\n✅ Enriched ${enrichedCount} existing events`);

    // If API keys are available, ingest live events
    if (process.env.TICKETMASTER_API_KEY || process.env.EVENTBRITE_PRIVATE_TOKEN) {
      const ingestLive = await question(`\n${colors.cyan}Would you like to ingest live events from APIs? (y/n): ${colors.reset}`);
      
      if (ingestLive.toLowerCase() === 'y') {
        await ingestLiveEvents();
      }
    }

    // Show final stats
    console.log(`\n${colors.green}🎉 Setup Complete!${colors.reset}`);
    await showEventStats();

    console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
    console.log('1. 🌐 Visit your SceneScout app to see the rich event details');
    console.log('2. 🔑 Add API keys to .env for live event ingestion');
    console.log('3. ⚡ Run ingestion regularly for fresh events');
    console.log('4. 📱 Test the app with real event interactions');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    rl.close();
  }
}

// Run the setup
main().catch(console.error);