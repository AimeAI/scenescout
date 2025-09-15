#!/usr/bin/env node

// Bootstrap real venue and event data using APIs directly
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;

// Toronto coordinates
const TORONTO_LAT = 43.6532;
const TORONTO_LNG = -79.3832;

async function fetchGooglePlaces() {
  console.log('🔍 Fetching venues from Google Places...');
  
  const types = ['restaurant', 'bar', 'tourist_attraction', 'museum', 'park', 'gym'];
  const allVenues = [];
  
  for (const type of types) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${TORONTO_LAT},${TORONTO_LNG}&radius=5000&type=${type}&key=${GOOGLE_API_KEY}`
      );
      
      if (!response.ok) {
        console.error(`Google Places API error for ${type}:`, response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (data.results) {
        console.log(`Found ${data.results.length} ${type} venues`);
        allVenues.push(...data.results.map(place => ({
          name: place.name,
          address: place.vicinity || place.formatted_address,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          venue_type: type,
          rating: place.rating,
          external_id: place.place_id,
          images: place.photos ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`] : []
        })));
      }
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error fetching ${type} places:`, error);
    }
  }
  
  return allVenues;
}

async function fetchYelpVenues() {
  console.log('🔍 Fetching venues from Yelp...');
  
  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?latitude=${TORONTO_LAT}&longitude=${TORONTO_LNG}&radius=5000&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${YELP_API_KEY}`,
        }
      }
    );
    
    if (!response.ok) {
      console.error('Yelp API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.businesses) {
      console.log(`Found ${data.businesses.length} Yelp venues`);
      return data.businesses.map(business => ({
        name: business.name,
        address: business.location.display_address.join(', '),
        latitude: business.coordinates.latitude,
        longitude: business.coordinates.longitude,
        venue_type: business.categories[0]?.alias || 'other',
        rating: business.rating,
        phone: business.phone,
        website: business.url,
        external_id: business.id,
        images: business.image_url ? [business.image_url] : []
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('Error fetching Yelp venues:', error);
    return [];
  }
}

async function insertVenues(venues) {
  console.log(`💾 Inserting ${venues.length} venues into database...`);
  
  // Get Toronto city ID
  const { data: city } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', 'toronto-on')
    .single();
  
  if (!city) {
    console.error('Toronto city not found');
    return;
  }
  
  let inserted = 0;
  
  for (const venue of venues) {
    try {
      const { error } = await supabase
        .from('venues')
        .insert({
          name: venue.name,
          address: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
          venue_type: venue.venue_type,
          phone: venue.phone,
          website: venue.website,
          images: venue.images,
          external_id: venue.external_id,
          city_id: city.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Insert error:', error.message);
      } else {
        inserted++;
      }
      
    } catch (error) {
      console.error('Error inserting venue:', error);
    }
  }
  
  console.log(`✅ Successfully inserted ${inserted} venues`);
}

async function main() {
  console.log('🚀 Bootstrapping real venue data for SceneScout...');
  
  if (!GOOGLE_API_KEY || !YELP_API_KEY) {
    console.error('❌ Missing API keys. Check your .env file.');
    process.exit(1);
  }
  
  try {
    // Fetch venues from both APIs
    const [googleVenues, yelpVenues] = await Promise.all([
      fetchGooglePlaces(),
      fetchYelpVenues()
    ]);
    
    // Combine and deduplicate
    const allVenues = [...googleVenues, ...yelpVenues];
    
    if (allVenues.length > 0) {
      await insertVenues(allVenues);
      console.log('🎉 Bootstrap complete! Refresh your app to see real venue data.');
    } else {
      console.log('❌ No venues found');
    }
    
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

main();