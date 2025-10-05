import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    console.log(`🔍 Fetching event by ID: ${eventId}`)

    let event = null

    // Strategy 1: Try Ticketmaster API directly (best, most reliable)
    if (isTicketmasterID(eventId)) {
      console.log('🎫 Detected Ticketmaster ID format')
      event = await fetchFromTicketmaster(eventId)
      if (event) {
        console.log('✅ Found in Ticketmaster API')
        return NextResponse.json({ success: true, event, source: 'ticketmaster_api' })
      }
    }

    // Strategy 2: Try EventBrite ID format (less reliable, no direct API)
    if (isEventBriteID(eventId)) {
      console.log('🎟️ Detected EventBrite ID format')
      // EventBrite doesn't support direct ID lookup via free API
      // Return helpful error message
      return NextResponse.json(
        {
          success: false,
          error: 'EventBrite events cannot be accessed by direct link',
          message: 'Please navigate to this event from the homepage or search',
          eventId,
          provider: 'eventbrite'
        },
        { status: 404 }
      )
    }

    // Strategy 3: Fallback - search aggregated events (slower, but catches everything)
    console.log('🔍 Searching aggregated events database...')
    event = await searchAggregatedEvents(eventId, request.nextUrl.origin)

    if (event) {
      console.log('✅ Found in aggregated search')
      return NextResponse.json({ success: true, event, source: 'aggregated' })
    }

    // Strategy 4: Last resort - try as raw Ticketmaster ID (no prefix)
    console.log('🔄 Trying as raw Ticketmaster ID...')
    event = await fetchFromTicketmaster(eventId)
    if (event) {
      console.log('✅ Found in Ticketmaster API (raw ID)')
      return NextResponse.json({ success: true, event, source: 'ticketmaster_api' })
    }

    // Not found anywhere
    console.log('❌ Event not found in any source')
    return NextResponse.json(
      {
        success: false,
        error: 'Event not found',
        message: 'This event may have been removed, expired, or the link is invalid. Try searching for it on the homepage.',
        eventId
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('❌ Error fetching event:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Check if ID matches Ticketmaster format
function isTicketmasterID(id: string): boolean {
  // TM IDs typically start with: vv, G5, Z7, or are 18+ chars alphanumeric
  return (
    id.startsWith('vv') ||
    id.startsWith('G5') ||
    id.startsWith('Z7') ||
    id.startsWith('tm_') ||
    /^[a-zA-Z0-9]{18,}$/.test(id)
  )
}

// Check if ID matches EventBrite format
function isEventBriteID(id: string): boolean {
  return (
    id.startsWith('eb_') ||
    id.startsWith('live_') ||
    id.includes('eventbrite')
  )
}

// Fetch from Ticketmaster API
async function fetchFromTicketmaster(eventId: string): Promise<any | null> {
  try {
    const cleanId = eventId.replace('tm_', '')
    const apiKey = process.env.TICKETMASTER_API_KEY

    if (!apiKey) {
      console.warn('⚠️ Ticketmaster API key not configured')
      return null
    }

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${cleanId}.json?apikey=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.log('📭 Not found in Ticketmaster')
        return null
      }
      console.error(`Ticketmaster API error: ${response.status}`)
      return null
    }

    const tmData = await response.json()
    return normalizeTicketmasterEvent(tmData)
  } catch (error) {
    console.error('Error fetching from Ticketmaster:', error)
    return null
  }
}

// Search aggregated events from main API
async function searchAggregatedEvents(eventId: string, origin: string): Promise<any | null> {
  try {
    const response = await fetch(`${origin}/api/search-events?limit=1000`)
    if (!response.ok) {
      console.error(`Aggregated search error: ${response.status}`)
      return null
    }

    const { events } = await response.json()
    return events.find((e: any) => e.id === eventId || e.external_id === eventId) || null
  } catch (error) {
    console.error('Error searching aggregated events:', error)
    return null
  }
}

// Normalize Ticketmaster event to our format
function normalizeTicketmasterEvent(tmEvent: any) {
  const venue = tmEvent._embedded?.venues?.[0]
  const image = tmEvent.images?.find((img: any) => img.width > 1000) || tmEvent.images?.[0]
  const priceRange = tmEvent.priceRanges?.[0]

  return {
    id: tmEvent.id,
    title: tmEvent.name,
    description: tmEvent.info || tmEvent.pleaseNote || tmEvent.description || `${tmEvent.name} - Check Ticketmaster for details`,
    date: tmEvent.dates?.start?.localDate || '',
    event_date: tmEvent.dates?.start?.localDate || '',
    time: tmEvent.dates?.start?.localTime || '',
    venue_name: venue?.name || 'Venue TBA',
    address: venue?.address?.line1 || '',
    venue_address: [
      venue?.address?.line1,
      venue?.city?.name,
      venue?.state?.stateCode,
      venue?.postalCode
    ].filter(Boolean).join(', '),
    city_name: venue?.city?.name || '',
    latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
    longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
    image_url: image?.url || '',
    external_url: tmEvent.url || '',
    url: tmEvent.url || '',
    price_min: priceRange?.min || 0,
    price_max: priceRange?.max || 0,
    is_free: priceRange?.min === 0 || !priceRange,
    category: tmEvent.classifications?.[0]?.segment?.name?.toLowerCase() || 'entertainment',
    source: 'ticketmaster',
    provider: 'ticketmaster',
    external_id: tmEvent.id,
    official: true,
    verified: true,
    // Add venue object for compatibility with event detail page
    venue: {
      name: venue?.name || 'Venue TBA',
      address: venue?.address?.line1 || '',
      latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
      longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined
    }
  }
}
