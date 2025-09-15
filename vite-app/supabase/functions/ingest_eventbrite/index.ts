import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface EventbriteEvent {
  id: string
  name: {
    text: string
  }
  description: {
    text: string
  }
  start: {
    timezone: string
    local: string
    utc: string
  }
  end: {
    timezone: string
    local: string
    utc: string
  }
  venue?: {
    id: string
    name: string
    address: {
      address_1?: string
      city?: string
      region?: string
      country?: string
      latitude?: string
      longitude?: string
    }
  }
  ticket_availability: {
    minimum_ticket_price?: {
      major_value: number
      currency: string
    }
    maximum_ticket_price?: {
      major_value: number
      currency: string
    }
  }
  logo?: {
    url: string
  }
  category_id: string
  is_free: boolean
}

const EVENTBRITE_CATEGORIES = {
  '103': 'music',
  '108': 'sports',
  '105': 'arts',
  '110': 'food',
  '102': 'business',
  '113': 'community',
  '104': 'film',
  '117': 'health',
  '118': 'education',
  '109': 'travel'
}

const RATE_LIMIT = {
  requests: 0,
  resetTime: 0,
  maxRequests: 1000 // Eventbrite allows 1000 requests per hour
}

async function checkRateLimit() {
  const now = Date.now()
  
  if (now > RATE_LIMIT.resetTime) {
    RATE_LIMIT.requests = 0
    RATE_LIMIT.resetTime = now + (60 * 60 * 1000) // Reset after 1 hour
  }
  
  if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Try again later.')
  }
  
  RATE_LIMIT.requests++
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchEventbriteEvents(location: string, page: number = 1, retryCount = 0): Promise<EventbriteEvent[]> {
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000

  try {
    await checkRateLimit()
    
    const token = Deno.env.get('EVENTBRITE_TOKEN')
    if (!token) {
      throw new Error('EVENTBRITE_TOKEN environment variable is required')
    }

    const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
    url.searchParams.set('location.address', location)
    url.searchParams.set('start_date.range_start', new Date().toISOString())
    url.searchParams.set('expand', 'venue,ticket_availability,category')
    url.searchParams.set('page', page.toString())
    url.searchParams.set('sort_by', 'date')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * Math.pow(2, retryCount)
        
        if (retryCount < MAX_RETRIES) {
          console.log(`Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}...`)
          await sleep(waitTime)
          return fetchEventbriteEvents(location, page, retryCount + 1)
        }
      }
      
      throw new Error(`Eventbrite API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.events || []
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error fetching events. Retrying ${retryCount + 1}/${MAX_RETRIES}...`)
      await sleep(RETRY_DELAY * Math.pow(2, retryCount))
      return fetchEventbriteEvents(location, page, retryCount + 1)
    }
    
    throw error
  }
}

async function processEvent(supabase: any, event: EventbriteEvent, cityId: string) {
  try {
    // Check if event already exists
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('external_id', event.id)
      .eq('source', 'eventbrite')
      .single()

    if (existing) {
      console.log(`Event ${event.id} already exists, skipping`)
      return { skipped: true }
    }

    // Process venue if available
    let venueId = null
    if (event.venue) {
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .upsert({
          external_id: event.venue.id,
          name: event.venue.name,
          address: [
            event.venue.address.address_1,
            event.venue.address.city,
            event.venue.address.region
          ].filter(Boolean).join(', '),
          city_id: cityId,
          latitude: event.venue.address.latitude ? parseFloat(event.venue.address.latitude) : null,
          longitude: event.venue.address.longitude ? parseFloat(event.venue.address.longitude) : null,
        })
        .select('id')
        .single()

      if (venueError) {
        console.error('Venue processing error:', venueError)
      } else {
        venueId = venue.id
      }
    }

    // Insert event
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        external_id: event.id,
        source: 'eventbrite',
        title: event.name.text,
        description: event.description?.text || '',
        date: event.start.local.split('T')[0],
        time: event.start.local.split('T')[1]?.substring(0, 5),
        end_date: event.end.local.split('T')[0],
        end_time: event.end.local.split('T')[1]?.substring(0, 5),
        timezone: event.start.timezone,
        venue_id: venueId,
        city_id: cityId,
        category: EVENTBRITE_CATEGORIES[event.category_id] || 'other',
        is_free: event.is_free,
        price_min: event.ticket_availability?.minimum_ticket_price?.major_value || null,
        price_max: event.ticket_availability?.maximum_ticket_price?.major_value || null,
        currency: event.ticket_availability?.minimum_ticket_price?.currency || 'USD',
        image_url: event.logo?.url || null,
        external_url: `https://www.eventbrite.com/e/${event.id}`,
      })

    if (eventError) {
      console.error('Event insertion error:', eventError)
      return { error: eventError }
    }

    return { success: true }
    
  } catch (error) {
    console.error('Event processing error:', error)
    return { error }
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Check for API token
  const token = Deno.env.get('EVENTBRITE_TOKEN')
  if (!token) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'disabled: missing EVENTBRITE_TOKEN' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  let jobId: string | null = null

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Start job logging
    const { data: jobData, error: jobError } = await supabase
      .rpc('start_job_run', {
        p_job_name: 'ingest_eventbrite',
        p_metadata: { 
          triggered_at: new Date().toISOString(),
          environment: Deno.env.get('ENVIRONMENT') || 'production'
        }
      })

    if (jobError) {
      console.error('Failed to start job run:', jobError)
    } else {
      jobId = jobData
    }

    const { cities } = await req.json()
    const targetCities = cities || ['San Francisco', 'New York', 'Los Angeles', 'Chicago']
    const startTime = Date.now()

    let totalProcessed = 0
    let totalInserted = 0
    let totalErrors = 0
    let totalSkipped = 0

    for (const cityName of targetCities) {
      try {
        console.log(`Processing events for ${cityName}...`)
        
        // Get or create city
        const { data: city, error: cityError } = await supabase
          .from('cities')
          .upsert({
            name: cityName,
            slug: cityName.toLowerCase().replace(/\s+/g, '-'),
            state: 'Unknown', // Will be updated later
            country: 'US'
          })
          .select('id')
          .single()

        if (cityError) {
          console.error(`City error for ${cityName}:`, cityError)
          continue
        }

        // Fetch events for this city
        const events = await fetchEventbriteEvents(cityName)
        console.log(`Found ${events.length} events for ${cityName}`)

        // Process each event
        for (const event of events) {
          const result = await processEvent(supabase, event, city.id)
          
          if (result.success) {
            totalProcessed++
            totalInserted++
          } else if (result.skipped) {
            totalSkipped++
          } else {
            totalErrors++
          }
          
          // Small delay to avoid overwhelming the database
          await sleep(100)
        }
        
      } catch (cityError) {
        console.error(`Error processing city ${cityName}:`, cityError)
        totalErrors++
      }
    }

    // Complete job run
    if (jobId) {
      await supabase.rpc('complete_job_run', {
        p_job_id: jobId,
        p_status: 'completed',
        p_records_processed: totalProcessed + totalSkipped,
        p_records_inserted: totalInserted,
        p_records_updated: 0,
        p_records_skipped: totalSkipped,
        p_errors_count: totalErrors
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        inserted: totalInserted,
        skipped: totalSkipped,
        errors: totalErrors,
        cities: targetCities.length,
        jobId
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Ingestion error:', error)
    
    // Mark job as failed
    if (jobId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase.rpc('complete_job_run', {
          p_job_id: jobId,
          p_status: 'failed',
          p_records_processed: 0,
          p_records_inserted: 0,
          p_records_updated: 0,
          p_records_skipped: 0,
          p_errors_count: 1,
          p_error_details: error.message
        })
      } catch (jobError) {
        console.error('Failed to update job status:', jobError)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        jobId 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
