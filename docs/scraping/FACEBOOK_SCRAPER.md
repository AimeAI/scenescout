# Facebook Events Scraper Documentation

## Overview

The Facebook Events Scraper is a robust, production-ready tool for extracting public event data from Facebook's events exploration pages. It implements comprehensive anti-detection measures, session management, and error handling to reliably scrape event information.

## Features

### 🎯 Core Functionality
- **City-based Event Discovery**: Scrape events from specific cities
- **Category Filtering**: Target specific event categories (music, nightlife, food, etc.)
- **Multiple Cities Support**: Batch scraping across multiple locations
- **Infinite Scroll Handling**: Extract events from paginated results

### 🛡️ Anti-Detection Measures
- **User Agent Rotation**: Cycles through realistic browser user agents
- **Session Management**: Maintains persistent sessions with cookie handling
- **Request Timing**: Configurable delays and rate limiting
- **Header Randomization**: Dynamic HTTP headers to mimic real browsers
- **Proxy Support**: Ready for proxy integration (configurable)

### 🔄 Robust Error Handling
- **Exponential Backoff**: Intelligent retry logic with increasing delays
- **Rate Limit Handling**: Respects Facebook's rate limiting with retry-after headers
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Graceful Degradation**: Continues operation even if some requests fail

### 📊 Data Normalization
- **Standardized Format**: Converts Facebook data to unified `RawEvent` format
- **Date/Time Normalization**: Handles various Facebook date formats
- **URL Resolution**: Converts relative URLs to absolute paths
- **Duplicate Removal**: Filters out duplicate events by ID

## Quick Start

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

### Advanced Configuration

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

const events = await customScraper.scrapeEventsFromCity('miami');
```

## Configuration Options

### FacebookScrapingConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | number | 3 | Maximum retry attempts for failed requests |
| `retryDelay` | number | 2000 | Base delay between retries (ms) |
| `timeout` | number | 30000 | Request timeout (ms) |
| `concurrentRequests` | number | 2 | Maximum concurrent requests |
| `requestDelay` | number | 1500 | Delay between requests (ms) |
| `userAgents` | string[] | [...] | Array of user agents to rotate |
| `sessionRotationInterval` | number | 10 | Requests before rotating session |

## Available Event Categories

The scraper supports the following Facebook event categories:

- `music` - Music events and concerts
- `nightlife` - Nightlife and club events
- `food` - Food and drink events
- `arts` - Arts and cultural events
- `sports` - Sports and fitness events
- `business` - Business and networking events
- `community` - Community events
- `family` - Family and education events
- `film` - Film and media events
- `causes` - Charity and cause events
- `comedy` - Comedy shows and events
- `crafts` - Crafts and DIY events
- `dance` - Dance events and classes
- `drinks` - Bar and drink events
- `fitness` - Fitness and workout events
- `health` - Health and medical events
- `networking` - Professional networking
- `party` - Party and social events
- `technology` - Tech events and meetups
- `theater` - Theater and performance

## API Reference

### FacebookEventsScraper

#### Methods

##### `scrapeEventsFromCity(city: string, category?: string): Promise<RawEvent[]>`

Scrapes events from a specific city with optional category filtering.

**Parameters:**
- `city` - City name (URL-encoded format like 'new-york')
- `category` - Optional event category filter

**Returns:** Array of normalized event objects

**Example:**
```typescript
const events = await scraper.scrapeEventsFromCity('los-angeles', 'music');
```

##### `scrapeEventsMultiple(params): Promise<RawEvent[]>`

Scrapes events from multiple cities and categories.

**Parameters:**
```typescript
{
  cities: string[];
  categories?: string[];
  maxEventsPerCity?: number;
}
```

**Example:**
```typescript
const events = await scraper.scrapeEventsMultiple({
  cities: ['new-york', 'chicago'],
  categories: ['music', 'food'],
  maxEventsPerCity: 25
});
```

##### `scrapeEvents(searchParams: SearchParams): Promise<RawEvent[]>`

Scrapes events using structured search parameters.

**Parameters:**
```typescript
interface SearchParams {
  location?: {
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  categories?: string[];
  limit?: number;
}
```

##### `scrapeWithInfiniteScroll(city: string, maxPages?: number): Promise<RawEvent[]>`

Handles pagination to scrape more events from infinite scroll.

**Parameters:**
- `city` - Target city
- `maxPages` - Maximum pages to scrape (default: 3)

##### `healthCheck(): Promise<{status: 'ok' | 'error', message: string}>`

Performs health check to verify scraper functionality.

##### `getAvailableCategories(): string[]`

Returns list of supported event categories.

##### `cleanup(): void`

Cleans up resources and resets sessions.

## Error Handling

### ApiError Class

The scraper throws `ApiError` instances with detailed information:

```typescript
class ApiError extends Error {
  status?: number;      // HTTP status code
  isRetryable: boolean; // Whether the error is retryable
  details?: any;        // Additional error context
}
```

### Common Error Scenarios

1. **Rate Limiting (429)**
   - Automatically retries after waiting
   - Respects `retry-after` header
   - Rotates sessions

2. **Access Forbidden (403)**
   - Rotates to different session
   - May indicate detection

3. **Network Timeouts**
   - Retries with exponential backoff
   - Adjustable timeout settings

4. **Parsing Errors**
   - Logs warnings but continues
   - Returns partial results

## Best Practices

### 1. Respectful Scraping
```typescript
// Use appropriate delays
const scraper = createFacebookScraper({
  requestDelay: 2000,  // 2 second delay between requests
  maxRetries: 3
});
```

### 2. Error Handling
```typescript
try {
  const events = await scraper.scrapeEventsFromCity('new-york');
} catch (error) {
  if (error instanceof ApiError && error.isRetryable) {
    // Wait and retry later
    console.log('Temporary error, will retry');
  } else {
    // Handle permanent error
    console.error('Scraping failed:', error.message);
  }
}
```

### 3. Resource Management
```typescript
// Always cleanup when done
try {
  const events = await scraper.scrapeEvents(params);
  // Process events...
} finally {
  scraper.cleanup();
}
```

### 4. Health Monitoring
```typescript
// Regular health checks
const health = await scraper.healthCheck();
if (health.status === 'error') {
  console.warn('Scraper health issue:', health.message);
}
```

## Integration with SceneScout

### Event Pipeline Integration

```typescript
import { facebookScraper } from '@/lib/scraping/sources/facebook';
import { eventNormalizer } from '@/lib/event-normalizer';

async function ingestFacebookEvents(city: string) {
  try {
    // Scrape events
    const rawEvents = await facebookScraper.scrapeEventsFromCity(city);
    
    // Normalize and validate
    const normalizedEvents = rawEvents.map(event => 
      eventNormalizer.normalize(event)
    );
    
    // Store in database
    for (const event of normalizedEvents) {
      await storeEvent(event);
    }
    
    console.log(`Ingested ${normalizedEvents.length} Facebook events for ${city}`);
  } catch (error) {
    console.error('Facebook ingestion failed:', error);
  }
}
```

### Scheduled Scraping

```typescript
// Schedule regular scraping
setInterval(async () => {
  const cities = ['new-york', 'los-angeles', 'chicago'];
  const categories = ['music', 'nightlife', 'food'];
  
  for (const city of cities) {
    for (const category of categories) {
      try {
        await ingestFacebookEvents(city, category);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
      } catch (error) {
        console.error(`Failed to scrape ${category} events in ${city}:`, error);
      }
    }
  }
}, 1000 * 60 * 60); // Every hour
```

## Testing

### Unit Tests
```bash
npm test -- facebook-scraper.test.ts
```

### Integration Tests
```bash
# Manual integration test (use carefully)
npm run test:integration:facebook
```

### Performance Tests
```bash
npm run test:performance:scraping
```

## Monitoring and Observability

### Metrics to Track
- Success rate per city/category
- Average response times
- Rate limit encounters
- Error rates by type
- Session rotation frequency

### Logging
```typescript
// Enable debug logging
const scraper = createFacebookScraper({
  // ... config
});

// Monitor scraper performance
scraper.on('request', (url) => console.log(`Requesting: ${url}`));
scraper.on('retry', (attempt, error) => console.log(`Retry ${attempt}: ${error.message}`));
scraper.on('success', (url, eventCount) => console.log(`Success: ${url} (${eventCount} events)`));
```

## Limitations and Considerations

### Technical Limitations
1. **Facebook Changes**: DOM structure may change frequently
2. **Rate Limiting**: Facebook has strict rate limits
3. **Geo-blocking**: Some regions may be blocked
4. **JavaScript Dependency**: Some content requires JS execution

### Legal Considerations
1. **Terms of Service**: Ensure compliance with Facebook's ToS
2. **Public Data Only**: Only scrape publicly available events
3. **Rate Limiting**: Respect Facebook's servers
4. **Data Usage**: Follow applicable data protection laws

### Performance Considerations
1. **Memory Usage**: Monitor memory consumption during large scrapes
2. **Request Volume**: Limit concurrent requests
3. **Storage**: Ensure adequate storage for scraped data
4. **Processing Time**: Large scrapes can take significant time

## Troubleshooting

### Common Issues

1. **No Events Found**
   - Check if city name is correct
   - Verify Facebook page structure hasn't changed
   - Try different categories

2. **403 Forbidden Errors**
   - Increase request delays
   - Check if IP is blocked
   - Rotate user agents more frequently

3. **Parsing Errors**
   - Facebook may have changed their HTML structure
   - Check browser developer tools for new selectors
   - Update parsing logic if needed

4. **Rate Limiting**
   - Increase `requestDelay` setting
   - Reduce `concurrentRequests`
   - Add longer delays between city/category switches

### Debug Mode

```typescript
const scraper = createFacebookScraper({
  requestDelay: 5000,  // Slower for debugging
  maxRetries: 1,       // Fail fast
  timeout: 60000       // Longer timeout
});

// Enable verbose logging
process.env.DEBUG = 'facebook-scraper';
```

## Maintenance

### Regular Updates
1. Monitor Facebook for DOM changes
2. Update selectors as needed
3. Adjust rate limiting based on Facebook's policies
4. Test against real Facebook pages periodically

### Version History
- v1.0.0 - Initial implementation with basic scraping
- v1.1.0 - Added anti-detection measures
- v1.2.0 - Improved error handling and retry logic
- v1.3.0 - Added session management and rotation

## Contributing

When contributing to the Facebook scraper:

1. Test against real Facebook pages sparingly
2. Add comprehensive unit tests
3. Update documentation for any API changes
4. Follow the existing error handling patterns
5. Ensure compliance with rate limiting

## Support

For issues related to the Facebook scraper:

1. Check existing tests for expected behavior
2. Verify Facebook hasn't changed their structure
3. Test with minimal configuration first
4. Check rate limiting and session management
5. Review error logs for specific failure patterns