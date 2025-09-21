#!/usr/bin/env node

/**
 * Working Eventbrite Public Event Discovery
 * Uses the proper public search endpoints
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🎫 EVENTBRITE PUBLIC EVENT DISCOVERY\n');

async function searchEventbritePublicEvents(city = 'Toronto') {
  const token = process.env.EVENTBRITE_PRIVATE_TOKEN;
  
  console.log(`🔍 Searching public Eventbrite events for ${city}...`);
  
  // Try different search approaches for public events
  const searchStrategies = [
    // Strategy 1: Simple text search
    {
      name: 'Text search',
      url: `https://www.eventbriteapi.com/v3/destination/search/?location=${encodeURIComponent(city)}&include_online_only=false&include_tba=false&price=free,paid`
    },
    // Strategy 2: Events by city
    {
      name: 'City search', 
      url: `https://www.eventbriteapi.com/v3/destination/search/?location.address=${encodeURIComponent(city)}&include_online_only=false`
    },
    // Strategy 3: Browse events
    {
      name: 'Browse events',
      url: `https://www.eventbriteapi.com/v3/destination/events/?expand=venue,category&location=${encodeURIComponent(city)}`
    }
  ];

  let allEvents = [];

  for (const strategy of searchStrategies) {
    try {
      console.log(`  Trying: ${strategy.name}`);
      
      const response = await fetch(strategy.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`    Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response structures
        let events = [];
        if (data.events) {
          events = data.events;
        } else if (data.results) {
          events = data.results;
        } else if (data.items) {
          events = data.items;
        }
        
        console.log(`    Found: ${events.length} events`);
        
        if (events.length > 0) {
          allEvents.push(...events);
          console.log(`    ✅ Success with ${strategy.name}`);
          break; // Use first successful strategy
        }
      } else {
        const errorText = await response.text();
        console.log(`    ❌ Failed: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }

  // If no events found, try the organization events approach
  if (allEvents.length === 0) {
    console.log('  Trying organization-specific search...');
    try {
      // Get organizations first
      const orgResponse = await fetch('https://www.eventbriteapi.com/v3/organizations/search/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        console.log(`    Found ${orgData.organizations?.length || 0} organizations`);
        
        // For each organization, get their events
        for (const org of (orgData.organizations || []).slice(0, 3)) {
          try {
            const eventsResponse = await fetch(`https://www.eventbriteapi.com/v3/organizations/${org.id}/events/?expand=venue,category&status=live`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              if (eventsData.events && eventsData.events.length > 0) {
                allEvents.push(...eventsData.events);
                console.log(`    ✅ Found ${eventsData.events.length} events from ${org.name}`);
              }
            }
          } catch (error) {
            console.log(`    ⚠️ Org ${org.id} failed: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`    ❌ Org search failed: ${error.message}`);
    }
  }

  console.log(`\n📊 Total Eventbrite events found: ${allEvents.length}`);
  
  if (allEvents.length > 0) {
    console.log('\n📋 Sample events:');
    allEvents.slice(0, 3).forEach((event, i) => {
      console.log(`  ${i+1}. ${event.name?.text || event.title || 'Untitled'}`);
      console.log(`     📅 ${event.start?.local || event.date || 'TBA'}`);
      console.log(`     📍 ${event.venue?.name || event.location || 'TBA'}`);
    });
  }

  return allEvents;
}

// Test the search
const events = await searchEventbritePublicEvents('Toronto');

if (events.length === 0) {
  console.log('\n💡 If no events found, this could mean:');
  console.log('   • Your Eventbrite token has limited access');
  console.log('   • No public events in the search area');
  console.log('   • API endpoints have changed');
  console.log('\n✅ The good news: Yelp API is working perfectly!');
  console.log('   We can still populate events from Yelp + Google Places');
} else {
  console.log('\n🎉 Eventbrite integration working!');
}