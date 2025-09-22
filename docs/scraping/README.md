# SceneScout Facebook Events Scraper

## Overview

A comprehensive Facebook Events public scraper built for SceneScout's event discovery platform. This implementation provides robust, production-ready scraping capabilities with advanced anti-detection measures, session management, and seamless integration with SceneScout's event pipeline.

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install axios cheerio @types/axios @types/cheerio

# Run tests to verify installation
npm test -- facebook-scraper.test.ts
```

### Basic Usage

```typescript
import { facebookScraper } from '@/lib/scraping/sources/facebook';

// Scrape events from New York
const events = await facebookScraper.scrapeEventsFromCity('new-york');

// Scrape music events specifically
const musicEvents = await facebookScraper.scrapeEventsFromCity('san-francisco', 'music');

// Multiple cities and categories
const allEvents = await facebookScraper.scrapeEventsMultiple({
  cities: ['new-york', 'los-angeles', 'chicago'],
  categories: ['music', 'nightlife', 'food'],
  maxEventsPerCity: 50
});
```

### Integrated Ingestion

```typescript
import { facebookIngestionService } from '@/lib/ingestion/facebook-ingestion';

// Run complete ingestion pipeline
const result = await facebookIngestionService.runFullIngestion();

// Manual trigger for specific city
const cityResult = await facebookIngestionService.triggerManualIngestion('miami', 'nightlife');

// Start scheduled ingestion
facebookIngestionService.startScheduled();
```

## 📁 File Structure

```
src/lib/scraping/
├── sources/
│   └── facebook.ts              # Core Facebook scraper implementation
├── index.ts                     # Unified scraping interface
└── README.md                    # This file

src/lib/ingestion/
└── facebook-ingestion.ts       # Integration service for SceneScout pipeline

tests/
├── facebook-scraper.test.ts     # Unit tests for scraper
└── integration/
    └── facebook-integration.test.ts  # Integration tests

docs/scraping/
├── README.md                    # This overview
└── FACEBOOK_SCRAPER.md         # Detailed documentation
```

## 🎯 Key Features

### Core Scraping Capabilities
- **City-based Discovery**: Target specific cities for event scraping
- **Category Filtering**: 25+ event categories (music, nightlife, food, etc.)
- **Batch Processing**: Handle multiple cities and categories efficiently
- **Search Parameters**: Flexible search with location, date, and category filters
- **Infinite Scroll**: Handle Facebook's dynamic content loading

### Anti-Detection & Reliability
- **User Agent Rotation**: Cycles through realistic browser identities
- **Session Management**: Persistent sessions with cookie handling
- **Request Timing**: Configurable delays and rate limiting
- **Header Randomization**: Dynamic headers to mimic real browsers
- **Exponential Backoff**: Intelligent retry logic with increasing delays
- **Circuit Breaker**: Prevents cascading failures

### Data Processing
- **Standardized Format**: Converts to unified `RawEvent` structure
- **Date/Time Normalization**: Handles various Facebook date formats
- **URL Resolution**: Converts relative URLs to absolute paths
- **Duplicate Detection**: Filters events by external ID
- **Error Handling**: Graceful degradation with detailed error reporting

### Integration Features
- **Database Storage**: Direct integration with Supabase
- **Event Normalization**: Seamless data transformation
- **Scheduled Ingestion**: Automated periodic scraping
- **Health Monitoring**: Service health checks and metrics
- **Performance Tracking**: Detailed performance and error metrics

## 🎪 Supported Event Categories

The scraper supports 25+ Facebook event categories:

**Popular Categories:**
- `music` - Concerts, festivals, live music
- `nightlife` - Clubs, bars, late-night events
- `food` - Food festivals, restaurant events, tastings
- `arts` - Art shows, gallery openings, cultural events
- `sports` - Sports events, fitness classes, tournaments

**All Categories:**
`music`, `nightlife`, `food`, `arts`, `sports`, `business`, `community`, `family`, `film`, `causes`, `comedy`, `crafts`, `dance`, `drinks`, `fitness`, `health`, `networking`, `party`, `technology`, `theater`, `wellness`, and more.

## 🔧 Configuration

### Scraper Configuration

```typescript
import { createFacebookScraper } from '@/lib/scraping/sources/facebook';

const customScraper = createFacebookScraper({
  maxRetries: 5,
  retryDelay: 3000,
  timeout: 45000,
  concurrentRequests: 1,
  requestDelay: 2500,
  sessionRotationInterval: 15
});
```

### Ingestion Configuration

```typescript
import { createFacebookIngestionService } from '@/lib/ingestion/facebook-ingestion';

const ingestionService = createFacebookIngestionService({
  batchSize: 10,
  maxEventsPerBatch: 100,
  requestDelay: 2000,
  enableDeduplication: true,
  cities: ['new-york', 'los-angeles', 'chicago'],
  categories: ['music', 'nightlife', 'food'],
  schedule: {
    interval: 60, // minutes
    enabled: true
  }
});
```

## 📊 Monitoring & Metrics

### Health Checks

```typescript
// Scraper health
const scraperHealth = await facebookScraper.healthCheck();
console.log(scraperHealth); // { status: 'ok', message: '...' }

// Ingestion service health
const serviceHealth = await facebookIngestionService.healthCheck();
console.log(serviceHealth); // Includes scraper + database status
```

### Performance Metrics

```typescript
const metrics = facebookIngestionService.getMetrics();
console.log(metrics);
/*
{
  successRate: 95.2,
  averageEventsPerCity: 47.3,
  errorsByType: {
    "429_retryable": 3,
    "network_error": 1
  },
  performanceByCity: {
    "new-york": {
      eventsFound: 52,
      processingTime: 1250
    }
  }
}
*/
```

### Ingestion Results

```typescript
const result = await facebookIngestionService.runFullIngestion();
console.log(result);
/*
{
  totalScraped: 234,
  totalProcessed: 230,
  totalStored: 225,
  duplicatesSkipped: 5,
  errors: [
    { city: "miami", category: "nightlife", error: "Rate limited" }
  ],
  duration: 45230
}
*/
```

## 🧪 Testing

### Run Unit Tests

```bash
# All scraper tests
npm test -- facebook-scraper.test.ts

# Integration tests
npm test -- facebook-integration.test.ts

# Watch mode for development
npm run test:watch -- facebook
```

### Test Coverage

```bash
npm run test:coverage
```

### Manual Testing

```bash
# Test scraper health
node -e "
const { facebookScraper } = require('./src/lib/scraping/sources/facebook');
facebookScraper.healthCheck().then(console.log);
"

# Test ingestion service
node -e "
const { facebookIngestionService } = require('./src/lib/ingestion/facebook-ingestion');
facebookIngestionService.healthCheck().then(console.log);
"
```

## 🚦 Best Practices

### 1. Respectful Scraping
```typescript
// Use appropriate delays (recommended: 2-5 seconds)
const scraper = createFacebookScraper({
  requestDelay: 2000,
  maxRetries: 3,
  concurrentRequests: 1
});
```

### 2. Error Handling
```typescript
try {
  const events = await scraper.scrapeEventsFromCity('new-york');
  // Process events...
} catch (error) {
  if (error instanceof ApiError && error.isRetryable) {
    // Schedule retry
    console.log('Temporary error, scheduling retry');
  } else {
    // Log permanent error
    console.error('Permanent failure:', error.message);
  }
} finally {
  scraper.cleanup();
}
```

### 3. Production Deployment
```typescript
// Production configuration
const prodScraper = createFacebookScraper({
  requestDelay: 5000,      // Conservative delays
  maxRetries: 5,           // More retries
  timeout: 60000,          // Longer timeouts
  sessionRotationInterval: 5  // Frequent rotation
});

// Enable scheduled ingestion
const prodIngestion = createFacebookIngestionService({
  schedule: {
    interval: 120,  // Every 2 hours
    enabled: true
  },
  enableDeduplication: true,
  retryFailedBatches: true
});
```

### 4. Monitoring
```typescript
// Set up monitoring
setInterval(async () => {
  const health = await facebookIngestionService.healthCheck();
  if (health.status === 'error') {
    console.error('Service unhealthy:', health.message);
    // Send alert to monitoring system
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

## 🔍 Troubleshooting

### Common Issues

1. **No Events Found**
   - Verify city name format (use hyphens: 'new-york')
   - Check if category is supported
   - Facebook may have changed their page structure

2. **403 Forbidden Errors**
   - Increase request delays (`requestDelay: 5000`)
   - Check if IP is rate limited
   - Try rotating user agents more frequently

3. **Rate Limiting (429)**
   - Respect `retry-after` headers (handled automatically)
   - Reduce concurrent requests
   - Increase delays between city/category switches

4. **Parsing Errors**
   - Facebook frequently changes DOM structure
   - Check browser developer tools for new selectors
   - Update parsing logic in `parseEventData()` method

### Debug Mode

```typescript
// Enable verbose logging
process.env.DEBUG = 'facebook-scraper';

// Use slower, more conservative settings
const debugScraper = createFacebookScraper({
  requestDelay: 10000,
  maxRetries: 1,
  timeout: 120000
});
```

### Health Monitoring

```typescript
// Regular health checks
const checkHealth = async () => {
  const health = await facebookIngestionService.healthCheck();
  console.log(`Health: ${health.status} - ${health.message}`);
  
  if (health.details?.metrics) {
    console.log(`Success Rate: ${health.details.metrics.successRate}%`);
  }
};

setInterval(checkHealth, 5 * 60 * 1000);
```

## 📝 Integration Examples

### With SceneScout Event Pipeline

```typescript
import { facebookIngestionService } from '@/lib/ingestion/facebook-ingestion';
import { eventNormalizer } from '@/lib/event-normalizer';

// Custom event processing
async function processEvents(city: string, category: string) {
  try {
    const result = await facebookIngestionService.ingestCityCategory(city, category);
    
    console.log(`✅ ${city}/${category}: ${result.totalStored} events stored`);
    
    if (result.errors.length > 0) {
      console.warn(`⚠️ ${result.errors.length} errors encountered`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to process ${city}/${category}:`, error);
    throw error;
  }
}
```

### Batch Processing Multiple Cities

```typescript
const cities = [
  'new-york', 'los-angeles', 'chicago', 'houston', 'phoenix',
  'philadelphia', 'san-antonio', 'san-diego', 'dallas', 'san-jose'
];

const categories = ['music', 'nightlife', 'food', 'arts'];

async function batchProcess() {
  const results = [];
  
  for (const city of cities) {
    for (const category of categories) {
      try {
        const result = await facebookIngestionService.ingestCityCategory(city, category);
        results.push({ city, category, ...result });
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Failed ${city}/${category}:`, error);
        results.push({ city, category, error: error.message });
      }
    }
    
    // Longer wait between cities
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  return results;
}
```

### Real-time Event Updates

```typescript
// Schedule regular updates
const scheduleUpdates = () => {
  facebookIngestionService.updateConfig({
    schedule: {
      interval: 60, // Every hour
      enabled: true
    }
  });
  
  facebookIngestionService.startScheduled();
  
  console.log('✅ Scheduled Facebook ingestion started');
};

// Monitor and restart if needed
const monitorService = () => {
  setInterval(async () => {
    const status = facebookIngestionService.getStatus();
    
    if (!status.isRunning && status.scheduledEnabled) {
      console.log('🔄 Restarting scheduled ingestion');
      facebookIngestionService.startScheduled();
    }
    
    const metrics = facebookIngestionService.getMetrics();
    if (metrics.successRate < 80) {
      console.warn(`⚠️ Low success rate: ${metrics.successRate}%`);
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
};
```

## 🔒 Legal & Compliance

### Important Considerations

1. **Terms of Service**: Ensure compliance with Facebook's Terms of Service
2. **Public Data Only**: Only scrape publicly available event information
3. **Rate Limiting**: Respect Facebook's servers with appropriate delays
4. **Data Protection**: Follow applicable data protection regulations (GDPR, CCPA, etc.)
5. **Attribution**: Consider providing attribution when displaying scraped data

### Recommended Practices

```typescript
// Conservative production settings
const productionConfig = {
  requestDelay: 5000,        // 5 second delays
  maxRetries: 3,             // Limited retries
  concurrentRequests: 1,     // Sequential requests only
  sessionRotationInterval: 5, // Frequent rotation
  timeout: 60000             // Generous timeouts
};

// Respect robots.txt and rate limits
const respectfulScraping = async () => {
  // Check health before scraping
  const health = await facebookScraper.healthCheck();
  if (health.status !== 'ok') {
    throw new Error('Scraper not healthy, aborting');
  }
  
  // Use conservative delays
  await facebookScraper.scrapeEventsFromCity('city', 'category');
  
  // Always cleanup
  facebookScraper.cleanup();
};
```

## 🚀 Future Enhancements

### Planned Features

1. **Proxy Support**: Rotating proxy pools for higher throughput
2. **Browser Automation**: Puppeteer/Playwright integration for JavaScript-heavy pages
3. **Event Details**: Scrape full event pages for additional metadata
4. **Image Processing**: Download and process event images
5. **Geographic Expansion**: Support for international cities and regions

### Contributing

To contribute to the Facebook scraper:

1. Add comprehensive tests for any new features
2. Update documentation for API changes
3. Follow existing error handling patterns
4. Ensure compliance with rate limiting
5. Test against real Facebook pages sparingly

### Support

For issues with the Facebook scraper:

1. Check the test suite for expected behavior
2. Verify Facebook hasn't changed their page structure
3. Test with minimal configuration first
4. Review error logs for specific failure patterns
5. Check rate limiting and session management

---

**Built for SceneScout** - Comprehensive event discovery platform  
**Version**: 1.0.0  
**Last Updated**: 2024-01-15