import { NextRequest, NextResponse } from 'next/server'
import { LiveEventScraper } from '@/lib/live-scraper'

export const dynamic = 'force-dynamic'

const scraper = new LiveEventScraper()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'events'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log(`🔍 Scraping events for: "${query}"`)

    // Scrape events directly (skip Supabase storage since it's not configured)
    const scrapedEvents = await scraper.scrapeAll(query, limit + 20)
    
    if (scrapedEvents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No events found',
        query,
        events: [],
        count: 0,
        hasMore: false
      })
    }

    // Return scraped events directly (no Supabase storage)
    const paginatedEvents = scrapedEvents.slice(offset, offset + limit)
    const hasMore = scrapedEvents.length > offset + limit

    console.log(`✅ Returning ${paginatedEvents.length} scraped events`)

    return NextResponse.json({
      success: true,
      query,
      events: paginatedEvents,
      count: paginatedEvents.length,
      totalCount: scrapedEvents.length,
      hasMore,
      source: 'scraped'
    })

  } catch (error) {
    console.error('Search error:', error)
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
