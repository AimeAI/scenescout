/**
 * Base scraper interface and abstract implementation
 * Provides the foundation for all scrapers in the SceneScout system
 */

import { Browser, BrowserContext, Page } from 'playwright'
import { 
  ScraperConfig, 
  ScrapeTarget, 
  RawScrapedData, 
  ScrapingSession, 
  ScrapingError,
  RateLimitState,
  BrowserSession,
  ScrapingMetrics,
  DataQualityReport
} from '../types'

/**
 * Core interface that all scrapers must implement
 */
export interface IScraper {
  readonly name: string
  readonly config: ScraperConfig
  readonly isActive: boolean
  
  // Lifecycle methods
  initialize(): Promise<void>
  destroy(): Promise<void>
  
  // Core scraping functionality
  scrape(target: ScrapeTarget, session?: ScrapingSession): Promise<RawScrapedData>
  validateTarget(target: ScrapeTarget): Promise<boolean>
  
  // Browser management
  createBrowserSession(): Promise<BrowserSession>
  destroyBrowserSession(sessionId: string): Promise<void>
  
  // Error handling and recovery
  handleError(error: ScrapingError, context: any): Promise<boolean>
  shouldRetry(error: ScrapingError): boolean
  
  // Monitoring and metrics
  getMetrics(): Promise<ScrapingMetrics[]>
  getHealthStatus(): Promise<{ healthy: boolean; issues: string[] }>
}

/**
 * Abstract base scraper class with common functionality
 */
export abstract class BaseScraper implements IScraper {
  public readonly name: string
  public readonly config: ScraperConfig
  
  protected browser: Browser | null = null
  protected contexts: Map<string, BrowserContext> = new Map()
  protected pages: Map<string, Page> = new Map()
  protected rateLimitState: RateLimitState
  protected metrics: ScrapingMetrics[] = []
  protected isInitialized = false
  
  constructor(name: string, config: ScraperConfig) {
    this.name = name
    this.config = config
    this.rateLimitState = {
      requestCount: 0,
      windowStart: new Date(),
      isLimited: false,
      remainingRequests: config.rateLimit.requestsPerMinute
    }
  }
  
  get isActive(): boolean {
    return this.isInitialized && this.browser !== null
  }
  
  /**
   * Initialize the scraper and browser instance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }
    
    try {
      this.browser = await this.createBrowser()
      this.isInitialized = true
      await this.logInfo('Scraper initialized successfully')
    } catch (error) {
      await this.logError('Failed to initialize scraper', error)
      throw error
    }
  }
  
  /**
   * Clean up resources and close browser
   */
  async destroy(): Promise<void> {
    try {
      // Close all pages
      for (const [pageId, page] of this.pages) {
        try {
          if (!page.isClosed()) {
            await page.close()
          }
        } catch (error) {
          await this.logWarning(`Failed to close page ${pageId}`, error)
        }
      }
      this.pages.clear()
      
      // Close all contexts
      for (const [contextId, context] of this.contexts) {
        try {
          await context.close()
        } catch (error) {
          await this.logWarning(`Failed to close context ${contextId}`, error)
        }
      }
      this.contexts.clear()
      
      // Close browser
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      
      this.isInitialized = false
      await this.logInfo('Scraper destroyed successfully')
    } catch (error) {
      await this.logError('Error during scraper destruction', error)
      throw error
    }
  }
  
  /**
   * Main scraping method - to be implemented by specific scrapers
   */
  abstract scrape(target: ScrapeTarget, session?: ScrapingSession): Promise<RawScrapedData>
  
  /**
   * Validate that a target is properly configured and accessible
   */
  async validateTarget(target: ScrapeTarget): Promise<boolean> {
    try {
      const response = await fetch(target.baseUrl, {
        method: 'HEAD',
        headers: target.customHeaders || {}
      })
      
      if (!response.ok) {
        await this.logWarning(`Target validation failed for ${target.name}`, {
          status: response.status,
          statusText: response.statusText
        })
        return false
      }
      
      return true
    } catch (error) {
      await this.logError(`Target validation error for ${target.name}`, error)
      return false
    }
  }
  
  /**
   * Create a new browser session with proper configuration
   */
  async createBrowserSession(): Promise<BrowserSession> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }
    
    const sessionId = this.generateSessionId()
    const userAgent = await this.getUserAgent()
    
    const context = await this.browser.newContext({
      viewport: this.config.browser.viewport,
      userAgent,
      locale: this.config.browser.locale,
      timezoneId: this.config.browser.timezone,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    })
    
    if (this.config.useStealthMode) {
      await this.applyStealthMode(context)
    }
    
    const page = await context.newPage()
    
    // Set up request interception for monitoring
    await this.setupRequestInterception(page)
    
    const browserId = this.browser.version()
    const contextId = context.toString()
    const pageId = page.toString()
    
    this.contexts.set(sessionId, context)
    this.pages.set(sessionId, page)
    
    const session: BrowserSession = {
      id: sessionId,
      browserId,
      contextId,
      pageId,
      isActive: true,
      createdAt: new Date(),
      lastUsed: new Date(),
      userAgent,
      viewport: this.config.browser.viewport,
      cookies: [],
      localStorage: {},
      sessionStorage: {}
    }
    
    await this.logInfo(`Created browser session ${sessionId}`)
    return session
  }
  
  /**
   * Destroy a browser session and clean up resources
   */
  async destroyBrowserSession(sessionId: string): Promise<void> {
    try {
      const page = this.pages.get(sessionId)
      const context = this.contexts.get(sessionId)
      
      if (page && !page.isClosed()) {
        await page.close()
      }
      
      if (context) {
        await context.close()
      }
      
      this.pages.delete(sessionId)
      this.contexts.delete(sessionId)
      
      await this.logInfo(`Destroyed browser session ${sessionId}`)
    } catch (error) {
      await this.logError(`Failed to destroy session ${sessionId}`, error)
      throw error
    }
  }
  
  /**
   * Handle scraping errors with appropriate recovery strategies
   */
  async handleError(error: ScrapingError, context: any): Promise<boolean> {
    await this.logError(`Scraping error: ${error.type}`, {
      message: error.message,
      severity: error.severity,
      context
    })
    
    switch (error.type) {
      case 'rate_limit':
        await this.handleRateLimit(error)
        return true
        
      case 'blocked':
        await this.handleBlocked(error, context)
        return true
        
      case 'timeout':
        return error.retryable && error.retryCount < this.config.retry.maxRetries
        
      case 'captcha':
        await this.handleCaptcha(error, context)
        return false // Usually requires manual intervention
        
      case 'network':
        return error.retryable && error.retryCount < this.config.retry.maxRetries
        
      default:
        return false
    }
  }
  
  /**
   * Determine if an error should trigger a retry
   */
  shouldRetry(error: ScrapingError): boolean {
    if (!error.retryable || error.retryCount >= this.config.retry.maxRetries) {
      return false
    }
    
    const retryableTypes = ['network', 'timeout', 'rate_limit']
    return retryableTypes.includes(error.type)
  }
  
  /**
   * Get scraping metrics for monitoring
   */
  async getMetrics(): Promise<ScrapingMetrics[]> {
    return [...this.metrics]
  }
  
  /**
   * Check the health status of the scraper
   */
  async getHealthStatus(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = []
    
    if (!this.isInitialized) {
      issues.push('Scraper not initialized')
    }
    
    if (!this.browser || !this.browser.isConnected()) {
      issues.push('Browser not connected')
    }
    
    if (this.rateLimitState.isLimited) {
      issues.push('Rate limited')
    }
    
    const activeContexts = this.contexts.size
    const maxContexts = 10 // Configurable limit
    
    if (activeContexts > maxContexts) {
      issues.push(`Too many active contexts: ${activeContexts}`)
    }
    
    return {
      healthy: issues.length === 0,
      issues
    }
  }
  
  // Protected helper methods
  
  /**
   * Create and configure browser instance
   */
  protected abstract createBrowser(): Promise<Browser>
  
  /**
   * Get user agent for requests (rotating if configured)
   */
  protected abstract getUserAgent(): Promise<string>
  
  /**
   * Apply stealth mode configurations to avoid detection
   */
  protected async applyStealthMode(context: BrowserContext): Promise<void> {
    // Remove webdriver property
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })
    
    // Override plugins length
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      })
    })
    
    // Override languages
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      })
    })
  }
  
  /**
   * Set up request interception for monitoring and control
   */
  protected async setupRequestInterception(page: Page): Promise<void> {
    await page.route('**/*', async (route) => {
      const request = route.request()
      
      // Block unnecessary resources to speed up scraping
      const resourceType = request.resourceType()
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        await route.abort()
        return
      }
      
      // Apply rate limiting
      if (await this.isRateLimited()) {
        await this.waitForRateLimit()
      }
      
      await route.continue()
    })
    
    // Monitor responses
    page.on('response', async (response) => {
      const status = response.status()
      const url = response.url()
      
      if (status === 429) {
        await this.handleRateLimitResponse(response)
      } else if (status >= 400) {
        await this.logWarning(`HTTP error ${status} for ${url}`)
      }
    })
  }
  
  /**
   * Check if we're currently rate limited
   */
  protected async isRateLimited(): Promise<boolean> {
    const now = new Date()
    const windowMs = 60 * 1000 // 1 minute window
    
    // Reset window if needed
    if (now.getTime() - this.rateLimitState.windowStart.getTime() > windowMs) {
      this.rateLimitState.requestCount = 0
      this.rateLimitState.windowStart = now
      this.rateLimitState.isLimited = false
    }
    
    this.rateLimitState.requestCount++
    
    if (this.rateLimitState.requestCount > this.config.rateLimit.requestsPerMinute) {
      this.rateLimitState.isLimited = true
      this.rateLimitState.resetTime = new Date(now.getTime() + windowMs)
    }
    
    return this.rateLimitState.isLimited
  }
  
  /**
   * Wait for rate limit to reset
   */
  protected async waitForRateLimit(): Promise<void> {
    if (!this.rateLimitState.resetTime) {
      return
    }
    
    const waitTime = this.rateLimitState.resetTime.getTime() - Date.now()
    if (waitTime > 0) {
      await this.logInfo(`Rate limited, waiting ${waitTime}ms`)
      await this.delay(waitTime)
    }
  }
  
  /**
   * Handle rate limit errors
   */
  protected async handleRateLimit(error: ScrapingError): Promise<void> {
    const delay = Math.min(
      this.config.retry.baseDelay * Math.pow(this.config.retry.backoffMultiplier, error.retryCount),
      this.config.retry.maxDelay
    )
    
    await this.logInfo(`Rate limit hit, backing off for ${delay}ms`)
    await this.delay(delay)
  }
  
  /**
   * Handle being blocked by the target site
   */
  protected async handleBlocked(error: ScrapingError, context: any): Promise<void> {
    await this.logWarning('Detected blocking, rotating session')
    
    // Destroy current session and create new one
    if (context.sessionId) {
      await this.destroyBrowserSession(context.sessionId)
    }
    
    // Wait before creating new session
    await this.delay(this.config.retry.baseDelay * 2)
  }
  
  /**
   * Handle CAPTCHA detection
   */
  protected async handleCaptcha(error: ScrapingError, context: any): Promise<void> {
    await this.logError('CAPTCHA detected - manual intervention required', {
      url: error.url,
      context
    })
    
    // Could integrate with CAPTCHA solving services here
    // For now, just log and fail
  }
  
  /**
   * Handle rate limit response from server
   */
  protected async handleRateLimitResponse(response: any): Promise<void> {
    const retryAfter = response.headers()['retry-after']
    if (retryAfter) {
      const delayMs = parseInt(retryAfter) * 1000
      this.rateLimitState.resetTime = new Date(Date.now() + delayMs)
      this.rateLimitState.isLimited = true
    }
  }
  
  /**
   * Generate unique session ID
   */
  protected generateSessionId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Delay execution for specified milliseconds
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Logging methods (to be implemented by specific scrapers)
  protected abstract logInfo(message: string, data?: any): Promise<void>
  protected abstract logWarning(message: string, data?: any): Promise<void>
  protected abstract logError(message: string, error?: any): Promise<void>
}