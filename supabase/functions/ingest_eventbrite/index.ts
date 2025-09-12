import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
    html: string;
  };
  description: {
    text: string;
    html: string;
  };
  url: string;
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end: {
    timezone: string;
    local: string;
    utc: string;
  };
  organization_id: string;
  created: string;
  changed: string;
  published: string;
  capacity: number;
  capacity_is_custom: boolean;
  status: string;
  currency: string;
  listed: boolean;
  shareable: boolean;
  online_event: boolean;
  tx_time_limit: number;
  hide_start_date: boolean;
  hide_end_date: boolean;
  locale: string;
  is_locked: boolean;
  privacy_setting: string;
  is_series: boolean;
  is_series_parent: boolean;
  inventory_type: string;
  is_reserved_seating: boolean;
  show_pick_a_seat: boolean;
  show_seatmap_thumbnail: boolean;
  show_colors_in_seatmap_thumbnail: boolean;
  source: string;
  is_free: boolean;
  version: string;
  summary: string;
  logo_id: string;
  organizer_id: string;
  venue_id: string;
  category_id: string;
  subcategory_id: string;
  format_id: string;
  resource_uri: string;
  is_externally_ticketed: boolean;
  logo?: {
    crop_mask: {
      top_left: { x: number; y: number };
      width: number;
      height: number;
    };
    original: {
      url: string;
      width: number;
      height: number;
    };
    id: string;
    url: string;
    aspect_ratio: string;
    edge_color: string;
    edge_color_set: boolean;
  };
}

interface EventbriteVenue {
  resource_uri: string;
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  address: {
    address_1: string;
    address_2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
    localized_address_display: string;
    localized_area_display: string;
    localized_multi_line_address_display: string[];
  };
}

interface EventbriteOrganizer {
  resource_uri: string;
  id: string;
  name: string;
  description: {
    text: string;
    html: string;
  };
  long_description: {
    text: string;
    html: string;
  };
  logo_id: string;
  url: string;
  vanity_url: string;
  num_past_events: number;
  num_future_events: number;
  twitter: string;
  facebook: string;
  instagram: string;
  logo?: {
    crop_mask: {
      top_left: { x: number; y: number };
      width: number;
      height: number;
    };
    original: {
      url: string;
      width: number;
      height: number;
    };
    id: string;
    url: string;
    aspect_ratio: string;
    edge_color: string;
    edge_color_set: boolean;
  };
}

interface EventbriteTicketClass {
  resource_uri: string;
  id: string;
  name: string;
  description: string;
  donation: boolean;
  free: boolean;
  minimum_quantity: number;
  maximum_quantity: number;
  maximum_quantity_per_order: number;
  on_sale_status: string;
  on_sale_status_message: string;
  event_id: string;
  order_confirmation_message: string;
  cost: {
    currency: string;
    value: number;
    major_value: string;
    display: string;
  };
  fee: {
    currency: string;
    value: number;
    major_value: string;
    display: string;
  };
  tax: {
    currency: string;
    value: number;
    major_value: string;
    display: string;
  };
  actual_cost: {
    currency: string;
    value: number;
    major_value: string;
    display: string;
  };
  sales_start: string;
  sales_end: string;
  sales_start_after: string;
  include_fee: boolean;
  split_fee: boolean;
  hide_description: boolean;
  hide_sale_dates: boolean;
  auto_hide: boolean;
  auto_hide_before: string;
  auto_hide_after: string;
  variant: string;
  hidden: boolean;
  order_confirmation_message_type: string;
  delivery_methods: string[];
  category: string;
  inventory_tier: string;
  secondary_assignment_enabled: boolean;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    object_count: number;
    page_number: number;
    page_size: number;
    page_count: number;
    continuation: string;
    has_more_items: boolean;
  };
}

/**
 * Supabase Edge Function to ingest events from Eventbrite API
 * Fetches events from Eventbrite Events API and stores them in the database
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API token from environment variables
    const token = Deno.env.get('EVENTBRITE_TOKEN');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Eventbrite API token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const location = url.searchParams.get('location') || 'San Francisco, CA';
    const startDate = url.searchParams.get('start_date') || new Date().toISOString().split('T')[0] + 'T00:00:00Z';
    const categories = url.searchParams.get('categories') || '';
    const q = url.searchParams.get('q') || '';

    console.log(`Fetching Eventbrite events for location: ${location}`);

    // Construct Eventbrite API URL
    const eventbriteUrl = new URL('https://www.eventbriteapi.com/v3/events/search/');
    eventbriteUrl.searchParams.set('location.address', location);
    eventbriteUrl.searchParams.set('location.within', '25mi');
    eventbriteUrl.searchParams.set('start_date.range_start', startDate);
    eventbriteUrl.searchParams.set('sort_by', 'date');
    eventbriteUrl.searchParams.set('expand', 'venue,organizer,ticket_classes');
    eventbriteUrl.searchParams.set('page_size', '50');
    
    if (categories) {
      eventbriteUrl.searchParams.set('categories', categories);
    }
    
    if (q) {
      eventbriteUrl.searchParams.set('q', q);
    }

    // Fetch events from Eventbrite
    const response = await fetch(eventbriteUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Eventbrite API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error response:', errorBody);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Eventbrite API',
          status: response.status,
          statusText: response.statusText,
          details: errorBody
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: EventbriteResponse = await response.json();
    const events = data.events || [];

    console.log(`Found ${events.length} events from Eventbrite`);

    // Process and insert events
    const processedEvents = [];
    const processedVenues = [];
    const processedOrganizers = [];

    for (const event of events) {
      try {
        // Process venue if it exists
        let venueId = null;
        if (event.venue_id && (event as any).venue) {
          const venue = (event as any).venue as EventbriteVenue;
          
          const venueData = {
            id: venue.id,
            name: venue.name,
            address: venue.address?.address_1 || '',
            city: venue.address?.city || '',
            state: venue.address?.region || '',
            postal_code: venue.address?.postal_code || '',
            country: venue.address?.country || 'United States',
            latitude: parseFloat(venue.latitude || '0'),
            longitude: parseFloat(venue.longitude || '0'),
            phone: null,
            website: null,
            timezone: event.start?.timezone || 'America/Los_Angeles',
            capacity: null,
            venue_type: 'unknown',
            amenities: [],
            accessibility_features: [],
            parking_info: null,
            source: 'eventbrite',
            external_id: venue.id,
            last_updated: new Date().toISOString()
          };

          processedVenues.push(venueData);
          venueId = venue.id;
        }

        // Process organizer if it exists
        if (event.organizer_id && (event as any).organizer) {
          const organizer = (event as any).organizer as EventbriteOrganizer;
          
          const organizerData = {
            id: organizer.id,
            name: organizer.name,
            description: organizer.description?.text || '',
            website: organizer.url || null,
            social_media: {
              twitter: organizer.twitter || null,
              facebook: organizer.facebook || null,
              instagram: organizer.instagram || null
            },
            logo_url: organizer.logo?.original?.url || null,
            source: 'eventbrite',
            external_id: organizer.id,
            last_updated: new Date().toISOString()
          };

          processedOrganizers.push(organizerData);
        }

        // Determine pricing from ticket classes
        let priceMin = null;
        let priceMax = null;
        let isFree = event.is_free;
        
        if ((event as any).ticket_classes) {
          const ticketClasses = (event as any).ticket_classes as EventbriteTicketClass[];
          const prices = ticketClasses
            .filter(tc => !tc.free && tc.cost?.value > 0)
            .map(tc => tc.cost.value / 100); // Convert cents to dollars
          
          if (prices.length > 0) {
            priceMin = Math.min(...prices);
            priceMax = Math.max(...prices);
            isFree = false;
          }
        }

        // Process event
        const eventData = {
          id: event.id,
          title: event.name?.text || 'Untitled Event',
          description: event.description?.text || event.summary || '',
          start_time: event.start?.utc || event.start?.local,
          end_time: event.end?.utc || event.end?.local,
          timezone: event.start?.timezone || 'America/Los_Angeles',
          venue_id: venueId,
          organizer_id: event.organizer_id || null,
          category: 'Community', // Eventbrite events are typically community events
          subcategory: null,
          tags: [],
          price_min: isFree ? 0 : priceMin,
          price_max: isFree ? 0 : priceMax,
          price_currency: event.currency || 'USD',
          ticket_url: event.url,
          image_url: event.logo?.original?.url || null,
          source: 'eventbrite',
          external_id: event.id,
          status: event.status === 'live' && event.listed ? 'active' : 'inactive',
          age_restriction: null,
          capacity: event.capacity || null,
          last_updated: new Date().toISOString(),
          hotness_score: 0
        };

        processedEvents.push(eventData);

      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        continue;
      }
    }

    // Insert organizers first
    if (processedOrganizers.length > 0) {
      const { error: organizerError } = await supabase
        .from('organizers')
        .upsert(processedOrganizers, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        });

      if (organizerError) {
        console.error('Error inserting organizers:', organizerError);
      } else {
        console.log(`Inserted/updated ${processedOrganizers.length} organizers`);
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
      } else {
        console.log(`Inserted/updated ${processedVenues.length} venues`);
      }
    }

    // Insert events
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
        organizersProcessed: processedOrganizers.length,
        totalFound: events.length,
        hasMore: data.pagination?.has_more_items || false
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest_eventbrite function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});