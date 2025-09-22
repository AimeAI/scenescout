/**
 * Eventbrite scraper implementation for SceneScout
 * Scrapes events directly from Eventbrite event listing pages
 */

import { Browser, Page } from 'playwright'
import { BaseScraper } from '../interfaces/base-scraper'
import { BrowserFactory, BROWSER_CONFIGS } from '../config/playwright-config'
import { DataNormalizer } from '../utils/normalization'
import { ScrapingErrorHandler, NetworkError, ParsingError } from '../utils/error-handler'
import {
  ScraperConfig,
  ScrapeTarget,
  RawScrapedData,
  RawEventData,
  RawVenueData,
  ScrapingSession,
  ScrapingError,
  ScrapingMetrics
} from '../types'

export class EventbriteScraper extends BaseScraper {
  private normalizer: DataNormalizer
  private errorHandler: ScrapingErrorHandler
  
  constructor(config: ScraperConfig) {
    super('eventbrite', config)
    this.normalizer = new DataNormalizer()
    this.errorHandler = new ScrapingErrorHandler(config)
  }
  
  /**
   * Create browser instance optimized for Eventbrite
   */
  protected async createBrowser(): Promise<Browser> {
    return await BrowserFactory.createBrowser('stealth')
  }
  
  /**
   * Get user agent with rotation
   */
  protected async getUserAgent(): Promise<string> {
    // Use realistic user agents for Eventbrite
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ]
    
    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }
  
  /**
   * Main scraping implementation for Eventbrite
   */
  async scrape(target: ScrapeTarget, session?: ScrapingSession): Promise<RawScrapedData> {
    const startTime = Date.now()
    const scrapeId = `eventbrite_${Date.now()}`
    
    let browserSession = await this.createBrowserSession()
    let page = this.pages.get(browserSession.id)!
    
    const result: RawScrapedData = {
      source: 'eventbrite',
      sourceUrl: target.baseUrl,
      scrapeId,
      scrapedAt: new Date(),
      events: [],
      venues: [],
      errors: [],
      metadata: {
        totalFound: 0,
        totalProcessed: 0,
        pagesScrapped: 0,
        timeTaken: 0,
        userAgent: browserSession.userAgent
      }
    }
    
    try {
      await this.logInfo(`Starting Eventbrite scrape for ${target.name}`)
      
      // Navigate to the target URL
      await page.goto(target.baseUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout.navigationTimeout
      })
      
      // Handle cookie consent if present
      await this.handleCookieConsent(page, target)
      
      // Scrape events from current page
      let currentPage = 1
      let hasMorePages = true
      
      while (hasMorePages && currentPage <= (target.pagination?.maxPages || 5)) {
        try {
          await this.logInfo(`Scraping page ${currentPage}`)
          
          const pageEvents = await this.scrapeEventsFromPage(page, target)
          result.events.push(...pageEvents)
          result.metadata.pagesScrapped++
          
          await this.logInfo(`Found ${pageEvents.length} events on page ${currentPage}`)
          
          // Navigate to next page
          hasMorePages = await this.navigateToNextPage(page, target, currentPage)
          currentPage++
          
          // Respect rate limiting
          await this.delay(this.config.rateLimit.delayBetweenRequests)
          
        } catch (error) {
          const scrapingError: ScrapingError = {
            type: 'parsing',
            severity: 'medium',
            message: `Error scraping page ${currentPage}: ${error.message}`,
            details: { page: currentPage, error },
            timestamp: new Date(),
            retryable: false,
            retryCount: 0
          }
          
          result.errors.push(scrapingError)
          await this.logError(`Page ${currentPage} scraping failed`, error)
          break
        }
      }
      
      // Extract unique venues from events
      result.venues = this.extractVenuesFromEvents(result.events)
      
      result.metadata.totalFound = result.events.length
      result.metadata.totalProcessed = result.events.length
      result.metadata.timeTaken = Date.now() - startTime
      
      await this.logInfo(`Completed Eventbrite scrape: ${result.events.length} events, ${result.venues.length} venues`)
      
    } catch (error) {
      await this.logError('Fatal error during Eventbrite scraping', error)
      
      const fatalError: ScrapingError = {
        type: 'network',
        severity: 'critical',
        message: `Fatal scraping error: ${error.message}`,
        details: error,
        url: target.baseUrl,
        timestamp: new Date(),
        retryable: true,
        retryCount: 0
      }
      
      result.errors.push(fatalError)
      
    } finally {
      await this.destroyBrowserSession(browserSession.id)
    }
    
    return result
  }
  
  /**
   * Scrape events from the current page
   */
  private async scrapeEventsFromPage(page: Page, target: ScrapeTarget): Promise<RawEventData[]> {
    const events: RawEventData[] = []
    
    try {
      // Wait for events to load
      await page.waitForSelector(target.selectors.events.container, {
        timeout: this.config.timeout.waitTimeout
      })
      
      // Get all event cards
      const eventElements = await page.$$(target.selectors.events.eventCard)
      
      for (const eventElement of eventElements) {
        try {
          const eventData = await this.extractEventData(eventElement, target, page)
          if (eventData) {
            events.push(eventData)
          }
        } catch (error) {
          await this.logWarning('Failed to extract event data', error)
          continue
        }
      }
      
    } catch (error) {
      throw new ParsingError(
        `Failed to find event container: ${target.selectors.events.container}`,
        target.selectors.events.container,
        page.url()
      )
    }
    
    return events
  }
  
  /**
   * Extract event data from a single event element
   */
  private async extractEventData(
    eventElement: any,
    target: ScrapeTarget,
    page: Page
  ): Promise<RawEventData | null> {
    try {
      // Extract basic event information
      const title = await this.extractText(eventElement, target.selectors.events.title)
      if (!title) return null
      
      const description = await this.extractText(eventElement, target.selectors.events.description, false)
      const date = await this.extractText(eventElement, target.selectors.events.date)
      const time = await this.extractText(eventElement, target.selectors.events.time, false)
      const venueName = await this.extractText(eventElement, target.selectors.events.venue)
      const priceText = await this.extractText(eventElement, target.selectors.events.price, false)
      const imageUrl = await this.extractAttribute(eventElement, target.selectors.events.image, 'src', false)
      const eventLink = await this.extractAttribute(eventElement, target.selectors.events.link, 'href')
      
      // Parse date and time
      const dateTime = this.parseDateTimeString(date, time)
      
      // Parse pricing
      const pricing = this.parsePricing(priceText)
      
      // Extract additional details by following the event link
      let additionalDetails: any = {}
      if (eventLink) {
        try {
          additionalDetails = await this.scrapeEventDetails(page, eventLink)
        } catch (error) {
          await this.logWarning(`Failed to scrape details for ${title}`, error)
        }
      }
      
      const eventData: RawEventData = {
        externalId: this.extractEventId(eventLink || title),
        title: title.trim(),
        description: description || additionalDetails.description || '',
        dateTime: {
          start: dateTime.start,
          end: dateTime.end,
          timezone: dateTime.timezone,
          allDay: false
        },
        venue: {
          name: venueName || 'Unknown Venue',
          address: additionalDetails.venue?.address,
          city: additionalDetails.venue?.city,
          coordinates: additionalDetails.venue?.coordinates
        },
        organizer: additionalDetails.organizer,
        pricing: {
          isFree: pricing.isFree,
          minPrice: pricing.minPrice,
          maxPrice: pricing.maxPrice,
          currency: pricing.currency,
          ticketUrl: this.resolveUrl(eventLink, page.url())
        },
        media: {
          images: imageUrl ? [this.resolveUrl(imageUrl, page.url())] : [],
          videos: []
        },
        categories: this.extractCategories(additionalDetails.categories || []),
        tags: this.extractTags(title, description),
        status: 'active',
        capacity: additionalDetails.capacity,
        ageRestriction: additionalDetails.ageRestriction,
        urls: {
          event: this.resolveUrl(eventLink, page.url()),
          tickets: this.resolveUrl(eventLink, page.url()),
          organizer: additionalDetails.organizer?.url,
          venue: additionalDetails.venue?.url
        },
        socialMetrics: additionalDetails.socialMetrics,
        customFields: {
          source: 'eventbrite',
          scrapedFrom: page.url()
        }
      }
      
      return eventData
      
    } catch (error) {
      await this.logError('Error extracting event data', error)
      return null
    }
  }
  
  /**
   * Scrape detailed information from individual event page
   */
  private async scrapeEventDetails(page: Page, eventUrl: string): Promise<any> {
    const newPage = await page.context().newPage()
    
    try {
      await newPage.goto(eventUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout.navigationTimeout 
      })
      
      // Extract detailed information
      const details: any = {}
      
      // Description
      const descriptionSelectors = [
        '[data-testid="event-description"]',
        '.event-description',
        '.structured-content-rich-text'
      ]
      
      for (const selector of descriptionSelectors) {
        try {
          const element = await newPage.$(selector)
          if (element) {
            details.description = await element.textContent()
            break
          }
        } catch (e) {
          continue
        }
      }
      
      // Venue details
      const venueSelectors = {
        name: '[data-testid="venue-name"], .venue-name',
        address: '[data-testid="venue-address"], .venue-address',
        city: '[data-testid="venue-city"], .venue-city'
      }
      
      details.venue = {}
      for (const [key, selector] of Object.entries(venueSelectors)) {
        try {
          const element = await newPage.$(selector)
          if (element) {
            details.venue[key] = await element.textContent()
          }
        } catch (e) {
          continue
        }
      }
      
      // Organizer info
      const organizerSelectors = {
        name: '[data-testid="organizer-name"], .organizer-name',
        url: '[data-testid="organizer-link"], .organizer-link'
      }
      
      details.organizer = {}
      for (const [key, selector] of Object.entries(organizerSelectors)) {
        try {
          const element = await newPage.$(selector)
          if (element) {
            if (key === 'url') {
              details.organizer[key] = await element.getAttribute('href')
            } else {
              details.organizer[key] = await element.textContent()
            }
          }
        } catch (e) {
          continue
        }
      }
      
      // Categories and tags
      const categoryElements = await newPage.$$('[data-testid="event-category"], .event-category')
      details.categories = []
      for (const element of categoryElements) {
        const text = await element.textContent()
        if (text) {
          details.categories.push(text.trim())
        }
      }
      
      return details
      
    } catch (error) {
      await this.logWarning(`Failed to scrape event details from ${eventUrl}`, error)
      return {}
    } finally {
      await newPage.close()
    }
  }
  
  /**
   * Navigate to the next page of results
   */
  private async navigateToNextPage(page: Page, target: ScrapeTarget, currentPage: number): Promise<boolean> {
    if (!target.pagination) {
      return false
    }
    
    try {
      switch (target.pagination.type) {
        case 'button':
          const nextButton = await page.$(target.pagination.selector!)
          if (nextButton) {
            const isDisabled = await nextButton.getAttribute('disabled')
            if (!isDisabled) {
              await nextButton.click()
              await page.waitForLoadState('networkidle')
              return true
            }
          }
          return false
          
        case 'infinite_scroll':
          // Scroll to bottom and wait for new content
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight)
          })
          
          await this.delay(target.pagination.scrollDelay || 2000)
          
          // Check if new content was loaded
          const newEventCount = await page.$$eval(
            target.selectors.events.eventCard,
            elements => elements.length
          )
          
          return newEventCount > 0
          
        case 'url_params':
          const nextPageUrl = this.buildNextPageUrl(page.url(), currentPage + 1, target.pagination.paramName || 'page')
          await page.goto(nextPageUrl, { waitUntil: 'networkidle' })
          return true
          
        default:
          return false
      }
    } catch (error) {
      await this.logWarning('Failed to navigate to next page', error)
      return false
    }
  }
  
  /**
   * Handle cookie consent dialogs
   */
  private async handleCookieConsent(page: Page, target: ScrapeTarget): Promise<void> {
    if (!target.cookieConsent) {
      return
    }
    
    try {
      await page.waitForSelector(target.cookieConsent.selector, {
        timeout: target.cookieConsent.waitTime || 5000
      })
      
      const consentElement = await page.$(target.cookieConsent.selector)
      if (consentElement) {
        await consentElement.click()
        await this.delay(1000)
      }
    } catch (error) {
      // Cookie consent not found or already handled
      await this.logInfo('Cookie consent not found or already handled')
    }
  }
  
  // Helper methods for data extraction and parsing
  
  private async extractText(element: any, selector: string, required = true): Promise<string | null> {
    try {
      const targetElement = selector ? await element.$(selector) : element
      const text = await targetElement?.textContent()
      return text?.trim() || (required ? null : '')
    } catch (error) {
      if (required) {
        throw new ParsingError(`Required selector not found: ${selector}`)
      }
      return null
    }
  }
  
  private async extractAttribute(
    element: any, 
    selector: string, 
    attribute: string, 
    required = true
  ): Promise<string | null> {
    try {
      const targetElement = selector ? await element.$(selector) : element
      const value = await targetElement?.getAttribute(attribute)
      return value || (required ? null : '')
    } catch (error) {
      if (required) {
        throw new ParsingError(`Required selector not found: ${selector}`)
      }
      return null
    }
  }
  
  private parseDateTimeString(dateStr: string, timeStr?: string): {
    start: string
    end?: string
    timezone: string
  } {
    // Basic date/time parsing - would need more sophisticated logic for production
    const date = new Date(dateStr)
    
    if (timeStr) {
      const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (timeParts) {
        let hours = parseInt(timeParts[1])
        const minutes = parseInt(timeParts[2])
        const ampm = timeParts[3]?.toUpperCase()
        
        if (ampm === 'PM' && hours !== 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0
        
        date.setHours(hours, minutes, 0, 0)
      }
    }
    
    return {
      start: date.toISOString(),
      timezone: 'America/New_York' // Default - should be determined by venue location
    }
  }
  
  private parsePricing(priceText?: string): {
    isFree: boolean
    minPrice?: number
    maxPrice?: number
    currency: string
  } {
    if (!priceText || priceText.toLowerCase().includes('free')) {
      return { isFree: true, currency: 'USD' }
    }
    
    // Extract price from text like "$25.00" or "$20 - $50"
    const priceMatch = priceText.match(/\$(\d+(?:\.\d{2})?)/g)
    
    if (!priceMatch) {
      return { isFree: true, currency: 'USD' }
    }
    
    const prices = priceMatch.map(p => parseFloat(p.replace('$', '')))
    
    return {
      isFree: false,
      minPrice: Math.min(...prices),
      maxPrice: prices.length > 1 ? Math.max(...prices) : undefined,
      currency: 'USD'
    }
  }
  
  private extractEventId(url: string): string {
    // Extract event ID from Eventbrite URL
    const match = url.match(/events\/(\d+)/)
    return match ? match[1] : `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private extractCategories(categories: string[]): string[] {
    return categories.filter(cat => cat && cat.trim().length > 0)
  }
  
  private extractTags(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase()
    const tags: string[] = []
    
    // Simple keyword extraction
    const keywords = [
      'music', 'concert', 'live', 'band', 'dj', 'festival',
      'art', 'gallery', 'exhibition', 'theater', 'comedy',
      'food', 'dining', 'wine', 'beer', 'cocktail',
      'tech', 'startup', 'business', 'networking',
      'fitness', 'yoga', 'running', 'cycling',
      'family', 'kids', 'education', 'workshop'
    ]
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword)
      }
    })
    
    return tags
  }
  
  private extractVenuesFromEvents(events: RawEventData[]): RawVenueData[] {
    const venueMap = new Map<string, RawVenueData>()
    
    events.forEach(event => {
      if (event.venue && typeof event.venue === 'object' && 'name' in event.venue) {
        const venue = event.venue as any
        const venueId = `venue_${venue.name.replace(/\s+/g, '_').toLowerCase()}`
        
        if (!venueMap.has(venueId)) {
          const venueData: RawVenueData = {
            externalId: venueId,
            name: venue.name,
            description: '',
            address: {
              street: venue.address || '',
              city: venue.city || '',
              state: '',
              country: 'United States',
              coordinates: venue.coordinates
            },
            contact: {
              website: venue.url
            },
            details: {
              venueType: 'unknown',
              amenities: [],
              accessibilityFeatures: []
            },
            media: {
              images: []
            }
          }
          
          venueMap.set(venueId, venueData)
        }
      }
    })
    
    return Array.from(venueMap.values())
  }
  
  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).toString()
    } catch (error) {
      return relativeUrl
    }
  }
  
  private buildNextPageUrl(currentUrl: string, pageNumber: number, paramName: string): string {
    const url = new URL(currentUrl)
    url.searchParams.set(paramName, pageNumber.toString())
    return url.toString()
  }
  
  // Logging methods
  protected async logInfo(message: string, data?: any): Promise<void> {
    console.log(`[${this.name}] ${message}`, data || '')
  }
  
  protected async logWarning(message: string, data?: any): Promise<void> {
    console.warn(`[${this.name}] ${message}`, data || '')
  }
  
  protected async logError(message: string, error?: any): Promise<void> {
    console.error(`[${this.name}] ${message}`, error || '')
  }
}