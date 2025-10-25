import { NextRequest, NextResponse } from 'next/server'
import { LiveEventScraper } from '@/lib/live-scraper'
import { MultiSourceScraper } from '@/lib/multi-source-scraper'
import { EventManager } from '@/lib/event-manager'
import { searchQuerySchema } from '@/lib/validation/schemas'
import { validateAndRateLimit, safeErrorResponse, logValidationFailure } from '@/lib/validation/api-validator'
import { sanitizeEvents } from '@/lib/validation/sanitize'

export const dynamic = 'force-dynamic'

const liveScraper = new LiveEventScraper()
const multiScraper = new MultiSourceScraper()
const eventManager = new EventManager()

// Rate limit: 30 requests per minute for enhanced search (more intensive)
const ENHANCED_SEARCH_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000,
}

export async function GET(request: NextRequest) {
  try {
    // Validate and rate limit
    const result = await validateAndRateLimit(
      request,
      searchQuerySchema,
      'search-enhanced',
      ENHANCED_SEARCH_RATE_LIMIT
    )

    if ('response' in result) {
      return result.response
    }

    const { data: params } = result
    const { q: query, limit, offset } = params

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

    // Sanitize events to prevent XSS
    const sanitizedEvents = sanitizeEvents(paginatedEvents)

    const hasMore = uniqueEvents.length > offset + limit || offset === 0 // Always show more on first load

    console.log(`🎉 Returning ${sanitizedEvents.length} events (${uniqueEvents.length} total, hasMore: ${hasMore})`)

    return NextResponse.json({
      success: true,
      query,
      events: sanitizedEvents,
      count: sanitizedEvents.length,
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
    logValidationFailure(request, error instanceof Error ? error.message : 'Unknown error', {
      endpoint: '/api/search-enhanced',
    })
    return safeErrorResponse(error, 'Enhanced search failed')
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
