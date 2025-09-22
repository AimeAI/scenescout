import { logger } from '@/lib/utils/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScrapedEvent } from '@/types/events';
import { DataCleaner, CleaningOptions, CleaningResult } from './DataCleaner';
import { EventNormalizer, NormalizationOptions, NormalizedEvent, NormalizationResult } from './EventNormalizer';
import { GeocodingService, GeocodingOptions, GeocodingResult } from './GeocodingService';
import { CategoryClassifier, ClassificationOptions, ClassificationResult } from './CategoryClassifier';
import { ImageProcessor, ImageProcessingOptions, ImageProcessingResult } from './ImageProcessor';
import { QualityScorer, ScoringOptions, QualityScore, EventContext } from './QualityScorer';

export interface ProcessingOptions {
  cleaning?: CleaningOptions;
  normalization?: NormalizationOptions;
  geocoding?: GeocodingOptions;
  classification?: ClassificationOptions;
  imageProcessing?: ImageProcessingOptions;
  scoring?: ScoringOptions;
  
  // Pipeline control
  skipSteps?: Array<'cleaning' | 'normalization' | 'geocoding' | 'classification' | 'imageProcessing' | 'scoring'>;
  failOnError?: boolean;
  batchSize?: number;
  maxConcurrent?: number;
  retryAttempts?: number;
  
  // Storage options
  saveToDatabase?: boolean;
  updateExisting?: boolean;
  tableName?: string;
}

export interface ProcessingResult {
  event: ProcessedEvent;
  processingTime: number;
  stepResults: {
    cleaning?: CleaningResult;
    normalization?: NormalizationResult;
    geocoding?: GeocodingResult;
    classification?: ClassificationResult;
    imageProcessing?: ImageProcessingResult;
    scoring?: QualityScore;
  };
  warnings: string[];
  errors: string[];
  success: boolean;
  skippedSteps: string[];
}

export interface ProcessedEvent extends NormalizedEvent {
  id?: string;
  qualityScore?: number;
  qualityTier?: string;
  categories?: string[];
  tags?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  processedImages?: {
    original: string[];
    optimized?: string[];
    thumbnails?: Array<{
      url: string;
      size: string;
    }>;
  };
  metadata: {
    source: string;
    processedAt: Date;
    processingVersion: string;
    qualityMetrics?: any;
    geocodingConfidence?: number;
    classificationConfidence?: number;
  };
}

export interface BatchProcessingResult {
  results: ProcessingResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    warnings: number;
    averageQualityScore: number;
    processingTime: number;
  };
  errors: string[];
}

export class DataProcessor {
  private supabase?: SupabaseClient;
  private dataCleaner: DataCleaner;
  private eventNormalizer: EventNormalizer;
  private geocodingService: GeocodingService;
  private categoryClassifier: CategoryClassifier;
  private imageProcessor: ImageProcessor;
  private qualityScorer: QualityScorer;
  
  private readonly defaultOptions: ProcessingOptions = {
    skipSteps: [],
    failOnError: false,
    batchSize: 10,
    maxConcurrent: 5,
    retryAttempts: 2,
    saveToDatabase: true,
    updateExisting: false,
    tableName: 'events'
  };
  
  private readonly processingVersion = '1.0.0';

  constructor(private options: ProcessingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    
    // Initialize Supabase if credentials are available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    } else if (this.options.saveToDatabase) {
      logger.warn('Supabase credentials not found, database operations will be disabled');
      this.options.saveToDatabase = false;
    }
    
    // Initialize pipeline components
    this.dataCleaner = new DataCleaner(this.options.cleaning);
    this.eventNormalizer = new EventNormalizer(this.options.normalization);
    this.geocodingService = new GeocodingService(this.options.geocoding);
    this.categoryClassifier = new CategoryClassifier(this.options.classification);
    this.imageProcessor = new ImageProcessor(this.options.imageProcessing);
    this.qualityScorer = new QualityScorer(this.options.scoring);
  }

  async processEvent(
    rawEvent: any,
    context: EventContext = {},
    source: string = 'unknown'
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const stepResults: ProcessingResult['stepResults'] = {};
    const skippedSteps: string[] = [];
    
    let currentData = rawEvent;
    let success = true;

    logger.info('Starting event processing', {
      source,
      title: rawEvent.title,
      skipSteps: this.options.skipSteps
    });

    try {
      // Step 1: Data Cleaning
      if (!this.shouldSkipStep('cleaning')) {
        try {
          const cleaningResult = await this.dataCleaner.clean(currentData);
          stepResults.cleaning = cleaningResult;
          
          if (cleaningResult.isValid) {
            currentData = { ...currentData, ...cleaningResult.data };
            warnings.push(...cleaningResult.warnings);
          } else {
            errors.push(...cleaningResult.errors.map(e => e.message));
            if (this.options.failOnError) {
              throw new Error('Data cleaning failed validation');
            }
          }
        } catch (error) {
          const errorMsg = `Data cleaning failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      } else {
        skippedSteps.push('cleaning');
      }

      // Step 2: Data Normalization
      if (!this.shouldSkipStep('normalization')) {
        try {
          const normalizationResult = await this.eventNormalizer.normalize(currentData);
          stepResults.normalization = normalizationResult;
          
          currentData = { ...currentData, ...normalizationResult.event };
          warnings.push(...normalizationResult.warnings);
          errors.push(...normalizationResult.errors);
        } catch (error) {
          const errorMsg = `Data normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      } else {
        skippedSteps.push('normalization');
      }

      // Step 3: Geocoding
      if (!this.shouldSkipStep('geocoding') && (currentData.address || currentData.venue)) {
        try {
          const address = [currentData.venue, currentData.address].filter(Boolean).join(', ');
          const geocodingResult = await this.geocodingService.geocode(address);
          stepResults.geocoding = geocodingResult;
          
          if (geocodingResult.coordinates) {
            currentData.coordinates = geocodingResult.coordinates;
            currentData.formattedAddress = geocodingResult.formattedAddress;
          }
          
          if (geocodingResult.confidence < 0.5) {
            warnings.push(`Low geocoding confidence: ${geocodingResult.confidence.toFixed(2)}`);
          }
        } catch (error) {
          const errorMsg = `Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      } else {
        skippedSteps.push('geocoding');
      }

      // Step 4: AI Classification
      if (!this.shouldSkipStep('classification')) {
        try {
          const eventData = {
            title: currentData.title || '',
            description: currentData.description,
            venue: currentData.venue,
            tags: currentData.tags,
            price: currentData.price,
            priceText: currentData.priceText
          };
          
          const classificationResult = await this.categoryClassifier.classify(eventData);
          stepResults.classification = classificationResult;
          
          currentData.categories = classificationResult.categories;
          currentData.tags = [...(currentData.tags || []), ...classificationResult.tags];
          
          if (classificationResult.confidence < 0.7) {
            warnings.push(`Low classification confidence: ${classificationResult.confidence.toFixed(2)}`);
          }
        } catch (error) {
          const errorMsg = `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      } else {
        skippedSteps.push('classification');
      }

      // Step 5: Image Processing
      if (!this.shouldSkipStep('imageProcessing') && currentData.images && currentData.images.length > 0) {
        try {
          const imageProcessingResult = await this.imageProcessor.processImages(currentData.images);
          stepResults.imageProcessing = imageProcessingResult;
          
          // Update event with processed images
          currentData.processedImages = {
            original: currentData.images,
            optimized: imageProcessingResult.images
              .map(img => img.processedUrl)
              .filter(Boolean),
            thumbnails: imageProcessingResult.images
              .flatMap(img => img.thumbnails || [])
              .map(thumb => ({
                url: thumb.url,
                size: `${thumb.width}x${thumb.height}`
              }))
          };
          
          warnings.push(...imageProcessingResult.warnings);
          errors.push(...imageProcessingResult.errors);
        } catch (error) {
          const errorMsg = `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      } else {
        skippedSteps.push('imageProcessing');
      }

      // Step 6: Quality Scoring
      if (!this.shouldSkipStep('scoring')) {
        try {
          const qualityScore = await this.qualityScorer.scoreEvent(currentData, context);
          stepResults.scoring = qualityScore;
          
          currentData.qualityScore = qualityScore.overall;
          currentData.qualityTier = qualityScore.tier;
          
          warnings.push(...qualityScore.warnings);
          
          if (qualityScore.overall < 0.3) {
            warnings.push('Event has very low quality score and may not be suitable for display');
          }
        } catch (error) {
          const errorMsg = `Quality scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      } else {
        skippedSteps.push('scoring');
      }

      // Create final processed event
      const processedEvent: ProcessedEvent = {
        ...currentData,
        metadata: {
          source,
          processedAt: new Date(),
          processingVersion: this.processingVersion,
          qualityMetrics: stepResults.scoring?.metrics,
          geocodingConfidence: stepResults.geocoding?.confidence,
          classificationConfidence: stepResults.classification?.confidence
        }
      };

      // Save to database if enabled
      if (this.options.saveToDatabase && this.supabase) {
        try {
          await this.saveToDatabase(processedEvent);
        } catch (error) {
          const errorMsg = `Database save failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (this.options.failOnError) throw error;
        }
      }

      const processingTime = Date.now() - startTime;
      
      logger.info('Event processing completed', {
        title: currentData.title,
        success: errors.length === 0,
        processingTime,
        qualityScore: currentData.qualityScore,
        warnings: warnings.length,
        errors: errors.length
      });

      return {
        event: processedEvent,
        processingTime,
        stepResults,
        warnings,
        errors,
        success: errors.length === 0,
        skippedSteps
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = `Processing pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      
      logger.error('Event processing failed:', error);
      
      return {
        event: currentData as ProcessedEvent,
        processingTime,
        stepResults,
        warnings,
        errors,
        success: false,
        skippedSteps
      };
    }
  }

  async batchProcess(
    rawEvents: any[],
    context: EventContext = {},
    source: string = 'batch'
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: ProcessingResult[] = [];
    const batchErrors: string[] = [];
    
    logger.info('Starting batch processing', {
      eventCount: rawEvents.length,
      batchSize: this.options.batchSize,
      source
    });

    // Process events in batches
    const batchSize = this.options.batchSize || 10;
    for (let i = 0; i < rawEvents.length; i += batchSize) {
      const batch = rawEvents.slice(i, i + batchSize);
      
      try {
        // Process batch with controlled concurrency
        const batchPromises = batch.map(async (event, index) => {
          const eventSource = `${source}_${i + index}`;
          return this.processEvent(event, context, eventSource);
        });
        
        const batchResults = await this.processConcurrently(
          batchPromises,
          this.options.maxConcurrent || 5
        );
        
        results.push(...batchResults);
        
        // Add delay between batches to prevent overwhelming external services
        if (i + batchSize < rawEvents.length) {
          await this.delay(1000);
        }
        
      } catch (error) {
        const errorMsg = `Batch ${Math.floor(i / batchSize) + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        batchErrors.push(errorMsg);
        logger.error(errorMsg, error);
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const qualityScores = results
      .map(r => r.event.qualityScore)
      .filter((score): score is number => typeof score === 'number');
    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;
    
    const totalProcessingTime = Date.now() - startTime;
    
    logger.info('Batch processing completed', {
      total: rawEvents.length,
      successful,
      failed,
      averageQualityScore: Math.round(averageQualityScore * 100),
      totalProcessingTime
    });

    return {
      results,
      summary: {
        total: rawEvents.length,
        successful,
        failed,
        warnings: totalWarnings,
        averageQualityScore,
        processingTime: totalProcessingTime
      },
      errors: batchErrors
    };
  }

  private shouldSkipStep(step: string): boolean {
    return this.options.skipSteps?.includes(step as any) || false;
  }

  private async saveToDatabase(event: ProcessedEvent): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const tableName = this.options.tableName || 'events';
    
    // Prepare data for database insertion
    const dbEvent = {
      title: event.title,
      description: event.description,
      start_date: event.normalizedStartDate || event.startDate,
      end_date: event.normalizedEndDate || event.endDate,
      venue: event.venue,
      address: event.address,
      formatted_address: event.formattedAddress,
      price: event.normalizedPrice || event.price,
      price_text: event.priceText,
      currency: event.normalizedCurrency,
      website: event.website,
      email: event.email,
      phone: event.phone,
      images: event.images,
      processed_images: event.processedImages,
      tags: event.tags,
      categories: event.categories,
      coordinates: event.coordinates,
      quality_score: event.qualityScore,
      quality_tier: event.qualityTier,
      source_url: event.sourceUrl,
      external_id: event.externalId,
      metadata: event.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.options.updateExisting && event.externalId) {
      // Try to update existing event first
      const { data: existingEvent } = await this.supabase
        .from(tableName)
        .select('id')
        .eq('external_id', event.externalId)
        .single();

      if (existingEvent) {
        const { error } = await this.supabase
          .from(tableName)
          .update(dbEvent)
          .eq('id', existingEvent.id);

        if (error) {
          throw error;
        }
        return;
      }
    }

    // Insert new event
    const { error } = await this.supabase
      .from(tableName)
      .insert(dbEvent);

    if (error) {
      throw error;
    }
  }

  private async processConcurrently<T>(
    promises: Promise<T>[],
    maxConcurrent: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += maxConcurrent) {
      const batch = promises.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public utility methods
  async validateInput(rawEvent: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawEvent || typeof rawEvent !== 'object') {
      errors.push('Input must be a valid object');
      return { valid: false, errors, warnings };
    }

    if (!rawEvent.title || typeof rawEvent.title !== 'string') {
      errors.push('Title is required and must be a string');
    }

    if (rawEvent.startDate) {
      const date = new Date(rawEvent.startDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid start date format');
      }
    } else {
      warnings.push('Start date not provided');
    }

    if (rawEvent.images && !Array.isArray(rawEvent.images)) {
      warnings.push('Images should be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  getProcessingStats(): {
    version: string;
    options: ProcessingOptions;
    components: {
      dataCleaner: boolean;
      eventNormalizer: boolean;
      geocodingService: boolean;
      categoryClassifier: boolean;
      imageProcessor: boolean;
      qualityScorer: boolean;
    };
  } {
    return {
      version: this.processingVersion,
      options: this.options,
      components: {
        dataCleaner: !!this.dataCleaner,
        eventNormalizer: !!this.eventNormalizer,
        geocodingService: !!this.geocodingService,
        categoryClassifier: !!this.categoryClassifier,
        imageProcessor: !!this.imageProcessor,
        qualityScorer: !!this.qualityScorer
      }
    };
  }

  // Clean up resources
  cleanup(): void {
    this.geocodingService.clearCache();
    this.categoryClassifier.clearCache();
    logger.info('Data processor cleanup completed');
  }
}