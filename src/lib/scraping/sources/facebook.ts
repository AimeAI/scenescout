/**
 * Facebook Events Public Scraper
 * 
 * Scrapes public events from Facebook's events exploration pages
 * Implements anti-detection measures, session management, and robust error handling
 * 
 * Target URLs:
 * - https://www.facebook.com/events/explore/{city}/
 * - Category-specific event discovery
 * - Infinite scroll handling
 */

import * as cheerio from 'cheerio';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RawEvent, ApiError, SearchParams } from '../../api/types';

interface FacebookEventRaw {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: {
    name: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  attendees?: {
    going_count?: number;
    interested_count?: number;
  };
  image_url?: string;
  event_url?: string;
  category?: string;
  organizer?: {
    name: string;
    id?: string;
  };
  is_online?: boolean;
  price_info?: string;
}

interface FacebookScrapingConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  concurrentRequests: number;
  requestDelay: number;
  userAgents: string[];
  sessionRotationInterval: number;
}

interface SessionData {
  cookies: string;
  userAgent: string;
  proxy?: string;
  lastUsed: number;
  requestCount: number;
}

export class FacebookEventsScraper {
  private config: FacebookScrapingConfig;
  private sessions: SessionData[] = [];
  private currentSessionIndex = 0;
  private httpClient: AxiosInstance;
  private readonly rateLimiter = new Map<string, number>();

  // Facebook event categories for targeted scraping
  private readonly EVENT_CATEGORIES = {
    music: 'music_events',
    nightlife: 'nightlife',
    food: 'food_and_drink',
    arts: 'arts',
    sports: 'sports_and_fitness',
    business: 'business',
    community: 'community',
    family: 'family_and_education',
    film: 'film_and_media',
    causes: 'causes',
    comedy: 'comedy',
    crafts: 'crafts',
    dance: 'dance',
    drinks: 'drinks',
    fitness: 'fitness_and_workouts',
    health: 'health_and_medical',
    home: 'home_and_garden',
    literature: 'literature_and_books',
    music_concerts: 'music_concerts',
    networking: 'networking',
    party: 'party',
    religion: 'religion_and_spirituality',
    shopping: 'shopping_and_fashion',
    singles: 'singles',
    sports_active: 'sports_active',
    sports_watch: 'sports_watch',
    technology: 'technology',
    theater: 'theater',
    wellness: 'wellness'
  };

  // Anti-detection user agents
  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  ];

  constructor(config?: Partial<FacebookScrapingConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 30000,
      concurrentRequests: 2,
      requestDelay: 1500,
      userAgents: this.USER_AGENTS,
      sessionRotationInterval: 10,
      ...config
    };

    this.httpClient = axios.create({
      timeout: this.config.timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    this.initializeSessions();
  }

  /**
   * Initialize multiple sessions with different user agents and headers
   */
  private initializeSessions(): void {
    for (let i = 0; i < 5; i++) {
      this.sessions.push({
        cookies: '',
        userAgent: this.config.userAgents[i % this.config.userAgents.length],
        lastUsed: 0,
        requestCount: 0
      });
    }
  }

  /**
   * Get current session and rotate if needed
   */
  private getCurrentSession(): SessionData {
    const session = this.sessions[this.currentSessionIndex];
    
    // Rotate session if it's been used too many times
    if (session.requestCount >= this.config.sessionRotationInterval) {
      this.currentSessionIndex = (this.currentSessionIndex + 1) % this.sessions.length;
      this.sessions[this.currentSessionIndex].requestCount = 0;
    }

    return this.sessions[this.currentSessionIndex];
  }

  /**
   * Generate randomized headers for anti-detection
   */
  private generateHeaders(session: SessionData): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': session.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    if (session.cookies) {
      headers['Cookie'] = session.cookies;
    }

    // Add randomized headers
    if (Math.random() > 0.5) {
      headers['sec-ch-ua'] = '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"';
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = '"Windows"';
    }

    return headers;
  }

  /**
   * Rate limiting logic
   */
  private async rateLimit(key: string): Promise<void> {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(key) || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < this.config.requestDelay) {
      const delay = this.config.requestDelay - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.rateLimiter.set(key, Date.now());
  }

  /**
   * Exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const maxDelay = 30000; // 30 seconds max
    const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
    
    return Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retry logic and anti-detection
   */
  private async makeRequest(url: string, options: AxiosRequestConfig = {}): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        await this.rateLimit(url);
        
        const session = this.getCurrentSession();
        session.requestCount++;
        session.lastUsed = Date.now();

        const headers = this.generateHeaders(session);
        
        console.log(`[Facebook Scraper] Attempt ${attempt + 1} for ${url}`);

        const response = await this.httpClient.get(url, {
          ...options,
          headers: { ...headers, ...options.headers }
        });

        // Update session cookies if received
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          session.cookies = setCookieHeader.join('; ');
        }

        if (response.status === 200) {
          return response.data;
        }

        if (response.status === 429) {
          // Rate limited
          const retryAfter = parseInt(response.headers['retry-after'] || '60') * 1000;
          console.log(`[Facebook Scraper] Rate limited, waiting ${retryAfter}ms`);
          await this.sleep(retryAfter);
          continue;
        }

        if (response.status === 403 || response.status === 404) {
          throw new ApiError(
            `Facebook returned ${response.status}: ${response.statusText}`,
            response.status,
            false // Not retryable
          );
        }

        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          true
        );

      } catch (error: any) {
        lastError = error;
        
        if (error.code === 'ECONNABORTED') {
          console.log(`[Facebook Scraper] Request timeout on attempt ${attempt + 1}`);
        } else if (error.response?.status === 403) {
          console.log(`[Facebook Scraper] Access forbidden, rotating session`);
          this.currentSessionIndex = (this.currentSessionIndex + 1) % this.sessions.length;
        }

        if (attempt < this.config.maxRetries - 1) {
          const delay = this.getBackoffDelay(attempt);
          console.log(`[Facebook Scraper] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new ApiError(
      `Failed to fetch ${url} after ${this.config.maxRetries} attempts: ${lastError?.message}`,
      500,
      false,
      { originalError: lastError }
    );
  }

  /**
   * Parse event data from Facebook page HTML
   */
  private parseEventData($: cheerio.CheerioAPI, element: cheerio.Cheerio<cheerio.Element>): FacebookEventRaw | null {
    try {
      // Facebook uses dynamic class names, so we need to be flexible with selectors
      const eventLink = element.find('a[href*="/events/"]').first();
      const eventUrl = eventLink.attr('href');
      
      if (!eventUrl) return null;

      // Extract event ID from URL
      const eventIdMatch = eventUrl.match(/\/events\/(\d+)/);
      const eventId = eventIdMatch?.[1];
      
      if (!eventId) return null;

      // Event name - look for text in heading or strong elements
      const nameElement = element.find('h3, h4, strong, [role="heading"]').first();
      const name = nameElement.text().trim();
      
      if (!name) return null;

      // Event time - look for time elements or date patterns
      const timeElement = element.find('[datetime], time, .time, .date').first();
      let startTime = timeElement.attr('datetime') || timeElement.text();
      
      // Try to extract date from text if no structured data
      if (!startTime) {
        const textContent = element.text();
        const dateMatch = textContent.match(/\w+,?\s+\w+\s+\d{1,2}(?:,\s+\d{4})?/);
        startTime = dateMatch?.[0] || new Date().toISOString();
      }

      // Location information
      const locationElement = element.find('.location, [aria-label*="location"], [title*="location"]').first();
      const locationText = locationElement.text().trim();

      // Image
      const imageElement = element.find('img').first();
      const imageUrl = imageElement.attr('src') || imageElement.attr('data-src');

      // Attendee counts - look for numbers in specific patterns
      const attendeeText = element.text();
      const goingMatch = attendeeText.match(/(\d+)\s+going/i);
      const interestedMatch = attendeeText.match(/(\d+)\s+interested/i);

      // Description - try to find longer text content
      const descriptionElement = element.find('.description, .event-description, [data-testid*="description"]').first();
      const description = descriptionElement.text().trim();

      const event: FacebookEventRaw = {
        id: eventId,
        name,
        description: description || undefined,
        start_time: this.normalizeDateTime(startTime),
        location: locationText ? {
          name: locationText,
          address: locationText
        } : undefined,
        attendees: {
          going_count: goingMatch ? parseInt(goingMatch[1]) : undefined,
          interested_count: interestedMatch ? parseInt(interestedMatch[1]) : undefined
        },
        image_url: imageUrl ? this.resolveImageUrl(imageUrl) : undefined,
        event_url: this.resolveEventUrl(eventUrl),
        is_online: attendeeText.toLowerCase().includes('online') || locationText.toLowerCase().includes('online')
      };

      return event;
    } catch (error) {
      console.warn('[Facebook Scraper] Error parsing event:', error);
      return null;
    }
  }

  /**
   * Normalize various date/time formats
   */
  private normalizeDateTime(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();

    try {
      // Handle ISO format
      if (dateStr.includes('T') && dateStr.includes('Z')) {
        return dateStr;
      }

      // Handle common Facebook date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }

      // Fallback to current date
      return new Date().toISOString();
    } catch (error) {
      console.warn('[Facebook Scraper] Error normalizing date:', dateStr, error);
      return new Date().toISOString();
    }
  }

  /**
   * Resolve relative image URLs
   */
  private resolveImageUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://www.facebook.com${url}`;
    return url;
  }

  /**
   * Resolve relative event URLs
   */
  private resolveEventUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `https://www.facebook.com${url}`;
    return url;
  }

  /**
   * Convert raw Facebook event to standardized format
   */
  private convertToRawEvent(fbEvent: FacebookEventRaw, source: string = 'facebook'): RawEvent {
    return {
      id: `fb_${fbEvent.id}`,
      external_id: fbEvent.id,
      source: 'facebook',
      title: fbEvent.name,
      description: fbEvent.description,
      start_time: fbEvent.start_time,
      end_time: fbEvent.end_time,
      venue: fbEvent.location ? {
        name: fbEvent.location.name,
        address: fbEvent.location.address,
        city: fbEvent.location.city,
        latitude: fbEvent.location.latitude,
        longitude: fbEvent.location.longitude
      } : undefined,
      organizer: fbEvent.organizer ? {
        name: fbEvent.organizer.name
      } : undefined,
      category: fbEvent.category || 'general',
      images: fbEvent.image_url ? [fbEvent.image_url] : undefined,
      url: fbEvent.event_url,
      capacity: fbEvent.attendees?.going_count ? fbEvent.attendees.going_count + (fbEvent.attendees.interested_count || 0) : undefined,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      price: {
        is_free: true, // Default to free for scraped events
        currency: 'USD'
      }
    };
  }

  /**
   * Scrape events from a specific Facebook events explore page
   */
  public async scrapeEventsFromCity(city: string, category?: string): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    
    try {
      // Construct URL
      let url = `https://www.facebook.com/events/explore/${encodeURIComponent(city)}/`;
      
      if (category && this.EVENT_CATEGORIES[category as keyof typeof this.EVENT_CATEGORIES]) {
        url += `?category=${this.EVENT_CATEGORIES[category as keyof typeof this.EVENT_CATEGORIES]}`;
      }

      console.log(`[Facebook Scraper] Scraping events from: ${url}`);

      // Fetch the page
      const html = await this.makeRequest(url);
      const $ = cheerio.load(html);

      // Facebook uses complex selectors, try multiple approaches
      const eventSelectors = [
        '[data-testid="event-card"]',
        '.event-card',
        '[role="article"]',
        '.uiList > li',
        '[data-testid*="event"]',
        'a[href*="/events/"]'
      ];

      let eventElements: cheerio.Cheerio<cheerio.Element> | null = null;

      for (const selector of eventSelectors) {
        eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`[Facebook Scraper] Found ${eventElements.length} elements with selector: ${selector}`);
          break;
        }
      }

      if (!eventElements || eventElements.length === 0) {
        console.log('[Facebook Scraper] No event elements found, trying fallback extraction');
        
        // Fallback: extract all links with /events/ and process them
        const eventLinks = $('a[href*="/events/"]');
        console.log(`[Facebook Scraper] Found ${eventLinks.length} event links`);

        eventLinks.each((_, element) => {
          const $element = $(element);
          const eventData = this.parseEventData($, $element.closest('div, article, li'));
          if (eventData) {
            events.push(this.convertToRawEvent(eventData));
          }
        });
      } else {
        // Process found event elements
        eventElements.each((_, element) => {
          const $element = $(element);
          const eventData = this.parseEventData($, $element);
          if (eventData) {
            events.push(this.convertToRawEvent(eventData));
          }
        });
      }

      console.log(`[Facebook Scraper] Successfully parsed ${events.length} events from ${city}`);
      return events;

    } catch (error) {
      console.error(`[Facebook Scraper] Error scraping events from ${city}:`, error);
      throw new ApiError(
        `Failed to scrape Facebook events for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        true,
        { city, category, originalError: error }
      );
    }
  }

  /**
   * Scrape events from multiple cities and categories
   */
  public async scrapeEventsMultiple(params: {
    cities: string[];
    categories?: string[];
    maxEventsPerCity?: number;
  }): Promise<RawEvent[]> {
    const { cities, categories = ['music', 'nightlife', 'food'], maxEventsPerCity = 50 } = params;
    const allEvents: RawEvent[] = [];

    for (const city of cities) {
      for (const category of categories) {
        try {
          console.log(`[Facebook Scraper] Scraping ${category} events in ${city}`);
          
          const cityEvents = await this.scrapeEventsFromCity(city, category);
          const limitedEvents = cityEvents.slice(0, maxEventsPerCity);
          
          allEvents.push(...limitedEvents);
          
          // Add delay between requests to avoid rate limiting
          await this.sleep(this.config.requestDelay);
          
        } catch (error) {
          console.error(`[Facebook Scraper] Failed to scrape ${category} events in ${city}:`, error);
          // Continue with other cities/categories even if one fails
        }
      }
    }

    // Remove duplicates based on external_id
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.external_id === event.external_id)
    );

    console.log(`[Facebook Scraper] Total unique events scraped: ${uniqueEvents.length}`);
    return uniqueEvents;
  }

  /**
   * Scrape events using search parameters
   */
  public async scrapeEvents(searchParams: SearchParams): Promise<RawEvent[]> {
    const cities = searchParams.location?.city ? [searchParams.location.city] : ['new-york'];
    const categories = searchParams.categories?.length ? searchParams.categories : ['music', 'nightlife'];
    
    return this.scrapeEventsMultiple({
      cities,
      categories,
      maxEventsPerCity: searchParams.limit || 50
    });
  }

  /**
   * Handle infinite scroll loading (for dynamic content)
   */
  public async scrapeWithInfiniteScroll(city: string, maxPages: number = 3): Promise<RawEvent[]> {
    // Note: This would require a browser automation tool like Puppeteer
    // For now, we'll implement a simplified version that tries to get more content
    
    const allEvents: RawEvent[] = [];
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const url = `https://www.facebook.com/events/explore/${encodeURIComponent(city)}/?offset=${page * 20}`;
        const events = await this.scrapeEventsFromCity(city);
        
        if (events.length === 0) {
          console.log(`[Facebook Scraper] No more events found at page ${page}`);
          break;
        }
        
        allEvents.push(...events);
        await this.sleep(this.config.requestDelay);
        
      } catch (error) {
        console.error(`[Facebook Scraper] Error on page ${page}:`, error);
        break;
      }
    }
    
    return allEvents;
  }

  /**
   * Get available event categories
   */
  public getAvailableCategories(): string[] {
    return Object.keys(this.EVENT_CATEGORIES);
  }

  /**
   * Health check for the scraper
   */
  public async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      // Try to fetch a simple page to test connectivity
      const url = 'https://www.facebook.com/events/explore/new-york/';
      const html = await this.makeRequest(url);
      
      if (html.includes('facebook') || html.includes('events')) {
        return { status: 'ok', message: 'Facebook scraper is working' };
      } else {
        return { status: 'error', message: 'Unexpected response from Facebook' };
      }
    } catch (error) {
      return { 
        status: 'error', 
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.rateLimiter.clear();
    this.sessions.length = 0;
    this.initializeSessions();
  }
}

// Export default instance
export const facebookScraper = new FacebookEventsScraper();

// Export factory function for custom configurations
export function createFacebookScraper(config?: Partial<FacebookScrapingConfig>): FacebookEventsScraper {
  return new FacebookEventsScraper(config);
}

// Export types
export type { FacebookEventRaw, FacebookScrapingConfig, SessionData };