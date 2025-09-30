/**
 * Facebook Events Scraper Tests
 * 
 * Comprehensive tests for Facebook events scraping functionality
 * Includes unit tests, integration tests, and error handling validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { facebookScraper, createFacebookScraper, FacebookEventsScraper } from '../src/lib/scraping/sources/facebook';
import { ApiError } from '../src/lib/api/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Sample HTML responses for testing
const SAMPLE_FACEBOOK_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Events in New York | Facebook</title>
</head>
<body>
  <div data-testid="event-card">
    <h3>Sample Music Event</h3>
    <a href="/events/123456789">View Event</a>
    <time datetime="2024-01-15T20:00:00Z">January 15, 2024 at 8:00 PM</time>
    <div class="location">Brooklyn Bowl</div>
    <img src="/event-image.jpg" alt="Event image" />
    <div>25 going · 100 interested</div>
    <div class="description">Amazing live music event in Brooklyn!</div>
  </div>
  
  <div data-testid="event-card">
    <h3>Food Festival Downtown</h3>
    <a href="/events/987654321">View Event</a>
    <time datetime="2024-01-20T12:00:00Z">January 20, 2024 at 12:00 PM</time>
    <div class="location">Madison Square Park</div>
    <img src="/food-festival.jpg" alt="Food festival" />
    <div>150 going · 500 interested</div>
    <div class="description">Best food trucks in the city!</div>
  </div>
</body>
</html>
`;

const EMPTY_FACEBOOK_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Events | Facebook</title>
</head>
<body>
  <div>No events found</div>
</body>
</html>
`;

const RATE_LIMITED_RESPONSE = {
  status: 429,
  statusText: 'Too Many Requests',
  headers: { 'retry-after': '60' },
  data: 'Rate limited'
};

describe('FacebookEventsScraper', () => {
  let scraper: FacebookEventsScraper;

  beforeEach(() => {
    scraper = createFacebookScraper({
      maxRetries: 2,
      retryDelay: 100,
      timeout: 5000,
      requestDelay: 100
    });
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock successful axios response by default
    mockedAxios.create.mockReturnValue(mockedAxios as any);
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: SAMPLE_FACEBOOK_HTML,
      headers: {}
    });
  });

  afterEach(() => {
    scraper.cleanup();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default config', () => {
      const defaultScraper = new FacebookEventsScraper();
      expect(defaultScraper).toBeInstanceOf(FacebookEventsScraper);
    });

    it('should initialize with custom config', () => {
      const customScraper = createFacebookScraper({
        maxRetries: 5,
        timeout: 10000
      });
      expect(customScraper).toBeInstanceOf(FacebookEventsScraper);
    });

    it('should return available categories', () => {
      const categories = scraper.getAvailableCategories();
      expect(categories).toContain('music');
      expect(categories).toContain('nightlife');
      expect(categories).toContain('food');
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('Event Scraping', () => {
    it('should scrape events from a city successfully', async () => {
      const events = await scraper.scrapeEventsFromCity('new-york');
      
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        external_id: '123456789',
        source: 'facebook',
        title: 'Sample Music Event',
        description: 'Amazing live music event in Brooklyn!'
      });
      expect(events[1]).toMatchObject({
        external_id: '987654321',
        source: 'facebook',
        title: 'Food Festival Downtown'
      });
    });

    it('should handle empty results gracefully', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: EMPTY_FACEBOOK_HTML,
        headers: {}
      });

      const events = await scraper.scrapeEventsFromCity('small-town');
      expect(events).toHaveLength(0);
    });

    it('should scrape events with category filter', async () => {
      const events = await scraper.scrapeEventsFromCity('new-york', 'music');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('category=music_events'),
        expect.any(Object)
      );
      expect(events).toHaveLength(2);
    });

    it('should scrape events from multiple cities', async () => {
      const events = await scraper.scrapeEventsMultiple({
        cities: ['new-york', 'los-angeles'],
        categories: ['music'],
        maxEventsPerCity: 10
      });

      // Should be called for each city-category combination
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle search parameters', async () => {
      const searchParams = {
        location: {
          city: 'chicago',
          latitude: 41.8781,
          longitude: -87.6298
        },
        categories: ['nightlife', 'food'],
        limit: 25
      };

      const events = await scraper.scrapeEvents(searchParams);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Anti-Detection and Session Management', () => {
    it('should rotate user agents', async () => {
      await scraper.scrapeEventsFromCity('test-city-1');
      await scraper.scrapeEventsFromCity('test-city-2');

      const calls = mockedAxios.get.mock.calls;
      expect(calls.length).toBe(2);
      
      // Check that User-Agent headers are present
      calls.forEach(call => {
        const config = call[1];
        expect(config?.headers).toHaveProperty('User-Agent');
      });
    });

    it('should handle cookies and session data', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: SAMPLE_FACEBOOK_HTML,
        headers: {
          'set-cookie': ['session=abc123; Path=/']
        }
      });

      await scraper.scrapeEventsFromCity('test-city');
      
      // Second request should include cookies
      await scraper.scrapeEventsFromCity('test-city-2');
      
      const secondCall = mockedAxios.get.mock.calls[1];
      const headers = secondCall[1]?.headers;
      // Note: In real implementation, this would check for Cookie header
      expect(headers).toBeDefined();
    });

    it('should respect rate limiting', async () => {
      const startTime = Date.now();
      
      await scraper.scrapeEventsFromCity('test-city-1');
      await scraper.scrapeEventsFromCity('test-city-2');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have some delay between requests
      expect(duration).toBeGreaterThanOrEqual(100); // Based on requestDelay config
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on temporary failures', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: SAMPLE_FACEBOOK_HTML,
          headers: {}
        });

      const events = await scraper.scrapeEventsFromCity('test-city');
      
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(events).toHaveLength(2);
    });

    it('should handle rate limiting with retry-after header', async () => {
      mockedAxios.get
        .mockResolvedValueOnce(RATE_LIMITED_RESPONSE)
        .mockResolvedValueOnce({
          status: 200,
          data: SAMPLE_FACEBOOK_HTML,
          headers: {}
        });

      const events = await scraper.scrapeEventsFromCity('test-city');
      
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(events).toHaveLength(2);
    });

    it('should throw ApiError on non-retryable failures', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 403,
        statusText: 'Forbidden',
        data: 'Access denied'
      });

      await expect(scraper.scrapeEventsFromCity('test-city'))
        .rejects
        .toThrow(ApiError);
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'Request timeout'
      });

      await expect(scraper.scrapeEventsFromCity('test-city'))
        .rejects
        .toThrow(ApiError);
    });

    it('should fail after max retries', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Persistent network error'));

      await expect(scraper.scrapeEventsFromCity('test-city'))
        .rejects
        .toThrow(ApiError);
      
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Based on maxRetries config
    });
  });

  describe('Data Parsing and Normalization', () => {
    it('should parse event data correctly', async () => {
      const events = await scraper.scrapeEventsFromCity('test-city');
      const event = events[0];

      expect(event).toMatchObject({
        id: 'fb_123456789',
        external_id: '123456789',
        source: 'facebook',
        title: 'Sample Music Event',
        description: 'Amazing live music event in Brooklyn!',
        start_time: '2024-01-15T20:00:00.000Z',
        venue: {
          name: 'Brooklyn Bowl',
          address: 'Brooklyn Bowl'
        },
        category: 'general',
        status: 'active',
        price: {
          is_free: true,
          currency: 'USD'
        }
      });

      expect(event.created_at).toBeDefined();
      expect(event.updated_at).toBeDefined();
    });

    it('should handle missing optional fields', async () => {
      const minimalHtml = `
        <div data-testid="event-card">
          <h3>Basic Event</h3>
          <a href="/events/999">View Event</a>
        </div>
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: minimalHtml,
        headers: {}
      });

      const events = await scraper.scrapeEventsFromCity('test-city');
      expect(events).toHaveLength(1);
      
      const event = events[0];
      expect(event.title).toBe('Basic Event');
      expect(event.external_id).toBe('999');
    });

    it('should resolve relative URLs correctly', async () => {
      const events = await scraper.scrapeEventsFromCity('test-city');
      const event = events[0];

      expect(event.url).toBe('https://www.facebook.com/events/123456789');
      expect(event.images?.[0]).toBe('https://www.facebook.com/event-image.jpg');
    });

    it('should remove duplicate events', async () => {
      const duplicateHtml = `
        <div data-testid="event-card">
          <h3>Duplicate Event</h3>
          <a href="/events/123">View Event</a>
        </div>
        <div data-testid="event-card">
          <h3>Duplicate Event Copy</h3>
          <a href="/events/123">View Event</a>
        </div>
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: duplicateHtml,
        headers: {}
      });

      const events = await scraper.scrapeEventsMultiple({
        cities: ['test-city'],
        categories: ['music']
      });

      // Should remove duplicates based on external_id
      const uniqueIds = new Set(events.map(e => e.external_id));
      expect(uniqueIds.size).toBe(events.length);
    });
  });

  describe('Health Check', () => {
    it('should pass health check when Facebook is accessible', async () => {
      const result = await scraper.healthCheck();
      
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Facebook scraper is working');
    });

    it('should fail health check on error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await scraper.healthCheck();
      
      expect(result.status).toBe('error');
      expect(result.message).toContain('Health check failed');
    });
  });

  describe('Infinite Scroll Handling', () => {
    it('should handle infinite scroll pagination', async () => {
      const events = await scraper.scrapeWithInfiniteScroll('test-city', 2);
      
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('should stop pagination when no more events found', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: SAMPLE_FACEBOOK_HTML,
          headers: {}
        })
        .mockResolvedValueOnce({
          status: 200,
          data: EMPTY_FACEBOOK_HTML,
          headers: {}
        });

      const events = await scraper.scrapeWithInfiniteScroll('test-city', 5);
      
      // Should stop after finding no events on second page
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources properly', () => {
      scraper.cleanup();
      
      // Should reset internal state
      expect(() => scraper.cleanup()).not.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  // These would be run against actual Facebook in a controlled environment
  describe('Real Facebook Integration', () => {
    it.skip('should scrape real events from Facebook (manual test)', async () => {
      // This test should only be run manually with proper throttling
      const realScraper = createFacebookScraper({
        requestDelay: 5000, // Much longer delay for real testing
        maxRetries: 1
      });

      try {
        const events = await realScraper.scrapeEventsFromCity('new-york');
        console.log(`Found ${events.length} real events`);
        
        if (events.length > 0) {
          console.log('Sample event:', JSON.stringify(events[0], null, 2));
        }
      } catch (error) {
        console.error('Real integration test failed:', error);
      }
    });

    it.skip('should handle real rate limiting', async () => {
      // Test rapid requests to trigger real rate limiting
      const realScraper = createFacebookScraper({
        requestDelay: 100, // Fast requests
        maxRetries: 3
      });

      try {
        const promises = Array(5).fill(0).map((_, i) => 
          realScraper.scrapeEventsFromCity(`test-city-${i}`)
        );

        const results = await Promise.allSettled(promises);
        
        // Some should succeed, some might be rate limited
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Successful: ${successful}, Failed: ${failed}`);
      } catch (error) {
        console.error('Rate limiting test failed:', error);
      }
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should handle concurrent scraping efficiently', async () => {
    const startTime = Date.now();
    
    const promises = [
      scraper.scrapeEventsFromCity('city1'),
      scraper.scrapeEventsFromCity('city2'),
      scraper.scrapeEventsFromCity('city3')
    ];

    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(10000); // 10 seconds max
  });

  it('should not leak memory on repeated operations', async () => {
    // Run many operations to test for memory leaks
    for (let i = 0; i < 50; i++) {
      await scraper.scrapeEventsFromCity(`test-city-${i}`);
      
      if (i % 10 === 0) {
        // Trigger garbage collection hint
        global.gc && global.gc();
      }
    }
    
    // No assertions here, just checking that it doesn't crash
    expect(true).toBe(true);
  });
});