/**
 * Eventbrite Scraper Usage Examples
 * 
 * This file demonstrates how to use the Eventbrite public page scraper
 * in various scenarios within the SceneScout application.
 */

import { 
  EventbritePublicScraper, 
  scrapeEventbriteEvents, 
  getEventbriteEventsForSceneScout,
  type ScrapingFilters,
  type EventbriteScrapingConfig 
} from './sources/eventbrite'
import { Event } from '../../types'

/**
 * Example 1: Basic city-based event scraping
 */
export async function scrapeEventsForCity(cityName: string): Promise<Event[]> {
  const filters: ScrapingFilters = {
    city: cityName,
    limit: 50
  }

  const config: EventbriteScrapingConfig = {
    headless: true,
    timeout: 30000,
    rateLimitDelay: 2000,
    maxRetries: 3
  }

  try {
    const normalizedEvents = await getEventbriteEventsForSceneScout(filters, config)
    
    console.log(`Found ${normalizedEvents.length} events in ${cityName}`)
    
    // Convert to full Event objects (you'd typically save these to database)
    return normalizedEvents.map(event => ({
      ...event,
      id: event.external_id || `eventbrite_${Date.now()}`,
      created_at: event.created_at || new Date().toISOString(),
      updated_at: event.updated_at || new Date().toISOString()
    })) as Event[]

  } catch (error) {
    console.error(`Error scraping events for ${cityName}:`, error)
    return []
  }
}

/**
 * Example 2: Category-specific event scraping
 */
export async function scrapeMusicEvents(cityName: string): Promise<Event[]> {
  const filters: ScrapingFilters = {
    city: cityName,
    categories: ['music'],
    limit: 100
  }

  const scraper = new EventbritePublicScraper({
    headless: true,
    rateLimitDelay: 1500
  })

  try {
    await scraper.initialize()
    const result = await scraper.scrapeEvents(filters)
    
    console.log(`Scraped ${result.events.length} music events`)
    console.log(`Total found: ${result.totalFound}`)
    console.log(`Pages scraped: ${result.metadata.pagesScraped}`)

    // Normalize and return
    return result.events.map(event => 
      scraper.normalizeToSceneScoutEvent(event)
    ) as Event[]

  } finally {
    await scraper.cleanup()
  }
}

/**
 * Example 3: Date range filtering for upcoming events
 */
export async function scrapeUpcomingEvents(
  cityName: string, 
  daysAhead: number = 30
): Promise<Event[]> {
  const startDate = new Date()
  const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)

  const filters: ScrapingFilters = {
    city: cityName,
    dateRange: { start: startDate, end: endDate },
    limit: 200
  }

  const result = await scrapeEventbriteEvents(filters)
  
  console.log(`Found ${result.events.length} upcoming events in the next ${daysAhead} days`)
  
  return result.events.map(event => {
    const scraper = new EventbritePublicScraper()
    return scraper.normalizeToSceneScoutEvent(event)
  }) as Event[]
}

/**
 * Example 4: Free events only
 */
export async function scrapeFreeEvents(cityName: string): Promise<Event[]> {
  const filters: ScrapingFilters = {
    city: cityName,
    freeOnly: true,
    limit: 50
  }

  const result = await scrapeEventbriteEvents(filters, {
    headless: true,
    timeout: 20000
  })

  console.log(`Found ${result.events.length} free events`)
  
  // Verify all events are actually free
  const freeEvents = result.events.filter(event => event.price.isFree)
  console.log(`Verified ${freeEvents.length} are actually free`)

  return freeEvents.map(event => {
    const scraper = new EventbritePublicScraper()
    return scraper.normalizeToSceneScoutEvent(event)
  }) as Event[]
}

/**
 * Example 5: Batch scraping multiple cities
 */
export async function scrapeMultipleCities(
  cities: string[],
  eventsPerCity: number = 25
): Promise<Record<string, Event[]>> {
  const results: Record<string, Event[]> = {}
  
  const scraper = new EventbritePublicScraper({
    headless: true,
    rateLimitDelay: 3000, // Longer delay for batch processing
    maxRetries: 2
  })

  try {
    await scraper.initialize()

    for (const city of cities) {
      try {
        console.log(`Scraping events for ${city}...`)
        
        const filters: ScrapingFilters = {
          city,
          limit: eventsPerCity
        }

        const result = await scraper.scrapeEvents(filters)
        
        results[city] = result.events.map(event => 
          scraper.normalizeToSceneScoutEvent(event)
        ) as Event[]

        console.log(`✓ Found ${results[city].length} events in ${city}`)
        
        // Rate limiting between cities
        await new Promise(resolve => setTimeout(resolve, 5000))
        
      } catch (error) {
        console.error(`✗ Error scraping ${city}:`, error)
        results[city] = []
      }
    }

  } finally {
    await scraper.cleanup()
  }

  return results
}

/**
 * Example 6: Advanced filtering and data enrichment
 */
export async function scrapeAndEnrichEvents(cityName: string): Promise<Event[]> {
  const filters: ScrapingFilters = {
    city: cityName,
    categories: ['music', 'arts', 'food'],
    priceRange: { min: 0, max: 100 },
    limit: 100
  }

  const scraper = new EventbritePublicScraper({
    headless: true,
    timeout: 45000
  })

  try {
    await scraper.initialize()
    const result = await scraper.scrapeEvents(filters)
    
    console.log(`Scraped ${result.events.length} events`)
    
    // Enrich with additional data
    const enrichedEvents = result.events.map(event => {
      const normalized = scraper.normalizeToSceneScoutEvent(event)
      
      // Add SceneScout-specific enhancements
      return {
        ...normalized,
        id: `eventbrite_${event.externalId}`,
        hotness_score: calculateHotnessScore(event),
        view_count: 0,
        is_featured: event.price.min && event.price.min > 50, // Premium events as featured
        tags: generateTags(event),
        last_updated: new Date().toISOString()
      } as Event
    })

    return enrichedEvents

  } finally {
    await scraper.cleanup()
  }
}

/**
 * Example 7: Error handling and retry logic
 */
export async function robustEventScraping(cityName: string): Promise<{
  events: Event[]
  errors: string[]
  retryCount: number
}> {
  const maxRetries = 3
  let retryCount = 0
  const errors: string[] = []
  let events: Event[] = []

  while (retryCount < maxRetries) {
    try {
      const filters: ScrapingFilters = {
        city: cityName,
        limit: 50
      }

      const config: EventbriteScrapingConfig = {
        headless: true,
        timeout: 30000,
        maxRetries: 2,
        rateLimitDelay: 2000
      }

      const normalizedEvents = await getEventbriteEventsForSceneScout(filters, config)
      
      events = normalizedEvents.map(event => ({
        ...event,
        id: event.external_id || `eventbrite_${Date.now()}_${Math.random()}`,
        created_at: event.created_at || new Date().toISOString(),
        updated_at: event.updated_at || new Date().toISOString()
      })) as Event[]

      break // Success, exit retry loop

    } catch (error) {
      retryCount++
      const errorMessage = `Attempt ${retryCount} failed: ${error}`
      errors.push(errorMessage)
      console.warn(errorMessage)

      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return { events, errors, retryCount }
}

/**
 * Example 8: Streaming/real-time scraping
 */
export async function* streamEvents(
  cityName: string,
  intervalMinutes: number = 60
): AsyncGenerator<Event[], void, unknown> {
  const scraper = new EventbritePublicScraper({
    headless: true,
    rateLimitDelay: 3000
  })

  try {
    await scraper.initialize()

    while (true) {
      try {
        const filters: ScrapingFilters = {
          city: cityName,
          limit: 20
        }

        const result = await scraper.scrapeEvents(filters)
        
        const events = result.events.map(event => 
          scraper.normalizeToSceneScoutEvent(event)
        ) as Event[]

        yield events

        // Wait for next interval
        await new Promise(resolve => 
          setTimeout(resolve, intervalMinutes * 60 * 1000)
        )

      } catch (error) {
        console.error('Streaming error:', error)
        // Continue streaming after errors
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    }

  } finally {
    await scraper.cleanup()
  }
}

/**
 * Helper function to calculate hotness score
 */
function calculateHotnessScore(event: any): number {
  let score = 0
  
  // Base score
  score += 10
  
  // Price factor (free events get boost)
  if (event.price.isFree) {
    score += 20
  } else if (event.price.min && event.price.min < 25) {
    score += 10
  }
  
  // Date factor (events soon get boost)
  const eventDate = new Date(event.date)
  const now = new Date()
  const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysUntil <= 7) {
    score += 15
  } else if (daysUntil <= 30) {
    score += 10
  }
  
  // Category boost
  if (['music', 'arts', 'food'].includes(event.category || '')) {
    score += 5
  }
  
  // Image boost
  if (event.imageUrls.length > 0) {
    score += 5
  }
  
  return Math.min(score, 100) // Cap at 100
}

/**
 * Helper function to generate tags
 */
function generateTags(event: any): string[] {
  const tags: string[] = []
  
  // Add category as tag
  if (event.category) {
    tags.push(event.category)
  }
  
  // Add price-based tags
  if (event.price.isFree) {
    tags.push('free')
  } else if (event.price.min && event.price.min < 25) {
    tags.push('affordable')
  }
  
  // Add location-based tags
  if (event.isOnline) {
    tags.push('online', 'virtual')
  } else {
    tags.push('in-person')
  }
  
  // Add time-based tags
  const eventDate = new Date(event.date)
  const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  tags.push(dayOfWeek)
  
  if ([5, 6].includes(eventDate.getDay())) { // Friday or Saturday
    tags.push('weekend')
  }
  
  return tags
}

/**
 * Example usage in Next.js API route
 */
export async function handleEventbriteAPI(
  cityName: string,
  categories?: string[],
  limit?: number
) {
  try {
    const filters: ScrapingFilters = {
      city: cityName,
      categories: categories || [],
      limit: limit || 50
    }

    const events = await getEventbriteEventsForSceneScout(filters, {
      headless: true,
      timeout: 30000,
      rateLimitDelay: 2000
    })

    return {
      success: true,
      data: events,
      message: `Found ${events.length} events in ${cityName}`
    }

  } catch (error) {
    console.error('API Error:', error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Export usage examples
export const examples = {
  basicScraping: scrapeEventsForCity,
  categorySpecific: scrapeMusicEvents,
  dateFiltered: scrapeUpcomingEvents,
  freeEvents: scrapeFreeEvents,
  batchScraping: scrapeMultipleCities,
  enrichedData: scrapeAndEnrichEvents,
  robustScraping: robustEventScraping,
  streaming: streamEvents,
  apiHandler: handleEventbriteAPI
}