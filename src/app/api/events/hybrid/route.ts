import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ✅ Use anon key to respect RLS policies (public API endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

/**
 * Hybrid Event Fetching Strategy:
 * 1. Try database first (fast, no rate limits)
 * 2. If database has enough events, return them
 * 3. If database is empty/stale, fall back to live APIs
 * 4. Return combined results with source indicator
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    console.log(`🔄 Hybrid fetch: category=${category}, limit=${limit}, location=${lat && lng ? `${lat},${lng}` : 'none'}`)

    // Step 1: Try database first
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .gte('date', new Date().toISOString().split('T')[0]) // Future events only
      .order('date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: dbEvents, error, count } = await query

    // Step 2: Check if database has sufficient data
    const hasEnoughData = (dbEvents?.length || 0) >= Math.min(limit * 0.5, 20) // At least 50% of requested or 20 events

    if (!error && hasEnoughData) {
      console.log(`✅ Database hit: ${dbEvents?.length} events (${count} total)`)
      return NextResponse.json({
        success: true,
        events: dbEvents || [],
        count: dbEvents?.length || 0,
        total: count || 0,
        source: 'database',
        category: category || 'all',
        pagination: {
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      })
    }

    // Step 3: Fall back to live APIs
    console.log(`⚠️ Database insufficient (${dbEvents?.length || 0} events), falling back to live APIs`)

    const searchQuery = category && category !== 'all'
      ? getCategoryQuery(category)
      : 'events'

    // Build location parameters if available
    const locationParams = lat && lng ? `&lat=${lat}&lng=${lng}` : ''

    const apiResponse = await fetch(
      `${request.nextUrl.origin}/api/search-events?q=${encodeURIComponent(searchQuery)}&limit=${limit}&sort=relevance${locationParams}`,
      { cache: 'no-store' }
    )

    if (!apiResponse.ok) {
      // If live API fails too, return whatever we have from database
      console.warn('⚠️ Live API failed, returning database results anyway')
      return NextResponse.json({
        success: true,
        events: dbEvents || [],
        count: dbEvents?.length || 0,
        total: count || 0,
        source: 'database_fallback',
        warning: 'Live APIs unavailable, showing database results'
      })
    }

    const apiData = await apiResponse.json()
    console.log(`✅ Live API hit: ${apiData.events?.length || 0} events`)

    return NextResponse.json({
      success: true,
      events: apiData.events || [],
      count: apiData.events?.length || 0,
      source: 'live_api',
      category: category || 'all',
      sources: apiData.sources
    })

  } catch (error) {
    console.error('❌ Hybrid fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Map category IDs to search queries (matches CATEGORIES in constants)
function getCategoryQuery(categoryId: string): string {
  const categoryMap: Record<string, string> = {
    'music-concerts': 'concert',
    'nightlife-dj': 'dance',
    'comedy-improv': 'comedy',
    'theatre-dance': 'theatre',
    'food-drink': 'food festival',
    'arts-exhibits': 'art',
    'film-screenings': 'film',
    'markets-popups': 'market',
    'sports-fitness': 'sports',
    'outdoors-nature': 'outdoor',
    'wellness-mindfulness': 'wellness',
    'workshops-classes': 'workshop',
    'tech-startups': 'tech',
    'family-kids': 'family',
    'date-night': 'live music',
    'late-night': 'club',
    'neighborhood': 'local events',
    'halloween': 'halloween'
  }

  return categoryMap[categoryId] || categoryId
}
