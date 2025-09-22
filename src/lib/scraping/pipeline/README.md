# SceneScout Data Processing Pipeline

A comprehensive data processing pipeline for cleaning, normalizing, enriching, and scoring scraped event data.

## Overview

The pipeline consists of six main components that work together to transform raw scraped data into high-quality, structured event information:

1. **DataCleaner** - Sanitizes and validates raw data
2. **EventNormalizer** - Standardizes formats and structures
3. **GeocodingService** - Converts addresses to coordinates
4. **CategoryClassifier** - AI-powered categorization and tagging
5. **ImageProcessor** - Optimizes and processes images
6. **QualityScorer** - Ranks events by completeness and relevance

## Quick Start

```typescript
import { DataProcessor } from '@/lib/scraping/pipeline';

// Create processor with default settings
const processor = new DataProcessor();

// Process a single event
const result = await processor.processEvent(rawEventData);
console.log('Quality Score:', result.event.qualityScore);

// Process multiple events
const batchResult = await processor.batchProcess(rawEventsArray);
console.log('Success Rate:', batchResult.summary.successful / batchResult.summary.total);
```

## Components

### DataCleaner

Sanitizes and validates raw scraped data.

**Features:**
- HTML tag removal
- Text normalization
- Date validation
- Email/phone/URL validation
- Price extraction and validation
- Image URL validation

```typescript
import { DataCleaner } from '@/lib/scraping/pipeline';

const cleaner = new DataCleaner({
  removeHtml: true,
  validateEmail: true,
  maxTitleLength: 200
});

const result = await cleaner.clean(rawData);
if (result.isValid) {
  console.log('Clean data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### EventNormalizer

Standardizes data formats (dates, prices, locations, categories).

**Features:**
- Date parsing and timezone normalization
- Currency detection and price normalization
- Address parsing and location structuring
- Category mapping and tag normalization
- Text case normalization

```typescript
import { EventNormalizer } from '@/lib/scraping/pipeline';

const normalizer = new EventNormalizer({
  defaultTimezone: 'America/New_York',
  defaultCurrency: 'USD',
  strictDateValidation: true
});

const result = await normalizer.normalize(eventData);
console.log('Normalized dates:', {
  start: result.event.normalizedStartDate,
  end: result.event.normalizedEndDate
});
```

### GeocodingService

Converts addresses to geographic coordinates.

**Features:**
- Multiple geocoding providers (Nominatim, Google Maps)
- Intelligent caching with TTL
- Fallback to approximate city coordinates
- Batch geocoding with rate limiting
- Confidence scoring

```typescript
import { GeocodingService } from '@/lib/scraping/pipeline';

const geocoder = new GeocodingService({
  cacheEnabled: true,
  cacheTTL: 1440, // 24 hours
  fallbackToApproximateLocation: true
});

const result = await geocoder.geocode('123 Main St, New York, NY');
if (result.coordinates) {
  console.log('Location:', result.coordinates);
  console.log('Confidence:', result.confidence);
}
```

### CategoryClassifier

AI-powered event categorization and tag extraction.

**Features:**
- OpenAI GPT-3.5 integration for intelligent classification
- Rule-based fallback for reliability
- 18 predefined categories (music, arts, food, sports, etc.)
- Automatic tag extraction and cleaning
- Confidence scoring and reasoning

```typescript
import { CategoryClassifier } from '@/lib/scraping/pipeline';

const classifier = new CategoryClassifier({
  maxCategories: 3,
  maxTags: 8,
  includeReasoning: true,
  fallbackToRuleBased: true
});

const result = await classifier.classify({
  title: 'Jazz Night at Blue Note',
  description: 'Live jazz performance...',
  venue: 'Blue Note Jazz Club'
});

console.log('Categories:', result.categories);
console.log('Tags:', result.tags);
console.log('AI Confidence:', result.confidence);
```

### ImageProcessor

Optimizes and processes event images.

**Features:**
- Format conversion (WebP, JPEG, PNG)
- Intelligent resizing and compression
- Thumbnail generation (multiple sizes)
- Watermark application
- Supabase storage integration
- Batch processing with size optimization

```typescript
import { ImageProcessor } from '@/lib/scraping/pipeline';

const processor = new ImageProcessor({
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 80,
  format: 'webp',
  generateThumbnails: true,
  thumbnailSizes: [
    { width: 150, height: 150, suffix: 'thumb' },
    { width: 400, height: 300, suffix: 'medium' }
  ]
});

const result = await processor.processImages(imageUrls);
console.log('Compression ratio:', result.compressionRatio);
console.log('Processing time:', result.processingTime);
```

### QualityScorer

Ranks events by completeness, accuracy, and relevance.

**Scoring Metrics:**
- **Completeness** (25%): Required fields, content richness
- **Accuracy** (20%): Data consistency, validation
- **Relevance** (20%): Category competition, location popularity
- **Freshness** (15%): Event timing, recency
- **Engagement** (10%): Images, contact info, social presence
- **Trustworthiness** (10%): Source reputation, detail level

```typescript
import { QualityScorer } from '@/lib/scraping/pipeline';

const scorer = new QualityScorer({
  includeBreakdown: true,
  includeRecommendations: true,
  strictMode: false
});

const score = await scorer.scoreEvent(eventData, {
  sourceReputation: 0.8,
  locationPopularity: 0.9
});

console.log('Overall Score:', score.overall);
console.log('Tier:', score.tier); // 'premium', 'standard', 'basic', 'poor'
console.log('Recommendations:', score.recommendations);
```

## Configuration

### Environment Variables

```bash
# Required for database storage
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional for enhanced geocoding
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Required for AI classification
OPENAI_API_KEY=your_openai_api_key
```

### Processing Options

```typescript
const processor = new DataProcessor({
  // Skip specific steps
  skipSteps: ['imageProcessing'], // Skip expensive operations for testing
  
  // Error handling
  failOnError: false, // Continue processing despite errors
  retryAttempts: 2,
  
  // Performance
  batchSize: 10,
  maxConcurrent: 5,
  
  // Storage
  saveToDatabase: true,
  updateExisting: false,
  tableName: 'events',
  
  // Component-specific options
  cleaning: {
    removeHtml: true,
    validateEmail: true
  },
  geocoding: {
    cacheEnabled: true,
    cacheTTL: 1440
  },
  classification: {
    maxCategories: 3,
    fallbackToRuleBased: true
  }
});
```

## Pipeline Flow

```
Raw Event Data
      ↓
1. Data Cleaning ────→ Sanitized, validated data
      ↓
2. Normalization ───→ Standardized formats
      ↓
3. Geocoding ───────→ Geographic coordinates
      ↓
4. Classification ──→ Categories and tags
      ↓
5. Image Processing → Optimized images
      ↓
6. Quality Scoring ─→ Quality metrics and tier
      ↓
Processed Event (saved to database)
```

## Error Handling

The pipeline is designed to be resilient:

- **Individual component failures** don't stop the entire pipeline
- **Fallback mechanisms** for external service failures
- **Detailed error reporting** with step-by-step results
- **Warning system** for data quality issues
- **Retry logic** for transient failures

```typescript
const result = await processor.processEvent(rawData);

if (result.success) {
  console.log('Processing completed successfully');
} else {
  console.log('Processing completed with errors:');
  result.errors.forEach(error => console.error(error));
}

// Always check warnings for data quality issues
result.warnings.forEach(warning => console.warn(warning));
```

## Performance Considerations

### Batch Processing

- Process events in configurable batches
- Controlled concurrency to respect API rate limits
- Automatic delays between batches
- Progress tracking and error isolation

### Caching

- **Geocoding cache**: Reduces API calls for repeated addresses
- **Classification cache**: Speeds up similar event processing
- **TTL-based expiration**: Ensures data freshness

### Resource Management

- **Memory usage**: Large batches are processed in chunks
- **API rate limits**: Built-in delays and retry logic
- **Storage optimization**: Images are compressed and resized

## Database Schema

The processed events are stored with the following structure:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  venue TEXT,
  address TEXT,
  formatted_address TEXT,
  coordinates POINT,
  price DECIMAL,
  price_text TEXT,
  currency TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  images TEXT[],
  processed_images JSONB,
  tags TEXT[],
  categories TEXT[],
  quality_score DECIMAL,
  quality_tier TEXT,
  source_url TEXT,
  external_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing

```typescript
// Test individual components
import { DataCleaner, EventNormalizer } from '@/lib/scraping/pipeline';

const cleaner = new DataCleaner();
const normalizer = new EventNormalizer();

// Test with sample data
const sampleEvent = {
  title: 'Test Event',
  description: 'A test event for validation',
  startDate: '2024-12-25T19:00:00Z'
};

const cleanResult = await cleaner.clean(sampleEvent);
const normalizeResult = await normalizer.normalize(cleanResult.data);

console.log('Pipeline test completed');
```

## Monitoring and Logging

The pipeline includes comprehensive logging:

```typescript
// Logs include:
// - Processing start/completion times
// - Quality scores and confidence levels
// - Error details and warnings
// - Performance metrics
// - Cache hit rates

// Enable debug logging
process.env.LOG_LEVEL = 'debug';
```

## Best Practices

1. **Always validate input** before processing
2. **Handle errors gracefully** - don't let one bad event stop the batch
3. **Monitor quality scores** - use them to improve scrapers
4. **Cache aggressively** - especially for geocoding and classification
5. **Process in batches** - balance speed with resource usage
6. **Use appropriate image sizes** - don't over-process for your use case
7. **Set up proper monitoring** - track success rates and processing times

## Troubleshooting

### Common Issues

**Low quality scores:**
- Check data completeness (title, description, dates)
- Verify address formatting for geocoding
- Ensure images are accessible and valid

**Geocoding failures:**
- Verify Google Maps API key if using
- Check address format and completeness
- Monitor rate limits

**Classification issues:**
- Verify OpenAI API key
- Check for sufficient content in title/description
- Enable rule-based fallback

**Image processing errors:**
- Verify Supabase storage configuration
- Check image URL accessibility
- Monitor file size limits

### Debug Mode

```typescript
const processor = new DataProcessor({
  // Enable detailed logging
});

// Check component status
const stats = processor.getProcessingStats();
console.log('Pipeline components:', stats.components);
```
