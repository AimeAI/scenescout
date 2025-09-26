import { NextRequest, NextResponse } from 'next/server'
import { LiveEventScraper } from '@/lib/live-scraper'

export const dynamic = 'force-dynamic'

const scraper = new LiveEventScraper()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const lat = parseFloat(searchParams.get('lat') || '43.6532')
    const lng = parseFloat(searchParams.get('lng') || '-79.3832')
    const radius = parseInt(searchParams.get('radius') || '25')

    console.log(`🗺️ Loading events for map: category=${category}, limit=${limit}`)

    // Get events from multiple queries to ensure good coverage
    let allEvents = []
    
    if (category === 'all') {
      // Load events from multiple categories
      const categoryQueries = [
        'music concerts',
        'food restaurants', 
        'tech meetups',
        'art exhibitions',
        'sports games',
        'social events'
      ]
      
      for (const query of categoryQueries) {
        const events = await scraper.scrapeAll(query, 15)
        allEvents.push(...events)
      }
    } else {
      // Load specific category
      const events = await scraper.scrapeAll(category, limit)
      allEvents.push(...events)
    }

    // Remove duplicates and add coordinates if missing
    const uniqueEvents = removeDuplicates(allEvents).map(event => ({
      ...event,
      latitude: event.latitude || (lat + (Math.random() - 0.5) * 0.1),
      longitude: event.longitude || (lng + (Math.random() - 0.5) * 0.1),
      id: event.external_id || `event-${Date.now()}-${Math.random()}`
    }))

    // Filter by category if specified
    const filteredEvents = category === 'all' 
      ? uniqueEvents 
      : uniqueEvents.filter(event => event.category === category)

    // Calculate distance and filter by radius
    const eventsWithDistance = filteredEvents.map(event => ({
      ...event,
      distance: calculateDistance(lat, lng, event.latitude, event.longitude)
    })).filter(event => event.distance <= radius)

    // Sort by distance
    const sortedEvents = eventsWithDistance.sort((a, b) => a.distance - b.distance)

    const stats = {
      total: sortedEvents.length,
      freeEvents: sortedEvents.filter(e => e.price_min === 0).length,
      paidEvents: sortedEvents.filter(e => e.price_min > 0).length,
      categories: [...new Set(sortedEvents.map(e => e.category))].length
    }

    console.log(`✅ Returning ${sortedEvents.length} events for map`)

    return NextResponse.json({
      success: true,
      events: sortedEvents.slice(0, limit),
      stats,
      center: { lat, lng },
      radius
    })

  } catch (error) {
    console.error('Map events API error:', error)
    return NextResponse.json(
      { error: 'Failed to load events', details: error.message },
      { status: 500 }
    )
  }
}

function removeDuplicates(events: any[]): any[] {
  const seen = new Set<string>()
  return events.filter(event => {
    const key = event.title?.toLowerCase().replace(/[^\w]/g, '') + event.date
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}
