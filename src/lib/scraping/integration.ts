/**
 * SceneScout Integration for Eventbrite Scraper
 * 
 * This file provides integration utilities to use the Eventbrite scraper
 * within SceneScout's existing architecture and database structure.
 */

import { EventbritePublicScraper, type ScrapingFilters } from './sources/eventbrite'
import { Event, City } from '../../types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Database integration utilities
export class EventbriteScrapingService {
  private scraper: EventbritePublicScraper
  private supabase = createClientComponentClient()

  constructor(config = {}) {
    this.scraper = new EventbritePublicScraper({
      headless: true,
      rateLimitDelay: 3000,
      timeout: 30000,
      maxRetries: 3,
      ...config
    })
  }

  /**
   * Scrape events for a city and save to database
   */
  async scrapeAndSaveEvents(cityName: string, options: {
    categories?: string[]
    limit?: number
    updateExisting?: boolean
  } = {}): Promise<{
    saved: number
    updated: number
    errors: string[]
  }> {
    const result = { saved: 0, updated: 0, errors: [] as string[] }

    try {
      await this.scraper.initialize()

      // Get city info from database
      const city = await this.getCityByName(cityName)
      if (!city) {
        throw new Error(`City "${cityName}" not found in database`)
      }

      // Scrape events
      const scrapingResult = await this.scraper.scrapeEvents({
        city: cityName,
        categories: options.categories,
        limit: options.limit || 100
      })

      console.log(`Found ${scrapingResult.events.length} events to process`)

      // Process each event
      for (const scrapedEvent of scrapingResult.events) {
        try {
          const normalizedEvent = this.scraper.normalizeToSceneScoutEvent(scrapedEvent)
          
          // Add SceneScout-specific fields
          const eventData: Partial<Event> = {
            ...normalizedEvent,
            city_id: city.id,
            city_name: city.name,
            status: 'active',
            hotness_score: this.calculateHotnessScore(scrapedEvent),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          // Check if event already exists
          const existingEvent = await this.findExistingEvent(eventData.external_id!)
          
          if (existingEvent) {
            if (options.updateExisting) {
              await this.updateEvent(existingEvent.id, eventData)
              result.updated++
            }
          } else {
            await this.saveEvent(eventData)
            result.saved++
          }

        } catch (error) {
          result.errors.push(`Error processing event "${scrapedEvent.title}": ${error}`)
          console.error('Event processing error:', error)
        }
      }

      console.log(`Processing complete: ${result.saved} saved, ${result.updated} updated`)

    } catch (error) {
      result.errors.push(`Scraping failed: ${error}`)
      throw error
    } finally {
      await this.scraper.cleanup()
    }

    return result
  }

  /**
   * Bulk update events for multiple cities
   */
  async bulkUpdateCities(cities: string[], options: {
    eventsPerCity?: number
    categories?: string[]
    delayBetweenCities?: number
  } = {}): Promise<Record<string, any>> {
    const results: Record<string, any> = {}
    
    await this.scraper.initialize()

    try {
      for (const cityName of cities) {
        console.log(`Processing ${cityName}...`)
        
        try {
          const result = await this.scrapeAndSaveEvents(cityName, {
            limit: options.eventsPerCity || 50,
            categories: options.categories,
            updateExisting: true
          })
          
          results[cityName] = result

          // Rate limiting between cities
          if (options.delayBetweenCities) {
            await new Promise(resolve => 
              setTimeout(resolve, options.delayBetweenCities)
            )
          }

        } catch (error) {
          results[cityName] = { error: error.message }
        }
      }
    } finally {
      await this.scraper.cleanup()
    }

    return results
  }

  /**
   * Scheduled event refresh for active cities
   */
  async refreshActiveCities(): Promise<void> {
    try {
      // Get active cities from database
      const { data: cities, error } = await this.supabase
        .from('cities')
        .select('name, slug')
        .eq('is_active', true)

      if (error) throw error

      console.log(`Refreshing events for ${cities.length} active cities`)

      for (const city of cities) {
        try {
          await this.scrapeAndSaveEvents(city.name, {
            limit: 100,
            updateExisting: true
          })

          // Longer delay between cities for scheduled updates
          await new Promise(resolve => setTimeout(resolve, 10000))

        } catch (error) {
          console.error(`Failed to refresh ${city.name}:`, error)
        }
      }

    } catch (error) {
      console.error('Refresh active cities failed:', error)
      throw error
    }
  }

  /**
   * Get trending events by scraping and analyzing
   */
  async getTrendingEvents(cityName: string): Promise<Event[]> {
    await this.scraper.initialize()

    try {
      const result = await this.scraper.scrapeEvents({
        city: cityName,
        limit: 200
      })

      // Sort by hotness score
      const trendingEvents = result.events
        .map(event => ({
          ...this.scraper.normalizeToSceneScoutEvent(event),
          hotness_score: this.calculateHotnessScore(event)
        }))
        .sort((a, b) => (b.hotness_score || 0) - (a.hotness_score || 0))
        .slice(0, 20) // Top 20 trending events

      return trendingEvents as Event[]

    } finally {
      await this.scraper.cleanup()
    }
  }

  // Private helper methods

  private async getCityByName(name: string): Promise<City | null> {
    const { data, error } = await this.supabase
      .from('cities')
      .select('*')
      .ilike('name', `%${name.split(',')[0].trim()}%`)
      .single()

    if (error) {
      console.warn(`City lookup error for "${name}":`, error)
      return null
    }

    return data
  }

  private async findExistingEvent(externalId: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('id')
      .eq('external_id', externalId)
      .single()

    if (error) return null
    return data
  }

  private async saveEvent(eventData: Partial<Event>): Promise<void> {
    const { error } = await this.supabase
      .from('events')
      .insert(eventData)

    if (error) {
      throw new Error(`Failed to save event: ${error.message}`)
    }
  }

  private async updateEvent(id: string, eventData: Partial<Event>): Promise<void> {
    const { error } = await this.supabase
      .from('events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`)
    }
  }

  private calculateHotnessScore(event: any): number {
    let score = 0

    // Base score
    score += 10

    // Price factor
    if (event.price.isFree) {
      score += 25
    } else if (event.price.min && event.price.min < 30) {
      score += 15
    }

    // Date proximity factor
    const eventDate = new Date(event.date)
    const now = new Date()
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 3) {
      score += 20
    } else if (daysUntil <= 7) {
      score += 15
    } else if (daysUntil <= 14) {
      score += 10
    }

    // Category bonus
    if (['music', 'arts', 'food'].includes(event.category || '')) {
      score += 10
    }

    // Image bonus
    if (event.imageUrls.length > 0) {
      score += 5
    }

    // Weekend bonus
    const dayOfWeek = eventDate.getDay()
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
      score += 10
    }

    return Math.min(score, 100)
  }
}

/**
 * Next.js API route handlers
 */
export class EventbriteAPIHandlers {
  private service = new EventbriteScrapingService()

  /**
   * API handler for manual event scraping
   */
  async handleScrapeRequest(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const { city, categories, limit } = req.body

      if (!city) {
        return res.status(400).json({ error: 'City is required' })
      }

      const result = await this.service.scrapeAndSaveEvents(city, {
        categories,
        limit: Math.min(limit || 50, 200), // Cap at 200
        updateExisting: true
      })

      res.status(200).json({
        success: true,
        message: `Scraped ${result.saved + result.updated} events for ${city}`,
        data: result
      })

    } catch (error) {
      console.error('Scrape API error:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * API handler for bulk city updates
   */
  async handleBulkUpdate(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const { cities, eventsPerCity, categories } = req.body

      if (!cities || !Array.isArray(cities)) {
        return res.status(400).json({ error: 'Cities array is required' })
      }

      const results = await this.service.bulkUpdateCities(cities, {
        eventsPerCity: Math.min(eventsPerCity || 25, 100),
        categories,
        delayBetweenCities: 5000
      })

      res.status(200).json({
        success: true,
        message: `Bulk update completed for ${cities.length} cities`,
        data: results
      })

    } catch (error) {
      console.error('Bulk update API error:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * API handler for trending events
   */
  async handleTrendingEvents(req: any, res: any) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const { city } = req.query

      if (!city) {
        return res.status(400).json({ error: 'City parameter is required' })
      }

      const events = await this.service.getTrendingEvents(city as string)

      res.status(200).json({
        success: true,
        data: events,
        message: `Found ${events.length} trending events`
      })

    } catch (error) {
      console.error('Trending events API error:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

/**
 * Scheduled job functions for cron/background processing
 */
export class EventbriteScheduledJobs {
  private service = new EventbriteScrapingService({
    rateLimitDelay: 5000, // More conservative for scheduled jobs
    maxRetries: 5
  })

  /**
   * Daily refresh of all active cities
   */
  async dailyRefresh(): Promise<void> {
    console.log('Starting daily Eventbrite refresh...')
    
    try {
      await this.service.refreshActiveCities()
      console.log('Daily refresh completed successfully')
    } catch (error) {
      console.error('Daily refresh failed:', error)
      // You might want to send alerts here
    }
  }

  /**
   * Weekly deep sync with more comprehensive data
   */
  async weeklySync(): Promise<void> {
    console.log('Starting weekly Eventbrite sync...')

    try {
      // Get all active cities
      const supabase = createClientComponentClient()
      const { data: cities } = await supabase
        .from('cities')
        .select('name')
        .eq('is_active', true)

      if (cities) {
        const results = await this.service.bulkUpdateCities(
          cities.map(c => c.name),
          {
            eventsPerCity: 200,
            delayBetweenCities: 10000
          }
        )

        console.log('Weekly sync completed:', results)
      }

    } catch (error) {
      console.error('Weekly sync failed:', error)
    }
  }
}

// Export convenience instances
export const eventbriteService = new EventbriteScrapingService()
export const eventbriteAPI = new EventbriteAPIHandlers()
export const eventbriteJobs = new EventbriteScheduledJobs()

export default EventbriteScrapingService