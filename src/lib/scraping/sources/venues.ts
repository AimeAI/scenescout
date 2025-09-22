import puppeteer, { Browser, Page } from 'puppeteer';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import {
  VenueConfiguration,
  VenueLocation,
  ScrapingResult,
  VenueEvent,
  ScrapingError,
  ScrapingMetadata,
  FallbackConfiguration
} from '../types/venue';
import { AdaptiveParser } from '../parsers/adaptive-parser';
import {
  VENUE_CONFIGURATIONS,
  getVenueConfig,
  getVenuesByCity,
  getVenuesByType,
  getAllEnabledVenues
} from '../config/venue-configs';

export class VenueScraper {
  private parser: AdaptiveParser;
  private browser: Browser | null = null;
  private rateLimiters: Map<string, { lastRequest: number; requestCount: number }> = new Map();

  constructor() {
    this.parser = new AdaptiveParser();
  }

  /**
   * Scrape events from all enabled venues
   */
  public async scrapeAllVenues(options?: {
    maxConcurrent?: number;
    includeDisabled?: boolean;
  }): Promise<Map<string, ScrapingResult>> {
    const { maxConcurrent = 3, includeDisabled = false } = options || {};
    
    const venues = includeDisabled 
      ? VENUE_CONFIGURATIONS 
      : getAllEnabledVenues();

    const results = new Map<string, ScrapingResult>();
    const chunks = this.chunkArray(venues, maxConcurrent);

    for (const chunk of chunks) {
      const promises = chunk.map(venue => 
        this.scrapeVenue(venue.id).catch(error => ({
          success: false,
          events: [],
          errors: [{
            type: 'unknown' as const,
            message: error.message,
            recoverable: false
          }],
          metadata: {
            venueId: venue.id,
            scrapedAt: new Date(),
            totalFound: 0,
            totalProcessed: 0,
            processingTime: 0,
            fallbacksUsed: [],
            dataQuality: 0
          }
        }))
      );

      const chunkResults = await Promise.all(promises);
      
      chunk.forEach((venue, index) => {
        results.set(venue.id, chunkResults[index]);
      });

      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(2000);
      }
    }

    return results;
  }

  /**
   * Scrape events from a specific venue
   */
  public async scrapeVenue(venueId: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    const config = getVenueConfig(venueId);
    
    if (!config) {
      return this.createErrorResult(venueId, 'Venue configuration not found', startTime);
    }

    if (!config.enabled) {
      return this.createErrorResult(venueId, 'Venue is disabled', startTime);
    }

    const allEvents: VenueEvent[] = [];
    const allErrors: ScrapingError[] = [];
    const fallbacksUsed: string[] = [];

    // Scrape all locations for this venue
    for (const location of config.locations) {
      try {
        await this.enforceRateLimit(config);
        
        const locationResult = await this.scrapeLocation(config, location);
        
        allEvents.push(...locationResult.events);
        allErrors.push(...locationResult.errors);
        fallbacksUsed.push(...locationResult.metadata.fallbacksUsed);

      } catch (error) {
        allErrors.push({
          type: 'unknown',
          message: `Failed to scrape location ${location.id}: ${error}`,
          recoverable: true
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const dataQuality = this.calculateOverallDataQuality(allEvents);

    return {
      success: allErrors.length === 0 || allEvents.length > 0,
      events: allEvents,
      errors: allErrors,
      metadata: {
        venueId,
        scrapedAt: new Date(),
        totalFound: allEvents.length,
        totalProcessed: allEvents.length,
        processingTime,
        fallbacksUsed: [...new Set(fallbacksUsed)],
        dataQuality
      }
    };
  }

  /**
   * Scrape events from venues in a specific city
   */
  public async scrapeByCity(city: string, state?: string): Promise<Map<string, ScrapingResult>> {
    const venues = getVenuesByCity(city, state);
    const results = new Map<string, ScrapingResult>();

    for (const venue of venues) {
      try {
        const result = await this.scrapeVenue(venue.id);
        results.set(venue.id, result);
      } catch (error) {
        results.set(venue.id, this.createErrorResult(
          venue.id, 
          `Failed to scrape venue: ${error}`, 
          Date.now()
        ));
      }
    }

    return results;
  }

  /**
   * Scrape events from venues of a specific type
   */
  public async scrapeByType(type: string): Promise<Map<string, ScrapingResult>> {
    const venues = getVenuesByType(type);
    const results = new Map<string, ScrapingResult>();

    for (const venue of venues) {
      try {
        const result = await this.scrapeVenue(venue.id);
        results.set(venue.id, result);
      } catch (error) {
        results.set(venue.id, this.createErrorResult(
          venue.id, 
          `Failed to scrape venue: ${error}`, 
          Date.now()
        ));
      }
    }

    return results;
  }

  /**
   * Scrape a specific venue location
   */
  private async scrapeLocation(
    config: VenueConfiguration, 
    location: VenueLocation
  ): Promise<ScrapingResult> {
    const startTime = Date.now();
    const events: VenueEvent[] = [];
    const errors: ScrapingError[] = [];
    const fallbacksUsed: string[] = [];

    try {
      // Merge location-specific config with venue config
      const effectiveConfig = this.mergeConfigs(config, location);
      
      let page: Page | null = null;
      let dom: Document | null = null;

      if (effectiveConfig.scrapeConfig.javascript) {
        // Use Puppeteer for JavaScript-heavy sites
        page = await this.getPage();
        await page.goto(location.url, { waitUntil: 'networkidle0' });
        
        // Handle pagination if configured
        if (effectiveConfig.scrapeConfig.pagination) {
          await this.handlePagination(page, effectiveConfig.scrapeConfig.pagination);
        }

        const content = await page.content();
        dom = new JSDOM(content).window.document;
      } else {
        // Use fetch for static content
        const response = await fetch(location.url, {
          headers: effectiveConfig.scrapeConfig.headers || {}
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        dom = new JSDOM(content).window.document;
      }

      // Extract events using adaptive parser
      const extractedEvents = await this.extractEvents(
        dom, 
        effectiveConfig, 
        location,
        fallbacksUsed
      );

      events.push(...extractedEvents);

    } catch (error) {
      errors.push({
        type: 'network',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true
      });

      // Try fallback strategies
      const fallbackResult = await this.tryFallbacks(
        config, 
        location, 
        error as Error,
        fallbacksUsed
      );
      
      if (fallbackResult) {
        events.push(...fallbackResult.events);
        errors.push(...fallbackResult.errors);
      }
    }

    const processingTime = Date.now() - startTime;
    const dataQuality = this.calculateOverallDataQuality(events);

    return {
      success: events.length > 0,
      events,
      errors,
      metadata: {
        venueId: config.id,
        scrapedAt: new Date(),
        totalFound: events.length,
        totalProcessed: events.length,
        processingTime,
        fallbacksUsed,
        dataQuality
      }
    };
  }

  /**
   * Extract events from parsed DOM
   */
  private async extractEvents(
    dom: Document,
    config: VenueConfiguration,
    location: VenueLocation,
    fallbacksUsed: string[]
  ): Promise<VenueEvent[]> {
    const events: VenueEvent[] = [];
    const selectors = config.scrapeConfig.listingSelectors;

    // Find event container
    let container = dom.querySelector(selectors.container);
    
    if (!container && config.fallbacks.length > 0) {
      // Try fallback containers
      for (const fallback of config.fallbacks) {
        if (fallback.triggers.some(t => t.type === 'selector_missing')) {
          if (fallback.action.type === 'alternative_selectors') {
            const altSelectors = fallback.action.config.container as string[];
            for (const selector of altSelectors) {
              container = dom.querySelector(selector);
              if (container) {
                fallbacksUsed.push(fallback.id);
                break;
              }
            }
          }
        }
        if (container) break;
      }
    }

    if (!container) {
      throw new Error('Event container not found');
    }

    // Find event items
    const eventElements = container.querySelectorAll(selectors.eventItem);
    
    if (eventElements.length === 0) {
      throw new Error('No event items found');
    }

    // Parse each event
    for (const element of Array.from(eventElements)) {
      try {
        const venueInfo = {
          id: location.id,
          name: config.name,
          type: config.type,
          address: '', // Would need to be populated from venue data
          city: location.city,
          state: location.state,
          country: location.country,
          website: config.baseUrl
        };

        const event = await this.parser.parseEvent(
          element,
          config.scrapeConfig.eventSelectors,
          venueInfo
        );

        if (event) {
          // Validate event
          const validationErrors = this.parser.validateEvent(event);
          if (validationErrors.length === 0 || validationErrors.every(e => e.recoverable)) {
            events.push(event);
          }
        }

      } catch (error) {
        console.warn('Failed to parse event element:', error);
        continue;
      }
    }

    return events;
  }

  /**
   * Try fallback strategies when primary scraping fails
   */
  private async tryFallbacks(
    config: VenueConfiguration,
    location: VenueLocation,
    error: Error,
    fallbacksUsed: string[]
  ): Promise<ScrapingResult | null> {
    for (const fallback of config.fallbacks) {
      const shouldTrigger = fallback.triggers.some(trigger => {
        switch (trigger.type) {
          case 'rate_limited':
            return error.message.includes('429') || error.message.includes('rate');
          case 'blocked':
            return error.message.includes('403') || error.message.includes('blocked');
          case 'empty_results':
            return error.message.includes('No event') || error.message.includes('not found');
          case 'error':
            return true;
          default:
            return false;
        }
      });

      if (shouldTrigger) {
        fallbacksUsed.push(fallback.id);
        
        try {
          const result = await this.executeFallback(fallback, config, location);
          if (result && result.events.length > 0) {
            return result;
          }
        } catch (fallbackError) {
          console.warn(`Fallback ${fallback.id} failed:`, fallbackError);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Execute a specific fallback strategy
   */
  private async executeFallback(
    fallback: FallbackConfiguration,
    config: VenueConfiguration,
    location: VenueLocation
  ): Promise<ScrapingResult | null> {
    switch (fallback.action.type) {
      case 'wait_and_retry':
        const delay = fallback.action.config.delay || 60000;
        const maxRetries = fallback.action.config.maxRetries || 1;
        
        await this.delay(delay);
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await this.scrapeLocation(config, location);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await this.delay(delay);
          }
        }
        break;

      case 'different_url':
        const altUrl = fallback.action.config.url;
        if (altUrl) {
          const altLocation = { ...location, url: altUrl };
          return await this.scrapeLocation(config, altLocation);
        }
        break;

      case 'skip':
        return {
          success: true,
          events: [],
          errors: [],
          metadata: {
            venueId: config.id,
            scrapedAt: new Date(),
            totalFound: 0,
            totalProcessed: 0,
            processingTime: 0,
            fallbacksUsed: [fallback.id],
            dataQuality: 0
          }
        };

      default:
        break;
    }

    return null;
  }

  /**
   * Handle pagination for JavaScript-enabled scraping
   */
  private async handlePagination(page: Page, paginationConfig: any): Promise<void> {
    const { type, selector, maxPages = 5, scrollDelay = 2000 } = paginationConfig;

    switch (type) {
      case 'button':
        for (let i = 0; i < maxPages; i++) {
          try {
            const nextButton = await page.$(selector);
            if (!nextButton) break;
            
            await nextButton.click();
            await page.waitForTimeout(scrollDelay);
          } catch (error) {
            break;
          }
        }
        break;

      case 'infinite_scroll':
        for (let i = 0; i < maxPages; i++) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(scrollDelay);
          
          // Check if more content loaded
          const hasMore = await page.$(selector);
          if (!hasMore) break;
        }
        break;

      default:
        break;
    }
  }

  /**
   * Get or create Puppeteer page
   */
  private async getPage(): Promise<Page> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await this.browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    return page;
  }

  /**
   * Enforce rate limiting for venue requests
   */
  private async enforceRateLimit(config: VenueConfiguration): Promise<void> {
    const venueId = config.id;
    const rateLimit = config.scrapeConfig.rateLimit;
    const now = Date.now();

    let limiter = this.rateLimiters.get(venueId);
    if (!limiter) {
      limiter = { lastRequest: 0, requestCount: 0 };
      this.rateLimiters.set(venueId, limiter);
    }

    // Reset request count if a minute has passed
    if (now - limiter.lastRequest > 60000) {
      limiter.requestCount = 0;
    }

    // Check if we've exceeded the rate limit
    if (limiter.requestCount >= rateLimit.requestsPerMinute) {
      const waitTime = 60000 - (now - limiter.lastRequest);
      if (waitTime > 0) {
        await this.delay(waitTime);
        limiter.requestCount = 0;
      }
    }

    // Enforce minimum delay between requests
    const timeSinceLastRequest = now - limiter.lastRequest;
    if (timeSinceLastRequest < rateLimit.delayBetweenRequests) {
      await this.delay(rateLimit.delayBetweenRequests - timeSinceLastRequest);
    }

    limiter.lastRequest = Date.now();
    limiter.requestCount++;
  }

  /**
   * Merge venue config with location-specific overrides
   */
  private mergeConfigs(
    config: VenueConfiguration, 
    location: VenueLocation
  ): VenueConfiguration {
    if (!location.customConfig) {
      return config;
    }

    return {
      ...config,
      scrapeConfig: {
        ...config.scrapeConfig,
        ...location.customConfig
      }
    };
  }

  /**
   * Calculate overall data quality for a batch of events
   */
  private calculateOverallDataQuality(events: VenueEvent[]): number {
    if (events.length === 0) return 0;

    const totalQuality = events.reduce((sum, event) => {
      return sum + this.parser.calculateDataQuality(event);
    }, 0);

    return Math.round(totalQuality / events.length);
  }

  /**
   * Create error result
   */
  private createErrorResult(
    venueId: string, 
    message: string, 
    startTime: number
  ): ScrapingResult {
    return {
      success: false,
      events: [],
      errors: [{
        type: 'unknown',
        message,
        recoverable: false
      }],
      metadata: {
        venueId,
        scrapedAt: new Date(),
        totalFound: 0,
        totalProcessed: 0,
        processingTime: Date.now() - startTime,
        fallbacksUsed: [],
        dataQuality: 0
      }
    };
  }

  /**
   * Utility: Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.rateLimiters.clear();
  }
}

// Export convenience functions
export async function scrapeVenue(venueId: string): Promise<ScrapingResult> {
  const scraper = new VenueScraper();
  try {
    return await scraper.scrapeVenue(venueId);
  } finally {
    await scraper.cleanup();
  }
}

export async function scrapeAllVenues(): Promise<Map<string, ScrapingResult>> {
  const scraper = new VenueScraper();
  try {
    return await scraper.scrapeAllVenues();
  } finally {
    await scraper.cleanup();
  }
}

export async function scrapeByCity(city: string, state?: string): Promise<Map<string, ScrapingResult>> {
  const scraper = new VenueScraper();
  try {
    return await scraper.scrapeByCity(city, state);
  } finally {
    await scraper.cleanup();
  }
}

export async function scrapeByType(type: string): Promise<Map<string, ScrapingResult>> {
  const scraper = new VenueScraper();
  try {
    return await scraper.scrapeByType(type);
  } finally {
    await scraper.cleanup();
  }
}