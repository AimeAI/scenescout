/**
 * Main export file for SceneScout scraping infrastructure
 * Provides a unified interface for all scraping functionality
 */

// Core types and interfaces
export * from './types'
export * from './interfaces/base-scraper'

// Configuration
export * from './config/playwright-config'
export * from './config/targets'

// Utilities
export * from './utils/normalization'
export * from './utils/error-handler'
export * from './utils/logger'

// Scrapers
export * from './scrapers/eventbrite-scraper'

// Factories and managers
export * from './factories/scraper-factory'

// Main scraping orchestrator class
import { ScraperFactory, ScraperManager } from './factories/scraper-factory'
import { DataNormalizer } from './utils/normalization'
import { ScrapingLogger, defaultLogger } from './utils/logger'
import { 
  ScrapeJobConfig, 
  ScrapeTarget, 
  RawScrapedData, 
  NormalizedEvent, 
  NormalizedVenue,
  ScrapingSession,
  HealthCheck,
  ScrapingMetrics
} from './types'
import { getTargetConfig, getTargetsForLocation, getTargetsForCategory } from './config/targets'

/**
 * Main orchestrator class for the SceneScout scraping system
 */
export class SceneScoutScraper {
  private factory: ScraperFactory
  private manager: ScraperManager
  private normalizer: DataNormalizer
  private logger: ScrapingLogger
  
  constructor(logger?: ScrapingLogger) {
    this.factory = ScraperFactory.getInstance()
    this.manager = new ScraperManager()
    this.normalizer = new DataNormalizer()
    this.logger = logger || defaultLogger
  }
  
  /**
   * Scrape events for a specific location
   */
  async scrapeLocation(
    location: string,
    options: {
      sources?: string[]
      categories?: string[]
      maxPages?: number
      customTargets?: ScrapeTarget[]
    } = {}
  ): Promise<{
    events: NormalizedEvent[]
    venues: NormalizedVenue[]
    sessions: ScrapingSession[]
    errors: any[]
  }> {
    this.logger.info('scraper', `Starting location scrape for ${location}`, { location, options })
    
    const results = {
      events: [] as NormalizedEvent[],
      venues: [] as NormalizedVenue[],
      sessions: [] as ScrapingSession[],
      errors: [] as any[]
    }
    
    try {
      // Get targets for location
      let targets = options.customTargets || getTargetsForLocation(location)
      
      // Filter by sources if specified
      if (options.sources && options.sources.length > 0) {
        targets = targets.filter(target => options.sources!.includes(target.source))
      }
      
      // Add category-specific targets
      if (options.categories && options.categories.length > 0) {
        for (const category of options.categories) {
          const categoryTargets = getTargetsForCategory(category)
          targets.push(...categoryTargets.map(target => ({
            ...target,
            baseUrl: target.baseUrl.replace('{{location}}', location)
          })))
        }
      }
      
      // Limit pages if specified
      if (options.maxPages) {
        targets = targets.map(target => ({
          ...target,
          pagination: target.pagination ? {
            ...target.pagination,
            maxPages: Math.min(target.pagination.maxPages, options.maxPages!)
          } : undefined
        }))
      }
      
      this.logger.info('scraper', `Found ${targets.length} targets for location`, { 
        location, 
        targetCount: targets.length,
        sources: targets.map(t => t.source)
      })
      
      // Create job configuration
      const jobConfig: ScrapeJobConfig = {
        id: `location_${location}_${Date.now()}`,
        name: `Location scrape: ${location}`,
        targets,
        filters: {
          location: { city: location }
        },
        output: { format: 'database' },
        notifications: {
          onSuccess: false,
          onError: true,
          onCompletion: true,
          channels: [],
          recipients: []
        }
      }
      
      // Execute scraping job
      const rawResults = await this.manager.executeScrapeJob(jobConfig)
      
      // Normalize results
      for (const rawData of rawResults) {
        // Normalize events
        for (const rawEvent of rawData.events) {
          try {
            const normalizedEvent = await this.normalizer.normalizeEvent(
              rawEvent,
              rawData.source,
              'America/New_York' // Default timezone, should be determined by location
            )
            
            if (normalizedEvent) {
              results.events.push(normalizedEvent)
            }
          } catch (error) {
            this.logger.error('normalization', 'Failed to normalize event', error, {
              sessionId: rawData.scrapeId,
              targetId: rawData.sourceUrl
            })
            results.errors.push({ type: 'normalization', event: rawEvent, error })
          }
        }
        
        // Normalize venues
        for (const rawVenue of rawData.venues) {
          try {
            const normalizedVenue = await this.normalizer.normalizeVenue(rawVenue, rawData.source)
            
            if (normalizedVenue) {
              results.venues.push(normalizedVenue)
            }
          } catch (error) {
            this.logger.error('normalization', 'Failed to normalize venue', error, {
              sessionId: rawData.scrapeId,
              targetId: rawData.sourceUrl
            })
            results.errors.push({ type: 'normalization', venue: rawVenue, error })
          }
        }
        
        // Collect errors
        results.errors.push(...rawData.errors)
      }
      
      // Get session information
      results.sessions = this.manager.getActiveSessions().filter(
        session => session.jobId === jobConfig.id
      )
      
      this.logger.info('scraper', 'Location scrape completed', {
        location,
        eventsFound: results.events.length,
        venuesFound: results.venues.length,
        errorsCount: results.errors.length,
        sessionsCount: results.sessions.length
      })
      
    } catch (error) {
      this.logger.error('scraper', 'Location scrape failed', error, { location })
      results.errors.push({ type: 'system', error })
    }
    
    return results
  }
  
  /**
   * Scrape events from a specific source
   */
  async scrapeSource(
    source: string,
    location?: string,
    category?: string
  ): Promise<RawScrapedData | null> {
    this.logger.info('scraper', `Starting source scrape`, { source, location, category })
    
    try {
      const target = getTargetConfig(source, location, category)
      
      if (!target) {
        this.logger.error('scraper', `No target configuration found for source`, undefined, { source })
        return null
      }
      
      const scraper = await this.factory.createScraper(target.source as any)
      const result = await scraper.scrape(target)
      
      await this.factory.destroyScraper(scraper.name)
      
      this.logger.info('scraper', 'Source scrape completed', {
        source,
        eventsFound: result.events.length,
        venuesFound: result.venues.length,
        errorsCount: result.errors.length
      })
      
      return result
      
    } catch (error) {
      this.logger.error('scraper', 'Source scrape failed', error, { source })
      return null
    }
  }
  
  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<HealthCheck> {
    return await this.factory.getHealthStatus()
  }
  
  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<{
    overall: ScrapingMetrics
    bySource: Record<string, ScrapingMetrics[]>
  }> {
    return await this.factory.getPerformanceMetrics()
  }
  
  /**
   * Get active scraping sessions
   */
  getActiveSessions(): ScrapingSession[] {
    return this.manager.getActiveSessions()
  }
  
  /**
   * Cancel a scraping session
   */
  async cancelSession(sessionId: string): Promise<void> {
    await this.manager.cancelSession(sessionId)
  }
  
  /**
   * Clean up old sessions and resources
   */
  async cleanup(olderThanHours = 24): Promise<void> {
    this.manager.cleanupSessions(olderThanHours)
    // Note: In production, this would also clean up browser instances,
    // temporary files, and other resources
  }
  
  /**
   * Validate target configuration
   */
  validateTarget(target: ScrapeTarget): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    // Import validation function
    const { validateTarget } = require('./config/targets')
    return validateTarget(target)
  }
  
  /**
   * Get available sources
   */
  getAvailableSources(): Array<{
    source: string
    description: string
    capabilities: string[]
  }> {
    return this.factory.getAvailableSources()
  }
  
  /**
   * Destroy all resources
   */
  async destroy(): Promise<void> {
    await this.factory.destroyAllScrapers()
    this.logger.info('scraper', 'SceneScout scraper destroyed')
  }
}

/**
 * Create a new scraper instance
 */
export function createScraper(logger?: ScrapingLogger): SceneScoutScraper {
  return new SceneScoutScraper(logger)
}

/**
 * Default scraper instance
 */
export const defaultScraper = new SceneScoutScraper()

/**
 * Quick utility functions for common operations
 */
export const ScrapingUtils = {
  /**
   * Quick scrape for a city
   */
  async scrapeCity(city: string, sources?: string[]): Promise<{
    events: NormalizedEvent[]
    venues: NormalizedVenue[]
  }> {
    const scraper = createScraper()
    try {
      const result = await scraper.scrapeLocation(city, { sources })
      return {
        events: result.events,
        venues: result.venues
      }
    } finally {
      await scraper.destroy()
    }
  },
  
  /**
   * Quick health check
   */
  async healthCheck(): Promise<HealthCheck> {
    const scraper = createScraper()
    try {
      return await scraper.getHealthStatus()
    } finally {
      await scraper.destroy()
    }
  },
  
  /**
   * Get available targets for location
   */
  getLocationTargets: getTargetsForLocation,
  
  /**
   * Get category targets
   */
  getCategoryTargets: getTargetsForCategory,
  
  /**
   * Get target config
   */
  getTargetConfig
}

// Re-export commonly used types for convenience
export type {
  ScrapeJobConfig,
  ScrapeTarget,
  RawScrapedData,
  RawEventData,
  RawVenueData,
  NormalizedEvent,
  NormalizedVenue,
  ScrapingSession,
  ScrapingError,
  ScrapingMetrics,
  HealthCheck,
  ScraperConfig
} from './types'