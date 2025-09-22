/**
 * Facebook Events Ingestion Service
 * 
 * Integrates Facebook scraper with SceneScout's event pipeline
 * Handles data normalization, deduplication, and storage
 */

import { facebookScraper, createFacebookScraper } from '../scraping/sources/facebook';
import { eventNormalizer } from '../event-normalizer';
import { supabase } from '../supabase';
import { ApiError, RawEvent, SearchParams } from '../api/types';

interface FacebookIngestionConfig {
  batchSize: number;
  maxEventsPerBatch: number;
  requestDelay: number;
  enableDeduplication: boolean;
  retryFailedBatches: boolean;
  cities: string[];
  categories: string[];
  schedule?: {
    interval: number; // minutes
    enabled: boolean;
  };
}

interface IngestionResult {
  totalScraped: number;
  totalProcessed: number;
  totalStored: number;
  duplicatesSkipped: number;
  errors: Array<{
    city: string;
    category: string;
    error: string;
  }>;
  duration: number;
}

interface IngestionMetrics {
  successRate: number;
  averageEventsPerCity: number;
  errorsByType: Record<string, number>;
  performanceByCity: Record<string, {
    eventsFound: number;
    processingTime: number;
  }>;
}

export class FacebookIngestionService {
  private config: FacebookIngestionConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private metrics: IngestionMetrics = {
    successRate: 0,
    averageEventsPerCity: 0,
    errorsByType: {},
    performanceByCity: {}
  };

  constructor(config?: Partial<FacebookIngestionConfig>) {
    this.config = {
      batchSize: 10,
      maxEventsPerBatch: 100,
      requestDelay: 2000,
      enableDeduplication: true,
      retryFailedBatches: true,
      cities: ['new-york', 'los-angeles', 'chicago', 'san-francisco'],
      categories: ['music', 'nightlife', 'food', 'arts'],
      schedule: {
        interval: 60, // 1 hour
        enabled: false
      },
      ...config
    };
  }

  /**
   * Start scheduled ingestion
   */
  public startScheduled(): void {
    if (this.intervalId || !this.config.schedule?.enabled) {
      return;
    }

    console.log(`[Facebook Ingestion] Starting scheduled ingestion every ${this.config.schedule.interval} minutes`);
    
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) {
        await this.runFullIngestion();
      }
    }, this.config.schedule.interval * 60 * 1000);
  }

  /**
   * Stop scheduled ingestion
   */
  public stopScheduled(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Facebook Ingestion] Stopped scheduled ingestion');
    }
  }

  /**
   * Run complete ingestion for all configured cities and categories
   */
  public async runFullIngestion(): Promise<IngestionResult> {
    if (this.isRunning) {
      throw new Error('Ingestion is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('[Facebook Ingestion] Starting full ingestion...');

    const result: IngestionResult = {
      totalScraped: 0,
      totalProcessed: 0,
      totalStored: 0,
      duplicatesSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      // Process each city-category combination
      for (const city of this.config.cities) {
        for (const category of this.config.categories) {
          try {
            console.log(`[Facebook Ingestion] Processing ${category} events in ${city}`);
            
            const batchResult = await this.ingestCityCategory(city, category);
            
            result.totalScraped += batchResult.totalScraped;
            result.totalProcessed += batchResult.totalProcessed;
            result.totalStored += batchResult.totalStored;
            result.duplicatesSkipped += batchResult.duplicatesSkipped;

            // Add delay between city-category combinations
            await this.sleep(this.config.requestDelay);

          } catch (error) {
            console.error(`[Facebook Ingestion] Error processing ${category} in ${city}:`, error);
            
            result.errors.push({
              city,
              category,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Update metrics
            this.updateErrorMetrics(error);
          }
        }

        // Longer delay between cities
        await this.sleep(this.config.requestDelay * 2);
      }

      // Update success metrics
      this.updateSuccessMetrics(result);

    } finally {
      this.isRunning = false;
      result.duration = Date.now() - startTime;
      
      console.log(`[Facebook Ingestion] Completed in ${result.duration}ms`);
      console.log(`[Facebook Ingestion] Results:`, {
        scraped: result.totalScraped,
        processed: result.totalProcessed,
        stored: result.totalStored,
        duplicates: result.duplicatesSkipped,
        errors: result.errors.length
      });
    }

    return result;
  }

  /**
   * Ingest events for a specific city and category
   */
  public async ingestCityCategory(city: string, category: string): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      totalScraped: 0,
      totalProcessed: 0,
      totalStored: 0,
      duplicatesSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      // Configure scraper for reliable operation
      const scraper = createFacebookScraper({
        requestDelay: this.config.requestDelay,
        maxRetries: 3,
        timeout: 30000
      });

      // Scrape events
      const rawEvents = await scraper.scrapeEventsFromCity(city, category);
      result.totalScraped = rawEvents.length;

      if (rawEvents.length === 0) {
        console.log(`[Facebook Ingestion] No events found for ${category} in ${city}`);
        return result;
      }

      // Process events in batches
      const batches = this.chunkArray(rawEvents, this.config.batchSize);
      
      for (const batch of batches) {
        const batchResult = await this.processBatch(batch);
        
        result.totalProcessed += batchResult.processed;
        result.totalStored += batchResult.stored;
        result.duplicatesSkipped += batchResult.duplicates;
        
        if (batchResult.errors.length > 0) {
          result.errors.push(...batchResult.errors.map(error => ({
            city,
            category,
            error
          })));
        }

        // Small delay between batches
        await this.sleep(500);
      }

      // Update performance metrics
      this.metrics.performanceByCity[city] = {
        eventsFound: result.totalScraped,
        processingTime: Date.now() - startTime
      };

      scraper.cleanup();

    } catch (error) {
      console.error(`[Facebook Ingestion] Error ingesting ${category} in ${city}:`, error);
      
      result.errors.push({
        city,
        category,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Process a batch of raw events
   */
  private async processBatch(rawEvents: RawEvent[]): Promise<{
    processed: number;
    stored: number;
    duplicates: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      stored: 0,
      duplicates: 0,
      errors: []
    };

    for (const rawEvent of rawEvents) {
      try {
        // Normalize event data
        const normalizedEvent = eventNormalizer.normalize(rawEvent);
        result.processed++;

        // Check for duplicates if enabled
        if (this.config.enableDeduplication) {
          const isDuplicate = await this.checkDuplicate(normalizedEvent);
          if (isDuplicate) {
            result.duplicates++;
            continue;
          }
        }

        // Store in database
        await this.storeEvent(normalizedEvent);
        result.stored++;

      } catch (error) {
        console.error('[Facebook Ingestion] Error processing event:', error);
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return result;
  }

  /**
   * Check if event already exists in database
   */
  private async checkDuplicate(event: any): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('external_id', event.external_id)
        .eq('source', event.source)
        .limit(1);

      if (error) {
        console.warn('[Facebook Ingestion] Error checking duplicates:', error);
        return false; // Assume not duplicate on error
      }

      return data && data.length > 0;
    } catch (error) {
      console.warn('[Facebook Ingestion] Error checking duplicates:', error);
      return false;
    }
  }

  /**
   * Store normalized event in database
   */
  private async storeEvent(event: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          external_id: event.external_id,
          source: event.source,
          title: event.title,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          timezone: event.timezone,
          venue_name: event.venue?.name,
          venue_address: event.venue?.address,
          venue_city: event.venue?.city,
          venue_state: event.venue?.state,
          venue_country: event.venue?.country,
          latitude: event.venue?.latitude,
          longitude: event.venue?.longitude,
          organizer_name: event.organizer?.name,
          category: event.category,
          subcategory: event.subcategory,
          tags: event.tags,
          price_min: event.price?.min,
          price_max: event.price?.max,
          price_currency: event.price?.currency,
          is_free: event.price?.is_free || false,
          images: event.images,
          url: event.url,
          ticket_url: event.ticket_url,
          capacity: event.capacity,
          age_restriction: event.age_restriction,
          status: event.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to store event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(error: any): void {
    const errorType = error instanceof ApiError ? 
      `${error.status || 'unknown'}_${error.isRetryable ? 'retryable' : 'permanent'}` :
      'unknown';

    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(result: IngestionResult): void {
    const totalOperations = result.totalScraped + result.errors.length;
    this.metrics.successRate = totalOperations > 0 ? 
      (result.totalScraped / totalOperations) * 100 : 0;

    this.metrics.averageEventsPerCity = this.config.cities.length > 0 ? 
      result.totalScraped / this.config.cities.length : 0;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): IngestionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      successRate: 0,
      averageEventsPerCity: 0,
      errorsByType: {},
      performanceByCity: {}
    };
  }

  /**
   * Ingest events using search parameters
   */
  public async ingestWithSearchParams(searchParams: SearchParams): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      totalScraped: 0,
      totalProcessed: 0,
      totalStored: 0,
      duplicatesSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      const scraper = createFacebookScraper({
        requestDelay: this.config.requestDelay,
        maxRetries: 3
      });

      const rawEvents = await scraper.scrapeEvents(searchParams);
      result.totalScraped = rawEvents.length;

      if (rawEvents.length > 0) {
        const batches = this.chunkArray(rawEvents, this.config.batchSize);
        
        for (const batch of batches) {
          const batchResult = await this.processBatch(batch);
          
          result.totalProcessed += batchResult.processed;
          result.totalStored += batchResult.stored;
          result.duplicatesSkipped += batchResult.duplicates;
          
          if (batchResult.errors.length > 0) {
            result.errors.push(...batchResult.errors.map(error => ({
              city: searchParams.location?.city || 'unknown',
              category: 'custom_search',
              error
            })));
          }
        }
      }

      scraper.cleanup();

    } catch (error) {
      result.errors.push({
        city: searchParams.location?.city || 'unknown',
        category: 'custom_search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Health check for the ingestion service
   */
  public async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string; details?: any }> {
    try {
      // Check scraper health
      const scraperHealth = await facebookScraper.healthCheck();
      if (scraperHealth.status === 'error') {
        return {
          status: 'error',
          message: 'Facebook scraper health check failed',
          details: scraperHealth
        };
      }

      // Check database connectivity
      const { error } = await supabase
        .from('events')
        .select('id')
        .limit(1);

      if (error) {
        return {
          status: 'error',
          message: 'Database connectivity failed',
          details: error
        };
      }

      return {
        status: 'ok',
        message: 'Facebook ingestion service is healthy',
        details: {
          isRunning: this.isRunning,
          scheduledEnabled: this.config.schedule?.enabled,
          metrics: this.metrics
        }
      };

    } catch (error) {
      return {
        status: 'error',
        message: 'Health check failed',
        details: error
      };
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): FacebookIngestionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FacebookIngestionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart scheduled ingestion if interval changed
    if (newConfig.schedule && this.intervalId) {
      this.stopScheduled();
      this.startScheduled();
    }
  }

  /**
   * Get ingestion status
   */
  public getStatus(): {
    isRunning: boolean;
    scheduledEnabled: boolean;
    nextRun?: Date;
    lastRun?: Date;
    metrics: IngestionMetrics;
  } {
    return {
      isRunning: this.isRunning,
      scheduledEnabled: this.config.schedule?.enabled || false,
      metrics: this.metrics
    };
  }

  /**
   * Manual trigger for specific city/category
   */
  public async triggerManualIngestion(city: string, category?: string): Promise<IngestionResult> {
    if (this.isRunning) {
      throw new Error('Cannot trigger manual ingestion while scheduled ingestion is running');
    }

    console.log(`[Facebook Ingestion] Manual trigger: ${category || 'all categories'} in ${city}`);

    if (category) {
      return this.ingestCityCategory(city, category);
    } else {
      // Run all categories for the city
      const results: IngestionResult[] = [];
      
      for (const cat of this.config.categories) {
        const result = await this.ingestCityCategory(city, cat);
        results.push(result);
        
        await this.sleep(this.config.requestDelay);
      }

      // Aggregate results
      return results.reduce((acc, result) => ({
        totalScraped: acc.totalScraped + result.totalScraped,
        totalProcessed: acc.totalProcessed + result.totalProcessed,
        totalStored: acc.totalStored + result.totalStored,
        duplicatesSkipped: acc.duplicatesSkipped + result.duplicatesSkipped,
        errors: [...acc.errors, ...result.errors],
        duration: acc.duration + result.duration
      }), {
        totalScraped: 0,
        totalProcessed: 0,
        totalStored: 0,
        duplicatesSkipped: 0,
        errors: [],
        duration: 0
      });
    }
  }
}

// Export singleton instance
export const facebookIngestionService = new FacebookIngestionService();

// Export factory function
export function createFacebookIngestionService(config?: Partial<FacebookIngestionConfig>): FacebookIngestionService {
  return new FacebookIngestionService(config);
}

// Export types
export type { FacebookIngestionConfig, IngestionResult, IngestionMetrics };