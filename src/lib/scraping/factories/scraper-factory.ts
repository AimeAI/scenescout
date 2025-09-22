/**
 * Scraper factory for creating and managing different scraper instances
 * Provides a unified interface for all scrapers in the SceneScout system
 */

import { IScraper } from '../interfaces/base-scraper'
import { EventbriteScraper } from '../scrapers/eventbrite-scraper'
import { 
  ScraperConfig, 
  ScrapeSource, 
  ScrapeTarget,
  ScrapeJobConfig,
  ScrapingSession,
  RawScrapedData,
  ScrapingMetrics,
  HealthCheck
} from '../types'
import { DEFAULT_SCRAPER_CONFIG } from '../config/playwright-config'

/**
 * Registry of all available scrapers
 */
interface ScraperRegistry {
  [key: string]: {
    scraperClass: new (config: ScraperConfig) => IScraper
    defaultConfig: Partial<ScraperConfig>
    description: string
    capabilities: string[]
  }
}

/**
 * Factory for creating and managing scrapers
 */
export class ScraperFactory {
  private static instance: ScraperFactory
  private scrapers: Map<string, IScraper> = new Map()
  private registry: ScraperRegistry = {}
  
  private constructor() {
    this.registerDefaultScrapers()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): ScraperFactory {
    if (!ScraperFactory.instance) {
      ScraperFactory.instance = new ScraperFactory()
    }
    return ScraperFactory.instance
  }
  
  /**
   * Register default scrapers
   */
  private registerDefaultScrapers(): void {
    this.registerScraper('eventbrite', {
      scraperClass: EventbriteScraper,
      defaultConfig: {
        rateLimit: {
          requestsPerMinute: 30,
          burstLimit: 5,
          delayBetweenRequests: 2000
        },
        browser: {
          headless: true,
          viewport: { width: 1920, height: 1080 },
          userAgent: null,
          locale: 'en-US',
          timezone: 'America/New_York'
        }
      },
      description: 'Scrapes events from Eventbrite event listing pages',
      capabilities: ['events', 'venues', 'organizers', 'pagination', 'details']
    })
    
    // Future scrapers would be registered here
    // this.registerScraper('facebook', { ... })
    // this.registerScraper('meetup', { ... })
  }
  
  /**
   * Register a new scraper type
   */
  registerScraper(
    name: string,
    config: {
      scraperClass: new (config: ScraperConfig) => IScraper
      defaultConfig: Partial<ScraperConfig>
      description: string
      capabilities: string[]
    }
  ): void {
    this.registry[name] = config
  }
  
  /**
   * Create a scraper instance
   */
  async createScraper(
    source: ScrapeSource,
    customConfig?: Partial<ScraperConfig>
  ): Promise<IScraper> {
    const scraperInfo = this.registry[source]
    
    if (!scraperInfo) {
      throw new Error(`Scraper not found for source: ${source}`)
    }
    
    // Merge default config with custom config
    const config: ScraperConfig = {
      ...DEFAULT_SCRAPER_CONFIG,
      ...scraperInfo.defaultConfig,
      ...customConfig,
      name: source
    }
    
    const scraper = new scraperInfo.scraperClass(config)
    
    // Initialize the scraper
    await scraper.initialize()
    
    // Store in active scrapers
    const scraperId = `${source}_${Date.now()}`
    this.scrapers.set(scraperId, scraper)
    
    return scraper
  }
  
  /**
   * Get an existing scraper instance
   */
  getScraper(scraperId: string): IScraper | undefined {
    return this.scrapers.get(scraperId)
  }
  
  /**
   * Get all active scrapers
   */
  getActiveScrapers(): Map<string, IScraper> {
    return new Map(this.scrapers)
  }
  
  /**
   * Destroy a scraper instance
   */
  async destroyScraper(scraperId: string): Promise<void> {
    const scraper = this.scrapers.get(scraperId)
    
    if (scraper) {
      await scraper.destroy()
      this.scrapers.delete(scraperId)
    }
  }
  
  /**
   * Destroy all scraper instances
   */
  async destroyAllScrapers(): Promise<void> {
    const destroyPromises = Array.from(this.scrapers.entries()).map(
      async ([scraperId, scraper]) => {
        try {
          await scraper.destroy()
        } catch (error) {
          console.error(`Error destroying scraper ${scraperId}:`, error)
        }
      }
    )
    
    await Promise.all(destroyPromises)
    this.scrapers.clear()
  }
  
  /**
   * Get available scraper sources
   */
  getAvailableSources(): Array<{
    source: ScrapeSource
    description: string
    capabilities: string[]
  }> {
    return Object.entries(this.registry).map(([source, info]) => ({
      source: source as ScrapeSource,
      description: info.description,
      capabilities: info.capabilities
    }))
  }
  
  /**
   * Validate scraper configuration
   */
  validateConfig(source: ScrapeSource, config: Partial<ScraperConfig>): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    const scraperInfo = this.registry[source]
    if (!scraperInfo) {
      errors.push(`Unknown scraper source: ${source}`)
      return { isValid: false, errors, warnings }
    }
    
    // Validate rate limiting
    if (config.rateLimit) {
      if (config.rateLimit.requestsPerMinute < 1) {
        errors.push('Rate limit requests per minute must be at least 1')
      }
      
      if (config.rateLimit.requestsPerMinute > 100) {
        warnings.push('High rate limit may cause blocking - consider reducing')
      }
      
      if (config.rateLimit.delayBetweenRequests < 1000) {
        warnings.push('Very low delay between requests may cause rate limiting')
      }
    }
    
    // Validate timeouts
    if (config.timeout) {
      if (config.timeout.navigationTimeout < 5000) {
        warnings.push('Low navigation timeout may cause failures on slow sites')
      }
      
      if (config.timeout.navigationTimeout > 60000) {
        warnings.push('Very high navigation timeout may slow down scraping')
      }
    }
    
    // Validate retry configuration
    if (config.retry) {
      if (config.retry.maxRetries > 10) {
        warnings.push('High retry count may cause excessive delays')
      }
      
      if (config.retry.baseDelay < 500) {
        warnings.push('Very low base delay may not be effective for recovery')
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings }
  }
  
  /**
   * Get health status of all active scrapers
   */
  async getHealthStatus(): Promise<HealthCheck> {
    const healthChecks = await Promise.all(
      Array.from(this.scrapers.values()).map(scraper => scraper.getHealthStatus())
    )
    
    const allHealthy = healthChecks.every(check => check.healthy)
    const allIssues = healthChecks.flatMap(check => check.issues)
    
    return {
      timestamp: new Date(),
      status: allHealthy ? 'healthy' : (allIssues.length > 5 ? 'unhealthy' : 'degraded'),
      services: {
        browser: healthChecks.some(check => !check.issues.includes('Browser not connected')),
        network: healthChecks.some(check => !check.issues.includes('Network connectivity issues')),
        database: true, // Would check database connectivity
        storage: true   // Would check storage availability
      },
      metrics: {
        activeSessions: this.scrapers.size,
        queueLength: 0, // Would get from job queue
        errorRate: 0,   // Would calculate from recent errors
        avgResponseTime: 0 // Would calculate from recent requests
      },
      issues: Array.from(new Set(allIssues))
    }
  }
  
  /**
   * Get performance metrics from all scrapers
   */
  async getPerformanceMetrics(): Promise<{
    overall: ScrapingMetrics
    bySource: Record<string, ScrapingMetrics[]>
  }> {
    const allMetrics: ScrapingMetrics[] = []
    const bySource: Record<string, ScrapingMetrics[]> = {}
    
    for (const [scraperId, scraper] of this.scrapers) {
      const metrics = await scraper.getMetrics()
      allMetrics.push(...metrics)
      
      const source = scraper.name
      if (!bySource[source]) {
        bySource[source] = []
      }
      bySource[source].push(...metrics)
    }
    
    // Calculate overall metrics
    const overall: ScrapingMetrics = {
      sessionId: 'overall',
      target: 'all',
      startTime: new Date(),
      status: 'completed',
      eventsScraped: allMetrics.reduce((sum, m) => sum + m.eventsScraped, 0),
      venuesScraped: allMetrics.reduce((sum, m) => sum + m.venuesScraped, 0),
      errorsCount: allMetrics.reduce((sum, m) => sum + m.errorsCount, 0),
      avgResponseTime: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / allMetrics.length
        : 0,
      successRate: allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length
        : 0,
      dataQualityScore: allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.dataQualityScore, 0) / allMetrics.length
        : 0,
      blockedAttempts: allMetrics.reduce((sum, m) => sum + m.blockedAttempts, 0),
      rateLimitHits: allMetrics.reduce((sum, m) => sum + m.rateLimitHits, 0),
      captchaEncounters: allMetrics.reduce((sum, m) => sum + m.captchaEncounters, 0)
    }
    
    return { overall, bySource }
  }
}

/**
 * Scraper manager for handling multiple scraping jobs
 */
export class ScraperManager {
  private factory: ScraperFactory
  private activeSessions: Map<string, ScrapingSession> = new Map()
  private jobQueue: ScrapeJobConfig[] = []
  private isProcessing = false
  
  constructor() {
    this.factory = ScraperFactory.getInstance()
  }
  
  /**
   * Execute a single scraping job
   */
  async executeScrapeJob(jobConfig: ScrapeJobConfig): Promise<RawScrapedData[]> {
    const results: RawScrapedData[] = []
    
    for (const target of jobConfig.targets) {
      try {
        const scraper = await this.factory.createScraper(target.source)
        
        const session: ScrapingSession = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          jobId: jobConfig.id,
          target,
          status: 'running',
          progress: {
            currentPage: 0,
            eventsFound: 0,
            eventsProcessed: 0,
            errorsCount: 0
          },
          startTime: new Date(),
          errors: [],
          metrics: {
            requestCount: 0,
            successRate: 0,
            avgResponseTime: 0,
            dataTransferred: 0
          }
        }
        
        this.activeSessions.set(session.id, session)
        
        const result = await scraper.scrape(target, session)
        results.push(result)
        
        session.status = 'completed'
        session.endTime = new Date()
        session.result = result
        
        await this.factory.destroyScraper(scraper.name)
        
      } catch (error) {
        console.error(`Error executing scrape job for ${target.name}:`, error)
        
        const session = Array.from(this.activeSessions.values())
          .find(s => s.target.id === target.id)
        
        if (session) {
          session.status = 'failed'
          session.endTime = new Date()
          session.errors.push({
            type: 'network',
            severity: 'critical',
            message: `Job execution failed: ${error.message}`,
            details: error,
            timestamp: new Date(),
            retryable: false,
            retryCount: 0
          })
        }
      }
    }
    
    return results
  }
  
  /**
   * Add job to queue
   */
  addJobToQueue(jobConfig: ScrapeJobConfig): void {
    this.jobQueue.push(jobConfig)
  }
  
  /**
   * Process job queue
   */
  async processJobQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) {
      return
    }
    
    this.isProcessing = true
    
    try {
      while (this.jobQueue.length > 0) {
        const job = this.jobQueue.shift()!
        await this.executeScrapeJob(job)
      }
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Get active sessions
   */
  getActiveSessions(): ScrapingSession[] {
    return Array.from(this.activeSessions.values())
  }
  
  /**
   * Get session by ID
   */
  getSession(sessionId: string): ScrapingSession | undefined {
    return this.activeSessions.get(sessionId)
  }
  
  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    
    if (session && session.status === 'running') {
      session.status = 'cancelled'
      session.endTime = new Date()
      
      // Note: In a full implementation, we would also need to cancel
      // the actual scraping operation and clean up resources
    }
  }
  
  /**
   * Clean up completed sessions
   */
  cleanupSessions(olderThanHours = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.endTime && session.endTime < cutoffTime) {
        this.activeSessions.delete(sessionId)
      }
    }
  }
  
  /**
   * Get manager statistics
   */
  getStatistics(): {
    activeSessions: number
    queuedJobs: number
    completedSessions: number
    failedSessions: number
  } {
    const sessions = Array.from(this.activeSessions.values())
    
    return {
      activeSessions: sessions.filter(s => s.status === 'running').length,
      queuedJobs: this.jobQueue.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length
    }
  }
}

// Export singleton instances
export const scraperFactory = ScraperFactory.getInstance()
export const scraperManager = new ScraperManager()