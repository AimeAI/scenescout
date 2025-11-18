import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full cache refresh

// Read service role key from .env.local directly to avoid Next.js truncation
function getServiceRoleKey(): string {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf-8')

    for (const line of envContent.split('\n')) {
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        const key = line.split('=')[1].trim().replace(/^["']|["']$/g, '')
        console.log('📁 Read service key from file, length:', key.length)
        return key
      }
    }
  } catch (error) {
    console.log('⚠️  Could not read .env.local, using anon key')
  }

  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

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

    // Get service role key (bypassing Next.js env parsing)
    const serviceKey = getServiceRoleKey()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
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
          // Map category to enum-safe value (temporary until enum is changed to TEXT)
          const categoryMap: Record<string, string> = {
            'music-concerts': 'music',
            'nightlife-dj': 'nightlife',
            'comedy-improv': 'comedy',
            'theatre-dance': 'performing_arts',
            'food-drink': 'food',
            'arts-exhibits': 'arts',
            'film-screenings': 'film',
            'markets-popups': 'markets',
            'sports-fitness': 'sports',
            'outdoors-nature': 'outdoors',
            'wellness-mindfulness': 'wellness',
            'workshops-classes': 'education',
            'tech-startups': 'tech',
            'family-kids': 'family',
            'date-night': 'music',
            'late-night': 'nightlife',
            'neighborhood': 'community',
            'halloween': 'seasonal'
          }

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
            category: categoryMap[category.key] || 'music', // Use enum-safe category
            subcategory: category.key, // Store original category in subcategory
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
    await getSupabaseClient().from('cache_status').upsert({
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
