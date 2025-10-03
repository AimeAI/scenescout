import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    console.log(`🔍 Fetching event: ${eventId}`)

    // Strategy: Search across all our data sources for this event
    // 1. Try Ticketmaster first (most events come from here)
    // 2. Try EventBrite second
    // 3. Try searching by partial ID match

    let event = null

    // Check if this is a Ticketmaster ID (format: vv1AaZA...)
    if (eventId.startsWith('vv') || eventId.startsWith('G5') || eventId.startsWith('Z7')) {
      console.log('🎫 Trying Ticketmaster...')
      const tmResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${process.env.TICKETMASTER_API_KEY}`
      )

      if (tmResponse.ok) {
        const tmData = await tmResponse.json()
        event = normalizeTicketmasterEvent(tmData)
        console.log('✅ Found in Ticketmaster')
      }
    }

    // If not found in Ticketmaster, search our aggregated events
    if (!event) {
      console.log('🔍 Searching aggregated events...')

      // Search through recent events from our main search endpoint
      const searchResponse = await fetch(`${request.nextUrl.origin}/api/search-events?limit=500`)
      if (searchResponse.ok) {
        const { events } = await searchResponse.json()
        event = events.find((e: any) => e.id === eventId)

        if (event) {
          console.log('✅ Found in aggregated search')
        }
      }
    }

    if (!event) {
      console.log('❌ Event not found')
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      event
    })

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

// Normalize Ticketmaster event to our format
function normalizeTicketmasterEvent(tmEvent: any) {
  const venue = tmEvent._embedded?.venues?.[0]
  const image = tmEvent.images?.find((img: any) => img.width > 1000) || tmEvent.images?.[0]

  return {
    id: tmEvent.id,
    title: tmEvent.name,
    description: tmEvent.info || tmEvent.pleaseNote || tmEvent.description || '',
    date: tmEvent.dates?.start?.localDate,
    time: tmEvent.dates?.start?.localTime,
    venue_name: venue?.name,
    venue_address: [
      venue?.address?.line1,
      venue?.city?.name,
      venue?.state?.stateCode,
      venue?.postalCode
    ].filter(Boolean).join(', '),
    latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
    image_url: image?.url,
    external_url: tmEvent.url,
    price_min: tmEvent.priceRanges?.[0]?.min,
    price_max: tmEvent.priceRanges?.[0]?.max,
    category: tmEvent.classifications?.[0]?.segment?.name?.toLowerCase() || 'event',
    source: 'ticketmaster',
    provider: 'Ticketmaster'
  }
}
