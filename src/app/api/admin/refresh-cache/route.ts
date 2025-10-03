import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full cache refresh

// Categories to cache
const CATEGORIES = [
  { key: 'music-concerts', query: 'concert' },
  { key: 'nightlife-dj', query: 'club' },
  { key: 'comedy-improv', query: 'comedy' },
  { key: 'theatre-dance', query: 'dance' },
  { key: 'food-drink', query: 'festival' },
  { key: 'arts-exhibits', query: 'art' },
  { key: 'film-screenings', query: 'film' },
  { key: 'markets-popups', query: 'expo' },
  { key: 'sports-fitness', query: 'sports' },
  { key: 'outdoors-nature', query: 'festival' },
  { key: 'wellness-mindfulness', query: 'wellness' },
  { key: 'workshops-classes', query: 'workshop' },
  { key: 'tech-startups', query: 'tech' },
  { key: 'family-kids', query: 'family' },
  { key: 'date-night', query: 'jazz' },
  { key: 'late-night', query: 'club' },
  { key: 'neighborhood', query: 'festival' },
  { key: 'halloween', query: 'halloween' },
]

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting cache refresh...')

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get city from request or default to San Francisco
    const { city = 'San Francisco' } = await request.json().catch(() => ({}))

    let totalEvents = 0
    const categoryResults: any[] = []

    // Process each category
    for (const category of CATEGORIES) {
      try {
        console.log(`📂 Refreshing category: ${category.key}`)

        // Fetch events from aggregated API
        const eventsResponse = await fetch(
          `${request.nextUrl.origin}/api/search-events?q=${category.query}&limit=20&city=${encodeURIComponent(city)}`
        )

        if (!eventsResponse.ok) {
          throw new Error(`Failed to fetch ${category.key}: ${eventsResponse.status}`)
        }

        const { events } = await eventsResponse.json()

        // Store events in Supabase
        for (const event of events) {
          const eventData = {
            id: event.id,
            title: event.title,
            description: event.description || '',
            date: event.date || event.event_date,
            time: event.time,
            venue_name: event.venue_name,
            address: event.address || event.venue_address,
            latitude: event.latitude,
            longitude: event.longitude,
            price_min: event.price_min || 0,
            price_max: event.price_max || 0,
            external_url: event.external_url || event.url,
            category: category.key,
            image_url: event.image_url,
            source: event.source,
            provider: event.provider,
            external_id: event.external_id,
            city_name: event.city_name || city,
            is_free: event.is_free || false,
            official: event.official || false,
            verified: event.verified || false,
            cached_at: new Date().toISOString(),
          }

          // Upsert event (insert or update if exists)
          const { error } = await supabase
            .from('events')
            .upsert(eventData, { onConflict: 'id' })

          if (error) {
            console.error(`Error upserting event ${event.id}:`, error.message)
          }
        }

        totalEvents += events.length
        categoryResults.push({
          category: category.key,
          count: events.length,
        })

        console.log(`✅ ${category.key}: ${events.length} events cached`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ Error caching ${category.key}:`, error)
        categoryResults.push({
          category: category.key,
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update cache status
    await supabase.from('cache_status').upsert({
      cache_key: `events_${city.toLowerCase().replace(/\s+/g, '_')}`,
      last_refreshed_at: new Date().toISOString(),
      event_count: totalEvents,
      status: 'completed',
    }, { onConflict: 'cache_key' })

    console.log(`✅ Cache refresh complete: ${totalEvents} total events`)

    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      totalEvents,
      categories: categoryResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Cache refresh failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
