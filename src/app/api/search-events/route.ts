import { NextRequest, NextResponse } from 'next/server'
import { dedupeEvents } from '@/lib/deduplication/event-deduper'
import { normalizePrice } from '@/lib/pricing/price-normalizer'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'events'
    const limit = parseInt(searchParams.get('limit') || '20')
    const city = searchParams.get('city')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    
    console.log(`🔍 Searching for: "${query}"`)
    
    // Get events from both Ticketmaster and EventBrite APIs
    const allEvents: any[] = []
    
    // Get location params for APIs
    const locationParams = lat && lng ? 
      `lat=${lat}&lng=${lng}` : 
      city ? `city=${encodeURIComponent(city)}` : 
      'city=San Francisco'
    
    // Try Ticketmaster first (primary source)
    try {
      const tmResponse = await fetch(`${request.nextUrl.origin}/api/ticketmaster/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 15)}&${locationParams}`)
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
    
    // Try EventBrite (secondary source) using live scraper
    try {
      const ebResponse = await fetch(`${request.nextUrl.origin}/api/search-live?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 10)}`)
      if (ebResponse.ok) {
        const ebData = await ebResponse.json()
        if (ebData.success && ebData.events?.length > 0) {
          // Convert the scraped events to match our format
          const convertedEvents = ebData.events.map((event: any) => ({
            ...event,
            id: `live_${event.title.replace(/[^\w]/g, '_').toLowerCase()}`,
            source: 'eventbrite',
            provider: 'EventBrite',
            official: true,
            verified: true
          }))
          allEvents.push(...convertedEvents)
          console.log(`✅ EventBrite (live): ${convertedEvents.length} events`)
        }
      } else {
        console.warn(`⚠️ EventBrite live scraper returned ${ebResponse.status}`)
      }
    } catch (error) {
      console.warn('⚠️ EventBrite live scraper error:', error)
    }
    
    // Sort events by date and prioritize Ticketmaster
    const sortedEvents = allEvents
      .sort((a, b) => {
        // First sort by date
        const dateA = new Date(a.date || '9999-12-31')
        const dateB = new Date(b.date || '9999-12-31')
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
    
    // Apply price normalization if feature flag is enabled
    const eventsWithPricing = process.env.NEXT_PUBLIC_FEATURE_PRICE_V2 === 'true'
      ? limitedEvents.map(event => ({ ...event, normalizedPrice: normalizePrice(event) }))
      : limitedEvents
    
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
    return NextResponse.json(
      { 
        success: false,
        error: 'Search failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        events: [],
        count: 0
      },
      { status: 500 }
    )
  }
}