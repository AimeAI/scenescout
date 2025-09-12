import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    periods?: Array<{
      close: {
        day: number;
        time: string;
      };
      open: {
        day: number;
        time: string;
      };
    }>;
    weekday_text?: string[];
  };
  photos?: Array<{
    height: number;
    html_attributions: string[];
    photo_reference: string;
    width: number;
  }>;
  vicinity?: string;
  permanently_closed?: boolean;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  reference?: string;
  scope?: string;
  alt_ids?: Array<{
    place_id: string;
    scope: string;
  }>;
}

interface GooglePlacesResponse {
  html_attributions: string[];
  results: GooglePlace[];
  status: string;
  error_message?: string;
  info_messages?: string[];
  next_page_token?: string;
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    periods?: Array<{
      close: {
        day: number;
        time: string;
      };
      open: {
        day: number;
        time: string;
      };
    }>;
    weekday_text?: string[];
  };
  photos?: Array<{
    height: number;
    html_attributions: string[];
    photo_reference: string;
    width: number;
  }>;
  reviews?: Array<{
    author_name: string;
    author_url: string;
    language: string;
    profile_photo_url: string;
    rating: number;
    relative_time_description: string;
    text: string;
    time: number;
  }>;
  editorial_summary?: {
    language: string;
    overview: string;
  };
  current_opening_hours?: {
    open_now: boolean;
    periods: Array<{
      close?: {
        date: string;
        day: number;
        time: string;
      };
      open: {
        date: string;
        day: number;
        time: string;
      };
    }>;
    weekday_text: string[];
  };
  wheelchair_accessible_entrance?: boolean;
  curbside_pickup?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  reservable?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  serves_beer?: boolean;
  serves_wine?: boolean;
  serves_vegetarian_food?: boolean;
  utc_offset?: number;
  vicinity?: string;
  adr_address?: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
}

/**
 * Rate limiting helper for Google Places API
 */
class GooglePlacesRateLimit {
  private requests: number[] = [];
  private maxRequestsPerSecond = 50;
  private windowMs = 1000; // 1 second

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequestsPerSecond) {
      const waitTime = this.windowMs;
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

const rateLimit = new GooglePlacesRateLimit();

/**
 * Maps Google Place types to venue categories
 */
function categorizeVenue(types: string[]): { category: string; venue_type: string } {
  const typeMap = {
    restaurant: { category: 'Food & Drink', venue_type: 'restaurant' },
    bar: { category: 'Food & Drink', venue_type: 'bar' },
    night_club: { category: 'Entertainment', venue_type: 'nightclub' },
    movie_theater: { category: 'Entertainment', venue_type: 'movie_theater' },
    amusement_park: { category: 'Entertainment', venue_type: 'amusement_park' },
    bowling_alley: { category: 'Entertainment', venue_type: 'bowling_alley' },
    museum: { category: 'Arts & Culture', venue_type: 'museum' },
    art_gallery: { category: 'Arts & Culture', venue_type: 'art_gallery' },
    library: { category: 'Arts & Culture', venue_type: 'library' },
    park: { category: 'Recreation', venue_type: 'park' },
    gym: { category: 'Recreation', venue_type: 'fitness' },
    stadium: { category: 'Sports', venue_type: 'stadium' },
    shopping_mall: { category: 'Shopping', venue_type: 'shopping_center' },
    store: { category: 'Shopping', venue_type: 'retail' },
    tourist_attraction: { category: 'Entertainment', venue_type: 'attraction' },
    church: { category: 'Community', venue_type: 'religious' },
    university: { category: 'Education', venue_type: 'educational' },
    school: { category: 'Education', venue_type: 'educational' }
  };

  for (const type of types) {
    if (typeMap[type as keyof typeof typeMap]) {
      return typeMap[type as keyof typeof typeMap];
    }
  }

  return { category: 'Other', venue_type: 'unknown' };
}

/**
 * Parses address components from formatted address
 */
function parseAddress(formatted_address: string): {
  city: string;
  state: string;
  postal_code: string;
  country: string;
} {
  const parts = formatted_address.split(', ');
  let city = '';
  let state = '';
  let postal_code = '';
  let country = 'United States';

  // This is a simplified parser - Google Places Details API provides better structured data
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1]; // Country
    const secondLastPart = parts[parts.length - 2]; // State + ZIP
    
    if (lastPart !== 'USA' && lastPart !== 'United States') {
      country = lastPart;
    }
    
    const stateZipMatch = secondLastPart.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
    if (stateZipMatch) {
      state = stateZipMatch[1];
      postal_code = stateZipMatch[2];
    }
    
    if (parts.length >= 4) {
      city = parts[parts.length - 4];
    } else if (parts.length === 3) {
      city = parts[0];
    }
  }

  return { city, state, postal_code, country };
}

/**
 * Supabase Edge Function to ingest venues from Google Places API
 * Fetches venues from Google Places API and stores them in the database
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API key from environment variables
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const location = url.searchParams.get('location') || '37.7749,-122.4194'; // San Francisco default
    const radius = parseInt(url.searchParams.get('radius') || '5000'); // 5km default
    const type = url.searchParams.get('type') || ''; // venue type
    const keyword = url.searchParams.get('keyword') || '';
    const fetchDetails = url.searchParams.get('details') === 'true';

    console.log(`Fetching Google Places for location: ${location}, radius: ${radius}m`);

    // Define venue types to search for
    const venueTypes = type ? [type] : [
      'restaurant',
      'bar', 
      'night_club',
      'movie_theater',
      'amusement_park',
      'bowling_alley',
      'museum',
      'art_gallery',
      'park',
      'stadium',
      'tourist_attraction',
      'shopping_mall'
    ];

    const allVenues = [];

    // Search for each venue type
    for (const venueType of venueTypes) {
      try {
        await rateLimit.waitIfNeeded();

        // Construct Google Places API URL
        const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        placesUrl.searchParams.set('location', location);
        placesUrl.searchParams.set('radius', radius.toString());
        placesUrl.searchParams.set('type', venueType);
        placesUrl.searchParams.set('key', apiKey);
        
        if (keyword) {
          placesUrl.searchParams.set('keyword', keyword);
        }

        // Fetch places from Google
        const response = await fetch(placesUrl.toString(), {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SceneScout/1.0'
          }
        });

        if (!response.ok) {
          console.error(`Google Places API error for ${venueType}: ${response.status} ${response.statusText}`);
          continue;
        }

        const data: GooglePlacesResponse = await response.json();

        if (data.status !== 'OK') {
          console.error(`Google Places API returned status ${data.status} for ${venueType}: ${data.error_message}`);
          continue;
        }

        console.log(`Found ${data.results.length} places for type: ${venueType}`);
        allVenues.push(...data.results);

      } catch (error) {
        console.error(`Error fetching ${venueType} venues:`, error);
        continue;
      }
    }

    // Remove duplicates based on place_id
    const uniqueVenues = Array.from(
      new Map(allVenues.map(venue => [venue.place_id, venue])).values()
    );

    console.log(`Processing ${uniqueVenues.length} unique venues`);

    // Process and insert venues
    const processedVenues = [];

    for (const place of uniqueVenues) {
      try {
        let venueData: any;

        // Fetch detailed information if requested
        if (fetchDetails) {
          await rateLimit.waitIfNeeded();

          const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
          detailsUrl.searchParams.set('place_id', place.place_id);
          detailsUrl.searchParams.set('fields', 'place_id,name,formatted_address,formatted_phone_number,website,url,geometry,types,business_status,rating,user_ratings_total,price_level,opening_hours,photos,wheelchair_accessible_entrance,editorial_summary');
          detailsUrl.searchParams.set('key', apiKey);

          const detailsResponse = await fetch(detailsUrl.toString());
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.status === 'OK') {
              const details: GooglePlaceDetails = detailsData.result;
              
              const addressInfo = parseAddress(details.formatted_address);
              const { category, venue_type } = categorizeVenue(details.types);
              
              // Extract amenities from place details
              const amenities = [];
              if (details.wheelchair_accessible_entrance) amenities.push('wheelchair_accessible');
              if (details.curbside_pickup) amenities.push('curbside_pickup');
              if (details.delivery) amenities.push('delivery');
              if (details.takeout) amenities.push('takeout');
              if (details.dine_in) amenities.push('dine_in');
              if (details.reservable) amenities.push('reservations');
              
              venueData = {
                id: details.place_id,
                name: details.name,
                address: details.formatted_address,
                city: addressInfo.city,
                state: addressInfo.state,
                postal_code: addressInfo.postal_code,
                country: addressInfo.country,
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                phone: details.formatted_phone_number || null,
                website: details.website || null,
                timezone: 'America/Los_Angeles', // Would need geocoding for accurate timezone
                capacity: null,
                venue_type,
                category,
                rating: details.rating || null,
                review_count: details.user_ratings_total || 0,
                price_level: details.price_level || null,
                amenities,
                accessibility_features: details.wheelchair_accessible_entrance ? ['wheelchair_accessible'] : [],
                parking_info: null,
                description: details.editorial_summary?.overview || '',
                opening_hours: details.opening_hours?.weekday_text || [],
                photos: details.photos?.slice(0, 3).map(photo => ({
                  url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`,
                  width: photo.width,
                  height: photo.height
                })) || [],
                source: 'google_places',
                external_id: details.place_id,
                last_updated: new Date().toISOString()
              };
            }
          }
        }

        // Fallback to basic place data if details not fetched or failed
        if (!venueData) {
          const addressInfo = parseAddress(place.formatted_address);
          const { category, venue_type } = categorizeVenue(place.types);
          
          venueData = {
            id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            city: addressInfo.city,
            state: addressInfo.state,
            postal_code: addressInfo.postal_code,
            country: addressInfo.country,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            phone: null,
            website: null,
            timezone: 'America/Los_Angeles',
            capacity: null,
            venue_type,
            category,
            rating: place.rating || null,
            review_count: place.user_ratings_total || 0,
            price_level: place.price_level || null,
            amenities: [],
            accessibility_features: [],
            parking_info: null,
            description: '',
            opening_hours: [],
            photos: [],
            source: 'google_places',
            external_id: place.place_id,
            last_updated: new Date().toISOString()
          };
        }

        // Skip permanently closed venues
        if (place.permanently_closed || place.business_status === 'CLOSED_PERMANENTLY') {
          console.log(`Skipping permanently closed venue: ${place.name}`);
          continue;
        }

        processedVenues.push(venueData);

      } catch (error) {
        console.error(`Error processing place ${place.place_id}:`, error);
        continue;
      }
    }

    // Insert venues
    if (processedVenues.length > 0) {
      const { error: venueError } = await supabase
        .from('venues')
        .upsert(processedVenues, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        });

      if (venueError) {
        console.error('Error inserting venues:', venueError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to insert venues into database',
            details: venueError 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Inserted/updated ${processedVenues.length} venues from Google Places`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        venuesProcessed: processedVenues.length,
        totalFound: uniqueVenues.length,
        typesSearched: venueTypes.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest_places_google function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});