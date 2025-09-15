import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface MeetupEvent {
  id: string;
  name: string;
  description: string;
  status: string;
  created: number;
  updated: number;
  time: number;
  utc_offset: number;
  waitlist_count: number;
  yes_rsvp_count: number;
  venue?: {
    id: number;
    name: string;
    lat: number;
    lon: number;
    repinned: boolean;
    address_1: string;
    address_2?: string;
    address_3?: string;
    city: string;
    country: string;
    localized_country_name: string;
    phone?: string;
    zip?: string;
    state?: string;
  };
  group: {
    id: number;
    name: string;
    urlname: string;
    category: {
      id: number;
      name: string;
      shortname: string;
    };
    photo?: {
      id: number;
      highres_link: string;
      photo_link: string;
      thumb_link: string;
      type: string;
      base_url: string;
    };
    created: number;
    join_mode: string;
    lat: number;
    lon: number;
    members: number;
    status: string;
    timezone: string;
    visibility: string;
  };
  link: string;
  photo?: {
    id: number;
    highres_link: string;
    photo_link: string;
    thumb_link: string;
    type: string;
    base_url: string;
  };
  how_to_find_us?: string;
  visibility: string;
  member_pay_fee: boolean;
  fee?: {
    accepts: string;
    amount: number;
    currency: string;
    description: string;
    label: string;
    required: boolean;
  };
  attendee_sample?: Array<{
    id: number;
    name: string;
    photo?: {
      id: number;
      highres_link: string;
      photo_link: string;
      thumb_link: string;
      type: string;
      base_url: string;
    };
  }>;
  duration?: number;
  plain_text_description?: string;
  plain_text_no_images_description?: string;
  short_link?: string;
  series?: {
    id: number;
    start_date: string;
    end_date: string;
    weekly: boolean;
    monthly: boolean;
    template_event_id: string;
    description?: string;
  };
  featured_photo?: {
    id: number;
    highres_link: string;
    photo_link: string;
    thumb_link: string;
    type: string;
    base_url: string;
  };
  pro_is_email_shared?: boolean;
  event_hosts?: Array<{
    id: number;
    name: string;
    intro: string;
  }>;
  rsvp_limit?: number;
  comment_count?: number;
  rating_count?: number;
  rating_average?: number;
}

interface MeetupGroup {
  id: number;
  name: string;
  urlname: string;
  description: string;
  created: number;
  city: string;
  untranslated_city: string;
  country: string;
  state: string;
  join_mode: string;
  visibility: string;
  lat: number;
  lon: number;
  members: number;
  organizer: {
    id: number;
    name: string;
    bio?: string;
  };
  who: string;
  group_photo?: {
    id: number;
    highres_link: string;
    photo_link: string;
    thumb_link: string;
    type: string;
    base_url: string;
  };
  key_photo?: {
    id: number;
    highres_link: string;
    photo_link: string;
    thumb_link: string;
    type: string;
    base_url: string;
  };
  timezone: string;
  next_event?: {
    id: string;
    name: string;
    yes_rsvp_count: number;
    time: number;
  };
  category: {
    id: number;
    name: string;
    shortname: string;
    sort_name: string;
  };
  meta_category: {
    id: number;
    shortname: string;
    name: string;
    sort_name: string;
  };
  photo?: {
    id: number;
    highres_link: string;
    photo_link: string;
    thumb_link: string;
    type: string;
    base_url: string;
  };
  status: string;
  link: string;
  rating?: number;
  pro_network?: {
    name: string;
  };
  topics?: Array<{
    id: number;
    name: string;
    urlkey: string;
  }>;
  localized_location: string;
  region?: string;
  short_link?: string;
}

/**
 * Rate limiting helper for Meetup API
 */
class MeetupRateLimit {
  private requests: number[] = [];
  private maxRequests = 200; // 200 requests per hour
  private windowMs = 60 * 60 * 1000; // 1 hour

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimit = new MeetupRateLimit();

/**
 * Supabase Edge Function to ingest meetups from Meetup API
 * Fetches meetup events from Meetup.com API and stores them in the database
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get access token from environment variables
    const accessToken = Deno.env.get('MEETUP_ACCESS_TOKEN');
    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          status: 'disabled', 
          reason: 'missing MEETUP_ACCESS_TOKEN',
          success: false 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat') || '37.7749'); // San Francisco default
    const lon = parseFloat(url.searchParams.get('lon') || '-122.4194');
    const radius = parseFloat(url.searchParams.get('radius') || '25'); // miles
    const category = url.searchParams.get('category') || '';
    const text = url.searchParams.get('text') || '';

    console.log(`Fetching Meetup events for lat: ${lat}, lon: ${lon}, radius: ${radius}mi`);

    // Apply rate limiting
    await rateLimit.waitIfNeeded();

    // Construct Meetup API URL for events
    const meetupUrl = new URL('https://api.meetup.com/find/upcoming_events');
    meetupUrl.searchParams.set('lat', lat.toString());
    meetupUrl.searchParams.set('lon', lon.toString());
    meetupUrl.searchParams.set('radius', radius.toString());
    meetupUrl.searchParams.set('page', '200');
    
    if (category) {
      meetupUrl.searchParams.set('category', category);
    }
    
    if (text) {
      meetupUrl.searchParams.set('text', text);
    }

    // Fetch events from Meetup
    const response = await fetch(meetupUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Meetup API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error response:', errorBody);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Meetup API',
          status: response.status,
          statusText: response.statusText,
          details: errorBody
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const events: MeetupEvent[] = data.events || [];

    console.log(`Found ${events.length} meetup events`);

    // Process and insert events
    const processedEvents = [];
    const processedVenues = [];
    const processedGroups = [];

    for (const event of events) {
      try {
        // Process group (organizer)
        if (event.group) {
          const group = event.group;
          
          const groupData = {
            id: group.id.toString(),
            name: group.name,
            description: '', // Would need separate API call to get full description
            website: `https://www.meetup.com/${group.urlname}`,
            social_media: {},
            logo_url: group.photo?.photo_link || null,
            category: group.category?.name || 'Community',
            member_count: group.members,
            location: `${group.lat},${group.lon}`,
            timezone: group.timezone,
            source: 'meetup',
            external_id: group.id.toString(),
            last_updated: new Date().toISOString()
          };

          processedGroups.push(groupData);
        }

        // Process venue if it exists
        let venueId = null;
        if (event.venue) {
          const venue = event.venue;
          
          const venueData = {
            id: venue.id.toString(),
            name: venue.name,
            address: [venue.address_1, venue.address_2, venue.address_3].filter(Boolean).join(', '),
            city: venue.city,
            state: venue.state || '',
            postal_code: venue.zip || '',
            country: venue.country,
            latitude: venue.lat,
            longitude: venue.lon,
            phone: venue.phone || null,
            website: null,
            timezone: event.group.timezone,
            capacity: null,
            venue_type: 'meetup_venue',
            amenities: [],
            accessibility_features: [],
            parking_info: null,
            source: 'meetup',
            external_id: venue.id.toString(),
            last_updated: new Date().toISOString()
          };

          processedVenues.push(venueData);
          venueId = venue.id.toString();
        }

        // Calculate event duration (default to 2 hours if not specified)
        const startTime = new Date(event.time + event.utc_offset);
        const duration = event.duration || (2 * 60 * 60 * 1000); // 2 hours in milliseconds
        const endTime = new Date(startTime.getTime() + duration);

        // Process event
        const eventData = {
          id: event.id,
          title: event.name,
          description: event.plain_text_description || event.description || '',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          timezone: event.group.timezone,
          venue_id: venueId,
          organizer_id: event.group.id.toString(),
          category: 'Community',
          subcategory: event.group.category?.name || 'Meetup',
          tags: [
            'meetup',
            event.group.category?.name || '',
            ...(event.group.name.split(' ').slice(0, 3)) // First few words of group name as tags
          ].filter(Boolean),
          price_min: event.fee?.amount ? event.fee.amount / 100 : 0, // Convert cents to dollars
          price_max: event.fee?.amount ? event.fee.amount / 100 : 0,
          price_currency: event.fee?.currency || 'USD',
          ticket_url: event.link,
          image_url: event.featured_photo?.photo_link || 
                     event.photo?.photo_link || 
                     event.group.photo?.photo_link || null,
          source: 'meetup',
          external_id: event.id,
          status: event.status === 'upcoming' ? 'active' : 'inactive',
          age_restriction: null,
          capacity: event.rsvp_limit || null,
          attendee_count: event.yes_rsvp_count || 0,
          last_updated: new Date().toISOString(),
          hotness_score: Math.min(Math.round((event.yes_rsvp_count || 0) / 2), 100) // RSVP count as popularity indicator
        };

        processedEvents.push(eventData);

      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        continue;
      }
    }

    // Insert groups (as organizers) first
    if (processedGroups.length > 0) {
      const { error: groupError } = await supabase
        .from('organizers')
        .upsert(processedGroups, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        });

      if (groupError) {
        console.error('Error inserting groups:', groupError);
      } else {
        console.log(`Inserted/updated ${processedGroups.length} meetup groups`);
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

      console.log(`Inserted/updated ${processedEvents.length} meetup events`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: processedEvents.length,
        venuesProcessed: processedVenues.length,
        groupsProcessed: processedGroups.length,
        totalFound: events.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest_meetup function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});