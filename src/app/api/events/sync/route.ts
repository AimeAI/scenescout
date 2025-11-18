import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Categories to sync - matching homepage categories
const CATEGORIES = [
  { id: 'music-concerts', query: 'concert' },
  { id: 'nightlife-dj', query: 'dance' },
  { id: 'comedy-improv', query: 'comedy' },
  { id: 'theatre-dance', query: 'theatre' },
  { id: 'food-drink', query: 'festival' },
  { id: 'arts-exhibits', query: 'art' },
  { id: 'film-screenings', query: 'film' },
  { id: 'sports-fitness', query: 'sports' },
  { id: 'tech-startups', query: 'tech' },
  { id: 'family-kids', query: 'family' },
  { id: 'date-night', query: 'jazz' },
  { id: 'late-night', query: 'club' },
  { id: 'halloween', query: 'halloween' }
]

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting comprehensive event sync to database...')

    let totalSynced = 0
    let totalSkipped = 0
    const results: any[] = []

    for (const cat of CATEGORIES) {
      console.log(`🔄 Syncing ${cat.id} (${cat.query})`)

      try {
        // Fetch 100+ events with relevance sorting
        const response = await fetch(
          `${request.nextUrl.origin}/api/search-events?q=${encodeURIComponent(cat.query)}&limit=200&sort=relevance`,
          { cache: 'no-store' }
        )

        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch ${cat.id}`)
          continue
        }

        const data = await response.json()
        const events = data.events || []
        console.log(`📥 ${cat.id}: Fetched ${events.length} events`)

        let synced = 0
        let skipped = 0

        for (const event of events) {
          try {
            const eventData = {
              id: event.id || `${cat.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: event.title,
              description: event.description || null,
              date: event.date || event.event_date,
              time: event.time || event.start_time || null,
              venue_name: event.venue_name || null,
              address: event.address || null,
              price_min: event.price_min || 0,
              price_max: event.price_max || event.price_min || 0,
              price_range: event.price_min === 0 ? 'Free' : `$${event.price_min}`,
              external_url: event.external_url || event.ticket_url || null,
              category: cat.id,
              image_url: event.image_url || null,
              latitude: event.latitude || null,
              longitude: event.longitude || null,
              source: event.source || 'api'
            }

            const { error } = await supabase
              .from('events')
              .upsert(eventData, { onConflict: 'id' })

            if (error) {
              console.error(`❌ Failed to upsert event ${event.id}:`, error.message, error.details)
              skipped++
            } else {
              synced++
            }
          } catch (err) {
            console.error(`❌ Exception upserting event:`, err)
            skipped++
          }
        }

        totalSynced += synced
        totalSkipped += skipped

        results.push({
          category: cat.id,
          fetched: events.length,
          synced,
          skipped
        })

        console.log(`✅ ${cat.id}: ${synced}/${events.length} synced`)

      } catch (error) {
        console.error(`❌ Error syncing ${cat.id}:`, error)
      }
    }

    // Delete past events
    const today = new Date().toISOString().split('T')[0]
    const { data: deletedEvents } = await supabase
      .from('events')
      .delete()
      .lt('date', today)
      .select('id')

    const deletedCount = deletedEvents?.length || 0
    console.log(`🗑️  Deleted ${deletedCount} past events`)

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} events across ${CATEGORIES.length} categories`,
      totalSynced,
      totalSkipped,
      deletedPastEvents: deletedCount,
      categories: results
    })

  } catch (error) {
    console.error('❌ Sync error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get database stats
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    const categoryStats = await Promise.all(
      CATEGORIES.map(async (cat) => {
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('category', cat.id)

        return { category: cat.id, count: count || 0 }
      })
    )

    return NextResponse.json({
      success: true,
      totalEvents: totalEvents || 0,
      categories: categoryStats,
      lastChecked: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
