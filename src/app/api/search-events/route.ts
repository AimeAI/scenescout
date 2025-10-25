import { NextRequest, NextResponse } from 'next/server'
import { dedupeEvents } from '@/lib/deduplication/event-deduper'
import { normalizePrice } from '@/lib/pricing/price-normalizer'
import { searchQuerySchema } from '@/lib/validation/schemas'
import { validateAndRateLimit, safeErrorResponse, logValidationFailure } from '@/lib/validation/api-validator'
import { sanitizeEvents } from '@/lib/validation/sanitize'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Rate limit: 60 requests per minute for search
const SEARCH_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60 * 1000,
}

export async function GET(request: NextRequest) {
  try {
    // Validate and rate limit
    const result = await validateAndRateLimit(
      request,
      searchQuerySchema,
      'search-events',
      SEARCH_RATE_LIMIT
    )

    if ('response' in result) {
      return result.response
    }

    const { data: params } = result
    const { q: query, limit, city, lat, lng, sort: sortBy } = params

    console.log(`🔍 Searching for: "${query}" (sort: ${sortBy})`)
    
    // Get events from both Ticketmaster and EventBrite APIs
    const allEvents: any[] = []
    
    // Get location params for APIs
    const locationParams = lat && lng ? 
      `lat=${lat}&lng=${lng}` : 
      city ? `city=${encodeURIComponent(city)}` : 
      'city=San Francisco'
    
    // Try Ticketmaster first (primary source)
    try {
      // Increase limit to 100 for Ticketmaster to get more events
      // Pass sort parameter to Ticketmaster API
      const tmResponse = await fetch(`${request.nextUrl.origin}/api/ticketmaster/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}&${locationParams}&sort=${sortBy}`)
      if (tmResponse.ok) {
        const tmData = await tmResponse.json()
        if (tmData.success && tmData.events?.length > 0) {
          allEvents.push(...tmData.events)
          console.log(`✅ Ticketmaster: ${tmData.events.length} events`)
        }
      } else {
        console.warn(`⚠️ Ticketmaster API returned ${tmResponse.status}`)
      }
    } catch (error) {
      console.warn('⚠️ Ticketmaster API error:', error)
    }

    // Try EventBrite (secondary source) using official API
    try {
      const { EventbriteClient } = await import('@/lib/api/eventbrite-client')
      const ebClient = new EventbriteClient({
        apiKey: process.env.EVENTBRITE_PRIVATE_TOKEN || process.env.EVENTBRITE_TOKEN || '',
        baseUrl: 'https://www.eventbriteapi.com/v3'
      })

      const searchParams: any = {
        query,
        limit: Math.min(limit, 50),
        sort: 'date'
      }

      // Add location if available
      if (lat && lng) {
        searchParams.location = {
          latitude: lat,
          longitude: lng,
          radius: 25 // 25km radius
        }
      } else {
        // Default to Toronto
        searchParams.location = {
          city: 'Toronto'
        }
      }

      const ebResult = await ebClient.searchEvents(searchParams)

      if (ebResult.success && ebResult.data?.length > 0) {
        // Convert EventBrite API response to our format
        const convertedEvents = ebResult.data.map((event: any) => ({
          id: `eb_${event.id}`,
          title: event.name?.text || event.name,
          description: event.description?.text || event.description || '',
          event_date: event.start?.local?.split('T')[0] || event.start?.utc?.split('T')[0],
          date: event.start?.local || event.start?.utc,
          start_time: event.start?.local?.split('T')[1] || '19:00:00',
          time: event.start?.local?.split('T')[1] || '19:00:00',
          venue_name: event.venue?.name || event.venue?.address?.city || 'Toronto',
          address: event.venue?.address ? `${event.venue.address.address_1 || ''}, ${event.venue.address.city || 'Toronto'}`.trim() : 'Toronto, ON',
          latitude: event.venue?.latitude ? parseFloat(event.venue.latitude) : lat,
          longitude: event.venue?.longitude ? parseFloat(event.venue.longitude) : lng,
          lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : lat,
          lng: event.venue?.longitude ? parseFloat(event.venue.longitude) : lng,
          price_min: event.ticket_classes?.[0]?.cost?.value ? parseFloat(event.ticket_classes[0].cost.value) / 100 : 0,
          price: event.is_free ? 0 : (event.ticket_classes?.[0]?.cost?.value ? parseFloat(event.ticket_classes[0].cost.value) / 100 : undefined),
          price_label: event.is_free ? 'Free' : (event.ticket_classes?.[0]?.cost?.display || 'Paid'),
          url: event.url,
          image: event.logo?.url || event.logo?.original?.url || '',
          source: 'eventbrite',
          provider: 'EventBrite',
          official: true,
          verified: true
        }))
        allEvents.push(...convertedEvents)
        console.log(`✅ EventBrite (API): ${convertedEvents.length} events`)
      }
    } catch (error) {
      console.warn('⚠️ EventBrite API error:', error)
    }
    
    // Filter out past events - only show events from today onwards (comparing dates only, not times)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    const futureEvents = allEvents.filter(event => {
      const eventDateStr = event.event_date || event.date
      if (!eventDateStr) return true // Keep events without dates

      const eventDate = new Date(eventDateStr)
      if (isNaN(eventDate.getTime())) return true // Keep invalid dates

      eventDate.setHours(0, 0, 0, 0) // Compare dates only, not times
      return eventDate >= today // Keep today and future events
    })

    // Sort events by date and prioritize Ticketmaster
    const sortedEvents = futureEvents
      .sort((a, b) => {
        // First sort by date
        const dateA = new Date(a.event_date || a.date || '9999-12-31')
        const dateB = new Date(b.event_date || b.date || '9999-12-31')
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime()
        }
        // Then prioritize Ticketmaster events
        const priorityA = a.source?.includes('ticketmaster') ? 1 : 2
        const priorityB = b.source?.includes('ticketmaster') ? 1 : 2
        return priorityA - priorityB
      })
    
    // Apply deduplication by default (preserving Ticketmaster as preferred source)
    const finalEvents = dedupeEvents(sortedEvents, { preserveProvider: 'ticketmaster' })
    
    // Apply limit after deduplication
    const limitedEvents = finalEvents.slice(0, limit)
    
    // Sanitize events to prevent XSS
    const sanitizedEvents = sanitizeEvents(limitedEvents)

    // Apply price normalization if feature flag is enabled
    const eventsWithPricing = process.env.NEXT_PUBLIC_FEATURE_PRICE_V2 === 'true'
      ? sanitizedEvents.map(event => ({ ...event, normalizedPrice: normalizePrice(event) }))
      : sanitizedEvents

    console.log(`✅ Found ${eventsWithPricing.length} total events for "${query}" (${allEvents.length} before deduplication)`)

    return NextResponse.json({
      success: true,
      query,
      events: eventsWithPricing,
      count: eventsWithPricing.length,
      sources: {
        ticketmaster: allEvents.filter(e => e.source?.includes('ticketmaster')).length,
        eventbrite: allEvents.filter(e => e.source?.includes('eventbrite')).length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Search error:', error)
    logValidationFailure(request, error instanceof Error ? error.message : 'Unknown error', {
      endpoint: '/api/search-events',
    })
    return safeErrorResponse(error, 'Search failed')
  }
}