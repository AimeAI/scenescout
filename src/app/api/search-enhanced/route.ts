import { NextRequest, NextResponse } from 'next/server'
import { LiveEventScraper } from '@/lib/live-scraper'
import { MultiSourceScraper } from '@/lib/multi-source-scraper'
import { EventManager } from '@/lib/event-manager'

const liveScraper = new LiveEventScraper()
const multiScraper = new MultiSourceScraper()
const eventManager = new EventManager()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'events'
    const limit = parseInt(searchParams.get('limit') || '25') // Increased default
    const offset = parseInt(searchParams.get('offset') || '0')
    
    console.log(`🔍 Enhanced search for: "${query}" (limit: ${limit}, offset: ${offset})`)
    
    // First try the working LiveEventScraper
    const liveEvents = await liveScraper.scrapeAll(query, limit + offset + 10)
    console.log(`✅ LiveScraper found: ${liveEvents.length} events`)
    
    // Then add multi-source events as bonus
    let multiEvents = []
    try {
      multiEvents = await multiScraper.scrapeAllSources(query, ['music', 'food', 'social', 'tech', 'arts'])
      console.log(`✅ MultiScraper found: ${multiEvents.length} additional events`)
    } catch (error) {
      console.log(`⚠️ MultiScraper failed: ${error.message}`)
    }
    
    // Combine and deduplicate
    const allEvents = [...liveEvents, ...multiEvents]
    const uniqueEvents = removeDuplicates(allEvents)
    
    // Apply pagination
    const paginatedEvents = uniqueEvents.slice(offset, offset + limit)
    const hasMore = uniqueEvents.length > offset + limit || offset === 0 // Always show more on first load
    
    console.log(`🎉 Returning ${paginatedEvents.length} events (${uniqueEvents.length} total, hasMore: ${hasMore})`)
    
    return NextResponse.json({
      success: true,
      query,
      events: paginatedEvents,
      count: paginatedEvents.length,
      totalFound: uniqueEvents.length,
      hasMore,
      sources: {
        live: liveEvents.length,
        multi: multiEvents.length,
        unique: uniqueEvents.length
      }
    })

  } catch (error) {
    console.error('Enhanced search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
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
