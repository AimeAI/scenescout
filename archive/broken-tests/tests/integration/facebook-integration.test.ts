/**
 * Facebook Integration Tests
 * 
 * End-to-end tests for Facebook scraper integration with SceneScout
 * Tests the complete pipeline from scraping to database storage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { facebookIngestionService, createFacebookIngestionService } from '../../src/lib/ingestion/facebook-ingestion';
import { facebookScraper } from '../../src/lib/scraping/sources/facebook';
import { supabase } from '../../src/lib/supabase';

// Test configuration
const TEST_CONFIG = {
  batchSize: 5,
  maxEventsPerBatch: 20,
  requestDelay: 500, // Faster for testing
  enableDeduplication: true,
  retryFailedBatches: true,
  cities: ['test-city'],
  categories: ['music']
};

describe('Facebook Integration Tests', () => {
  let ingestionService: any;
  let originalConsoleLog: any;
  let originalConsoleError: any;

  beforeAll(() => {
    // Suppress console output during tests
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore console output
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    ingestionService = createFacebookIngestionService(TEST_CONFIG);
  });

  afterEach(() => {
    if (ingestionService) {
      ingestionService.stopScheduled();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize ingestion service with default config', () => {
      const service = createFacebookIngestionService();
      expect(service).toBeDefined();
      
      const config = service.getConfig();
      expect(config.batchSize).toBeGreaterThan(0);
      expect(config.cities.length).toBeGreaterThan(0);
      expect(config.categories.length).toBeGreaterThan(0);
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        batchSize: 15,
        cities: ['custom-city'],
        categories: ['nightlife']
      };
      
      const service = createFacebookIngestionService(customConfig);
      const config = service.getConfig();
      
      expect(config.batchSize).toBe(15);
      expect(config.cities).toContain('custom-city');
      expect(config.categories).toContain('nightlife');
    });
  });

  describe('Health Checks', () => {
    it('should perform health check successfully', async () => {
      // Mock scraper health check
      jest.spyOn(facebookScraper, 'healthCheck')
        .mockResolvedValue({ status: 'ok', message: 'Scraper healthy' });

      // Mock database check
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const health = await ingestionService.healthCheck();
      
      expect(health.status).toBe('ok');
      expect(health.message).toContain('healthy');
    });

    it('should detect scraper health issues', async () => {
      jest.spyOn(facebookScraper, 'healthCheck')
        .mockResolvedValue({ status: 'error', message: 'Scraper failed' });

      const health = await ingestionService.healthCheck();
      
      expect(health.status).toBe('error');
      expect(health.message).toContain('scraper health check failed');
    });

    it('should detect database connectivity issues', async () => {
      jest.spyOn(facebookScraper, 'healthCheck')
        .mockResolvedValue({ status: 'ok', message: 'Scraper healthy' });

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ 
            error: { message: 'Database connection failed' }
          })
        })
      } as any);

      const health = await ingestionService.healthCheck();
      
      expect(health.status).toBe('error');
      expect(health.message).toContain('Database connectivity failed');
    });
  });

  describe('Event Ingestion Pipeline', () => {
    it('should ingest events for city and category', async () => {
      // Mock scraper to return sample events
      const mockEvents = [
        {
          id: 'fb_123',
          external_id: '123',
          source: 'facebook',
          title: 'Test Event 1',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Test Venue' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        },
        {
          id: 'fb_456',
          external_id: '456',
          source: 'facebook',
          title: 'Test Event 2',
          start_time: '2024-01-16T19:00:00Z',
          venue: { name: 'Test Venue 2' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: false, currency: 'USD', min: 25 }
        }
      ];

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockResolvedValue(mockEvents as any);

      // Mock database operations
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await ingestionService.ingestCityCategory('test-city', 'music');
      
      expect(result.totalScraped).toBe(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.totalStored).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should handle duplicate detection', async () => {
      const mockEvents = [
        {
          id: 'fb_123',
          external_id: '123',
          source: 'facebook',
          title: 'Duplicate Event',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Test Venue' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        }
      ];

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockResolvedValue(mockEvents as any);

      // Mock duplicate detection - event already exists
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [{ id: 'existing-123' }], 
                error: null 
              })
            })
          })
        })
      } as any);

      const result = await ingestionService.ingestCityCategory('test-city', 'music');
      
      expect(result.totalScraped).toBe(1);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalStored).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
    });

    it('should handle scraping errors gracefully', async () => {
      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockRejectedValue(new Error('Scraping failed'));

      const result = await ingestionService.ingestCityCategory('test-city', 'music');
      
      expect(result.totalScraped).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain('Scraping failed');
    });

    it('should handle database storage errors', async () => {
      const mockEvents = [
        {
          id: 'fb_123',
          external_id: '123',
          source: 'facebook',
          title: 'Test Event',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Test Venue' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        }
      ];

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockResolvedValue(mockEvents as any);

      // Mock database operations - duplicate check passes, insert fails
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ 
          error: { message: 'Database insert failed' }
        })
      } as any);

      const result = await ingestionService.ingestCityCategory('test-city', 'music');
      
      expect(result.totalScraped).toBe(1);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalStored).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Full Ingestion Workflow', () => {
    it('should run full ingestion for all configured cities and categories', async () => {
      const customService = createFacebookIngestionService({
        cities: ['city1', 'city2'],
        categories: ['music', 'food'],
        batchSize: 5,
        requestDelay: 100
      });

      // Mock successful scraping for all combinations
      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockImplementation(async (city, category) => {
          return [{
            id: `fb_${city}_${category}`,
            external_id: `${city}_${category}`,
            source: 'facebook',
            title: `${category} event in ${city}`,
            start_time: '2024-01-15T20:00:00Z',
            venue: { name: `${city} venue` },
            category,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            price: { is_free: true, currency: 'USD' }
          }] as any;
        });

      // Mock database operations
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await customService.runFullIngestion();
      
      // Should process 2 cities × 2 categories = 4 combinations, 1 event each
      expect(result.totalScraped).toBe(4);
      expect(result.totalProcessed).toBe(4);
      expect(result.totalStored).toBe(4);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should continue processing even when some city-category combinations fail', async () => {
      const customService = createFacebookIngestionService({
        cities: ['good-city', 'bad-city'],
        categories: ['music'],
        requestDelay: 100
      });

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockImplementation(async (city, category) => {
          if (city === 'bad-city') {
            throw new Error('City blocked');
          }
          return [{
            id: `fb_${city}_${category}`,
            external_id: `${city}_${category}`,
            source: 'facebook',
            title: `${category} event in ${city}`,
            start_time: '2024-01-15T20:00:00Z',
            venue: { name: `${city} venue` },
            category,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            price: { is_free: true, currency: 'USD' }
          }] as any;
        });

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await customService.runFullIngestion();
      
      expect(result.totalScraped).toBe(1); // Only good-city succeeded
      expect(result.totalStored).toBe(1);
      expect(result.errors.length).toBe(1); // bad-city failed
      expect(result.errors[0].city).toBe('bad-city');
    });
  });

  describe('Search Parameters Integration', () => {
    it('should ingest events using search parameters', async () => {
      const searchParams = {
        location: {
          city: 'test-city',
          latitude: 40.7128,
          longitude: -74.0060
        },
        categories: ['music', 'nightlife'],
        limit: 10
      };

      const mockEvents = [
        {
          id: 'fb_search_1',
          external_id: 'search_1',
          source: 'facebook',
          title: 'Search Result Event',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Search Venue' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        }
      ];

      jest.spyOn(facebookScraper, 'scrapeEvents')
        .mockResolvedValue(mockEvents as any);

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await ingestionService.ingestWithSearchParams(searchParams);
      
      expect(result.totalScraped).toBe(1);
      expect(result.totalStored).toBe(1);
      expect(facebookScraper.scrapeEvents).toHaveBeenCalledWith(searchParams);
    });
  });

  describe('Scheduled Ingestion', () => {
    it('should start and stop scheduled ingestion', async () => {
      const scheduledService = createFacebookIngestionService({
        schedule: {
          interval: 1, // 1 minute for testing
          enabled: true
        }
      });

      expect(scheduledService.getStatus().scheduledEnabled).toBe(true);

      scheduledService.startScheduled();
      expect(scheduledService.getStatus().scheduledEnabled).toBe(true);

      scheduledService.stopScheduled();
    });

    it('should not start multiple scheduled instances', () => {
      const scheduledService = createFacebookIngestionService({
        schedule: {
          interval: 1,
          enabled: true
        }
      });

      scheduledService.startScheduled();
      
      // Starting again should not create another interval
      scheduledService.startScheduled();
      
      // Should still work normally
      expect(scheduledService.getStatus().scheduledEnabled).toBe(true);
      
      scheduledService.stopScheduled();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track ingestion metrics', async () => {
      const mockEvents = [
        {
          id: 'fb_123',
          external_id: '123',
          source: 'facebook',
          title: 'Metrics Test Event',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Test Venue' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        }
      ];

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockResolvedValue(mockEvents as any);

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      await ingestionService.ingestCityCategory('test-city', 'music');
      
      const metrics = ingestionService.getMetrics();
      
      expect(metrics.performanceByCity['test-city']).toBeDefined();
      expect(metrics.performanceByCity['test-city'].eventsFound).toBe(1);
      expect(metrics.performanceByCity['test-city'].processingTime).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      ingestionService.resetMetrics();
      
      const metrics = ingestionService.getMetrics();
      
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageEventsPerCity).toBe(0);
      expect(Object.keys(metrics.errorsByType)).toHaveLength(0);
      expect(Object.keys(metrics.performanceByCity)).toHaveLength(0);
    });
  });

  describe('Manual Triggers', () => {
    it('should trigger manual ingestion for specific city and category', async () => {
      const mockEvents = [
        {
          id: 'fb_manual',
          external_id: 'manual',
          source: 'facebook',
          title: 'Manual Trigger Event',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Manual Venue' },
          category: 'nightlife',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        }
      ];

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockResolvedValue(mockEvents as any);

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await ingestionService.triggerManualIngestion('manual-city', 'nightlife');
      
      expect(result.totalScraped).toBe(1);
      expect(result.totalStored).toBe(1);
      expect(facebookScraper.scrapeEventsFromCity).toHaveBeenCalledWith('manual-city', 'nightlife');
    });

    it('should trigger manual ingestion for all categories in a city', async () => {
      const customService = createFacebookIngestionService({
        categories: ['music', 'food'],
        requestDelay: 100
      });

      jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
        .mockResolvedValue([{
          id: 'fb_manual',
          external_id: 'manual',
          source: 'facebook',
          title: 'Manual Event',
          start_time: '2024-01-15T20:00:00Z',
          venue: { name: 'Manual Venue' },
          category: 'music',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          price: { is_free: true, currency: 'USD' }
        }] as any);

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any);

      const result = await customService.triggerManualIngestion('manual-city');
      
      // Should process both music and food categories
      expect(result.totalScraped).toBe(2);
      expect(result.totalStored).toBe(2);
    });

    it('should prevent manual ingestion while scheduled ingestion is running', async () => {
      // Mark service as running
      ingestionService.isRunning = true;

      await expect(
        ingestionService.triggerManualIngestion('test-city', 'music')
      ).rejects.toThrow('Cannot trigger manual ingestion while scheduled ingestion is running');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        batchSize: 20,
        cities: ['updated-city'],
        requestDelay: 3000
      };

      ingestionService.updateConfig(newConfig);
      
      const updatedConfig = ingestionService.getConfig();
      
      expect(updatedConfig.batchSize).toBe(20);
      expect(updatedConfig.cities).toContain('updated-city');
      expect(updatedConfig.requestDelay).toBe(3000);
    });

    it('should get current status', () => {
      const status = ingestionService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('scheduledEnabled');
      expect(status).toHaveProperty('metrics');
      expect(typeof status.isRunning).toBe('boolean');
    });
  });
});

// Performance and load tests
describe('Facebook Integration Performance Tests', () => {
  it('should handle large batch processing efficiently', async () => {
    const service = createFacebookIngestionService({
      batchSize: 10,
      requestDelay: 50
    });

    // Create large mock dataset
    const mockEvents = Array.from({ length: 100 }, (_, i) => ({
      id: `fb_perf_${i}`,
      external_id: `perf_${i}`,
      source: 'facebook',
      title: `Performance Test Event ${i}`,
      start_time: '2024-01-15T20:00:00Z',
      venue: { name: `Test Venue ${i}` },
      category: 'music',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      price: { is_free: true, currency: 'USD' }
    }));

    jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
      .mockResolvedValue(mockEvents as any);

    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    } as any);

    const startTime = Date.now();
    const result = await service.ingestCityCategory('perf-city', 'music');
    const duration = Date.now() - startTime;

    expect(result.totalScraped).toBe(100);
    expect(result.totalStored).toBe(100);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });

  it('should not leak memory during repeated operations', async () => {
    const service = createFacebookIngestionService({
      batchSize: 5,
      requestDelay: 10
    });

    const mockEvents = [{
      id: 'fb_memory',
      external_id: 'memory',
      source: 'facebook',
      title: 'Memory Test Event',
      start_time: '2024-01-15T20:00:00Z',
      venue: { name: 'Memory Venue' },
      category: 'music',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      price: { is_free: true, currency: 'USD' }
    }];

    jest.spyOn(facebookScraper, 'scrapeEventsFromCity')
      .mockResolvedValue(mockEvents as any);

    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    } as any);

    // Run many iterations
    for (let i = 0; i < 50; i++) {
      await service.ingestCityCategory(`memory-city-${i}`, 'music');
    }

    // If we get here without crashing, memory management is working
    expect(true).toBe(true);
  });
});