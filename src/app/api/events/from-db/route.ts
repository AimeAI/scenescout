import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { queryCache, CACHE_KEYS, CACHE_TTL } from '@/lib/query-cache'

// ✅ Use anon key to respect RLS policies (public API endpoint)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100) // Cap at 100
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log(`📂 Fetching events from database: category=${category}, limit=${limit}, offset=${offset}`)

    // Check cache first (cache per category + offset combination)
    const cacheKey = CACHE_KEYS.CATEGORY_EVENTS(category || 'all', offset)
    const cached = queryCache.get<any>(cacheKey)

    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true
      })
    }

    const startTime = Date.now()

    // Build query with optimized field selection
    let query = supabase
      .from('events')
      .select('id, title, description, venue_name, city_name, category, subcategory, date, start_time, end_time, price_min, price_max, currency, image_url, ticket_url, is_featured, is_free, source, provider', { count: 'exact' })
      .gte('date', new Date().toISOString().split('T')[0]) // Future events only
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1)

    // Filter by category if specified
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: events, error, count } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events from database' },
        { status: 500 }
      )
    }

    const queryTime = Date.now() - startTime
    if (queryTime > 500) {
      console.warn(`⚠️ Slow query detected: events from-db took ${queryTime}ms`)
    }

    const response = {
      success: true,
      events: events || [],
      count: events?.length || 0,
      total: count || 0,
      source: 'database',
      category: category || 'all',
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      queryTime
    }

    // Cache the result for 60 seconds
    queryCache.set(cacheKey, response, CACHE_TTL.CATEGORY_EVENTS)

    console.log(`✅ Fetched ${events?.length || 0} events from database (total: ${count}) in ${queryTime}ms`)

    return NextResponse.json({
      ...response,
      cached: false
    })

  } catch (error) {
    console.error('❌ Database fetch error:', error)
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

// GET statistics about database events
export async function HEAD(request: NextRequest) {
  try {
    const { data: stats } = await supabase
      .rpc('get_event_stats')
      .single()

    return NextResponse.json({
      success: true,
      stats: stats || {},
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
