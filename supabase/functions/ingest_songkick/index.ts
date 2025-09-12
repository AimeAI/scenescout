import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/types.ts";

interface SongkickEvent {
  id: number;
  type: string;
  uri: string;
  displayName: string;
  start: {
    date: string;
    time: string;
    datetime: string;
  };
  performance: Array<{
    id: number;
    displayName: string;
    billing: string;
    billingIndex: number;
    artist: {
      id: number;
      displayName: string;
      uri: string;
      identifier: Array<{
        mbid: string;
        href: string;
      }>;
    };
  }>;
  location: {
    city: string;
    lat: number;
    lng: number;
  };
  venue: {
    id: number;
    displayName: string;
    uri: string;
    lat: number;
    lng: number;
    metroArea: {
      displayName: string;
      country: {
        displayName: string;
      };
      id: number;
      uri: string;
    };
  };
  status: string;
  popularity: number;
  ageRestriction: string;
}

interface SongkickResponse {
  resultsPage: {
    status: string;
    results: {
      event: SongkickEvent[];
    };
    perPage: number;
    page: number;
    totalEntries: number;
  };
}

interface SongkickArtist {
  id: number;
  displayName: string;
  uri: string;
  identifier?: Array<{
    mbid?: string;
    href?: string;
  }>;
  onTourUntil?: string;
}

interface SongkickVenue {
  id: number;
  displayName: string;
  uri: string;
  lng: number;
  lat: number;
  metroArea: {
    displayName: string;
    country: {
      displayName: string;
    };
    state?: {
      displayName: string;
    };
    id: number;
    uri: string;
  };
  street?: string;
  zip?: string;
  phone?: string;
  website?: string;
  capacity?: number;
  description?: string;
}

/**
 * Rate limiting helper for Songkick API
 */
class RateLimit {
  private requests: number[] = [];
  private maxRequests = 60; // 60 requests per minute
  private windowMs = 60 * 1000; // 1 minute

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimit = new RateLimit();

/**
 * Supabase Edge Function to ingest concerts from Songkick API
 * Fetches concerts from Songkick Events API and stores them in the database
 */
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API key from environment variables
    const apiKey = Deno.env.get('SONGKICK_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Songkick API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const location = url.searchParams.get('location') || 'sk:26330'; // San Francisco metro area ID
    const minDate = url.searchParams.get('min_date') || new Date().toISOString().split('T')[0];
    const maxDate = url.searchParams.get('max_date') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`Fetching Songkick events for location: ${location}`);

    // Apply rate limiting
    await rateLimit.waitIfNeeded();

    // Construct Songkick API URL
    const songkickUrl = new URL('https://api.songkick.com/api/3.0/metro_areas/' + location + '/calendar.json');
    songkickUrl.searchParams.set('apikey', apiKey);
    songkickUrl.searchParams.set('min_date', minDate);
    songkickUrl.searchParams.set('max_date', maxDate);
    songkickUrl.searchParams.set('per_page', '50');

    // Fetch events from Songkick
    const response = await fetch(songkickUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SceneScout/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Songkick API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error response:', errorBody);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Songkick API',
          status: response.status,
          statusText: response.statusText,
          details: errorBody
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: SongkickResponse = await response.json();
    const events = data.resultsPage?.results?.event || [];

    console.log(`Found ${events.length} concerts from Songkick`);

    // Process and insert events
    const processedEvents = [];
    const processedVenues = [];
    const processedArtists = [];

    for (const event of events) {
      try {
        // Process venue
        let venueId = null;
        if (event.venue) {
          const venue = event.venue;
          
          const venueData = {
            id: venue.id.toString(),
            name: venue.displayName,
            address: '', // Songkick doesn't provide detailed address
            city: venue.metroArea?.displayName?.split(',')[0] || '',
            state: venue.metroArea?.state?.displayName || '',
            postal_code: '',
            country: venue.metroArea?.country?.displayName || 'United States',
            latitude: venue.lat || 0,
            longitude: venue.lng || 0,
            phone: null,
            website: null,
            timezone: 'America/Los_Angeles', // Default, would need geocoding for accurate timezone
            capacity: null,
            venue_type: 'music_venue',
            amenities: [],
            accessibility_features: [],
            parking_info: null,
            source: 'songkick',
            external_id: venue.id.toString(),
            last_updated: new Date().toISOString()
          };

          processedVenues.push(venueData);
          venueId = venue.id.toString();
        }

        // Process artists
        const artistNames = [];
        if (event.performance) {
          for (const performance of event.performance) {
            const artist = performance.artist;
            artistNames.push(artist.displayName);
            
            const artistData = {
              id: artist.id.toString(),
              name: artist.displayName,
              genre: [],
              description: '',
              image_url: null,
              external_links: {
                songkick: artist.uri,
                musicbrainz: artist.identifier?.find(id => id.mbid)?.mbid || null
              },
              source: 'songkick',
              external_id: artist.id.toString(),
              last_updated: new Date().toISOString()
            };

            processedArtists.push(artistData);
          }
        }

        // Process event
        const headliner = event.performance?.[0]?.artist?.displayName || 'Unknown Artist';
        const eventTitle = artistNames.length > 1 
          ? `${headliner} with ${artistNames.slice(1).join(', ')}`
          : headliner;

        const eventData = {
          id: event.id.toString(),
          title: eventTitle,
          description: `Live concert featuring ${artistNames.join(', ')}`,
          start_time: event.start?.datetime || `${event.start?.date}T20:00:00`,
          end_time: null, // Songkick doesn't provide end times
          timezone: 'America/Los_Angeles', // Default, would need venue-specific timezone
          venue_id: venueId,
          category: 'Music',
          subcategory: 'Concert',
          tags: ['live music', 'concert', ...artistNames],
          price_min: null, // Songkick doesn't provide pricing
          price_max: null,
          price_currency: 'USD',
          ticket_url: `https://www.songkick.com${event.uri}`,
          image_url: null, // Would need to fetch from artist or venue
          source: 'songkick',
          external_id: event.id.toString(),
          status: event.status === 'ok' ? 'active' : 'inactive',
          age_restriction: event.ageRestriction || null,
          last_updated: new Date().toISOString(),
          hotness_score: Math.min(Math.round((event.popularity || 0) * 10), 100) // Convert to 0-100 scale
        };

        processedEvents.push(eventData);

      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        continue;
      }
    }

    // Insert artists first
    if (processedArtists.length > 0) {
      const { error: artistError } = await supabase
        .from('artists')
        .upsert(processedArtists, { 
          onConflict: 'external_id,source',
          ignoreDuplicates: false 
        });

      if (artistError) {
        console.error('Error inserting artists:', artistError);
      } else {
        console.log(`Inserted/updated ${processedArtists.length} artists`);
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

      // Create event-artist relationships
      const eventArtistRelations = [];
      for (const event of events) {
        if (event.performance) {
          for (const performance of event.performance) {
            eventArtistRelations.push({
              event_id: event.id.toString(),
              artist_id: performance.artist.id.toString(),
              billing_order: performance.billingIndex || 0,
              role: performance.billing === 'headline' ? 'headliner' : 'support'
            });
          }
        }
      }

      if (eventArtistRelations.length > 0) {
        const { error: relationError } = await supabase
          .from('event_artists')
          .upsert(eventArtistRelations, { 
            onConflict: 'event_id,artist_id',
            ignoreDuplicates: true 
          });

        if (relationError) {
          console.error('Error inserting event-artist relations:', relationError);
        } else {
          console.log(`Inserted ${eventArtistRelations.length} event-artist relationships`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: processedEvents.length,
        venuesProcessed: processedVenues.length,
        artistsProcessed: processedArtists.length,
        totalFound: events.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest_songkick function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});