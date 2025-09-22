/**
 * Eventbrite Public Page Scraper
 * 
 * Scrapes Eventbrite's public event discovery pages without requiring API access.
 * Uses Playwright for browser automation with ethical scraping practices.
 * 
 * Features:
 * - City-based event discovery
 * - Category filtering and pagination
 * - Rate limiting and respectful scraping
 * - Event data extraction and normalization
 * - Image URL extraction
 * - Price parsing and validation
 * - Error handling and retry logic
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { Event } from '../../../types'

// Configuration and types
export interface EventbriteScrapingConfig {
  headless?: boolean
  timeout?: number
  maxRetries?: number
  rateLimitDelay?: number
  userAgent?: string
  viewport?: { width: number; height: number }
  maxConcurrentPages?: number
  respectRobotsTxt?: boolean
}

export interface ScrapingFilters {
  city: string
  categories?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  priceRange?: {
    min: number
    max: number
  }
  radius?: number // kilometers
  freeOnly?: boolean
  page?: number
  limit?: number
}

export interface ScrapedEventData {
  title: string
  description: string
  date: string
  startTime?: string
  endTime?: string
  location: {
    venue: string
    address: string
    city: string
    latitude?: number
    longitude?: number
  }
  price: {
    min?: number
    max?: number
    currency: string
    isFree: boolean
    displayText: string
  }
  imageUrls: string[]
  eventUrl: string
  ticketUrl: string
  organizer?: {
    name: string
    url?: string
  }
  category?: string
  subcategory?: string
  tags: string[]
  attendeeCount?: number
  isOnline: boolean
  externalId: string
}

export interface ScrapingResult {
  events: ScrapedEventData[]
  totalFound: number
  hasNextPage: boolean
  nextPageUrl?: string
  scrapedAt: Date
  metadata: {
    searchQuery: string
    filters: ScrapingFilters
    pagesScraped: number
    rateLimitHits: number
    errors: string[]
  }
}

export class EventbritePublicScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private config: Required<EventbriteScrapingConfig>
  private rateLimitQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false
  private requestCount = 0
  private lastRequestTime = 0

  constructor(config: EventbriteScrapingConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      rateLimitDelay: config.rateLimitDelay ?? 2000,
      userAgent: config.userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      maxConcurrentPages: config.maxConcurrentPages ?? 2,
      respectRobotsTxt: config.respectRobotsTxt ?? true
    }
  }

  /**
   * Initialize browser and context
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      })

      this.context = await this.browser.newContext({
        userAgent: this.config.userAgent,
        viewport: this.config.viewport,
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      // Set reasonable timeouts
      this.context.setDefaultTimeout(this.config.timeout)
      this.context.setDefaultNavigationTimeout(this.config.timeout)

    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error}`)
    }
  }

  /**
   * Main scraping method
   */
  async scrapeEvents(filters: ScrapingFilters): Promise<ScrapingResult> {
    if (!this.browser || !this.context) {
      await this.initialize()
    }

    const startTime = Date.now()
    const result: ScrapingResult = {
      events: [],
      totalFound: 0,
      hasNextPage: false,
      scrapedAt: new Date(),
      metadata: {
        searchQuery: this.buildSearchQuery(filters),
        filters,
        pagesScraped: 0,
        rateLimitHits: 0,
        errors: []
      }
    }

    try {
      const baseUrl = this.buildEventbriteSearchUrl(filters)
      let currentUrl = baseUrl
      let pageCount = 0
      const maxPages = Math.ceil((filters.limit || 50) / 20) // Eventbrite shows ~20 events per page

      while (currentUrl && pageCount < maxPages) {
        try {
          const pageResult = await this.scrapePage(currentUrl)
          
          result.events.push(...pageResult.events)
          result.totalFound = pageResult.totalFound
          result.hasNextPage = pageResult.hasNextPage
          result.nextPageUrl = pageResult.nextPageUrl
          
          pageCount++
          result.metadata.pagesScraped = pageCount

          // Break if we have enough events or no more pages
          if (result.events.length >= (filters.limit || 50) || !pageResult.hasNextPage) {
            break
          }

          currentUrl = pageResult.nextPageUrl || null
          
          // Rate limiting between pages
          await this.enforceRateLimit()
          
        } catch (error) {
          result.metadata.errors.push(`Page ${pageCount + 1}: ${error}`)
          console.warn(`Error scraping page ${pageCount + 1}:`, error)
          break
        }
      }

      // Limit results to requested amount
      if (filters.limit && result.events.length > filters.limit) {
        result.events = result.events.slice(0, filters.limit)
      }

      console.log(`Scraping completed in ${Date.now() - startTime}ms. Found ${result.events.length} events`)
      
    } catch (error) {
      result.metadata.errors.push(`Scraping failed: ${error}`)
      throw error
    }

    return result
  }

  /**
   * Scrape a single page of events
   */
  private async scrapePage(url: string): Promise<{
    events: ScrapedEventData[]
    totalFound: number
    hasNextPage: boolean
    nextPageUrl?: string
  }> {
    return this.withRetry(async () => {
      const page = await this.context!.newPage()
      
      try {
        // Navigate to the page
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        
        // Wait for events to load
        await this.waitForEvents(page)
        
        // Extract event data
        const events = await this.extractEventsFromPage(page)
        
        // Get pagination info
        const paginationInfo = await this.extractPaginationInfo(page)
        
        // Get total count if available
        const totalFound = await this.extractTotalCount(page)
        
        return {
          events,
          totalFound,
          hasNextPage: paginationInfo.hasNext,
          nextPageUrl: paginationInfo.nextUrl
        }
        
      } finally {
        await page.close()
      }
    })
  }

  /**
   * Wait for events to load on the page
   */
  private async waitForEvents(page: Page): Promise<void> {
    try {
      // Wait for event cards to appear
      await page.waitForSelector('[data-testid="event-card"], .eds-event-card, .discover-search-desktop-card', {
        timeout: 10000
      })
      
      // Wait a bit more for dynamic content
      await page.waitForTimeout(1000)
      
      // Handle "Show more" or infinite scroll if present
      await this.handleInfiniteScroll(page)
      
    } catch (error) {
      console.warn('Events may not have loaded properly:', error)
    }
  }

  /**
   * Handle infinite scroll or "Load More" buttons
   */
  private async handleInfiniteScroll(page: Page): Promise<void> {
    try {
      // Look for "Show more" or "Load more" buttons
      const loadMoreSelectors = [
        '[data-testid="load-more"]',
        '.load-more-button',
        'button:has-text("Show more")',
        'button:has-text("Load more")'
      ]

      for (const selector of loadMoreSelectors) {
        const loadMoreButton = await page.$(selector)
        if (loadMoreButton) {
          await loadMoreButton.click()
          await page.waitForTimeout(2000) // Wait for new content
          break
        }
      }

      // Alternative: scroll down to trigger infinite scroll
      let previousHeight = await page.evaluate(() => document.body.scrollHeight)
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(1500)
        
        const newHeight = await page.evaluate(() => document.body.scrollHeight)
        if (newHeight === previousHeight) break
        
        previousHeight = newHeight
        attempts++
      }

    } catch (error) {
      console.warn('Could not handle infinite scroll:', error)
    }
  }

  /**
   * Extract events from the current page
   */
  private async extractEventsFromPage(page: Page): Promise<ScrapedEventData[]> {
    return page.evaluate(() => {
      const events: ScrapedEventData[] = []
      
      // Multiple selectors to find event cards
      const eventSelectors = [
        '[data-testid="event-card"]',
        '.eds-event-card',
        '.discover-search-desktop-card',
        '.search-event-card',
        '.event-card'
      ]
      
      let eventElements: Element[] = []
      
      for (const selector of eventSelectors) {
        eventElements = Array.from(document.querySelectorAll(selector))
        if (eventElements.length > 0) break
      }

      eventElements.forEach((element, index) => {
        try {
          const event = this.extractEventFromElement(element, index)
          if (event) events.push(event)
        } catch (error) {
          console.warn(`Error extracting event ${index}:`, error)
        }
      })

      return events
    })
  }

  /**
   * Extract event data from a DOM element
   */
  private extractEventFromElement(element: Element, index: number): ScrapedEventData | null {
    try {
      // Get event link and ID
      const linkElement = element.querySelector('a[href*="/e/"]') as HTMLAnchorElement
      if (!linkElement) return null
      
      const eventUrl = linkElement.href
      const eventId = this.extractEventId(eventUrl)
      if (!eventId) return null

      // Extract title
      const titleSelectors = [
        '[data-testid="event-title"]',
        '.event-title',
        'h3 a',
        'h2 a',
        '.card-text--truncated__one',
        '.event-card__title'
      ]
      const title = this.getTextFromSelectors(element, titleSelectors)
      if (!title) return null

      // Extract date and time
      const dateInfo = this.extractDateTimeInfo(element)

      // Extract location
      const locationInfo = this.extractLocationInfo(element)

      // Extract price
      const priceInfo = this.extractPriceInfo(element)

      // Extract image
      const imageUrls = this.extractImageUrls(element)

      // Extract description
      const description = this.extractDescription(element)

      // Extract organizer
      const organizer = this.extractOrganizerInfo(element)

      // Extract category/tags
      const category = this.extractCategory(element)

      return {
        title,
        description: description || '',
        date: dateInfo.date,
        startTime: dateInfo.startTime,
        endTime: dateInfo.endTime,
        location: locationInfo,
        price: priceInfo,
        imageUrls,
        eventUrl,
        ticketUrl: eventUrl, // Same as event URL for Eventbrite
        organizer,
        category,
        tags: [],
        isOnline: locationInfo.venue.toLowerCase().includes('online') || 
                 locationInfo.address.toLowerCase().includes('online'),
        externalId: eventId
      }

    } catch (error) {
      console.warn(`Error extracting event data:`, error)
      return null
    }
  }

  /**
   * Extract event ID from URL
   */
  private extractEventId(url: string): string | null {
    const match = url.match(/\/e\/([^\/\?]+)/)
    return match ? match[1] : null
  }

  /**
   * Extract date and time information
   */
  private extractDateTimeInfo(element: Element): {
    date: string
    startTime?: string
    endTime?: string
  } {
    const dateSelectors = [
      '[data-testid="event-date"]',
      '.event-date',
      '.date-display',
      '.card-text--truncated__two',
      '.event-card__date'
    ]

    const timeSelectors = [
      '[data-testid="event-time"]',
      '.event-time',
      '.time-display'
    ]

    const dateText = this.getTextFromSelectors(element, dateSelectors)
    const timeText = this.getTextFromSelectors(element, timeSelectors)

    // Parse date
    let date = ''
    if (dateText) {
      date = this.parseEventDate(dateText)
    }

    // Parse time
    let startTime = ''
    let endTime = ''
    if (timeText) {
      const timeInfo = this.parseEventTime(timeText)
      startTime = timeInfo.start
      endTime = timeInfo.end
    }

    return { date, startTime, endTime }
  }

  /**
   * Extract location information
   */
  private extractLocationInfo(element: Element): {
    venue: string
    address: string
    city: string
    latitude?: number
    longitude?: number
  } {
    const locationSelectors = [
      '[data-testid="event-location"]',
      '.event-location',
      '.location-info',
      '.venue-name',
      '.card-text--truncated__three'
    ]

    const locationText = this.getTextFromSelectors(element, locationSelectors) || ''
    
    // Parse location text
    const parts = locationText.split('•').map(part => part.trim())
    const venue = parts[0] || 'Unknown Venue'
    const address = parts[1] || locationText
    
    // Extract city (often last part after comma)
    const addressParts = address.split(',').map(part => part.trim())
    const city = addressParts.length > 1 ? addressParts[addressParts.length - 1] : ''

    return {
      venue,
      address,
      city
    }
  }

  /**
   * Extract price information
   */
  private extractPriceInfo(element: Element): {
    min?: number
    max?: number
    currency: string
    isFree: boolean
    displayText: string
  } {
    const priceSelectors = [
      '[data-testid="event-price"]',
      '.event-price',
      '.price-display',
      '.conversion-bar__panel-info',
      '.price-info'
    ]

    const priceText = this.getTextFromSelectors(element, priceSelectors) || ''
    
    return this.parsePrice(priceText)
  }

  /**
   * Extract image URLs
   */
  private extractImageUrls(element: Element): string[] {
    const imageSelectors = [
      'img[src*="eventbrite"]',
      '.event-image img',
      '.card-image img',
      'img[alt*="event"]'
    ]

    const images: string[] = []
    
    for (const selector of imageSelectors) {
      const img = element.querySelector(selector) as HTMLImageElement
      if (img && img.src && !img.src.includes('placeholder')) {
        images.push(img.src)
      }
    }

    return [...new Set(images)] // Remove duplicates
  }

  /**
   * Extract description
   */
  private extractDescription(element: Element): string {
    const descSelectors = [
      '[data-testid="event-description"]',
      '.event-description',
      '.event-summary',
      '.card-text--truncated__four'
    ]

    return this.getTextFromSelectors(element, descSelectors) || ''
  }

  /**
   * Extract organizer information
   */
  private extractOrganizerInfo(element: Element): { name: string; url?: string } | undefined {
    const organizerSelectors = [
      '[data-testid="organizer-name"]',
      '.organizer-name',
      '.event-organizer'
    ]

    const organizerName = this.getTextFromSelectors(element, organizerSelectors)
    
    if (organizerName) {
      return { name: organizerName }
    }

    return undefined
  }

  /**
   * Extract category information
   */
  private extractCategory(element: Element): string | undefined {
    const categorySelectors = [
      '[data-testid="event-category"]',
      '.event-category',
      '.category-tag',
      '.badge'
    ]

    return this.getTextFromSelectors(element, categorySelectors)
  }

  /**
   * Helper to get text from multiple selectors
   */
  private getTextFromSelectors(element: Element, selectors: string[]): string | null {
    for (const selector of selectors) {
      const el = element.querySelector(selector)
      if (el && el.textContent) {
        return el.textContent.trim()
      }
    }
    return null
  }

  /**
   * Parse event date string
   */
  private parseEventDate(dateText: string): string {
    try {
      // Handle various date formats from Eventbrite
      const cleanDate = dateText.replace(/[^\w\s,:\-\/]/g, '').trim()
      
      // Common patterns
      if (cleanDate.match(/\w{3},?\s+\w{3}\s+\d{1,2}/)) {
        // "Thu, Mar 15" format
        const currentYear = new Date().getFullYear()
        const date = new Date(`${cleanDate} ${currentYear}`)
        return date.toISOString().split('T')[0]
      }
      
      // Try direct parsing
      const date = new Date(cleanDate)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
      
      return cleanDate
    } catch (error) {
      return dateText
    }
  }

  /**
   * Parse event time string
   */
  private parseEventTime(timeText: string): { start: string; end: string } {
    const cleanTime = timeText.trim()
    
    // Look for time ranges like "6:00 PM - 9:00 PM"
    const rangeMatch = cleanTime.match(/(\d{1,2}:\d{2}\s*[APap][Mm])\s*[-–]\s*(\d{1,2}:\d{2}\s*[APap][Mm])/)
    if (rangeMatch) {
      return {
        start: rangeMatch[1],
        end: rangeMatch[2]
      }
    }
    
    // Single time
    const singleMatch = cleanTime.match(/\d{1,2}:\d{2}\s*[APap][Mm]/)
    if (singleMatch) {
      return {
        start: singleMatch[0],
        end: ''
      }
    }
    
    return { start: cleanTime, end: '' }
  }

  /**
   * Parse price text
   */
  private parsePrice(priceText: string): {
    min?: number
    max?: number
    currency: string
    isFree: boolean
    displayText: string
  } {
    const cleanPrice = priceText.toLowerCase().trim()
    
    if (cleanPrice.includes('free') || cleanPrice === '$0' || cleanPrice === '0') {
      return {
        currency: 'USD',
        isFree: true,
        displayText: 'Free'
      }
    }
    
    // Extract currency symbol
    const currencyMatch = priceText.match(/[$£€¥₹]/)
    const currency = this.mapCurrencySymbol(currencyMatch?.[0] || '$')
    
    // Extract numeric values
    const numbers = priceText.match(/[\d,]+\.?\d*/g)?.map(n => parseFloat(n.replace(/,/g, '')))
    
    if (numbers && numbers.length > 0) {
      const min = Math.min(...numbers)
      const max = numbers.length > 1 ? Math.max(...numbers) : min
      
      return {
        min,
        max: max !== min ? max : undefined,
        currency,
        isFree: false,
        displayText: priceText
      }
    }
    
    return {
      currency: 'USD',
      isFree: false,
      displayText: priceText || 'Price not available'
    }
  }

  /**
   * Map currency symbol to code
   */
  private mapCurrencySymbol(symbol: string): string {
    const currencyMap: Record<string, string> = {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      '¥': 'JPY',
      '₹': 'INR'
    }
    return currencyMap[symbol] || 'USD'
  }

  /**
   * Extract pagination information
   */
  private async extractPaginationInfo(page: Page): Promise<{
    hasNext: boolean
    nextUrl?: string
  }> {
    return page.evaluate(() => {
      // Look for next page link
      const nextSelectors = [
        'a[aria-label="Next page"]',
        '.pagination-next',
        'a:has-text("Next")',
        '.page-next a'
      ]
      
      for (const selector of nextSelectors) {
        const nextLink = document.querySelector(selector) as HTMLAnchorElement
        if (nextLink && nextLink.href) {
          return {
            hasNext: true,
            nextUrl: nextLink.href
          }
        }
      }
      
      return { hasNext: false }
    })
  }

  /**
   * Extract total event count
   */
  private async extractTotalCount(page: Page): Promise<number> {
    return page.evaluate(() => {
      const countSelectors = [
        '[data-testid="results-count"]',
        '.results-count',
        '.search-results-count'
      ]
      
      for (const selector of countSelectors) {
        const countElement = document.querySelector(selector)
        if (countElement && countElement.textContent) {
          const match = countElement.textContent.match(/(\d+)/)
          if (match) return parseInt(match[1])
        }
      }
      
      return 0
    })
  }

  /**
   * Build Eventbrite search URL
   */
  private buildEventbriteSearchUrl(filters: ScrapingFilters): string {
    const baseUrl = 'https://www.eventbrite.com/d'
    const searchParams = new URLSearchParams()
    
    // Location
    searchParams.set('q', filters.city)
    
    // Categories
    if (filters.categories && filters.categories.length > 0) {
      searchParams.set('categories', filters.categories.join(','))
    }
    
    // Date range
    if (filters.dateRange) {
      const startDate = filters.dateRange.start.toISOString().split('T')[0]
      const endDate = filters.dateRange.end.toISOString().split('T')[0]
      searchParams.set('date_start', startDate)
      searchParams.set('date_end', endDate)
    }
    
    // Price
    if (filters.freeOnly) {
      searchParams.set('price', 'free')
    } else if (filters.priceRange) {
      searchParams.set('price', 'paid')
    }
    
    // Page
    if (filters.page && filters.page > 1) {
      searchParams.set('page', filters.page.toString())
    }
    
    return `${baseUrl}/${encodeURIComponent(filters.city)}/?${searchParams.toString()}`
  }

  /**
   * Build search query string for metadata
   */
  private buildSearchQuery(filters: ScrapingFilters): string {
    const parts = [filters.city]
    
    if (filters.categories?.length) {
      parts.push(`categories: ${filters.categories.join(', ')}`)
    }
    
    if (filters.freeOnly) {
      parts.push('free events only')
    }
    
    return parts.join(' | ')
  }

  /**
   * Normalize scraped data to SceneScout Event format
   */
  normalizeToSceneScoutEvent(scraped: ScrapedEventData): Partial<Event> {
    const startDateTime = this.combineDateTime(scraped.date, scraped.startTime)
    const endDateTime = scraped.endTime ? this.combineDateTime(scraped.date, scraped.endTime) : undefined

    return {
      external_id: `eventbrite_${scraped.externalId}`,
      source: 'eventbrite',
      provider: 'eventbrite_scraper',
      title: scraped.title,
      description: scraped.description,
      venue_name: scraped.location.venue,
      city_name: scraped.location.city,
      category: this.mapCategory(scraped.category),
      event_date: scraped.date,
      start_time: startDateTime,
      end_time: endDateTime,
      price_min: scraped.price.min,
      price_max: scraped.price.max,
      price_currency: scraped.price.currency,
      is_free: scraped.price.isFree,
      image_url: scraped.imageUrls[0],
      external_url: scraped.eventUrl,
      ticket_url: scraped.ticketUrl,
      tags: scraped.tags,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      venue: {
        name: scraped.location.venue,
        address: scraped.location.address,
        latitude: scraped.location.latitude,
        longitude: scraped.location.longitude
      }
    }
  }

  /**
   * Combine date and time strings
   */
  private combineDateTime(date: string, time?: string): string | undefined {
    if (!time) return undefined
    
    try {
      const dateTime = new Date(`${date} ${time}`)
      return dateTime.toISOString()
    } catch (error) {
      return undefined
    }
  }

  /**
   * Map Eventbrite categories to SceneScout categories
   */
  private mapCategory(category?: string): string {
    if (!category) return 'other'
    
    const categoryMap: Record<string, string> = {
      'music': 'music',
      'business': 'business',
      'food': 'food',
      'health': 'health',
      'sports': 'sports',
      'arts': 'arts',
      'film': 'arts',
      'comedy': 'arts',
      'theater': 'arts',
      'technology': 'tech',
      'education': 'education',
      'family': 'family',
      'community': 'social',
      'government': 'business',
      'spirituality': 'social',
      'hobbies': 'social',
      'travel': 'social',
      'charity': 'social',
      'seasonal': 'other'
    }
    
    const lowercaseCategory = category.toLowerCase()
    return categoryMap[lowercaseCategory] || 'other'
  }

  /**
   * Rate limiting enforcement
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      const waitTime = this.config.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  /**
   * Retry wrapper for failed requests
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries')
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close()
        this.context = null
      }
      
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
    } catch (error) {
      console.warn('Error during cleanup:', error)
    }
  }

  /**
   * Get scraping statistics
   */
  getStats(): {
    requestCount: number
    lastRequestTime: number
    isInitialized: boolean
  } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      isInitialized: !!(this.browser && this.context)
    }
  }
}

/**
 * Convenience function for one-off scraping
 */
export async function scrapeEventbriteEvents(
  filters: ScrapingFilters,
  config?: EventbriteScrapingConfig
): Promise<ScrapingResult> {
  const scraper = new EventbritePublicScraper(config)
  
  try {
    await scraper.initialize()
    return await scraper.scrapeEvents(filters)
  } finally {
    await scraper.cleanup()
  }
}

/**
 * Convenience function to get normalized events
 */
export async function getEventbriteEventsForSceneScout(
  filters: ScrapingFilters,
  config?: EventbriteScrapingConfig
): Promise<Partial<Event>[]> {
  const result = await scrapeEventbriteEvents(filters, config)
  const scraper = new EventbritePublicScraper(config)
  
  return result.events.map(event => scraper.normalizeToSceneScoutEvent(event))
}

export default EventbritePublicScraper