import { NextRequest, NextResponse } from 'next/server'
import { LiveEventScraper } from '@/lib/live-scraper'
import { EventManager } from '@/lib/event-manager'

const scraper = new LiveEventScraper()
const eventManager = new EventManager()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'events'
    const timeFilter = searchParams.get('time') || 'all'
    const category = searchParams.get('category') || 'all'
    const priceFilter = searchParams.get('price') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log(`🔍 Searching for: "${query}" (category: ${category}, time: ${timeFilter})`)
    
    // Clean up expired events first
    await eventManager.cleanupExpiredEvents()
    
    // Try to get from stored events first (unless force refresh)
    if (!forceRefresh) {
      const storedResult = await eventManager.searchStoredEvents(query, {
        category: category !== 'all' ? category : undefined,
        timeFilter: timeFilter !== 'all' ? timeFilter : undefined,
        priceFilter: priceFilter !== 'all' ? priceFilter : undefined
      })
      
      if (storedResult.success && storedResult.events.length >= 10) {
        const paginatedEvents = storedResult.events.slice(offset, offset + limit)
        const hasMore = storedResult.events.length > offset + limit
        
        console.log(`📚 Using ${paginatedEvents.length} stored events`)
        
        return NextResponse.json({
          success: true,
          query,
          events: paginatedEvents,
          count: paginatedEvents.length,
          totalCount: storedResult.events.length,
          hasMore,
          source: 'stored',
          timeFilter,
          category
        })
      }
    }
    
    // If not enough stored events or force refresh, scrape new ones
    console.log(`🔄 Scraping fresh events for: "${query}"`)
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

    // Store new events and merge with existing
    const mergeResult = await eventManager.mergeWithStoredEvents(scrapedEvents, 'live_scrape')
    
    if (!mergeResult.success) {
      // Return scraped events even if storage fails
      return NextResponse.json({
        success: true,
        query,
        events: scrapedEvents.slice(offset, offset + limit),
        count: Math.min(scrapedEvents.length, limit),
        totalCount: scrapedEvents.length,
        hasMore: scrapedEvents.length > offset + limit,
        source: 'scraped_only'
      })
    }

    // Apply filters to merged results
    const filteredResult = await eventManager.getStoredEvents({
      category: category !== 'all' ? category : undefined,
      timeFilter: timeFilter !== 'all' ? timeFilter : undefined,
      priceFilter: priceFilter !== 'all' ? priceFilter : undefined,
      limit: 100 // Get more for filtering
    })

    // Filter by search query
    const searchFilteredEvents = filteredResult.events.filter(event =>
      event.title?.toLowerCase().includes(query.toLowerCase()) ||
      event.description?.toLowerCase().includes(query.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(query.toLowerCase())
    )

    const paginatedEvents = searchFilteredEvents.slice(offset, offset + limit)
    const hasMore = searchFilteredEvents.length > offset + limit

    console.log(`✅ Returning ${paginatedEvents.length} events (${mergeResult.newCount} new, ${mergeResult.totalCount} total stored)`)

    return NextResponse.json({
      success: true,
      query,
      events: paginatedEvents,
      count: paginatedEvents.length,
      totalCount: searchFilteredEvents.length,
      hasMore,
      newEventsAdded: mergeResult.newCount,
      totalStoredEvents: mergeResult.totalCount,
      source: 'merged',
      timeFilter,
      category
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    )
  }
}
