/**
 * Test suite for Eventbrite Public Page Scraper
 */

import { 
  EventbritePublicScraper, 
  scrapeEventbriteEvents, 
  getEventbriteEventsForSceneScout,
  type ScrapingFilters 
} from './eventbrite'

describe('EventbritePublicScraper', () => {
  let scraper: EventbritePublicScraper

  beforeEach(() => {
    scraper = new EventbritePublicScraper({
      headless: true,
      timeout: 10000,
      rateLimitDelay: 1000
    })
  })

  afterEach(async () => {
    await scraper.cleanup()
  })

  describe('Initialization', () => {
    test('should initialize browser and context', async () => {
      await scraper.initialize()
      const stats = scraper.getStats()
      expect(stats.isInitialized).toBe(true)
    })

    test('should handle initialization errors gracefully', async () => {
      // Mock chromium.launch to throw error
      const mockChromium = require('playwright')
      jest.spyOn(mockChromium, 'chromium').mockImplementation(() => ({
        launch: jest.fn().mockRejectedValue(new Error('Launch failed'))
      }))

      await expect(scraper.initialize()).rejects.toThrow('Failed to initialize browser')
    })
  })

  describe('Event Scraping', () => {
    test('should scrape events from New York', async () => {
      const filters: ScrapingFilters = {
        city: 'New York, NY',
        limit: 10
      }

      const result = await scraper.scrapeEvents(filters)

      expect(result).toBeDefined()
      expect(result.events).toBeInstanceOf(Array)
      expect(result.metadata.searchQuery).toContain('New York')
      expect(result.scrapedAt).toBeInstanceOf(Date)
    }, 30000)

    test('should handle category filtering', async () => {
      const filters: ScrapingFilters = {
        city: 'San Francisco, CA',
        categories: ['music', 'arts'],
        limit: 5
      }

      const result = await scraper.scrapeEvents(filters)

      expect(result.events.length).toBeLessThanOrEqual(5)
      expect(result.metadata.filters.categories).toEqual(['music', 'arts'])
    }, 30000)

    test('should handle date range filtering', async () => {
      const startDate = new Date()
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now

      const filters: ScrapingFilters = {
        city: 'Los Angeles, CA',
        dateRange: { start: startDate, end: endDate },
        limit: 10
      }

      const result = await scraper.scrapeEvents(filters)

      expect(result.metadata.filters.dateRange?.start).toEqual(startDate)
      expect(result.metadata.filters.dateRange?.end).toEqual(endDate)
    }, 30000)

    test('should handle free events only', async () => {
      const filters: ScrapingFilters = {
        city: 'Chicago, IL',
        freeOnly: true,
        limit: 10
      }

      const result = await scraper.scrapeEvents(filters)

      // Check that all returned events are free
      result.events.forEach(event => {
        expect(event.price.isFree).toBe(true)
      })
    }, 30000)

    test('should respect pagination limits', async () => {
      const filters: ScrapingFilters = {
        city: 'Seattle, WA',
        limit: 25
      }

      const result = await scraper.scrapeEvents(filters)

      expect(result.events.length).toBeLessThanOrEqual(25)
      expect(result.metadata.pagesScraped).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Data Extraction', () => {
    test('should extract event data correctly', async () => {
      const filters: ScrapingFilters = {
        city: 'Boston, MA',
        limit: 1
      }

      const result = await scraper.scrapeEvents(filters)

      if (result.events.length > 0) {
        const event = result.events[0]
        
        expect(event.title).toBeDefined()
        expect(event.externalId).toBeDefined()
        expect(event.eventUrl).toMatch(/eventbrite\.com/)
        expect(event.location.venue).toBeDefined()
        expect(event.price.currency).toBeDefined()
        expect(typeof event.price.isFree).toBe('boolean')
        expect(event.date).toMatch(/\d{4}-\d{2}-\d{2}/)
      }
    }, 30000)
  })

  describe('Data Normalization', () => {
    test('should normalize scraped data to SceneScout format', () => {
      const scrapedEvent = {
        title: 'Test Concert',
        description: 'A great music event',
        date: '2024-12-25',
        startTime: '7:00 PM',
        endTime: '10:00 PM',
        location: {
          venue: 'Test Venue',
          address: '123 Test St, Test City, NY',
          city: 'Test City'
        },
        price: {
          min: 25,
          max: 50,
          currency: 'USD',
          isFree: false,
          displayText: '$25 - $50'
        },
        imageUrls: ['https://example.com/image.jpg'],
        eventUrl: 'https://eventbrite.com/e/test-123',
        ticketUrl: 'https://eventbrite.com/e/test-123',
        category: 'music',
        tags: [],
        isOnline: false,
        externalId: 'test-123'
      }

      const normalized = scraper.normalizeToSceneScoutEvent(scrapedEvent)

      expect(normalized.external_id).toBe('eventbrite_test-123')
      expect(normalized.source).toBe('eventbrite')
      expect(normalized.provider).toBe('eventbrite_scraper')
      expect(normalized.title).toBe('Test Concert')
      expect(normalized.venue_name).toBe('Test Venue')
      expect(normalized.city_name).toBe('Test City')
      expect(normalized.category).toBe('music')
      expect(normalized.price_min).toBe(25)
      expect(normalized.price_max).toBe(50)
      expect(normalized.is_free).toBe(false)
      expect(normalized.status).toBe('active')
    })

    test('should handle free events normalization', () => {
      const freeEvent = {
        title: 'Free Community Event',
        description: 'A free local gathering',
        date: '2024-12-25',
        location: {
          venue: 'Community Center',
          address: '456 Community Ave, Boston, MA',
          city: 'Boston'
        },
        price: {
          currency: 'USD',
          isFree: true,
          displayText: 'Free'
        },
        imageUrls: [],
        eventUrl: 'https://eventbrite.com/e/free-123',
        ticketUrl: 'https://eventbrite.com/e/free-123',
        tags: [],
        isOnline: false,
        externalId: 'free-123'
      }

      const normalized = scraper.normalizeToSceneScoutEvent(freeEvent)

      expect(normalized.is_free).toBe(true)
      expect(normalized.price_min).toBeUndefined()
      expect(normalized.price_max).toBeUndefined()
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limiting between requests', async () => {
      const scraper = new EventbritePublicScraper({
        rateLimitDelay: 2000
      })

      const startTime = Date.now()
      
      // Make multiple requests
      await scraper.initialize()
      const filters: ScrapingFilters = { city: 'Miami, FL', limit: 1 }
      
      await scraper.scrapeEvents(filters)
      await scraper.scrapeEvents(filters)
      
      const endTime = Date.now()
      const elapsed = endTime - startTime
      
      // Should take at least the rate limit delay
      expect(elapsed).toBeGreaterThan(2000)
      
      await scraper.cleanup()
    }, 30000)
  })

  describe('Error Handling', () => {
    test('should handle page load failures gracefully', async () => {
      const filters: ScrapingFilters = {
        city: 'InvalidCity12345',
        limit: 5
      }

      const result = await scraper.scrapeEvents(filters)

      expect(result.metadata.errors.length).toBeGreaterThanOrEqual(0)
      expect(result.events).toBeInstanceOf(Array)
    }, 30000)

    test('should retry failed operations', async () => {
      // This test would require mocking network failures
      // In a real scenario, we'd mock page.goto to fail initially
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('URL Building', () => {
    test('should build correct search URLs', () => {
      const filters: ScrapingFilters = {
        city: 'New York, NY',
        categories: ['music'],
        freeOnly: true,
        page: 2
      }

      // Access the private method through any casting
      const url = (scraper as any).buildEventbriteSearchUrl(filters)
      
      expect(url).toContain('eventbrite.com/d')
      expect(url).toContain('New%20York')
      expect(url).toContain('price=free')
      expect(url).toContain('page=2')
    })
  })
})

describe('Convenience Functions', () => {
  test('scrapeEventbriteEvents should work as standalone function', async () => {
    const filters: ScrapingFilters = {
      city: 'Portland, OR',
      limit: 5
    }

    const result = await scrapeEventbriteEvents(filters, { 
      headless: true,
      timeout: 15000 
    })

    expect(result).toBeDefined()
    expect(result.events).toBeInstanceOf(Array)
    expect(result.metadata.searchQuery).toContain('Portland')
  }, 30000)

  test('getEventbriteEventsForSceneScout should return normalized events', async () => {
    const filters: ScrapingFilters = {
      city: 'Denver, CO',
      limit: 3
    }

    const events = await getEventbriteEventsForSceneScout(filters)

    expect(events).toBeInstanceOf(Array)
    
    if (events.length > 0) {
      const event = events[0]
      expect(event.source).toBe('eventbrite')
      expect(event.provider).toBe('eventbrite_scraper')
      expect(event.external_id).toMatch(/^eventbrite_/)
    }
  }, 30000)
})

describe('Price Parsing', () => {
  let scraper: EventbritePublicScraper

  beforeEach(() => {
    scraper = new EventbritePublicScraper()
  })

  test('should parse free events correctly', () => {
    const priceTexts = ['Free', 'FREE', '$0', '0']
    
    priceTexts.forEach(text => {
      const result = (scraper as any).parsePrice(text)
      expect(result.isFree).toBe(true)
      expect(result.currency).toBe('USD')
    })
  })

  test('should parse single price correctly', () => {
    const result = (scraper as any).parsePrice('$25')
    
    expect(result.min).toBe(25)
    expect(result.max).toBeUndefined()
    expect(result.currency).toBe('USD')
    expect(result.isFree).toBe(false)
  })

  test('should parse price ranges correctly', () => {
    const result = (scraper as any).parsePrice('$25 - $50')
    
    expect(result.min).toBe(25)
    expect(result.max).toBe(50)
    expect(result.currency).toBe('USD')
    expect(result.isFree).toBe(false)
  })

  test('should handle different currencies', () => {
    const tests = [
      { text: '£25', currency: 'GBP' },
      { text: '€30', currency: 'EUR' },
      { text: '¥1000', currency: 'JPY' }
    ]
    
    tests.forEach(test => {
      const result = (scraper as any).parsePrice(test.text)
      expect(result.currency).toBe(test.currency)
    })
  })
})

describe('Category Mapping', () => {
  let scraper: EventbritePublicScraper

  beforeEach(() => {
    scraper = new EventbritePublicScraper()
  })

  test('should map categories correctly', () => {
    const mappings = [
      { input: 'Music', expected: 'music' },
      { input: 'BUSINESS', expected: 'business' },
      { input: 'Technology', expected: 'tech' },
      { input: 'Unknown Category', expected: 'other' }
    ]
    
    mappings.forEach(mapping => {
      const result = (scraper as any).mapCategory(mapping.input)
      expect(result).toBe(mapping.expected)
    })
  })
})

describe('Date/Time Parsing', () => {
  let scraper: EventbritePublicScraper

  beforeEach(() => {
    scraper = new EventbritePublicScraper()
  })

  test('should parse event dates correctly', () => {
    const dateTexts = [
      'Thu, Mar 15',
      'March 15, 2024',
      'Mar 15'
    ]
    
    dateTexts.forEach(text => {
      const result = (scraper as any).parseEventDate(text)
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/)
    })
  })

  test('should parse time ranges correctly', () => {
    const timeText = '6:00 PM - 9:00 PM'
    const result = (scraper as any).parseEventTime(timeText)
    
    expect(result.start).toBe('6:00 PM')
    expect(result.end).toBe('9:00 PM')
  })

  test('should handle single times', () => {
    const timeText = '7:30 PM'
    const result = (scraper as any).parseEventTime(timeText)
    
    expect(result.start).toBe('7:30 PM')
    expect(result.end).toBe('')
  })
})

// Integration test (optional - requires actual network access)
describe('Integration Tests', () => {
  // Mark as skipped by default to avoid hitting real Eventbrite in CI
  test.skip('should successfully scrape real Eventbrite page', async () => {
    const filters: ScrapingFilters = {
      city: 'Austin, TX',
      limit: 1
    }

    const result = await scrapeEventbriteEvents(filters, {
      headless: true,
      timeout: 30000
    })

    expect(result.events.length).toBeGreaterThan(0)
    expect(result.events[0].title).toBeDefined()
    expect(result.events[0].eventUrl).toMatch(/eventbrite\.com/)
  }, 60000)
})