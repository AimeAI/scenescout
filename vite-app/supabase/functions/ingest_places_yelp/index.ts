import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  transactions: string[];
  price?: string;
  location: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
    cross_streets?: string;
  };
  phone: string;
  display_phone: string;
  distance?: number;
  attributes?: {
    business_temp_closed?: boolean;
    menu_url?: string;
    open24_hours?: boolean;
    waitlist_reservation?: boolean;
  };
}

interface YelpBusinessDetails {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  is_claimed?: boolean;
  is_closed: boolean;
  url: string;
  phone: string;
  display_phone: string;
  review_count: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating: number;
  location: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
    cross_streets?: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  photos: string[];
  price?: string;
  hours?: Array<{
    open: Array<{
      is_overnight: boolean;
      start: string;
      end: string;
      day: number;
    }>;
    hours_type: string;
    is_open_now: boolean;
  }>;
  transactions: string[];
  special_hours?: Array<{
    date: string;
    is_closed?: boolean;
    start?: string;
    end?: string;
    is_overnight?: boolean;
  }>;
  messaging?: {
    url: string;
    use_case_text: string;
  };
  attributes?: {
    business_temp_closed?: boolean;
    menu_url?: string;
    open24_hours?: boolean;
    waitlist_reservation?: boolean;
    wheelchair_accessible?: boolean;
    open_to_all?: boolean;
    gender_neutral_restrooms?: boolean;
    restaurant_reservation?: boolean;
    restaurant_delivery?: boolean;
    restaurant_takeout?: boolean;
    outdoor_seating?: boolean;
    wifi?: string;
    noise_level?: string;
    music?: {
      dj?: boolean;
      background_music?: boolean;
      no_music?: boolean;
      jukebox?: boolean;
      live?: boolean;
      karaoke?: boolean;
    };
    alcohol?: string;
    smoking?: string;
    dogs_allowed?: boolean;
    bike_parking?: boolean;
    good_for_kids?: boolean;
    good_for_groups?: boolean;
    drive_thru?: boolean;
    caters?: boolean;
    by_appointment_only?: boolean;
  };
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
  region: {
    center: {
      longitude: number;
      latitude: number;
    };
  };
}

/**
 * Rate limiting helper for Yelp API
 */
class YelpRateLimit {
  private requests: number[] = [];
  private maxRequests = 5000; // 5000 requests per day
  private dailyWindowMs = 24 * 60 * 60 * 1000; // 24 hours

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.dailyWindowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.dailyWindowMs - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${Math.round(waitTime / 1000 / 60)}min`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000))); // Max 1 minute wait
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimit = new YelpRateLimit();

/**
 * Maps Yelp categories to venue categories and types
 */
function categorizeYelpBusiness(categories: Array<{ alias: string; title: string }>): { 
  category: string; 
  venue_type: string; 
  subcategory: string;
} {
  const primaryCategory = categories[0];
  const categoryAlias = primaryCategory?.alias || '';
  const categoryTitle = primaryCategory?.title || '';

  // Map Yelp categories to our schema
  const categoryMap: Record<string, { category: string; venue_type: string }> = {
    // Food & Drink
    restaurants: { category: 'Food & Drink', venue_type: 'restaurant' },
    bars: { category: 'Food & Drink', venue_type: 'bar' },
    nightlife: { category: 'Food & Drink', venue_type: 'bar' },
    coffee: { category: 'Food & Drink', venue_type: 'cafe' },
    cafes: { category: 'Food & Drink', venue_type: 'cafe' },
    food: { category: 'Food & Drink', venue_type: 'restaurant' },

    // Entertainment
    entertainment: { category: 'Entertainment', venue_type: 'entertainment' },
    eventservices: { category: 'Entertainment', venue_type: 'event_space' },
    venues: { category: 'Entertainment', venue_type: 'event_space' },
    musicvenues: { category: 'Entertainment', venue_type: 'music_venue' },
    comedyclubs: { category: 'Entertainment', venue_type: 'comedy_club' },
    theaters: { category: 'Entertainment', venue_type: 'theater' },
    movietheaters: { category: 'Entertainment', venue_type: 'movie_theater' },
    bowling: { category: 'Entertainment', venue_type: 'bowling_alley' },
    poolbilliards: { category: 'Entertainment', venue_type: 'pool_hall' },
    amusementparks: { category: 'Entertainment', venue_type: 'amusement_park' },

    // Arts & Culture
    arts: { category: 'Arts & Culture', venue_type: 'art_gallery' },
    museums: { category: 'Arts & Culture', venue_type: 'museum' },
    galleries: { category: 'Arts & Culture', venue_type: 'art_gallery' },
    libraries: { category: 'Arts & Culture', venue_type: 'library' },

    // Recreation
    active: { category: 'Recreation', venue_type: 'fitness' },
    gyms: { category: 'Recreation', venue_type: 'fitness' },
    fitness: { category: 'Recreation', venue_type: 'fitness' },
    parks: { category: 'Recreation', venue_type: 'park' },

    // Shopping
    shopping: { category: 'Shopping', venue_type: 'retail' },
    retail: { category: 'Shopping', venue_type: 'retail' },

    // Services
    eventplanning: { category: 'Services', venue_type: 'event_planning' },
    professional: { category: 'Services', venue_type: 'professional' },

    // Community
    religiousorgs: { category: 'Community', venue_type: 'religious' },
    nonprofit: { category: 'Community', venue_type: 'nonprofit' }
  };

  const mapped = categoryMap[categoryAlias] || { category: 'Other', venue_type: 'unknown' };
  
  return {
    ...mapped,
    subcategory: categoryTitle
  };
}

/**
 * Extracts amenities from Yelp business attributes
 */
function extractAmenities(attributes: YelpBusinessDetails['attributes'] = {}, transactions: string[] = []): string[] {
  const amenities: string[] = [];

  // Transaction-based amenities
  if (transactions.includes('delivery')) amenities.push('delivery');
  if (transactions.includes('pickup')) amenities.push('takeout');
  if (transactions.includes('restaurant_reservation')) amenities.push('reservations');

  // Attribute-based amenities
  if (attributes.wheelchair_accessible) amenities.push('wheelchair_accessible');
  if (attributes.wifi === 'free') amenities.push('free_wifi');
  if (attributes.wifi === 'paid') amenities.push('paid_wifi');
  if (attributes.outdoor_seating) amenities.push('outdoor_seating');
  if (attributes.restaurant_delivery) amenities.push('delivery');
  if (attributes.restaurant_takeout) amenities.push('takeout');
  if (attributes.drive_thru) amenities.push('drive_thru');
  if (attributes.bike_parking) amenities.push('bike_parking');
  if (attributes.dogs_allowed) amenities.push('pet_friendly');
  if (attributes.good_for_kids) amenities.push('family_friendly');
  if (attributes.good_for_groups) amenities.push('group_friendly');
  if (attributes.caters) amenities.push('catering');

  return [...new Set(amenities)]; // Remove duplicates
}

/**
 * Supabase Edge Function to ingest venues from Yelp API
 * Fetches venues from Yelp Fusion API and stores them in the database
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API key from environment variables
    const apiKey = Deno.env.get('YELP_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Yelp API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const location = url.searchParams.get('location') || 'San Francisco, CA';
    const radius = parseInt(url.searchParams.get('radius') || '10000'); // 10km default
    const categories = url.searchParams.get('categories') || '';
    const term = url.searchParams.get('term') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const fetchDetails = url.searchParams.get('details') === 'true';

    console.log(`Fetching Yelp businesses for location: ${location}`);

    // Apply rate limiting
    await rateLimit.waitIfNeeded();

    // Construct Yelp API URL
    const yelpUrl = new URL('https://api.yelp.com/v3/businesses/search');
    yelpUrl.searchParams.set('location', location);
    yelpUrl.searchParams.set('radius', Math.min(radius, 40000).toString()); // Yelp max is 40km
    yelpUrl.searchParams.set('limit', Math.min(limit, 50).toString()); // Yelp max is 50
    yelpUrl.searchParams.set('sort_by', 'rating');
    
    if (categories) {
      yelpUrl.searchParams.set('categories', categories);
    } else {
      // Default categories for event venues
      yelpUrl.searchParams.set('categories', 'restaurants,bars,nightlife,entertainment,eventservices,venues,musicvenues');
    }
    
    if (term) {
      yelpUrl.searchParams.set('term', term);
    }

    // Fetch businesses from Yelp
    const response = await fetch(yelpUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Yelp API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error response:', errorBody);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Yelp API',
          status: response.status,
          statusText: response.statusText,
          details: errorBody
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: YelpSearchResponse = await response.json();
    const businesses = data.businesses || [];

    console.log(`Found ${businesses.length} businesses from Yelp`);

    // Process and insert venues
    const processedVenues = [];

    for (const business of businesses) {
      try {
        // Skip closed businesses
        if (business.is_closed) {
          console.log(`Skipping closed business: ${business.name}`);
          continue;
        }

        let venueData: any;

        // Fetch detailed information if requested
        if (fetchDetails) {
          try {
            await rateLimit.waitIfNeeded();

            const detailsResponse = await fetch(`https://api.yelp.com/v3/businesses/${business.id}`, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'User-Agent': 'SceneScout/1.0'
              }
            });

            if (detailsResponse.ok) {
              const details: YelpBusinessDetails = await detailsResponse.json();
              const { category, venue_type, subcategory } = categorizeYelpBusiness(details.categories);
              const amenities = extractAmenities(details.attributes, details.transactions);
              
              // Format opening hours
              const openingHours = details.hours?.[0]?.open?.map(hour => {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const dayName = days[hour.day];
                const startTime = `${hour.start.slice(0, 2)}:${hour.start.slice(2)}`;
                const endTime = `${hour.end.slice(0, 2)}:${hour.end.slice(2)}`;
                return `${dayName}: ${startTime} - ${endTime}`;
              }) || [];

              venueData = {
                id: details.id,
                name: details.name,
                address: details.location.display_address.join(', '),
                city: details.location.city,
                state: details.location.state,
                postal_code: details.location.zip_code,
                country: details.location.country,
                latitude: details.coordinates.latitude,
                longitude: details.coordinates.longitude,
                phone: details.display_phone || null,
                website: details.url,
                timezone: 'America/Los_Angeles', // Would need geocoding for accurate timezone
                capacity: null,
                venue_type,
                category,
                subcategory,
                rating: details.rating,
                review_count: details.review_count,
                price_level: details.price ? details.price.length : null, // $ = 1, $$ = 2, etc.
                amenities,
                accessibility_features: details.attributes?.wheelchair_accessible ? ['wheelchair_accessible'] : [],
                parking_info: details.attributes?.bike_parking ? 'Bike parking available' : null,
                description: `${details.categories.map(c => c.title).join(', ')} • ${details.review_count} reviews`,
                opening_hours: openingHours,
                photos: details.photos?.slice(0, 5).map(url => ({
                  url,
                  width: 800,
                  height: 600
                })) || [],
                source: 'yelp',
                external_id: details.id,
                last_updated: new Date().toISOString()
              };
            }
          } catch (detailError) {
            console.error(`Error fetching details for ${business.id}:`, detailError);
          }
        }

        // Fallback to basic business data if details not fetched or failed
        if (!venueData) {
          const { category, venue_type, subcategory } = categorizeYelpBusiness(business.categories);
          const amenities = extractAmenities({}, business.transactions);
          
          venueData = {
            id: business.id,
            name: business.name,
            address: business.location.display_address.join(', '),
            city: business.location.city,
            state: business.location.state,
            postal_code: business.location.zip_code,
            country: business.location.country,
            latitude: business.coordinates.latitude,
            longitude: business.coordinates.longitude,
            phone: business.display_phone || null,
            website: business.url,
            timezone: 'America/Los_Angeles',
            capacity: null,
            venue_type,
            category,
            subcategory,
            rating: business.rating,
            review_count: business.review_count,
            price_level: business.price ? business.price.length : null,
            amenities,
            accessibility_features: [],
            parking_info: null,
            description: `${business.categories.map(c => c.title).join(', ')} • ${business.review_count} reviews`,
            opening_hours: [],
            photos: business.image_url ? [{
              url: business.image_url,
              width: 800,
              height: 600
            }] : [],
            source: 'yelp',
            external_id: business.id,
            last_updated: new Date().toISOString()
          };
        }

        processedVenues.push(venueData);

      } catch (error) {
        console.error(`Error processing business ${business.id}:`, error);
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

      console.log(`Inserted/updated ${processedVenues.length} venues from Yelp`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        venuesProcessed: processedVenues.length,
        totalFound: businesses.length,
        region: data.region
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest_places_yelp function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});