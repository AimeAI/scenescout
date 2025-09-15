import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: Array<{
    ratio: string;
    url: string;
    width: number;
    height: number;
    fallback: boolean;
  }>;
  sales: {
    public: {
      startDateTime: string;
      startTBD: boolean;
      startTBA: boolean;
      endDateTime: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime: string;
      dateTime: string;
      dateTBD: boolean;
      dateTBA: boolean;
      timeTBA: boolean;
      noSpecificTime: boolean;
    };
    timezone: string;
    status: {
      code: string;
    };
    spanMultipleDays: boolean;
  };
  classifications: Array<{
    primary: boolean;
    segment: {
      id: string;
      name: string;
    };
    genre: {
      id: string;
      name: string;
    };
    subGenre: {
      id: string;
      name: string;
    };
  }>;
  promoter?: {
    id: string;
    name: string;
    description: string;
  };
  promoters?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  info?: string;
  pleaseNote?: string;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  products?: Array<{
    name: string;
    id: string;
    url: string;
    type: string;
    classifications: Array<{
      primary: boolean;
      segment: {
        id: string;
        name: string;
      };
      genre: {
        id: string;
        name: string;
      };
      subGenre: {
        id: string;
        name: string;
      };
    }>;
  }>;
  seatmap?: {
    staticUrl: string;
  };
  accessibility?: {
    ticketLimit?: number;
  };
  ticketLimit?: {
    info: string;
  };
  ageRestrictions?: {
    legalAgeEnforced: boolean;
  };
  ticketing?: {
    safeTix: {
      enabled: boolean;
    };
  };
  _links: {
    self: {
      href: string;
    };
    attractions?: Array<{
      href: string;
    }>;
    venues?: Array<{
      href: string;
    }>;
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      type: string;
      id: string;
      test: boolean;
      url?: string;
      locale: string;
      images?: Array<{
        ratio: string;
        url: string;
        width: number;
        height: number;
        fallback: boolean;
      }>;
      distance?: number;
      units?: string;
      postalCode?: string;
      timezone: string;
      city: {
        name: string;
      };
      state: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      address: {
        line1: string;
      };
      location: {
        longitude: string;
        latitude: string;
      };
      markets?: Array<{
        name: string;
        id: string;
      }>;
      dmas?: Array<{
        id: number;
      }>;
      social?: {
        twitter: {
          handle: string;
        };
      };
      boxOfficeInfo?: {
        phoneNumberDetail: string;
        openHoursDetail: string;
        acceptedPaymentDetail: string;
        willCallDetail: string;
      };
      parkingDetail?: string;
      accessibleSeatingDetail?: string;
      generalInfo?: {
        generalRule: string;
        childRule: string;
      };
      upcomingEvents?: {
        ticketmaster?: number;
        _total: number;
        _filtered: number;
      };
      ada?: {
        adaPhones: string;
        adaCustomCopy: string;
        adaHours: string;
      };
      _links: {
        self: {
          href: string;
        };
      };
    }>;
    attractions?: Array<{
      name: string;
      type: string;
      id: string;
      test: boolean;
      url?: string;
      locale: string;
      externalLinks?: {
        youtube?: Array<{
          url: string;
        }>;
        twitter?: Array<{
          url: string;
        }>;
        itunes?: Array<{
          url: string;
        }>;
        lastfm?: Array<{
          url: string;
        }>;
        facebook?: Array<{
          url: string;
        }>;
        spotify?: Array<{
          url: string;
        }>;
        musicbrainz?: Array<{
          id: string;
        }>;
        homepage?: Array<{
          url: string;
        }>;
      };
      images?: Array<{
        ratio: string;
        url: string;
        width: number;
        height: number;
        fallback: boolean;
      }>;
      classifications?: Array<{
        primary: boolean;
        segment: {
          id: string;
          name: string;
        };
        genre: {
          id: string;
          name: string;
        };
        subGenre: {
          id: string;
          name: string;
        };
        type: {
          id: string;
          name: string;
        };
        subType: {
          id: string;
          name: string;
        };
        family: boolean;
      }>;
      upcomingEvents?: {
        ticketmaster?: number;
        _total: number;
        _filtered: number;
      };
      _links: {
        self: {
          href: string;
        };
      };
    }>;
  };
}

interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  _links: {
    first?: { href: string };
    self: { href: string };
    next?: { href: string };
    last?: { href: string };
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Supabase Edge Function to ingest events from Ticketmaster API
 * Fetches events from Ticketmaster Discovery API and stores them in the database
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API key from environment variables
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ticketmaster API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const city = url.searchParams.get('city') || 'San Francisco';
    const stateCode = url.searchParams.get('stateCode') || 'CA';
    const startDateTime = url.searchParams.get('startDateTime') || new Date().toISOString();
    const size = parseInt(url.searchParams.get('size') || '200');
    const keyword = url.searchParams.get('keyword') || '';

    console.log(`Fetching Ticketmaster events for ${city}, ${stateCode}`);

    // Construct Ticketmaster API URL
    const ticketmasterUrl = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    ticketmasterUrl.searchParams.set('apikey', apiKey);
    ticketmasterUrl.searchParams.set('city', city);
    ticketmasterUrl.searchParams.set('stateCode', stateCode);
    ticketmasterUrl.searchParams.set('startDateTime', startDateTime);
    ticketmasterUrl.searchParams.set('size', size.toString());
    ticketmasterUrl.searchParams.set('sort', 'date,asc');
    
    if (keyword) {
      ticketmasterUrl.searchParams.set('keyword', keyword);
    }

    // Fetch events from Ticketmaster
    const response = await fetch(ticketmasterUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Ticketmaster API',
          status: response.status,
          statusText: response.statusText
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: TicketmasterResponse = await response.json();
    const events = data._embedded?.events || [];

    console.log(`Found ${events.length} events from Ticketmaster`);

    // Process and insert events
    const processedEvents = [];
    const processedVenues = [];

    for (const event of events) {
      try {
        // Process venue if it exists
        let venueId = null;
        if (event._embedded?.venues?.[0]) {
          const venue = event._embedded.venues[0];
          
          const venueData = {
            id: venue.id,
            name: venue.name,
            address: venue.address?.line1 || '',
            city: venue.city?.name || '',
            state: venue.state?.name || '',
            postal_code: venue.postalCode || '',
            country: venue.country?.name || 'United States',
            latitude: parseFloat(venue.location?.latitude || '0'),
            longitude: parseFloat(venue.location?.longitude || '0'),
            phone: venue.boxOfficeInfo?.phoneNumberDetail || null,
            website: venue.url || null,
            timezone: venue.timezone || 'America/Los_Angeles',
            capacity: null,
            venue_type: venue.type || 'unknown',
            amenities: [],
            accessibility_features: venue.accessibleSeatingDetail ? [venue.accessibleSeatingDetail] : [],
            parking_info: venue.parkingDetail || null,
            source: 'ticketmaster',
            external_id: venue.id,
            last_updated: new Date().toISOString()
          };

          processedVenues.push(venueData);
          venueId = venue.id;
        }

        // Process event
        const eventStart = event.dates?.start?.dateTime || 
          `${event.dates?.start?.localDate}T${event.dates?.start?.localTime || '19:00:00'}`;
        
        const eventData = {
          id: event.id,
          title: event.name,
          description: event.info || event.pleaseNote || '',
          start_time: eventStart,
          end_time: null, // Ticketmaster doesn't provide end times
          timezone: event.dates?.timezone || 'America/Los_Angeles',
          venue_id: venueId,
          category: event.classifications?.[0]?.segment?.name || 'Entertainment',
          subcategory: event.classifications?.[0]?.genre?.name || null,
          tags: [
            ...(event.classifications?.map(c => c.genre?.name).filter(Boolean) || []),
            ...(event.classifications?.map(c => c.subGenre?.name).filter(Boolean) || [])
          ],
          price_min: event.priceRanges?.[0]?.min || null,
          price_max: event.priceRanges?.[0]?.max || null,
          price_currency: event.priceRanges?.[0]?.currency || 'USD',
          external_url: event.url,
          url: event.url,
          image_url: event.images?.find(img => img.ratio === '16_9')?.url || 
                     event.images?.[0]?.url || null,
          source: 'ticketmaster',
          external_id: event.id,
          status: event.dates?.status?.code === 'onsale' ? 'active' : 'inactive',
          age_restriction: event.ageRestrictions?.legalAgeEnforced ? '21+' : null,
          last_updated: new Date().toISOString(),
          hotness_score: 0
        };

        processedEvents.push(eventData);

      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        continue;
      }
    }

    // Insert venues first (upsert to avoid duplicates)
    if (processedVenues.length > 0) {
      const { error: venueError } = await supabase
        .from('venues')
        .upsert(processedVenues, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        });

      if (venueError) {
        console.error('Error inserting venues:', venueError);
      } else {
        console.log(`Inserted/updated ${processedVenues.length} venues`);
      }
    }

    // Insert events (upsert to avoid duplicates)
    if (processedEvents.length > 0) {
      const { error: eventError } = await supabase
        .from('events')
        .upsert(processedEvents, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        });

      if (eventError) {
        console.error('Error inserting events:', eventError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to insert events into database',
            details: eventError 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Inserted/updated ${processedEvents.length} events`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: processedEvents.length,
        venuesProcessed: processedVenues.length,
        totalFound: events.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest_ticketmaster function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});