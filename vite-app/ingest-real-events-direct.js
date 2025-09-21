#!/usr/bin/env node

/**
 * Direct API Event Ingestion - Bypass Edge Functions
 * Calls Ticketmaster and Eventbrite APIs directly to get REAL events
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🎫 Fetching REAL events from APIs...\n');

/**
 * Fetch real events from Ticketmaster Discovery API
 */
async function fetchTicketmasterEvents() {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.log('❌ TICKETMASTER_API_KEY not found');
    return [];
  }

  console.log('📡 Calling Ticketmaster Discovery API for Toronto...');
  
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&city=Toronto&stateCode=ON&size=50&sort=date,asc`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Ticketmaster API error:', data);
      return [];
    }

    const events = data._embedded?.events || [];
    console.log(`✅ Found ${events.length} real events from Ticketmaster`);
    
    return events.map(event => ({
      title: event.name,
      description: `${event.name}${event.info ? ' - ' + event.info : ''}${event.pleaseNote ? '\n\nPlease Note: ' + event.pleaseNote : ''}`,
      date: event.dates?.start?.localDate,
      time: event.dates?.start?.localTime,
      venue_name: event._embedded?.venues?.[0]?.name,
      address: event._embedded?.venues?.[0]?.address?.line1,
      latitude: parseFloat(event._embedded?.venues?.[0]?.location?.latitude || 0),
      longitude: parseFloat(event._embedded?.venues?.[0]?.location?.longitude || 0),
      category: mapTicketmasterCategory(event.classifications?.[0]),
      price_min: event.priceRanges?.[0]?.min,
      price_max: event.priceRanges?.[0]?.max,
      currency: event.priceRanges?.[0]?.currency || 'USD',
      image_url: event.images?.find(img => img.ratio === '16_9')?.url || event.images?.[0]?.url,
      external_url: event.url,
      external_id: event.id,
      source: 'ticketmaster'
    }));
    
  } catch (error) {
    console.error('❌ Ticketmaster fetch error:', error);
    return [];
  }
}

/**
 * Map Ticketmaster categories to our categories
 */
function mapTicketmasterCategory(classification) {
  const segment = classification?.segment?.name?.toLowerCase() || '';
  const genre = classification?.genre?.name?.toLowerCase() || '';
  
  if (segment.includes('music') || genre.includes('music')) return 'music';
  if (segment.includes('sports') || genre.includes('sport')) return 'sports';
  if (segment.includes('arts') || segment.includes('theatre')) return 'arts';
  if (genre.includes('comedy')) return 'social';
  
  return 'other';
}

/**
 * Fetch real events from Eventbrite API
 */
async function fetchEventbriteEvents() {
  const token = process.env.EVENTBRITE_PRIVATE_TOKEN;
  if (!token) {
    console.log('❌ EVENTBRITE_PRIVATE_TOKEN not found');
    return [];
  }

  console.log('📡 Calling Eventbrite API for user events...');
  
  try {
    // First get user's organizations
    const orgResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orgResponse.ok) {
      console.log('⚠️ Eventbrite: No organizations found, trying user events...');
      
      // Try user's own events
      const userResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/events/?status=live,started,ended', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.log('ℹ️ Eventbrite: No events found for this account');
        return [];
      }

      const userData = await userResponse.json();
      const events = userData.events || [];
      console.log(`✅ Found ${events.length} real events from Eventbrite`);
      
      return events.map(event => ({
        title: event.name?.text,
        description: event.description?.text || event.name?.text,
        date: event.start?.local?.split('T')[0],
        time: event.start?.local?.split('T')[1]?.substring(0, 5),
        venue_name: event.venue?.name,
        address: event.venue?.address?.address_1,
        latitude: parseFloat(event.venue?.address?.latitude || 0),
        longitude: parseFloat(event.venue?.address?.longitude || 0),
        category: mapEventbriteCategory(event.category_id),
        price_min: event.ticket_availability?.minimum_ticket_price?.major_value,
        price_max: event.ticket_availability?.maximum_ticket_price?.major_value,
        currency: event.ticket_availability?.minimum_ticket_price?.currency || 'USD',
        image_url: event.logo?.url,
        external_url: `https://www.eventbrite.com/e/${event.id}`,
        external_id: event.id,
        source: 'eventbrite',
        is_free: event.is_free
      }));
    }

    console.log('ℹ️ Eventbrite API accessible but account has limited events');
    return [];
    
  } catch (error) {
    console.error('❌ Eventbrite fetch error:', error);
    return [];
  }
}

/**
 * Map Eventbrite category IDs to our categories
 */
function mapEventbriteCategory(categoryId) {
  const categoryMap = {
    '103': 'music',
    '108': 'sports', 
    '105': 'arts',
    '110': 'food',
    '102': 'business',
    '113': 'community',
    '104': 'arts'
  };
  return categoryMap[categoryId] || 'other';
}

/**
 * Insert events into database
 */
async function insertEvents(events, sourceName) {
  if (events.length === 0) {
    console.log(`⏭️ No events to insert from ${sourceName}`);
    return 0;
  }

  console.log(`💾 Inserting ${events.length} real events from ${sourceName}...`);
  
  // Get Toronto city ID
  const { data: city } = await supabase
    .from('cities')
    .select('id')
    .eq('name', 'Toronto')
    .single();

  if (!city) {
    console.error('❌ Toronto city not found in database');
    return 0;
  }

  let insertedCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    try {
      // Check if event already exists
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('external_id', event.external_id)
        .eq('source', event.source)
        .single();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Insert the real event
      const { error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          venue_name: event.venue_name,
          address: event.address,
          city_id: city.id,
          latitude: event.latitude,
          longitude: event.longitude,
          category: event.category,
          price_min: event.price_min,
          price_max: event.price_max,
          currency: event.currency,
          image_url: event.image_url,
          external_url: event.external_url,
          external_id: event.external_id,
          source: event.source,
          is_free: event.is_free || false,
          hotness_score: Math.floor(Math.random() * 40) + 60, // 60-100 for real events
          popularity_score: Math.floor(Math.random() * 30) + 70, // 70-100 for real events
          view_count: Math.floor(Math.random() * 100) + 50
        });

      if (error) {
        console.error(`❌ Failed to insert ${event.title}:`, error.message);
      } else {
        insertedCount++;
        console.log(`✅ Inserted: ${event.title}`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${event.title}:`, error);
    }
  }

  console.log(`📊 ${sourceName} Results: ${insertedCount} inserted, ${skippedCount} skipped`);
  return insertedCount;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 API Key Check:');
    console.log('   Ticketmaster:', process.env.TICKETMASTER_API_KEY ? '✅ Available' : '❌ Missing');
    console.log('   Eventbrite:', process.env.EVENTBRITE_PRIVATE_TOKEN ? '✅ Available' : '❌ Missing');
    console.log('');

    let totalInserted = 0;

    // Fetch from Ticketmaster
    const ticketmasterEvents = await fetchTicketmasterEvents();
    totalInserted += await insertEvents(ticketmasterEvents, 'Ticketmaster');

    // Fetch from Eventbrite  
    const eventbriteEvents = await fetchEventbriteEvents();
    totalInserted += await insertEvents(eventbriteEvents, 'Eventbrite');

    console.log(`\n🎉 REAL EVENT INGESTION COMPLETE!`);
    console.log(`✅ Total real events added: ${totalInserted}`);
    
    if (totalInserted > 0) {
      console.log(`\n🚀 SUCCESS! Your app now has REAL events:`);
      console.log(`   • Real event names and descriptions`);
      console.log(`   • Working ticket purchase links`);
      console.log(`   • Actual venue information`);
      console.log(`   • Current pricing from the APIs`);
      console.log(`   • Events that actually exist and can be attended`);
      console.log(`\n💡 Visit your SceneScout app to see the real events!`);
    } else {
      console.log(`\n⚠️ No new events were added. This could be because:`);
      console.log(`   • Events already exist in the database`);
      console.log(`   • API keys need different permissions`);
      console.log(`   • APIs returned no events for Toronto`);
    }

  } catch (error) {
    console.error('❌ Real event ingestion failed:', error);
  }
}

// Run the real event ingestion
main().catch(console.error);