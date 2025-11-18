import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const city = searchParams.get('city') || 'San Francisco'

    // Initialize Supabase client
    // Use anon key instead - service role key has parsing issues in Next.js
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('🔑 Supabase URL:', url)
    console.log('🔑 Anon Key length:', key?.length, 'chars')

    if (!url || !key) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(url, key)

    // Build query - filter by subcategory (stores the original category key)
    let query = supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0]) // Only future events
      .order('date', { ascending: true })
      .limit(limit)

    // Filter by subcategory if provided
    if (category) {
      query = query.eq('subcategory', category)
    }

    const { data: events, error } = await query

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`)
    }

    console.log(`📦 Cached events query: ${events?.length || 0} events for category=${category || 'all'}`)

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
      source: 'cache',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching cached events:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cached events',
        details: error instanceof Error ? error.message : 'Unknown error',
        events: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}
