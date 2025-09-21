/**
 * Event-specific processor using the spawner system
 */

import { createSpawner, EventSpawner } from './index';
import { SpawnTask, SpawnResult } from './types';
// import { normalizeEvent } from '../event-normalizer'; // Not needed for this implementation
import { supabase } from '../supabase';
// Using any for database types to avoid dependency issues

type Event = any; // Simplified for implementation
type EventInsert = any; // Simplified for implementation

export interface EventProcessingOptions {
  batchSize: number;
  deduplicationEnabled: boolean;
  enrichmentEnabled: boolean;
  validateLocation: boolean;
}

export class EventProcessor {
  private spawner: EventSpawner;
  private options: EventProcessingOptions;
  private processedCount: number = 0;

  constructor(options: Partial<EventProcessingOptions> = {}) {
    this.options = {
      batchSize: 50,
      deduplicationEnabled: true,
      enrichmentEnabled: true,
      validateLocation: true,
      ...options
    };

    // Create spawner with event-specific configuration
    this.spawner = createSpawner({
      maxWorkers: 5,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 2000
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Process events from Eventbrite
   */
  async processEventbriteEvents(events: any[]): Promise<SpawnResult[]> {
    const tasks: SpawnTask[] = events.map(event => ({
      name: `eventbrite-${event.id}`,
      data: event,
      handler: this.createEventbriteHandler()
    }));

    return this.spawner.spawnBatch(tasks);
  }

  /**
   * Process events from Yelp
   */
  async processYelpEvents(events: any[]): Promise<SpawnResult[]> {
    const tasks: SpawnTask[] = events.map(event => ({
      name: `yelp-${event.id}`,
      data: event,
      handler: this.createYelpHandler()
    }));

    return this.spawner.spawnBatch(tasks);
  }

  /**
   * Process manual event submissions
   */
  async processManualEvent(eventData: any): Promise<SpawnResult> {
    const task: SpawnTask = {
      name: `manual-${Date.now()}`,
      data: eventData,
      handler: this.createManualHandler(),
      priority: 1 // Higher priority for manual submissions
    };

    return this.spawner.spawn(task);
  }

  /**
   * Create Eventbrite event handler
   */
  private createEventbriteHandler() {
    return async (data: any) => {
      try {
        // Normalize Eventbrite data
        const normalized = this.normalizeEventbriteData(data);
        
        // Validate required fields
        if (!this.validateEvent(normalized)) {
          throw new Error('Invalid event data');
        }

        // Check for duplicates if enabled
        if (this.options.deduplicationEnabled) {
          const isDuplicate = await this.checkDuplicate(normalized);
          if (isDuplicate) {
            return { skipped: true, reason: 'duplicate' };
          }
        }

        // Enrich data if enabled
        if (this.options.enrichmentEnabled) {
          await this.enrichEvent(normalized);
        }

        // Insert into database
        const result = await this.insertEvent(normalized);
        this.processedCount++;

        return { 
          success: true, 
          eventId: result.id,
          source: 'eventbrite'
        };
      } catch (error) {
        console.error('Eventbrite processing error:', error);
        throw error;
      }
    };
  }

  /**
   * Create Yelp event handler
   */
  private createYelpHandler() {
    return async (data: any) => {
      try {
        // Normalize Yelp data
        const normalized = this.normalizeYelpData(data);
        
        // Validate required fields
        if (!this.validateEvent(normalized)) {
          throw new Error('Invalid event data');
        }

        // Check for duplicates
        if (this.options.deduplicationEnabled) {
          const isDuplicate = await this.checkDuplicate(normalized);
          if (isDuplicate) {
            return { skipped: true, reason: 'duplicate' };
          }
        }

        // Insert into database
        const result = await this.insertEvent(normalized);
        this.processedCount++;

        return { 
          success: true, 
          eventId: result.id,
          source: 'yelp'
        };
      } catch (error) {
        console.error('Yelp processing error:', error);
        throw error;
      }
    };
  }

  /**
   * Create manual submission handler
   */
  private createManualHandler() {
    return async (data: any) => {
      try {
        // Validate and normalize manual data
        const normalized = this.normalizeManualData(data);
        
        if (!this.validateEvent(normalized)) {
          throw new Error('Invalid event data');
        }

        // Always enrich manual submissions
        await this.enrichEvent(normalized);

        // Insert with manual flag
        const result = await this.insertEvent({
          ...normalized,
          source: 'manual',
          status: 'pending' // Manual events need review
        });

        this.processedCount++;

        return { 
          success: true, 
          eventId: result.id,
          source: 'manual',
          status: 'pending_review'
        };
      } catch (error) {
        console.error('Manual submission error:', error);
        throw error;
      }
    };
  }

  /**
   * Normalize Eventbrite data format
   */
  private normalizeEventbriteData(data: any): Partial<EventInsert> {
    return {
      external_id: `eventbrite_${data.id}`,
      source: 'eventbrite',
      title: data.name?.text || '',
      description: data.description?.text || '',
      venue_name: data.venue?.name || '',
      address: data.venue?.address?.localized_address_display || '',
      city: data.venue?.address?.city || '',
      state: data.venue?.address?.region || '',
      country: data.venue?.address?.country || 'US',
      latitude: data.venue?.latitude ? parseFloat(data.venue.latitude) : null,
      longitude: data.venue?.longitude ? parseFloat(data.venue.longitude) : null,
      start_time: data.start?.local || null,
      end_time: data.end?.local || null,
      price: data.is_free ? 0 : null,
      currency: data.currency || 'USD',
      capacity: data.capacity || null,
      url: data.url || '',
      image_url: data.logo?.url || null,
      tags: data.category ? [data.category.name] : [],
      status: data.status || 'live',
      raw_data: data
    };
  }

  /**
   * Normalize Yelp data format
   */
  private normalizeYelpData(data: any): Partial<EventInsert> {
    return {
      external_id: `yelp_${data.id}`,
      source: 'yelp',
      title: data.name || '',
      description: data.description || '',
      venue_name: data.location?.name || data.name || '',
      address: data.location?.display_address?.join(', ') || '',
      city: data.location?.city || '',
      state: data.location?.state || '',
      country: data.location?.country || 'US',
      latitude: data.coordinates?.latitude || null,
      longitude: data.coordinates?.longitude || null,
      start_time: data.time_start || null,
      end_time: data.time_end || null,
      price: data.cost || 0,
      currency: 'USD',
      url: data.event_site_url || '',
      image_url: data.image_url || null,
      tags: data.category || [],
      status: 'active',
      raw_data: data
    };
  }

  /**
   * Normalize manual submission data
   */
  private normalizeManualData(data: any): Partial<EventInsert> {
    return {
      external_id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: 'manual',
      title: data.title || '',
      description: data.description || '',
      venue_name: data.venue_name || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || 'US',
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      price: parseFloat(data.price) || 0,
      currency: data.currency || 'USD',
      capacity: data.capacity ? parseInt(data.capacity) : null,
      url: data.url || '',
      image_url: data.image_url || null,
      tags: data.tags || [],
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      status: 'pending',
      raw_data: data
    };
  }

  /**
   * Validate event has required fields
   */
  private validateEvent(event: Partial<EventInsert>): boolean {
    return !!(
      event.title &&
      event.venue_name &&
      event.start_time &&
      (event.city || (event.latitude && event.longitude))
    );
  }

  /**
   * Check if event is duplicate
   */
  private async checkDuplicate(event: Partial<EventInsert>): Promise<boolean> {
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('external_id', event.external_id!)
      .single();

    return !!existing;
  }

  /**
   * Enrich event data with additional information
   */
  private async enrichEvent(event: Partial<EventInsert>): Promise<void> {
    // Add geocoding if needed
    if (!event.latitude || !event.longitude) {
      if (event.address && event.city) {
        // TODO: Implement geocoding
      }
    }

    // Add timezone if missing
    if (!event.timezone && event.latitude && event.longitude) {
      // TODO: Implement timezone lookup
    }

    // Normalize tags
    if (event.tags && Array.isArray(event.tags)) {
      event.tags = event.tags.map((tag: string) => 
        tag.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
    }
  }

  /**
   * Insert event into database
   */
  private async insertEvent(event: Partial<EventInsert>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.spawner.on('worker:complete', ({ task, result, duration }) => {
      console.log(`✅ Completed ${task.name} in ${duration}ms`);
    });

    this.spawner.on('worker:error', ({ task, error }) => {
      console.error(`❌ Failed ${task.name}:`, error);
    });

    this.spawner.on('worker:retry', ({ task, attempt }) => {
      console.warn(`🔄 Retrying ${task.name} (attempt ${attempt})`);
    });

    this.spawner.on('task:queued', ({ task, queueLength }) => {
      console.log(`📋 Queued ${task.name} (${queueLength} in queue)`);
    });
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const status = this.spawner.getStatus();
    return {
      ...status,
      processedCount: this.processedCount
    };
  }

  /**
   * Shutdown processor
   */
  async shutdown(): Promise<void> {
    await this.spawner.shutdown();
  }
}

// Export factory function
export function createEventProcessor(options?: Partial<EventProcessingOptions>): EventProcessor {
  return new EventProcessor(options);
}